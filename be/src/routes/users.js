const express = require('express');
const { body, validationResult } = require('express-validator');
const { findOne, updateOne, executeQuery } = require('../config/database');
const { authenticateToken, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// 获取用户资料
router.get('/:userId', authenticateToken, requireOwnership('userId'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await findOne('users', 
      { id: userId }, 
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
router.put('/:userId', authenticateToken, requireOwnership('userId'), [
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('languagePreference')
    .optional()
    .isIn(['zh', 'en', 'th'])
    .withMessage('语言设置无效'),
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('头像URL格式无效')
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

    const userId = parseInt(req.params.userId);
    const { email, languagePreference, avatarUrl } = req.body;

    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (languagePreference !== undefined) updateData.language_preference = languagePreference;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    // 如果有邮箱更新，检查是否已被其他用户使用
    if (email) {
      const existingUser = await findOne('users', { email });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        });
      }
    }

    // 更新用户资料
    await updateOne('users', updateData, { id: userId });

    // 获取更新后的用户信息
    const updatedUser = await findOne('users', 
      { id: userId }, 
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

// 获取用户统计信息
router.get('/:userId/stats', authenticateToken, requireOwnership('userId'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // 获取练习统计
    const practiceStats = await executeQuery(`
      SELECT
        COUNT(*) as totalPractices,
        AVG(score) as averageScore,
        SUM(total_questions) as totalQuestions,
        SUM(correct_answers) as totalCorrectAnswers,
        MAX(score) as bestScore,
        COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices
      FROM user_practice_records
      WHERE user_id = ?
    `, [userId]);

    // 获取收藏题目数量
    const bookmarkCount = await executeQuery(`
      SELECT COUNT(*) as total
      FROM user_bookmarks
      WHERE user_id = ?
    `, [userId]);

    // 获取最近练习记录
    const recentPractices = await executeQuery(`
      SELECT
        upr.score,
        upr.total_questions as totalQuestions,
        upr.correct_answers as correctAnswers,
        upr.is_passed as isPassed,
        upr.completed_at as completedAt,
        qc.name as categoryName
      FROM user_practice_records upr
      LEFT JOIN question_categories qc ON upr.question_category_id = qc.id
      WHERE upr.user_id = ?
      ORDER BY upr.completed_at DESC
      LIMIT 5
    `, [userId]);

    // 获取各分类练习统计
    const categoryStats = await executeQuery(`
      SELECT
        qc.id as categoryId,
        qc.name as categoryName,
        COUNT(upr.id) as practiceCount,
        AVG(upr.score) as averageScore,
        MAX(upr.score) as bestScore,
        COUNT(CASE WHEN upr.is_passed = 1 THEN 1 END) as passedCount
      FROM question_categories qc
      LEFT JOIN user_practice_records upr ON qc.id = upr.question_category_id AND upr.user_id = ?
      WHERE qc.parent_category_id IS NULL
      GROUP BY qc.id, qc.name
      ORDER BY qc.sort_order
    `, [userId]);

    res.json({
      success: true,
      data: {
        practice: practiceStats[0],
        bookmarks: bookmarkCount[0].total,
        recentPractices,
        categories: categoryStats
      }
    });

  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户统计失败'
    });
  }
});

module.exports = router;
