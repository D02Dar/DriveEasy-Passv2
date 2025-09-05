const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const fontOptimizer = require('./fontOptimizer');

class BilingualPdfService {
  constructor() {
    this.fonts = {
      english: null,
      chinese: null,
      thai: null,
      fallback: null
    };
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // 定义字体配置：优先使用系统字体，体积小且兼容性好
      const fontConfigs = {
        // 通用字体配置 - 优先使用支持多语言的系统字体
        universal: [
          'C:/Windows/Fonts/tahoma.ttf',   // Tahoma支持中英泰多语言 (Windows) - 体积小
          'C:/Windows/Fonts/arial.ttf',    // Arial Unicode MS支持多语言
          'C:/Windows/Fonts/calibri.ttf',  // Calibri支持多语言
          'C:/Windows/Fonts/segoeui.ttf',  // Segoe UI支持多语言
          '/System/Library/Fonts/Helvetica.ttc', // Helvetica (macOS)
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
          path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf') // 备用
        ],
        // 中文字体配置 - 只使用TTF/OTF格式，避免TTC兼容性问题
        chinese: [
          'C:/Windows/Fonts/simhei.ttf',   // 黑体 (Windows) - TTF格式，兼容性最好
          path.join(__dirname, '../../assets/fonts/NotoSansCJK-Regular.otf'), // 备用字体
          '/System/Library/Fonts/STHeiti Light.ttc', // macOS黑体
          '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf' // Linux
        ],
        // 泰语字体配置 - 仅在通用字体不支持时使用
        thai: [
          'C:/Windows/Fonts/tahoma.ttf',   // Tahoma支持泰语 (Windows) - 体积小
          'C:/Windows/Fonts/arial.ttf',    // Arial Unicode MS也支持泰语
          'C:/Windows/Fonts/calibri.ttf',  // Calibri也支持泰语
          '/System/Library/Fonts/Thonburi.ttc', // 泰语字体 (macOS)
          '/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf', // Linux
          path.join(__dirname, '../../assets/fonts/NotoSansThai-Regular.ttf') // 备用
        ]
      };

      // 优先加载通用字体
      for (const fontPath of fontConfigs.universal) {
        console.log(`Checking universal font at:`, fontPath);
        if (fs.existsSync(fontPath)) {
          try {
            const fontBytes = fs.readFileSync(fontPath);
            this.fonts.english = fontBytes;
            this.fonts.thai = fontBytes; // 通用字体同时用于泰语
            this.fonts.fallback = fontBytes;
            console.log(`Universal font loaded successfully from:`, fontPath, 'size:', (fontBytes.length / 1024 / 1024).toFixed(2), 'MB');
            break;
          } catch (err) {
            console.warn(`Failed to load universal font from:`, fontPath, err.message);
          }
        }
      }

      // 如果需要，加载专用中文字体
      if (!this.fonts.chinese) {
        for (const fontPath of fontConfigs.chinese) {
          console.log(`Checking Chinese font at:`, fontPath);
          if (fs.existsSync(fontPath)) {
            try {
              const fontBytes = fs.readFileSync(fontPath);
              this.fonts.chinese = fontBytes;
              console.log(`Chinese font loaded successfully from:`, fontPath, 'size:', (fontBytes.length / 1024 / 1024).toFixed(2), 'MB');
              break;
            } catch (err) {
              console.warn(`Failed to load Chinese font from:`, fontPath, err.message);
            }
          }
        }
      }

      // 如果没有加载到中文字体，使用通用字体
      if (!this.fonts.chinese) {
        this.fonts.chinese = this.fonts.english;
      }

      // 检查加载结果
      const loadedFonts = Object.entries(this.fonts).filter(([key, value]) => value !== null);
      console.log('Loaded fonts:', loadedFonts.map(([key]) => key).join(', '));

      this.initialized = true;
    } catch (error) {
      console.error('Error initializing bilingual PDF service:', error);
      this.initialized = true; // 继续使用标准字体
    }
  }

  async createBilingualAccidentReport(reportData, photos = []) {
    // 初始化字体
    await this.initialize();

    // 创建PDF文档
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // 嵌入字体 - 根据字体策略智能选择
    const embeddedFonts = {
      english: null,
      chinese: null,
      thai: null,
      bold: null,
      universal: null // 通用字体，支持多语言
    };

    // 简单直接的字体嵌入策略
    console.log('Using simple font embedding strategy');

    // 嵌入Tahoma字体（支持英文和泰文）
    if (this.fonts.english) {
      try {
        embeddedFonts.english = await pdfDoc.embedFont(this.fonts.english);
        embeddedFonts.thai = embeddedFonts.english; // Tahoma支持泰文
        console.log('Tahoma font embedded for English and Thai');
      } catch (err) {
        console.warn('Failed to embed Tahoma font:', err.message);
        embeddedFonts.english = await pdfDoc.embedFont(StandardFonts.Helvetica);
        embeddedFonts.thai = embeddedFonts.english;
      }
    } else {
      embeddedFonts.english = await pdfDoc.embedFont(StandardFonts.Helvetica);
      embeddedFonts.thai = embeddedFonts.english;
    }

    // 嵌入中文字体（使用子集化）
    if (this.fonts.chinese && this.fonts.chinese !== this.fonts.english) {
      try {
        embeddedFonts.chinese = await pdfDoc.embedFont(this.fonts.chinese, { subset: true });
        console.log('Chinese font embedded with subsetting');
      } catch (err) {
        console.warn('Failed to embed Chinese font:', err.message);
        embeddedFonts.chinese = embeddedFonts.english;
      }
    } else {
      embeddedFonts.chinese = embeddedFonts.english;
    }

    // 设置通用字体
    embeddedFonts.universal = embeddedFonts.chinese;

    // 粗体字体
    embeddedFonts.bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 定义字体别名，保持向后兼容
    const englishFont = embeddedFonts.english;
    const multiLangFont = embeddedFonts.thai; // 泰文字体，确保泰文正确显示
    const boldFont = embeddedFonts.bold;

    // 添加第一页
    let page = pdfDoc.addPage([595, 842]); // A4 size
    let { width, height } = page.getSize();
    let yPosition = height - 50;
    let pageNumber = 1;

    // 标题 - 双语（垂直布局避免重叠）
    page.drawText('ACCIDENT REPORT', {
      x: 50,
      y: yPosition,
      size: 24,
      font: embeddedFonts.bold,
      color: rgb(0, 0, 0)
    });
    yPosition -= 30;

    page.drawText('รายงานอุบัติเหตุ', {
      x: 50,
      y: yPosition,
      size: 20,
      font: embeddedFonts.thai,
      color: rgb(0.3, 0.3, 0.3)
    });
    yPosition -= 40;

    // 报告ID和生成时间（垂直布局）
    page.drawText(`Report ID: ${reportData.id}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: englishFont,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 15;

    page.drawText(`รหัสรายงาน: ${reportData.id}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: multiLangFont,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 20;

    page.drawText(`Generated: ${new Date().toLocaleString('en-US')}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: englishFont,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 15;

    page.drawText(`สร้างเมื่อ: ${new Date().toLocaleString('th-TH')}`, {
      x: 50,
      y: yPosition,
      size: 9,
      font: multiLangFont,
      color: rgb(0.5, 0.5, 0.5)
    });
    yPosition -= 30;

    // 检查页面空间并创建新页面的函数
    const checkPageSpace = (requiredSpace) => {
      if (yPosition - requiredSpace < 120) { // 增加底部边距
        // 添加页脚
        this.addPageFooter(page, pageNumber, reportData.id, multiLangFont, englishFont);

        // 创建新页面
        page = pdfDoc.addPage([595, 842]);
        ({ width, height } = page.getSize());
        yPosition = height - 80; // 增加顶部边距
        pageNumber++;

        // 添加页眉
        this.addPageHeader(page, pageNumber, reportData.id, multiLangFont, boldFont);
        yPosition -= 50; // 页眉后留更多空间
      }
    };

    // 智能文本分段函数 - 将混合语言文本分段，每段使用合适的字体
    const segmentText = (text) => {
      if (!text) return [];

      const segments = [];
      let currentSegment = '';
      let currentType = null;

      for (const char of text) {
        const code = char.charCodeAt(0);
        let charType;

        // 判断字符类型
        if (code >= 0x4E00 && code <= 0x9FFF) {
          charType = 'chinese';
        } else if (code >= 0x0E00 && code <= 0x0E7F) {
          charType = 'thai';
        } else if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
          charType = 'japanese';
        } else if (code >= 0xAC00 && code <= 0xD7AF) {
          charType = 'korean';
        } else {
          charType = 'latin'; // 英文、数字、符号等
        }

        // 如果字符类型改变，保存当前段落并开始新段落
        if (currentType !== null && currentType !== charType && currentSegment.length > 0) {
          segments.push({
            text: currentSegment,
            type: currentType,
            font: getSegmentFont(currentType)
          });
          currentSegment = char;
          currentType = charType;
        } else {
          currentSegment += char;
          currentType = charType;
        }
      }

      // 添加最后一个段落
      if (currentSegment.length > 0) {
        segments.push({
          text: currentSegment,
          type: currentType,
          font: getSegmentFont(currentType)
        });
      }

      return segments;
    };

    // 根据段落类型选择字体
    const getSegmentFont = (type) => {
      switch (type) {
        case 'chinese':
        case 'japanese':
        case 'korean':
          return embeddedFonts.chinese;
        case 'thai':
          return embeddedFonts.thai;
        default:
          return embeddedFonts.english;
      }
    };

    // 绘制分段文本函数
    const drawSegmentedText = (segments, x, y, size, color) => {
      let currentX = x;

      for (const segment of segments) {
        page.drawText(segment.text, {
          x: currentX,
          y: y,
          size: size,
          font: segment.font,
          color: color
        });

        // 计算下一段的X位置
        const textWidth = segment.font.widthOfTextAtSize(segment.text, size);
        currentX += textWidth;
      }

      return currentX; // 返回最终X位置
    };

    // 保持向后兼容的简单字体选择函数
    const getAppropriateFont = (text) => {
      if (!text) return embeddedFonts.english;

      // 对于简单情况，仍使用原来的逻辑
      const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
      const thaiRegex = /[\u0e00-\u0e7f]/g;

      const chineseCount = (text.match(chineseRegex) || []).length;
      const thaiCount = (text.match(thaiRegex) || []).length;

      if (thaiCount > chineseCount) {
        return embeddedFonts.thai;
      } else if (chineseCount > 0) {
        return embeddedFonts.chinese;
      } else {
        return embeddedFonts.english;
      }
    };

    // 双语文本添加函数（智能字体选择，修复重叠问题）
    const addBilingualTextLine = (englishLabel, thaiLabel, value, yPos) => {
      checkPageSpace(50); // 增加所需空间

      const displayValue = value || 'Not provided';

      // 英文标签
      page.drawText(`${englishLabel}:`, {
        x: 70,
        y: yPosition,
        size: 12,
        font: englishFont,
        color: rgb(0, 0, 0)
      });

      // 值 - 使用分段文本绘制，支持混合语言
      const segments = segmentText(displayValue);
      if (segments.length > 1) {
        // 混合语言文本，使用分段绘制
        drawSegmentedText(segments, 250, yPosition, 12, rgb(0, 0, 0));
      } else {
        // 单一语言文本，使用简单绘制
        const valueFont = getAppropriateFont(displayValue);
        page.drawText(displayValue, {
          x: 250,
          y: yPosition,
          size: 12,
          font: valueFont,
          color: rgb(0, 0, 0)
        });
      }

      yPosition -= 18; // 移动到下一行

      // 泰文标签（在下一行显示）
      page.drawText(`${thaiLabel}`, {
        x: 70,
        y: yPosition,
        size: 10,
        font: multiLangFont,
        color: rgb(0.5, 0.5, 0.5)
      });

      yPosition -= 25; // 为下一个条目留出空间
      return yPosition;
    };

    // 格式化日期（只返回英文格式避免字体问题）
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-US');
    };

    // 状态翻译（返回英文）
    const getStatusText = (status) => {
      const statusMap = {
        'draft': 'Draft',
        'submitted': 'Submitted',
        'archived': 'Archived'
      };
      return statusMap[status] || status;
    };

    // 责任认定翻译（返回英文）
    const getResponsibilityText = (responsibility) => {
      const responsibilityMap = {
        'partyA_full': 'Party A Full Responsibility',
        'partyB_full': 'Party B Full Responsibility',
        'equal': 'Equal Responsibility',
        'partyA_main': 'Party A Main Responsibility',
        'partyB_main': 'Party B Main Responsibility',
        'no_responsibility': 'No Responsibility Determined'
      };
      return responsibilityMap[responsibility] || 'Not determined';
    };

    // 添加节标题函数（垂直布局避免重叠）
    const addSectionTitle = (title, titleThai) => {
      checkPageSpace(60);

      // 英文标题
      page.drawText(title, {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0)
      });

      yPosition -= 20;

      // 泰文标题（在下一行）
      page.drawText(titleThai, {
        x: 50,
        y: yPosition,
        size: 14,
        font: multiLangFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 25;
    };

    // 基本信息
    addSectionTitle('BASIC INFORMATION', 'ข้อมูลพื้นฐาน');

    // 添加基本信息
    addBilingualTextLine(
      'Accident Time', 'เวลาเกิดอุบัติเหตุ',
      formatDate(reportData.accidentTime)
    );

    addBilingualTextLine(
      'Report Status', 'สถานะรายงาน',
      getStatusText(reportData.status)
    );

    addBilingualTextLine(
      'Created Time', 'เวลาสร้างรายงาน',
      formatDate(reportData.createdAt)
    );

    // 地理位置信息
    if (reportData.latitude && reportData.longitude) {
      addBilingualTextLine(
        'Location Coordinates', 'พิกัดที่เกิดเหตุ',
        `${reportData.latitude}, ${reportData.longitude}`
      );
    }

    yPosition -= 20;

    // 当事人A信息
    if (reportData.partyAName || reportData.partyAPhone || reportData.partyAVehicleNumber) {
      addSectionTitle('PARTY A INFORMATION', 'ข้อมูลฝ่าย A');

      if (reportData.partyAName) {
        addBilingualTextLine('Name', 'ชื่อ', reportData.partyAName);
      }

      if (reportData.partyAPhone) {
        addBilingualTextLine('Phone', 'เบอร์โทรศัพท์', reportData.partyAPhone);
      }

      if (reportData.partyAIdCard) {
        addBilingualTextLine('ID Card', 'เลขบัตรประชาชน', reportData.partyAIdCard);
      }

      if (reportData.partyALicenseNumber) {
        addBilingualTextLine('License Number', 'เลขใบขับขี่', reportData.partyALicenseNumber);
      }

      if (reportData.partyAVehicleNumber) {
        addBilingualTextLine('Vehicle Number', 'ทะเบียนรถ', reportData.partyAVehicleNumber);
      }

      if (reportData.partyAInsuranceCompany) {
        addBilingualTextLine('Insurance Company', 'บริษัทประกัน', reportData.partyAInsuranceCompany);
      }

      yPosition -= 20;
    }

    // 当事人B信息
    if (reportData.partyBName || reportData.partyBPhone || reportData.partyBVehicleNumber) {
      addSectionTitle('PARTY B INFORMATION', 'ข้อมูลฝ่าย B');

      if (reportData.partyBName) {
        addBilingualTextLine('Name', 'ชื่อ', reportData.partyBName);
      }

      if (reportData.partyBPhone) {
        addBilingualTextLine('Phone', 'เบอร์โทรศัพท์', reportData.partyBPhone);
      }

      if (reportData.partyBIdCard) {
        addBilingualTextLine('ID Card', 'เลขบัตรประชาชน', reportData.partyBIdCard);
      }

      if (reportData.partyBLicenseNumber) {
        addBilingualTextLine('License Number', 'เลขใบขับขี่', reportData.partyBLicenseNumber);
      }

      if (reportData.partyBVehicleNumber) {
        addBilingualTextLine('Vehicle Number', 'ทะเบียนรถ', reportData.partyBVehicleNumber);
      }

      if (reportData.partyBInsuranceCompany) {
        addBilingualTextLine('Insurance Company', 'บริษัทประกัน', reportData.partyBInsuranceCompany);
      }

      yPosition -= 20;
    }

    // 责任认定
    if (reportData.responsibility) {
      addSectionTitle('RESPONSIBILITY DETERMINATION', 'การกำหนดความรับผิดชอบ');

      addBilingualTextLine(
        'Responsibility', 'ความรับผิดชอบ',
        getResponsibilityText(reportData.responsibility)
      );

      yPosition -= 20;
    }

    // 签名信息
    if (reportData.partyASignature || reportData.partyBSignature) {
      addSectionTitle('DIGITAL SIGNATURES', 'ลายเซ็นดิจิทัล');

      if (reportData.partyASignature) {
        addBilingualTextLine(
          'Party A Signature', 'ลายเซ็นฝ่าย A',
          'Digital signature provided / มีลายเซ็นดิจิทัล'
        );
      }

      if (reportData.partyBSignature) {
        addBilingualTextLine(
          'Party B Signature', 'ลายเซ็นฝ่าย B',
          'Digital signature provided / มีลายเซ็นดิจิทัล'
        );
      }

      if (reportData.agreementGeneratedAt) {
        addBilingualTextLine(
          'Agreement Generated', 'เวลาสร้างข้อตกลง',
          formatDate(reportData.agreementGeneratedAt)
        );
      }

      yPosition -= 20;
    }

    // 对方信息（如果有额外信息）
    if (reportData.otherPartyInfo) {
      addSectionTitle('ADDITIONAL INFORMATION', 'ข้อมูลเพิ่มเติม');

      checkPageSpace(60);
      // 对于长文本，先尝试分段绘制
      const segments = segmentText(reportData.otherPartyInfo);
      if (segments.length > 1) {
        // 混合语言，简单分行显示
        for (const segment of segments) {
          checkPageSpace(25);
          page.drawText(segment.text, {
            x: 70,
            y: yPosition,
            size: 12,
            font: segment.font,
            color: rgb(0, 0, 0)
          });
          yPosition -= 20;
        }
      } else {
        // 单一语言，使用原有换行逻辑
        const otherPartyFont = getAppropriateFont(reportData.otherPartyInfo);
        yPosition = this.drawWrappedText(page, reportData.otherPartyInfo, 70, yPosition, width - 120, otherPartyFont, 12);
      }
      yPosition -= 20;
    }

    // 照片信息和嵌入
    if (photos.length > 0) {
      addSectionTitle('SCENE PHOTOS', 'ภาพถ่ายที่เกิดเหตุ');

      const photoTypeMap = {
        'scene': 'Scene Photo',
        'front': 'Front View',
        'frontView': 'Front View',
        'side': 'Side View',
        'rear': 'Rear View',
        'rearView': 'Rear View',
        'detail': 'Detail',
        'damageDetail': 'Damage Detail',
        'scenePanorama': 'Scene Panorama',
        'driverLicense': 'Driver License',
        'vehicleLicense': 'Vehicle License',
        'other': 'Other'
      };

      // 限制显示的照片数量以避免PDF过大
      const maxPhotos = Math.min(photos.length, 6);

      for (let i = 0; i < maxPhotos; i++) {
        const photo = photos[i];
        checkPageSpace(200); // 为照片预留更多空间

        const photoInfo = `${i + 1}. ${photoTypeMap[photo.photoType] || 'Other'}${photo.caption ? ` - ${photo.caption}` : ''}`;
        const photoFont = getAppropriateFont(photoInfo);

        // 显示照片信息
        page.drawText(photoInfo, {
          x: 70,
          y: yPosition,
          size: 12,
          font: photoFont,
          color: rgb(0, 0, 0)
        });
        yPosition -= 25;

        // 尝试嵌入照片
        try {
          // 构建正确的照片路径
          // photo.imageUrl 格式: /uploads/accidents/filename.jpg
          let photoPath;

          console.log('Original photo imageUrl:', photo.imageUrl);

          if (photo.imageUrl.startsWith('/uploads/')) {
            // 相对路径，从backend目录开始（因为uploads在backend目录下）
            photoPath = path.join(__dirname, '../../', photo.imageUrl.substring(1)); // 去掉开头的 /
          } else if (photo.imageUrl.startsWith('http')) {
            // 完整URL，提取路径部分
            const url = new URL(photo.imageUrl);
            photoPath = path.join(__dirname, '../../', url.pathname.substring(1));
          } else if (photo.imageUrl.startsWith('uploads/')) {
            // 没有开头斜杠的相对路径
            photoPath = path.join(__dirname, '../../', photo.imageUrl);
          } else {
            // 其他格式，假设是文件名，直接拼接到uploads/accidents目录
            photoPath = path.join(__dirname, '../../uploads/accidents', photo.imageUrl);
          }

          // 规范化路径
          photoPath = path.resolve(photoPath);
          console.log('Resolved photo path:', photoPath);
          console.log('Photo file exists:', fs.existsSync(photoPath));

          if (fs.existsSync(photoPath)) {
            const imageBytes = fs.readFileSync(photoPath);
            let image;

            // 根据文件扩展名选择图片类型，如果没有扩展名则检测文件头
            const ext = path.extname(photo.imageUrl).toLowerCase();

            if (ext === '.jpg' || ext === '.jpeg') {
              image = await pdfDoc.embedJpg(imageBytes);
            } else if (ext === '.png') {
              image = await pdfDoc.embedPng(imageBytes);
            } else {
              // 没有扩展名或未知扩展名，通过文件头检测类型
              try {
                // 检测JPEG文件头 (FF D8)
                if (imageBytes[0] === 0xFF && imageBytes[1] === 0xD8) {
                  console.log('Detected JPEG file by header');
                  image = await pdfDoc.embedJpg(imageBytes);
                }
                // 检测PNG文件头 (89 50 4E 47)
                else if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50 &&
                         imageBytes[2] === 0x4E && imageBytes[3] === 0x47) {
                  console.log('Detected PNG file by header');
                  image = await pdfDoc.embedPng(imageBytes);
                }
                // 默认尝试JPEG
                else {
                  console.log('Unknown file type, trying JPEG');
                  image = await pdfDoc.embedJpg(imageBytes);
                }
              } catch (embedError) {
                console.error('Failed to embed image with detected type, trying PNG:', embedError);
                try {
                  image = await pdfDoc.embedPng(imageBytes);
                } catch (pngError) {
                  console.error('Failed to embed as PNG as well:', pngError);
                  image = null;
                }
              }
            }

            if (image) {
              // 计算图片尺寸（保持比例，最大宽度400px）
              const maxWidth = 400;
              const maxHeight = 150;
              const { width: imgWidth, height: imgHeight } = image.scale(1);

              let scaledWidth = maxWidth;
              let scaledHeight = (imgHeight * maxWidth) / imgWidth;

              if (scaledHeight > maxHeight) {
                scaledHeight = maxHeight;
                scaledWidth = (imgWidth * maxHeight) / imgHeight;
              }

              // 绘制图片
              page.drawImage(image, {
                x: 70,
                y: yPosition - scaledHeight,
                width: scaledWidth,
                height: scaledHeight,
              });

              yPosition -= scaledHeight + 20;
            } else {
              // 如果无法嵌入图片，显示占位符
              page.drawText('[Photo not available]', {
                x: 70,
                y: yPosition,
                size: 10,
                font: englishFont,
                color: rgb(0.5, 0.5, 0.5)
              });
              yPosition -= 20;
            }
          } else {
            // 文件不存在，显示占位符
            page.drawText('[Photo file not found]', {
              x: 70,
              y: yPosition,
              size: 10,
              font: englishFont,
              color: rgb(0.5, 0.5, 0.5)
            });
            yPosition -= 20;
          }
        } catch (error) {
          console.error('Error embedding photo:', error);
          // 显示错误占位符
          page.drawText('[Photo loading error]', {
            x: 70,
            y: yPosition,
            size: 10,
            font: englishFont,
            color: rgb(0.5, 0.5, 0.5)
          });
          yPosition -= 20;
        }

        yPosition -= 10; // 照片之间的间距
      }

      // 如果有更多照片未显示，添加说明
      if (photos.length > maxPhotos) {
        page.drawText(`... and ${photos.length - maxPhotos} more photos`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: englishFont,
          color: rgb(0.5, 0.5, 0.5)
        });
        yPosition -= 20;
      }
    }

    // 添加最后一页的页脚
    this.addPageFooter(page, pageNumber, reportData.id, multiLangFont, englishFont);

    // 设置PDF元数据（只使用英文避免编码问题）
    pdfDoc.setTitle(`Accident Report ${reportData.id}`);
    pdfDoc.setAuthor('DriveEasy Pass');
    pdfDoc.setSubject('Traffic Accident Report');
    pdfDoc.setKeywords(['accident', 'report', 'traffic', 'bilingual']);
    pdfDoc.setCreator('DriveEasy Pass - Enhanced Bilingual PDF Generator');
    pdfDoc.setCreationDate(new Date());

    return await pdfDoc.save();
  }

  // 添加页眉（垂直布局避免重叠）
  addPageHeader(page, pageNumber, reportId, multiLangFont, boldFont) {
    const { width } = page.getSize();

    // 英文标题
    page.drawText(`ACCIDENT REPORT ${reportId}`, {
      x: 50,
      y: 800,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // 页码（右上角）
    page.drawText(`Page ${pageNumber}`, {
      x: width - 100,
      y: 800,
      size: 12,
      font: boldFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    // 泰文标题（下一行）
    page.drawText(`รายงานอุบัติเหตุ ${reportId}`, {
      x: 50,
      y: 785,
      size: 12,
      font: multiLangFont,
      color: rgb(0.3, 0.3, 0.3)
    });

    // 泰文页码
    page.drawText(`หน้า ${pageNumber}`, {
      x: width - 80,
      y: 785,
      size: 10,
      font: multiLangFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    // 添加分隔线
    page.drawLine({
      start: { x: 50, y: 770 },
      end: { x: width - 50, y: 770 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
  }

  // 添加页脚（分开显示英文和泰文）
  addPageFooter(page, pageNumber, reportId, multiLangFont, englishFont) {
    const { width } = page.getSize();

    // 添加分隔线
    page.drawLine({
      start: { x: 50, y: 60 },
      end: { x: width - 50, y: 60 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });

    page.drawText('Generated by DriveEasy Pass', {
      x: 50,
      y: 45,
      size: 10,
      font: englishFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText('สร้างโดย DriveEasy Pass', {
      x: 50,
      y: 30,
      size: 10,
      font: multiLangFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(new Date().toLocaleDateString('en-US'), {
      x: width - 150,
      y: 45,
      size: 10,
      font: englishFont,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(new Date().toLocaleDateString('th-TH'), {
      x: width - 150,
      y: 30,
      size: 10,
      font: multiLangFont,
      color: rgb(0.5, 0.5, 0.5)
    });
  }



  // 保留原有的简单文本换行函数
  drawWrappedText(page, text, x, startY, maxWidth, font, fontSize) {
    const words = text.split('');
    let line = '';
    let yPosition = startY;

    for (const char of words) {
      const testLine = line + char;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > maxWidth && line.length > 0) {
        page.drawText(line, {
          x: x,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        });
        yPosition -= 20;
        line = char;
      } else {
        line = testLine;
      }
    }

    if (line.length > 0) {
      page.drawText(line, {
        x: x,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0)
      });
      yPosition -= 20;
    }

    return yPosition;
  }
}

module.exports = new BilingualPdfService();
