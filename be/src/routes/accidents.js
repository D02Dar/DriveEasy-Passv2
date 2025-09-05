const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { executeQuery, insertOne, updateOne, deleteOne, findOne } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const bilingualPdfService = require('../services/bilingualPdfService');

const router = express.Router();

// 临时照片上传存储配置
const tempPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const accidentPath = path.join(uploadPath, 'accidents');

    // 确保目录存在
    if (!fs.existsSync(accidentPath)) {
      fs.mkdirSync(accidentPath, { recursive: true });
    }

    cb(null, accidentPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名，保留扩展名
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueSuffix + ext);
  }
});

// 临时照片上传接口（用于向导流程） - 放在最前面避免被其他路由拦截
const tempPhotoUpload = multer({
  storage: tempPhotoStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许特定的图片格式
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
    const mimeType = file.mimetype.toLowerCase();

    // 检查MIME类型和文件扩展名
    if (allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型。仅支持: ${allowedExtensions.join(', ')}`));
    }
  }
});

router.post('/temp/photos', authenticateToken, tempPhotoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
    }

    const { photoType } = req.body;

    if (!photoType) {
      return res.status(400).json({
        success: false,
        message: '缺少照片类型参数'
      });
    }

    // 验证照片类型
    const validPhotoTypes = [
      'frontView', 'rearView', 'damageDetail', 'scenePanorama',
      'driverLicense', 'vehicleLicense', 'scene', 'front', 'side', 'rear', 'detail', 'other'
    ];

    if (!validPhotoTypes.includes(photoType)) {
      return res.status(400).json({
        success: false,
        message: '无效的照片类型'
      });
    }

    // 验证图片
    const validation = await validateImage(req.file.path);
    if (!validation.valid) {
      // 删除无效文件
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('删除无效文件失败:', err);
      }

      return res.status(400).json({
        success: false,
        message: `图片验证失败: ${validation.error}`
      });
    }

    // 压缩图片
    const originalPath = req.file.path;
    const compressedPath = originalPath.replace(/\.[^.]+$/, '_compressed.jpg');

    const compressionResult = await compressImage(originalPath, compressedPath, validation.metadata);
    if (!compressionResult.success) {
      // 删除原文件
      try {
        fs.unlinkSync(originalPath);
      } catch (err) {
        console.error('删除原文件失败:', err);
      }

      return res.status(500).json({
        success: false,
        message: `图片压缩失败: ${compressionResult.error}`
      });
    }

    // 删除原文件，使用压缩后的文件
    try {
      fs.unlinkSync(originalPath);
      req.file.path = compressedPath;
      req.file.filename = path.basename(compressedPath);
    } catch (err) {
      console.error('删除原文件失败:', err);
    }

    // 生成图片URL
    const imageUrl = `/uploads/accidents/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        imageUrl: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        photoType: photoType,
        isTemporary: true // 标记为临时文件
      },
      message: '照片上传成功'
    });

  } catch (error) {
    console.error('临时照片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '照片上传失败'
    });
  }
});

// 生成报告内容哈希 - 包含所有相关字段
const generateContentHash = (reportData, photos) => {
  const content = {
    accidentTime: reportData.accidentTime,
    otherPartyInfo: reportData.otherPartyInfo,
    status: reportData.status,
    partyAName: reportData.partyAName,
    partyAPhone: reportData.partyAPhone,
    partyAIdCard: reportData.partyAIdCard,
    partyALicenseNumber: reportData.partyALicenseNumber,
    partyAVehicleNumber: reportData.partyAVehicleNumber,
    partyAInsuranceCompany: reportData.partyAInsuranceCompany,
    partyBName: reportData.partyBName,
    partyBPhone: reportData.partyBPhone,
    partyBIdCard: reportData.partyBIdCard,
    partyBLicenseNumber: reportData.partyBLicenseNumber,
    partyBVehicleNumber: reportData.partyBVehicleNumber,
    partyBInsuranceCompany: reportData.partyBInsuranceCompany,
    responsibility: reportData.responsibility,
    partyASignature: reportData.partyASignature,
    partyBSignature: reportData.partyBSignature,
    latitude: reportData.latitude,
    longitude: reportData.longitude,
    photos: photos.map(p => ({
      photoType: p.photoType,
      caption: p.caption,
      imageUrl: p.imageUrl
    }))
  };

  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
};

// 确保用户PDF目录存在
const ensureUserPdfDirectory = (userId) => {
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  const userPdfPath = path.join(uploadPath, 'pdfs', `user_${userId}`);

  if (!fs.existsSync(userPdfPath)) {
    fs.mkdirSync(userPdfPath, { recursive: true });
  }

  return userPdfPath;
};

// 检查PDF是否存在且有效
const checkExistingPdf = (userId, reportId, contentHash) => {
  const userPdfPath = ensureUserPdfDirectory(userId);
  const expectedFilename = `accident-report-${reportId}-${contentHash}.pdf`;
  const filePath = path.join(userPdfPath, expectedFilename);

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    // 检查文件是否为空或损坏
    if (stats.size > 0) {
      return {
        exists: true,
        filename: expectedFilename,
        filePath: filePath,
        relativePath: `/uploads/pdfs/user_${userId}/${expectedFilename}`
      };
    }
  }

  return { exists: false };
};

// 图片验证函数
const validateImage = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();

    // 检查图片尺寸
    const { width, height, format, size } = metadata;

    // 最小尺寸检查 (200x200)
    if (width < 200 || height < 200) {
      return {
        valid: false,
        error: `图片分辨率太低 (${width}x${height})，请选择至少200x200像素的图片`
      };
    }

    // 最大尺寸检查 (8000x8000)
    if (width > 8000 || height > 8000) {
      return {
        valid: false,
        error: `图片分辨率太高 (${width}x${height})，请选择小于8000x8000像素的图片`
      };
    }

    // 检查文件大小 (最小10KB)
    if (size < 10 * 1024) {
      return {
        valid: false,
        error: '图片文件太小，请选择有效的图片文件'
      };
    }

    // 检查图片格式
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `不支持的图片格式 (${format})，仅支持: ${allowedFormats.join(', ')}`
      };
    }

    return { valid: true, metadata };
  } catch (error) {
    return {
      valid: false,
      error: '图片文件损坏或格式不正确'
    };
  }
};

// 图片压缩函数
const compressImage = async (inputPath, outputPath, metadata) => {
  try {
    const { width, height } = metadata;

    // 计算压缩后的尺寸
    let newWidth = width;
    let newHeight = height;

    // 如果图片太大，按比例缩小
    const maxDimension = 2048; // 最大边长
    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }

    // 压缩图片
    await sharp(inputPath)
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 85, // 压缩质量
        progressive: true
      })
      .toFile(outputPath);

    return { success: true };
  } catch (error) {
    console.error('图片压缩失败:', error);
    return {
      success: false,
      error: '图片压缩失败'
    };
  }
};

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const accidentPath = path.join(uploadPath, 'accidents');
    
    // 确保目录存在
    if (!fs.existsSync(accidentPath)) {
      fs.mkdirSync(accidentPath, { recursive: true });
    }
    
    cb(null, accidentPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 注释掉原来的 upload 实例，避免冲突
// const upload = multer({
//   storage,
//   limits: {
//     fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
//     files: 10 // 最多10个文件
//   },
//   fileFilter: (req, file, cb) => {
//     // 只允许特定的图片格式
//     const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
//     const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

//     const fileExt = path.extname(file.originalname).toLowerCase().slice(1);
//     const mimeType = file.mimetype.toLowerCase();

//     // 检查MIME类型和文件扩展名
//     if (allowedMimeTypes.includes(mimeType) && allowedExtensions.includes(fileExt)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`不支持的文件类型。仅支持: ${allowedExtensions.join(', ')}`));
//     }
//   }
// });

// 创建新的 upload 实例用于其他路由
const upload = multer({ dest: './uploads/accidents/' });

// 获取用户的事故报告列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = 'user_id = ?';
    const queryParams = [req.user.id];

    if (status) {
      whereClause += ' AND status = ?';
      queryParams.push(status);
    }

    // 获取事故报告总数
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM accident_reports WHERE ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 获取事故报告列表
    const reports = await executeQuery(`
      SELECT
        id,
        accident_time as accidentTime,
        other_party_info as otherPartyInfo,
        pdf_url as pdfUrl,
        status,
        current_step as currentStep,
        party_a_name as partyAName,
        party_b_name as partyBName,
        responsibility,
        latitude,
        longitude,
        detailed_address as accidentLocation,
        created_at as createdAt,
        updated_at as updatedAt
      FROM accident_reports
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

    // 为每个报告获取照片数量
    for (const report of reports) {
      const photoCount = await executeQuery(`
        SELECT COUNT(*) as total
        FROM accident_report_photos
        WHERE accident_report_id = ?
      `, [report.id]);

      report.photoCount = photoCount[0].total;

      // 根据请求来源决定是否使用完整URL
      if (report.pdfUrl) {
        const host = req.get('host');
        const protocol = req.protocol;

        // 如果是外部访问（非localhost），使用完整URL，但确保使用后端端口
        if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
          const hostname = host.split(':')[0]; // 获取主机名，去掉端口
          const backendPort = process.env.PORT || '2607';
          report.pdfUrl = `${protocol}://${hostname}:${backendPort}${report.pdfUrl}`;
        }
      }
    }

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取事故报告列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取事故报告列表失败'
    });
  }
});

// 获取单个事故报告详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID'
      });
    }

    // 获取事故报告
    const reports = await executeQuery(`
      SELECT
        id,
        accident_time as accidentTime,
        other_party_info as otherPartyInfo,
        pdf_url as pdfUrl,
        status,
        current_step as currentStep,
        party_a_name as partyAName,
        party_a_phone as partyAPhone,
        party_a_id_card as partyAIdCard,
        party_a_license_number as partyALicenseNumber,
        party_a_vehicle_number as partyAVehicleNumber,
        party_a_insurance_company as partyAInsuranceCompany,
        party_b_name as partyBName,
        party_b_phone as partyBPhone,
        party_b_id_card as partyBIdCard,
        party_b_license_number as partyBLicenseNumber,
        party_b_vehicle_number as partyBVehicleNumber,
        party_b_insurance_company as partyBInsuranceCompany,
        responsibility,
        party_a_signature as partyASignature,
        party_b_signature as partyBSignature,
        agreement_generated_at as agreementGeneratedAt,
        latitude,
        longitude,
        detailed_address as detailedAddress,
        nearby_landmarks as nearbyLandmarks,
        completed_steps as completedSteps,
        has_read_guidelines as hasReadGuidelines,
        agreed_to_terms as agreedToTerms,
        created_at as createdAt,
        updated_at as updatedAt
      FROM accident_reports
      WHERE id = ? AND user_id = ?
    `, [reportId, req.user.id]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在'
      });
    }

    const report = reports[0];

    // 获取照片列表
    const photos = await executeQuery(`
      SELECT
        id,
        image_url as imageUrl,
        photo_type as photoType,
        caption,
        uploaded_at as uploadedAt,
        sort_order as sortOrder
      FROM accident_report_photos
      WHERE accident_report_id = ?
      ORDER BY sort_order ASC, uploaded_at ASC
    `, [reportId]);

    // 根据请求来源决定是否使用完整URL
    const host = req.get('host');
    const protocol = req.protocol;

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      // 外部访问：使用完整URL，但确保使用后端端口
      const hostname = host.split(':')[0]; // 获取主机名，去掉端口
      const backendPort = process.env.PORT || '2607';
      const baseUrl = `${protocol}://${hostname}:${backendPort}`;

      // 为照片添加完整URL
      const photosWithFullUrl = photos.map(photo => ({
        ...photo,
        imageUrl: photo.imageUrl ? `${baseUrl}${photo.imageUrl}` : null
      }));

      // 为PDF添加完整URL
      if (report.pdfUrl) {
        report.pdfUrl = `${baseUrl}${report.pdfUrl}`;
      }

      report.photos = photosWithFullUrl;
    } else {
      // 本地访问：使用相对路径，通过前端代理访问
      report.photos = photos;
    }

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('获取事故报告详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取事故报告详情失败'
    });
  }
});

// 创建事故报告
router.post('/', authenticateToken, [
  body('accidentTime').optional().isISO8601().withMessage('事故时间格式无效'),
  body('otherPartyInfo').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('对方信息必须是字符串或null');
  }),
  body('partyA').optional().isObject().withMessage('甲方信息必须是对象'),
  body('partyB').optional().isObject().withMessage('乙方信息必须是对象'),
  body('responsibility').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('责任认定必须是字符串或null');
  }),
  body('signatures').optional().isObject().withMessage('签名数据必须是对象'),
  body('location').optional().isObject().withMessage('位置信息必须是对象'),
  body('photos').optional().isObject().withMessage('照片信息必须是对象'),
  body('currentStep').optional().isInt({ min: 0, max: 5 }).withMessage('当前步骤必须是0-5的整数'),
  body('status').optional().isIn(['draft', 'submitted', 'archived']).withMessage('状态值无效')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const {
      accidentTime,
      otherPartyInfo,
      partyA,
      partyB,
      responsibility,
      signatures,
      location,
      photos,
      currentStep,
      status,
      hasReadGuidelines,
      agreedToTerms
    } = req.body;

    // 构建数据库插入对象
    const reportData = {
      user_id: req.user.id,
      status: status || 'draft',
      current_step: currentStep || 0
    };

    // 基本信息
    if (accidentTime) reportData.accident_time = new Date(accidentTime);
    if (otherPartyInfo) reportData.other_party_info = otherPartyInfo;

    // 当事人A信息
    if (partyA) {
      if (partyA.name) reportData.party_a_name = partyA.name;
      if (partyA.phone) reportData.party_a_phone = partyA.phone;
      if (partyA.idCard) reportData.party_a_id_card = partyA.idCard;
      if (partyA.licenseNumber) reportData.party_a_license_number = partyA.licenseNumber;
      if (partyA.vehicleNumber) reportData.party_a_vehicle_number = partyA.vehicleNumber;
      if (partyA.insuranceCompany) reportData.party_a_insurance_company = partyA.insuranceCompany;
    }

    // 当事人B信息
    if (partyB) {
      if (partyB.name) reportData.party_b_name = partyB.name;
      if (partyB.phone) reportData.party_b_phone = partyB.phone;
      if (partyB.idCard) reportData.party_b_id_card = partyB.idCard;
      if (partyB.licenseNumber) reportData.party_b_license_number = partyB.licenseNumber;
      if (partyB.vehicleNumber) reportData.party_b_vehicle_number = partyB.vehicleNumber;
      if (partyB.insuranceCompany) reportData.party_b_insurance_company = partyB.insuranceCompany;
    }

    // 责任认定
    if (responsibility) reportData.responsibility = responsibility;

    // 签名数据
    if (signatures) {
      if (signatures.partyA) reportData.party_a_signature = signatures.partyA;
      if (signatures.partyB) reportData.party_b_signature = signatures.partyB;
      if (signatures.partyA && signatures.partyB) {
        reportData.agreement_generated_at = new Date();
      }
    }

    // 地理位置 - 允许为空
    if (location) {
      // 允许位置信息为空或null
      reportData.latitude = location.latitude || null;
      reportData.longitude = location.longitude || null;
      reportData.detailed_address = location.address || null;
    }

    // 流程控制
    if (hasReadGuidelines !== undefined) reportData.has_read_guidelines = hasReadGuidelines;
    if (agreedToTerms !== undefined) reportData.agreed_to_terms = agreedToTerms;

    // 创建事故报告
    const reportId = await insertOne('accident_reports', reportData);

    // 处理照片上传
    if (photos && typeof photos === 'object') {
      const photoInserts = [];

      Object.keys(photos).forEach(photoType => {
        if (Array.isArray(photos[photoType])) {
          photos[photoType].forEach((photo, index) => {
            if (photo.url) {
              // 确保保存的是相对路径，去掉可能的完整URL前缀
              let imageUrl = photo.url;
              if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                // 提取相对路径部分
                const urlObj = new URL(imageUrl);
                imageUrl = urlObj.pathname;
              }

              photoInserts.push({
                accident_report_id: reportId,
                image_url: imageUrl,
                photo_type: photoType,
                caption: photo.caption || null,
                sort_order: index
              });
            }
          });
        }
      });

      // 批量插入照片记录
      if (photoInserts.length > 0) {
        for (const photoData of photoInserts) {
          await insertOne('accident_report_photos', photoData);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: { reportId },
      message: '事故报告创建成功'
    });

  } catch (error) {
    console.error('创建事故报告失败:', error);
    res.status(500).json({
      success: false,
      message: '创建事故报告失败'
    });
  }
});

// 更新事故报告
router.put('/:id', authenticateToken, [
  body('accidentTime').optional().isISO8601().withMessage('事故时间格式无效'),
  body('otherPartyInfo').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('对方信息必须是字符串或null');
  }),
  body('partyA').optional().isObject().withMessage('甲方信息必须是对象'),
  body('partyB').optional().isObject().withMessage('乙方信息必须是对象'),
  body('responsibility').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('责任认定必须是字符串或null');
  }),
  body('signatures').optional().isObject().withMessage('签名数据必须是对象'),
  body('location').optional().isObject().withMessage('位置信息必须是对象'),
  body('photos').optional().isObject().withMessage('照片信息必须是对象'),
  body('currentStep').optional().isInt({ min: 0, max: 5 }).withMessage('当前步骤必须是0-5的整数'),
  body('status').optional().isIn(['draft', 'submitted', 'archived']).withMessage('状态值无效')
], async (req, res) => {
  try {
    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    const reportId = parseInt(req.params.id);
    const {
      accidentTime,
      otherPartyInfo,
      partyA,
      partyB,
      responsibility,
      signatures,
      location,
      photos,
      currentStep,
      status,
      hasReadGuidelines,
      agreedToTerms
    } = req.body;

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID'
      });
    }

    // 检查报告是否存在且属于当前用户
    const report = await findOne('accident_reports', {
      id: reportId,
      user_id: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在'
      });
    }

    // 构建更新数据
    const updateData = {};

    // 基本信息
    if (accidentTime !== undefined) updateData.accident_time = new Date(accidentTime);
    if (otherPartyInfo !== undefined) updateData.other_party_info = otherPartyInfo;
    if (status !== undefined) updateData.status = status;
    if (currentStep !== undefined) updateData.current_step = currentStep;

    // 当事人A信息
    if (partyA) {
      if (partyA.name !== undefined) updateData.party_a_name = partyA.name;
      if (partyA.phone !== undefined) updateData.party_a_phone = partyA.phone;
      if (partyA.idCard !== undefined) updateData.party_a_id_card = partyA.idCard;
      if (partyA.licenseNumber !== undefined) updateData.party_a_license_number = partyA.licenseNumber;
      if (partyA.vehicleNumber !== undefined) updateData.party_a_vehicle_number = partyA.vehicleNumber;
      if (partyA.insuranceCompany !== undefined) updateData.party_a_insurance_company = partyA.insuranceCompany;
      if (partyA.policyNumber !== undefined) updateData.party_a_policy_number = partyA.policyNumber;
    }

    // 当事人B信息
    if (partyB) {
      if (partyB.name !== undefined) updateData.party_b_name = partyB.name;
      if (partyB.phone !== undefined) updateData.party_b_phone = partyB.phone;
      if (partyB.idCard !== undefined) updateData.party_b_id_card = partyB.idCard;
      if (partyB.licenseNumber !== undefined) updateData.party_b_license_number = partyB.licenseNumber;
      if (partyB.vehicleNumber !== undefined) updateData.party_b_vehicle_number = partyB.vehicleNumber;
      if (partyB.insuranceCompany !== undefined) updateData.party_b_insurance_company = partyB.insuranceCompany;
      if (partyB.policyNumber !== undefined) updateData.party_b_policy_number = partyB.policyNumber;
    }

    // 责任认定
    if (responsibility !== undefined) updateData.responsibility = responsibility;

    // 签名数据
    if (signatures) {
      if (signatures.partyA !== undefined) updateData.party_a_signature = signatures.partyA;
      if (signatures.partyB !== undefined) updateData.party_b_signature = signatures.partyB;
      if (signatures.partyA && signatures.partyB && !report.agreement_generated_at) {
        updateData.agreement_generated_at = new Date();
      }
    }

    // 地理位置 - 允许为空
    if (location) {
      // 允许位置信息为空或null
      if (location.latitude !== undefined) updateData.latitude = location.latitude || null;
      if (location.longitude !== undefined) updateData.longitude = location.longitude || null;
      if (location.address !== undefined) updateData.detailed_address = location.address || null;
      if (location.landmarks !== undefined) updateData.nearby_landmarks = location.landmarks || null;
    }

    // 流程控制
    if (hasReadGuidelines !== undefined) updateData.has_read_guidelines = hasReadGuidelines;
    if (agreedToTerms !== undefined) updateData.agreed_to_terms = agreedToTerms;

    // 更新事故报告
    await updateOne('accident_reports', updateData, { id: reportId });

    // 处理照片更新
    if (photos && typeof photos === 'object') {
      // 删除现有照片记录
      await executeQuery('DELETE FROM accident_report_photos WHERE accident_report_id = ?', [reportId]);

      // 插入新的照片记录
      const photoInserts = [];
      Object.keys(photos).forEach(photoType => {
        if (Array.isArray(photos[photoType])) {
          photos[photoType].forEach((photo, index) => {
            if (photo.url) {
              // 确保保存的是相对路径，去掉可能的完整URL前缀
              let imageUrl = photo.url;
              if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                // 提取相对路径部分
                const urlObj = new URL(imageUrl);
                imageUrl = urlObj.pathname;
              }

              photoInserts.push({
                accident_report_id: reportId,
                image_url: imageUrl,
                photo_type: photoType,
                caption: photo.caption || null,
                sort_order: index
              });
            }
          });
        }
      });

      // 批量插入照片记录
      if (photoInserts.length > 0) {
        for (const photoData of photoInserts) {
          await insertOne('accident_report_photos', photoData);
        }
      }
    }

    res.json({
      success: true,
      message: '事故报告更新成功'
    });

  } catch (error) {
    console.error('更新事故报告失败:', error);
    res.status(500).json({
      success: false,
      message: '更新事故报告失败'
    });
  }
});

// 删除事故报告
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID'
      });
    }

    // 检查报告是否存在且属于当前用户
    const report = await findOne('accident_reports', {
      id: reportId,
      user_id: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在'
      });
    }

    // 获取相关照片文件路径
    const photos = await executeQuery(`
      SELECT image_url
      FROM accident_report_photos
      WHERE accident_report_id = ?
    `, [reportId]);

    // 删除事故报告（级联删除照片记录）
    await deleteOne('accident_reports', { id: reportId });

    // 删除物理文件
    photos.forEach(photo => {
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', photo.image_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    res.json({
      success: true,
      message: '事故报告删除成功'
    });

  } catch (error) {
    console.error('删除事故报告失败:', error);
    res.status(500).json({
      success: false,
      message: '删除事故报告失败'
    });
  }
});

// 上传事故照片（支持多张）
router.post('/:id/photos', authenticateToken, upload.array('photos', 10), async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID',
        code: 'INVALID_REPORT_ID'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件',
        code: 'NO_FILES_SELECTED'
      });
    }

    // 检查文件数量限制
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: '一次最多只能上传10张照片',
        code: 'TOO_MANY_FILES'
      });
    }

    // 检查报告是否存在且属于当前用户
    const report = await findOne('accident_reports', {
      id: reportId,
      user_id: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在或您没有权限访问',
        code: 'REPORT_NOT_FOUND'
      });
    }

    // 获取当前最大排序号
    const maxSortResult = await executeQuery(`
      SELECT COALESCE(MAX(sort_order), 0) as maxSort
      FROM accident_report_photos
      WHERE accident_report_id = ?
    `, [reportId]);

    let currentSort = maxSortResult[0].maxSort;

    const uploadedPhotos = [];

    // 处理每个上传的文件
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      // 验证图片
      const validation = await validateImage(file.path);
      if (!validation.valid) {
        // 删除已上传的无效文件
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('删除无效文件失败:', err);
        }

        return res.status(400).json({
          success: false,
          message: `文件 "${file.originalname}" 验证失败: ${validation.error}`,
          code: 'FILE_VALIDATION_FAILED',
          details: {
            filename: file.originalname,
            error: validation.error
          }
        });
      }

      // 压缩图片
      const originalPath = file.path;
      const compressedPath = originalPath.replace(/\.[^.]+$/, '_compressed.jpg');

      const compressionResult = await compressImage(originalPath, compressedPath, validation.metadata);
      if (!compressionResult.success) {
        // 删除原文件
        try {
          fs.unlinkSync(originalPath);
        } catch (err) {
          console.error('删除原文件失败:', err);
        }

        return res.status(500).json({
          success: false,
          message: `文件 "${file.originalname}" 压缩失败: ${compressionResult.error}`,
          code: 'FILE_COMPRESSION_FAILED',
          details: {
            filename: file.originalname,
            error: compressionResult.error
          }
        });
      }

      // 删除原文件，使用压缩后的文件
      try {
        fs.unlinkSync(originalPath);
        file.path = compressedPath;
        file.filename = path.basename(compressedPath);
      } catch (err) {
        console.error('删除原文件失败:', err);
      }

      // 正确处理 FormData 中的数组数据
      let photoTypes = req.body.photoTypes || [];
      let captions = req.body.captions || [];

      // 确保 photoTypes 和 captions 是数组
      if (!Array.isArray(photoTypes)) {
        photoTypes = [photoTypes];
      }
      if (!Array.isArray(captions)) {
        captions = [captions];
      }

      const photoType = photoTypes[i] || 'other';
      const caption = captions[i] || '';

      // 验证 photoType 是否为有效值
      const validPhotoTypes = ['scene', 'front', 'side', 'rear', 'detail', 'other', 'driver_license', 'vehicle_license'];
      const finalPhotoType = validPhotoTypes.includes(photoType) ? photoType : 'other';

      currentSort++;

      // 保存照片记录
      const photoId = await insertOne('accident_report_photos', {
        accident_report_id: reportId,
        image_url: `/uploads/accidents/${file.filename}`,
        photo_type: finalPhotoType,
        caption: caption,
        sort_order: currentSort
      });

      uploadedPhotos.push({
        id: photoId,
        imageUrl: `/uploads/accidents/${file.filename}`,
        photoType: finalPhotoType,
        caption,
        sortOrder: currentSort
      });
    }

    res.status(201).json({
      success: true,
      data: {
        photos: uploadedPhotos,
        count: uploadedPhotos.length
      },
      message: `成功上传 ${uploadedPhotos.length} 张照片`
    });

  } catch (error) {
    console.error('上传照片失败:', error);

    // 处理不同类型的错误
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: '文件大小超过限制（最大10MB）',
        code: 'FILE_TOO_LARGE'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超过限制（最多10个）',
        code: 'TOO_MANY_FILES'
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: '不支持的文件字段',
        code: 'INVALID_FILE_FIELD'
      });
    }

    if (error.message && error.message.includes('不支持的文件类型')) {
      return res.status(415).json({
        success: false,
        message: error.message,
        code: 'UNSUPPORTED_FILE_TYPE'
      });
    }

    res.status(500).json({
      success: false,
      message: '上传照片失败，请稍后重试',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
});

// 更新照片说明
router.put('/:reportId/photos/:photoId', authenticateToken, [
  body('caption').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('说明必须是字符串或null');
  }),
  body('photoType').optional().isIn(['scene', 'front', 'side', 'rear', 'detail', 'other', 'driver_license', 'vehicle_license']).withMessage('照片类型无效')
], async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const photoId = parseInt(req.params.photoId);

    if (isNaN(reportId) || isNaN(photoId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }

    // 验证输入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '输入验证失败',
        errors: errors.array()
      });
    }

    // 检查报告是否存在且属于当前用户
    const report = await findOne('accident_reports', {
      id: reportId,
      user_id: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在'
      });
    }

    // 检查照片是否存在
    const photo = await findOne('accident_report_photos', {
      id: photoId,
      accident_report_id: reportId
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    const { caption, photoType } = req.body;
    const updateData = {};

    if (caption !== undefined) {
      updateData.caption = caption;
    }

    if (photoType !== undefined) {
      updateData.photo_type = photoType;
    }

    // 更新照片信息
    await updateOne('accident_report_photos', updateData, { id: photoId });

    res.json({
      success: true,
      message: '照片信息更新成功'
    });

  } catch (error) {
    console.error('更新照片信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新照片信息失败'
    });
  }
});

// 删除事故照片
router.delete('/:reportId/photos/:photoId', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const photoId = parseInt(req.params.photoId);

    if (isNaN(reportId) || isNaN(photoId)) {
      return res.status(400).json({
        success: false,
        message: '无效的ID参数'
      });
    }

    // 检查报告是否存在且属于当前用户
    const report = await findOne('accident_reports', {
      id: reportId,
      user_id: req.user.id
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在'
      });
    }

    // 获取照片信息
    const photo = await findOne('accident_report_photos', {
      id: photoId,
      accident_report_id: reportId
    });

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    // 删除照片记录
    await deleteOne('accident_report_photos', { id: photoId });

    // 删除物理文件
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', photo.image_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '照片删除成功'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('删除照片失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '删除照片失败'
    });
  }
});

// 强制重新生成PDF - 删除旧PDF并生成新的
router.post('/:id/regenerate-pdf', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID / Invalid report ID',
        code: 'INVALID_REPORT_ID'
      });
    }

    // 获取事故报告详情
    const reports = await executeQuery(`
      SELECT
        id,
        accident_time as accidentTime,
        other_party_info as otherPartyInfo,
        status,
        created_at as createdAt,
        pdf_content_hash as pdfContentHash,
        current_step as currentStep,
        party_a_name as partyAName,
        party_a_phone as partyAPhone,
        party_a_id_card as partyAIdCard,
        party_a_license_number as partyALicenseNumber,
        party_a_vehicle_number as partyAVehicleNumber,
        party_a_insurance_company as partyAInsuranceCompany,
        party_b_name as partyBName,
        party_b_phone as partyBPhone,
        party_b_id_card as partyBIdCard,
        party_b_license_number as partyBLicenseNumber,
        party_b_vehicle_number as partyBVehicleNumber,
        party_b_insurance_company as partyBInsuranceCompany,
        responsibility,
        party_a_signature as partyASignature,
        party_b_signature as partyBSignature,
        agreement_generated_at as agreementGeneratedAt,
        latitude,
        longitude,
        has_read_guidelines as hasReadGuidelines,
        agreed_to_terms as agreedToTerms
      FROM accident_reports
      WHERE id = ? AND user_id = ?
    `, [reportId, userId]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在或您没有权限访问 / Report not found or access denied',
        code: 'REPORT_NOT_FOUND'
      });
    }

    const report = reports[0];

    // 获取照片列表
    const photos = await executeQuery(`
      SELECT
        image_url as imageUrl,
        photo_type as photoType,
        caption,
        sort_order as sortOrder
      FROM accident_report_photos
      WHERE accident_report_id = ?
      ORDER BY sort_order ASC, uploaded_at ASC
    `, [reportId]);

    // 删除所有旧的PDF文件
    const userPdfPath = ensureUserPdfDirectory(userId);
    const files = fs.readdirSync(userPdfPath);
    files.forEach(file => {
      if (file.startsWith(`accident-report-${reportId}-`)) {
        const filePath = path.join(userPdfPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`删除旧PDF文件: ${file}`);
        } catch (error) {
          console.error(`删除PDF文件失败: ${file}`, error);
        }
      }
    });

    // 生成新的内容哈希
    const currentContentHash = generateContentHash(report, photos);
    console.log(`强制重新生成PDF for 用户${userId}, 报告${reportId}, 哈希: ${currentContentHash}`);

    // 使用双语PDF服务生成PDF
    const pdfBytes = await bilingualPdfService.createBilingualAccidentReport(report, photos);

    // 生成新的文件名
    const filename = `accident-report-${reportId}-${currentContentHash}.pdf`;
    const filePath = path.join(userPdfPath, filename);

    // 保存PDF文件
    fs.writeFileSync(filePath, pdfBytes);

    // 更新报告的PDF信息
    const relativePath = `/uploads/pdfs/user_${userId}/${filename}`;
    await updateOne('accident_reports', {
      pdf_url: relativePath,
      pdf_content_hash: currentContentHash,
      pdf_updated_at: new Date()
    }, { id: reportId });

    // 生成PDF URL
    let pdfUrl = relativePath;
    const host = req.get('host');
    const protocol = req.protocol;

    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const hostname = host.split(':')[0];
      const backendPort = process.env.PORT || '2607';
      pdfUrl = `${protocol}://${hostname}:${backendPort}${relativePath}`;
    }

    res.json({
      success: true,
      data: {
        pdfUrl: pdfUrl,
        filename: filename,
        isNew: true
      },
      message: 'PDF强制重新生成成功 / PDF forcefully regenerated successfully'
    });

  } catch (error) {
    console.error('PDF重新生成失败:', error);

    res.status(500).json({
      success: false,
      message: 'PDF重新生成失败 / PDF regeneration failed',
      code: 'PDF_REGENERATION_FAILED'
    });
  }
});

// 智能PDF生成 - 内容未变时直接下载，变化时重新生成
router.post('/:id/generate-pdf', authenticateToken, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(reportId)) {
      return res.status(400).json({
        success: false,
        message: '无效的报告ID / Invalid report ID',
        code: 'INVALID_REPORT_ID'
      });
    }

    // 获取事故报告详情 - 包含所有字段
    const reports = await executeQuery(`
      SELECT
        id,
        accident_time as accidentTime,
        other_party_info as otherPartyInfo,
        status,
        created_at as createdAt,
        pdf_content_hash as pdfContentHash,
        current_step as currentStep,
        party_a_name as partyAName,
        party_a_phone as partyAPhone,
        party_a_id_card as partyAIdCard,
        party_a_license_number as partyALicenseNumber,
        party_a_vehicle_number as partyAVehicleNumber,
        party_a_insurance_company as partyAInsuranceCompany,
        party_b_name as partyBName,
        party_b_phone as partyBPhone,
        party_b_id_card as partyBIdCard,
        party_b_license_number as partyBLicenseNumber,
        party_b_vehicle_number as partyBVehicleNumber,
        party_b_insurance_company as partyBInsuranceCompany,
        responsibility,
        party_a_signature as partyASignature,
        party_b_signature as partyBSignature,
        agreement_generated_at as agreementGeneratedAt,
        latitude,
        longitude,
        has_read_guidelines as hasReadGuidelines,
        agreed_to_terms as agreedToTerms
      FROM accident_reports
      WHERE id = ? AND user_id = ?
    `, [reportId, userId]);

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: '事故报告不存在或您没有权限访问 / Report not found or access denied',
        code: 'REPORT_NOT_FOUND'
      });
    }

    const report = reports[0];

    // 获取照片列表
    const photos = await executeQuery(`
      SELECT
        image_url as imageUrl,
        photo_type as photoType,
        caption,
        sort_order as sortOrder
      FROM accident_report_photos
      WHERE accident_report_id = ?
      ORDER BY sort_order ASC, uploaded_at ASC
    `, [reportId]);

    // 生成当前内容的哈希
    const currentContentHash = generateContentHash(report, photos);

    // 检查是否存在有效的PDF文件
    const existingPdf = checkExistingPdf(userId, reportId, currentContentHash);

    if (existingPdf.exists && report.pdfContentHash === currentContentHash) {
      // 内容未变，直接返回现有PDF
      let pdfUrl = existingPdf.relativePath;
      const host = req.get('host');
      const protocol = req.protocol;

      // 如果是外部访问（非localhost），使用完整URL，但确保使用后端端口
      if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
        const hostname = host.split(':')[0]; // 获取主机名，去掉端口
        const backendPort = process.env.PORT || '2607';
        pdfUrl = `${protocol}://${hostname}:${backendPort}${existingPdf.relativePath}`;
      }

      return res.json({
        success: true,
        data: {
          pdfUrl: pdfUrl,
          filename: existingPdf.filename,
          isNew: false
        },
        message: '报告内容未变，使用现有PDF / Content unchanged, using existing PDF'
      });
    }

    // 内容有变化，需要生成新PDF
    console.log(`生成新PDF for 用户${userId}, 报告${reportId}, 哈希: ${currentContentHash}`);

    // 使用双语PDF服务生成PDF
    const pdfBytes = await bilingualPdfService.createBilingualAccidentReport(report, photos);

    // 确保用户PDF目录存在
    const userPdfPath = ensureUserPdfDirectory(userId);

    // 生成新的文件名（包含内容哈希）
    const filename = `accident-report-${reportId}-${currentContentHash}.pdf`;
    const filePath = path.join(userPdfPath, filename);

    // 保存PDF文件
    fs.writeFileSync(filePath, pdfBytes);

    // 更新报告的PDF信息
    const relativePath = `/uploads/pdfs/user_${userId}/${filename}`;
    await updateOne('accident_reports', {
      pdf_url: relativePath,
      pdf_content_hash: currentContentHash,
      pdf_updated_at: new Date()
    }, { id: reportId });

    // 清理旧的PDF文件（可选）
    try {
      const files = fs.readdirSync(userPdfPath);
      const oldPdfFiles = files.filter(file =>
        file.startsWith(`accident-report-${reportId}-`) &&
        file !== filename
      );

      oldPdfFiles.forEach(oldFile => {
        const oldFilePath = path.join(userPdfPath, oldFile);
        fs.unlinkSync(oldFilePath);
        if (process.env.NODE_ENV === 'development') {
          console.log(`删除旧PDF文件: ${oldFile}`);
        }
      });
    } catch (cleanupError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('清理旧PDF文件失败:', cleanupError);
      }
    }

    // 生成PDF URL（根据请求来源决定是否使用完整URL）
    let pdfUrl = relativePath;
    const host = req.get('host');
    const protocol = req.protocol;

    // 如果是外部访问（非localhost），使用完整URL，但确保使用后端端口
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const hostname = host.split(':')[0]; // 获取主机名，去掉端口
      const backendPort = process.env.PORT || '2607';
      pdfUrl = `${protocol}://${hostname}:${backendPort}${relativePath}`;
    }

    res.json({
      success: true,
      data: {
        pdfUrl: pdfUrl,
        filename: filename,
        isNew: true
      },
      message: '新PDF生成成功 / New PDF generated successfully'
    });

  } catch (error) {
    console.error('PDF生成失败:', error);

    // 详细的错误处理
    let errorMessage = 'PDF生成失败 / PDF generation failed';
    let statusCode = 500;

    if (error.message && error.message.includes('WinAnsi')) {
      errorMessage = '字体编码错误，请联系技术支持 / Font encoding error, please contact support';
    } else if (error.code === 'ENOENT') {
      errorMessage = '文件系统错误 / File system error';
    } else if (error.code === 'EACCES') {
      errorMessage = '文件权限错误 / File permission error';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      code: 'PDF_GENERATION_FAILED'
    });
  }
});

// 保留双语PDF路由作为备用
router.post('/:id/generate-bilingual-pdf', authenticateToken, async (req, res) => {
  // 重定向到主PDF生成路由
  req.url = req.url.replace('/generate-bilingual-pdf', '/generate-pdf');
  return router.handle(req, res);
});

// 测试路由已移除

// 重复的路由已移到文件开头

module.exports = router;
