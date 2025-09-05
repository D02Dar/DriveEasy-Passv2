const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { findOne, insertOne, updateOne } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 生成JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// 用户注册
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符')
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

    const { username, email, password } = req.body;

    // 检查用户名是否已存在
    const existingUser = await findOne('users', { username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await findOne('users', { email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被注册'
        });
      }
    }

    // 加密密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const userId = await insertOne('users', {
      username,
      email: email || null,
      password_hash: passwordHash,
      role: 'user',
      is_active: true
    });

    // 获取创建的用户信息
    const newUser = await findOne('users', { id: userId }, 'id, username, email, role, avatar_url, language_preference, created_at');

    // 生成Token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: newUser
      }
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

// 用户登录
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('请输入用户名'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码')
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

    const { username, password } = req.body;

    // 查找用户
    const user = await findOne('users', { username });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 检查账户状态
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 更新最后登录时间
    await updateOne('users', 
      { last_login_at: new Date() }, 
      { id: user.id }
    );

    // 生成Token
    const token = generateToken(user);

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: userInfo
      }
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

// 获取用户资料
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await findOne('users', 
      { id: req.user.id }, 
      'id, username, email, role, avatar_url, language_preference, last_login_at, created_at'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('获取用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户资料失败'
    });
  }
});

// 更新用户资料
router.put('/profile', authenticateToken, [
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('language_preference')
    .optional()
    .isIn(['zh', 'en', 'th'])
    .withMessage('语言设置无效')
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

    const { email, language_preference, avatar_url } = req.body;
    const updateData = {};

    if (email !== undefined) updateData.email = email;
    if (language_preference !== undefined) updateData.language_preference = language_preference;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    // 如果有邮箱更新，检查是否已被其他用户使用
    if (email) {
      const existingUser = await findOne('users', { email });
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        });
      }
    }

    // 更新用户资料
    await updateOne('users', updateData, { id: req.user.id });

    // 获取更新后的用户信息
    const updatedUser = await findOne('users', 
      { id: req.user.id }, 
      'id, username, email, role, avatar_url, language_preference, last_login_at, created_at'
    );

    res.json({
      success: true,
      message: '资料更新成功',
      data: updatedUser
    });

  } catch (error) {
    console.error('更新用户资料失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户资料失败'
    });
  }
});

// 修改密码
router.put('/password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('请输入当前密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码长度至少6个字符')
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

    const { currentPassword, newPassword } = req.body;

    // 获取用户当前密码
    const user = await findOne('users', { id: req.user.id }, 'password_hash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 加密新密码
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await updateOne('users', 
      { password_hash: newPasswordHash }, 
      { id: req.user.id }
    );

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

// 登出
router.post('/logout', authenticateToken, (req, res) => {
  // 在实际应用中，可以将token加入黑名单
  // 这里简单返回成功响应
  res.json({
    success: true,
    message: '登出成功'
  });
});

module.exports = router;
