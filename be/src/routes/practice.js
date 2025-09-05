const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, insertOne, updateOne, findOne } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取用户练习记录
router.get('/records', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 获取练习记录总数
    const totalResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM user_practice_records
      WHERE user_id = ?
    `, [req.user.id]);
    
    const total = totalResult[0].total;

    // 获取练习记录列表
    const practiceRecords = await executeQuery(`
      SELECT
        upr.id,
        upr.score,
        upr.total_questions as totalQuestions,
        upr.correct_answers as correctAnswers,
        upr.is_passed as isPassed,
        upr.practice_duration as practiceDuration,
        upr.completed_at as completedAt,
        upr.created_at as createdAt,
        upr.question_category_id as categoryId,
        qc.name as categoryName
      FROM user_practice_records upr
      LEFT JOIN question_categories qc ON upr.question_category_id = qc.id
      WHERE upr.user_id = ?
      ORDER BY upr.completed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        records: practiceRecords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取练习记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习记录失败'
    });
  }
});

// 获取练习统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 获取总体统计
    const statsResult = await executeQuery(`
      SELECT
        COUNT(*) as totalPractices,
        AVG(score) as averageScore,
        SUM(total_questions) as totalQuestions,
        SUM(correct_answers) as totalCorrectAnswers,
        MAX(score) as bestScore,
        COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices
      FROM user_practice_records
      WHERE user_id = ?
    `, [req.user.id]);

    const stats = statsResult[0];

    // 获取最近7天的练习趋势
    const trendResult = await executeQuery(`
      SELECT
        DATE(completed_at) as practiceDate,
        COUNT(*) as practiceCount,
        AVG(score) as averageScore
      FROM user_practice_records
      WHERE user_id = ? 
        AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(completed_at)
      ORDER BY practiceDate DESC
    `, [req.user.id]);

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
    `, [req.user.id]);

    // 获取收藏题目数量
    const bookmarkCount = await executeQuery(`
      SELECT COUNT(*) as total
      FROM user_bookmarks
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        overall: {
          ...stats,
          bookmarkedQuestions: bookmarkCount[0].total
        },
        trend: trendResult,
        categories: categoryStats
      }
    });

  } catch (error) {
    console.error('获取练习统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习统计失败'
    });
  }
});

// 创建练习会话
router.post('/sessions', authenticateToken, [
  body('categoryId').isInt().withMessage('分类ID必须是整数'),
  body('questionCount').optional().isInt({ min: 1, max: 100 }).withMessage('题目数量必须在1-100之间')
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

    const { categoryId, questionCount = 20 } = req.body;

    // 检查分类是否存在
    const category = await findOne('question_categories', { id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 获取该分类下的题目
    const questions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.created_at as createdAt
      FROM questions q
      WHERE q.question_category_id = ?
      ORDER BY RAND()
      LIMIT ${questionCount}
    `, [categoryId]);

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '该分类下没有题目'
      });
    }

    const questionIds = questions.map(q => q.id);

    // 创建练习记录，保存题目ID顺序
    const practiceRecordId = await insertOne('user_practice_records', {
      user_id: req.user.id,
      question_category_id: categoryId,
      score: 0,
      total_questions: questions.length,
      correct_answers: 0,
      completed_at: new Date(),
      is_passed: false,
      practice_duration: 0,
      question_ids: JSON.stringify(questionIds)
    });

    res.json({
      success: true,
      data: {
        sessionId: practiceRecordId,
        categoryId,
        categoryName: category.name,
        questionIds,
        totalQuestions: questions.length
      }
    });

  } catch (error) {
    console.error('创建练习会话失败:', error);
    res.status(500).json({
      success: false,
      message: '创建练习会话失败'
    });
  }
});

// 更新练习会话
router.put('/sessions/:sessionId', authenticateToken, [
  body('score').optional().isFloat({ min: 0, max: 100 }).withMessage('分数必须在0-100之间'),
  body('correctAnswers').optional().isInt({ min: 0 }).withMessage('正确答案数必须是非负整数'),
  body('duration').optional().isInt({ min: 0 }).withMessage('练习时长必须是非负整数'),
  body('isCompleted').optional().isBoolean().withMessage('完成状态必须是布尔值')
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

    const sessionId = parseInt(req.params.sessionId);
    const { score, correctAnswers, duration, isCompleted } = req.body;

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的会话ID'
      });
    }

    // 检查练习记录是否存在且属于当前用户
    const practiceRecord = await findOne('user_practice_records', {
      id: sessionId,
      user_id: req.user.id
    });

    if (!practiceRecord) {
      return res.status(404).json({
        success: false,
        message: '练习记录不存在'
      });
    }

    // 构建更新数据
    const updateData = {};
    if (score !== undefined) updateData.score = score;
    if (correctAnswers !== undefined) updateData.correct_answers = correctAnswers;
    if (duration !== undefined) updateData.practice_duration = duration;
    if (isCompleted !== undefined && isCompleted) {
      updateData.completed_at = new Date();
      
      // 计算是否通过
      const category = await findOne('question_categories', { id: practiceRecord.question_category_id });
      if (category && score >= category.unlock_threshold) {
        updateData.is_passed = true;
      }
    }

    // 更新练习记录
    await updateOne('user_practice_records', updateData, { id: sessionId });

    // 获取更新后的记录
    const updatedRecord = await findOne('user_practice_records', { id: sessionId });

    res.json({
      success: true,
      data: updatedRecord,
      message: '练习会话更新成功'
    });

  } catch (error) {
    console.error('更新练习会话失败:', error);
    res.status(500).json({
      success: false,
      message: '更新练习会话失败'
    });
  }
});

// 获取练习会话详情
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);

    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的会话ID'
      });
    }

    // 获取练习记录
    const practiceRecord = await executeQuery(`
      SELECT
        upr.id,
        upr.score,
        upr.total_questions as totalQuestions,
        upr.correct_answers as correctAnswers,
        upr.is_passed as isPassed,
        upr.practice_duration as practiceDuration,
        upr.completed_at as completedAt,
        upr.created_at as createdAt,
        upr.question_category_id as categoryId,
        qc.name as categoryName
      FROM user_practice_records upr
      LEFT JOIN question_categories qc ON upr.question_category_id = qc.id
      WHERE upr.id = ? AND upr.user_id = ?
    `, [sessionId, req.user.id]);

    if (practiceRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: '练习记录不存在'
      });
    }

    const record = practiceRecord[0];

    // 获取答题详情
    const answerDetails = await executeQuery(`
      SELECT
        uad.id,
        uad.question_id as questionId,
        uad.selected_option_id as selectedOptionId,
        uad.is_correct as isCorrect,
        uad.created_at as answeredAt,
        q.question_text as questionText,
        q.explanation
      FROM user_answer_details uad
      LEFT JOIN questions q ON uad.question_id = q.id
      WHERE uad.user_practice_record_id = ?
      ORDER BY uad.created_at
    `, [sessionId]);

    record.answerDetails = answerDetails;

    res.json({
      success: true,
      data: record
    });

  } catch (error) {
    console.error('获取练习会话详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取练习会话详情失败'
    });
  }
});

// 获取练习会话题目详情
router.get('/sessions/:sessionId/questions', authenticateToken, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    if (isNaN(sessionId)) {
      return res.status(400).json({ success: false, message: '无效的会话ID' });
    }

    // 获取练习记录，包含题目ID顺序
    const record = await findOne('user_practice_records', { id: sessionId, user_id: req.user.id });
    if (!record) {
      return res.status(404).json({ success: false, message: '练习记录不存在' });
    }

    let questionIds = [];
    try {
      questionIds = JSON.parse(record.question_ids);
    } catch (e) {
      return res.status(500).json({ success: false, message: '题目ID解析失败' });
    }

    const questions = [];
    for (const qid of questionIds) {
      const question = await executeQuery(
        'SELECT id, question_text as questionText, explanation, image_url as imageUrl, language FROM questions WHERE id = ?',
        [qid]
      );
      if (question.length > 0) {
        const options = await executeQuery(
          'SELECT id, option_text as optionText, is_correct as isCorrect, option_order as optionOrder FROM question_options WHERE question_id = ? ORDER BY option_order',
          [qid]
        );
        question[0].options = options;
        questions.push(question[0]);
      }
    }

    // 获取题目的语言信息（从第一个题目中获取）
    const language = questions.length > 0 ? questions[0].language : 'en';

    res.json({
      success: true,
      data: {
        questions,
        language: language,
        availableCount: questions.length
      }
    });
  } catch (error) {
    console.error('获取会话题目失败:', error);
    res.status(500).json({ success: false, message: '获取会话题目失败' });
  }
});

module.exports = router;
