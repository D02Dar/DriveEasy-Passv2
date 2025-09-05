const express = require('express');
const { body, validationResult } = require('express-validator');
const verificationCodeService = require('../services/verificationCodeService');
const emailService = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 发送验证码
 * POST /api/verification/send-code
 */
router.post('/send-code', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('purpose')
    .isIn(['register', 'reset-password', 'change-email'])
    .withMessage('无效的验证码用途')
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

    const { email, purpose } = req.body;

    // 如果是修改邮箱，需要验证用户身份
    if (purpose === 'change-email') {
      // 这里需要验证用户是否已登录
      // 可以通过JWT token验证
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: '需要登录才能修改邮箱'
        });
      }
    }

    // 创建并发送验证码
    const result = await verificationCodeService.createAndSendCode(email, purpose);
    
    if (!result.success) {
      return res.status(429).json(result);
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        email,
        purpose,
        messageId: result.messageId
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('发送验证码失败:', error);
    }

    // 如果是邮箱限制错误，返回特定的错误信息
    if (error.message.includes('邮件发送受限')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '发送验证码失败，请稍后重试'
    });
  }
});

/**
 * 验证验证码
 * POST /api/verification/verify-code
 */
router.post('/verify-code', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('purpose')
    .isIn(['register', 'reset-password', 'change-email'])
    .withMessage('无效的验证码用途'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('验证码必须是6位数字')
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

    const { email, purpose, code } = req.body;

    // 验证验证码
    const result = verificationCodeService.verifyCode(email, purpose, code);
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
        reason: result.reason,
        remainingAttempts: result.remainingAttempts
      });
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        email,
        purpose,
        verified: true
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('验证验证码失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '验证失败，请稍后重试'
    });
  }
});



/**
 * 发送自定义通知邮件
 * POST /api/verification/send-notification
 * 需要管理员权限
 */
router.post('/send-notification', [
  authenticateToken,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('标题长度必须在1-100字符之间'),
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('内容长度必须在1-1000字符之间'),
  body('type')
    .optional()
    .isIn(['general', 'system', 'promotion', 'warning'])
    .withMessage('无效的通知类型')
], async (req, res) => {
  try {
    // 验证管理员权限
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
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

    const { email, title, content, type = 'general' } = req.body;

    // 发送通知邮件
    const result = await emailService.sendNotificationEmail(email, title, content, type);
    
    res.json({
      success: true,
      message: '通知邮件发送成功',
      data: {
        email,
        title,
        type,
        messageId: result.messageId
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('发送通知邮件失败:', error);
    }

    // 如果是邮箱限制错误，返回特定的错误信息
    if (error.message.includes('邮件发送受限')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '发送通知邮件失败，请稍后重试'
    });
  }
});

module.exports = router;
