const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

// 安全中间件 - 配置允许跨域资源访问
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // 允许跨域资源访问
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http:", "https:"], // 允许图片跨域
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(compression());

// 允许的域名列表
const allowedOrigins = [
  // 本地开发环境
  'http://localhost:2606',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:2606',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  // DDNS域名 - 前端
  'http://590702.xyz',
  'https://590702.xyz',
  'http://590702.xyz:2606',
  'https://590702.xyz:2606',
  // DDNS域名 - 后端
  'http://590702.xyz:2607',
  'https://590702.xyz:2607',
  // 其他可能的端口
  'http://590702.xyz:80',
  'https://590702.xyz:443'
];

// CORS配置
app.use(cors({
  origin: function(origin, callback) {
    // 允许没有来源的请求（比如移动端应用）
    if (!origin) return callback(null, true);

    // 开发环境下更宽松的CORS策略
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // 检查是否在允许的源列表中
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // 检查是否是localhost的不同端口（开发环境）
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('590702.xyz'))) {
        return callback(null, true);
      }

      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  optionsSuccessStatus: 200, // 一些旧版浏览器（IE11, 各种SmartTVs）在204上有问题
  preflightContinue: false
}));

// 请求日志
app.use(morgan('combined'));

// 请求体解析 - 跳过 multipart/form-data 请求
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

app.use(cookieParser());

// 安全的静态文件服务 - 用户只能访问自己的PDF文件
const jwt = require('jsonwebtoken');

app.use('/uploads/pdfs/user_:userId', (req, res, next) => {
  const requestedUserId = req.params.userId;

  // 添加CORS头，允许跨域访问PDF文件
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 尝试从Authorization header获取token
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 如果没有Authorization header，尝试从cookie获取token
  if (!token && req.cookies) {
    // 从cookie中获取token（与前端存储的键名一致）
    token = req.cookies['driving_exam_token'];
  }

  if (!token) {
    return res.status(401).json({ error: '需要认证 / Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 检查用户是否有权限访问该文件夹
    if (decoded.id.toString() !== requestedUserId) {
      return res.status(403).json({ error: '无权限访问 / Access denied' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: '无效的认证令牌 / Invalid token' });
  }
});

// 专门处理PDF文件的预览和下载（必须在通用uploads路由之前）
app.get('/uploads/pdfs/user_:userId/:filename', (req, res, next) => {
  const requestedUserId = req.params.userId;
  const filename = req.params.filename;
  const isDownload = req.query.download === 'true';

  // 添加CORS头
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');

  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 认证检查（与之前的逻辑相同）
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token && req.cookies) {
    token = req.cookies['driving_exam_token'];
  }

  if (!token) {
    return res.status(401).json({ error: '需要认证 / Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id.toString() !== requestedUserId) {
      return res.status(403).json({ error: '无权限访问 / Access denied' });
    }

    // 设置PDF响应头
    res.setHeader('Content-Type', 'application/pdf');

    if (isDownload) {
      // 下载模式：设置Content-Disposition为attachment
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      // 预览模式：设置Content-Disposition为inline
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    // 发送文件
    const filePath = path.join(__dirname, 'uploads', 'pdfs', `user_${requestedUserId}`, filename);
    res.sendFile(filePath);
  } catch (error) {
    return res.status(401).json({ error: '无效的认证令牌 / Invalid token' });
  }
});

// 自定义静态文件中间件，处理没有扩展名的图片文件
app.use('/uploads', (req, res, next) => {
  // 添加CORS头，允许跨域访问图片
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  const filePath = path.join(__dirname, 'uploads', req.path);

  // 检查是否是没有扩展名的事故图片文件
  if (req.path.startsWith('/accidents/') && !path.extname(req.path)) {
    // 检查文件是否存在（没有扩展名）
    if (fs.existsSync(filePath)) {
      // 文件存在但没有扩展名，需要检测文件类型
      try {
        const fileBuffer = fs.readFileSync(filePath);
        let mimeType = 'image/jpeg'; // 默认

        // 简单的文件类型检测
        if (fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4E && fileBuffer[3] === 0x47) {
          mimeType = 'image/png';
        } else if (fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8) {
          mimeType = 'image/jpeg';
        } else if (fileBuffer[0] === 0x52 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46 && fileBuffer[3] === 0x46) {
          mimeType = 'image/webp';
        }

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天缓存
        return res.sendFile(filePath);
      } catch (error) {
        console.error('读取图片文件失败:', error);
      }
    }

    // 尝试找到带扩展名的对应文件
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const ext of possibleExtensions) {
      const fileWithExt = filePath + ext;
      if (fs.existsSync(fileWithExt)) {
        const mimeType = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp'
        }[ext] || 'image/jpeg';

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1天缓存
        return res.sendFile(fileWithExt);
      }
    }
  }

  // 继续到express.static
  next();
}, express.static('uploads'));

// 路由配置
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/questions', require('./src/routes/questions'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/practice', require('./src/routes/practice'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/accidents', require('./src/routes/accidents'));
app.use('/api/schools', require('./src/routes/schools'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/verification', require('./src/routes/verification'));
app.use('/api/geolocation', require('./src/routes/geolocation'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }
  
  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: '数据已存在'
    });
  }
  
  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: '无效的认证令牌'
    });
  }
  
  // 验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  // 默认错误
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📱 允许的域名: ${allowedOrigins.join(', ')}`);
    console.log(`🔗 API地址: http://localhost:${PORT}/api`);
    console.log(`💾 环境: ${process.env.NODE_ENV || 'development'}`);
  }
});

module.exports = app;
