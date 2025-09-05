const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction, findOne, insertOne } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 根据分类获取题目列表（简化版本，兼容前端API调用）
router.get('/getByCategory/:categoryId', optionalAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: '无效的分类ID'
      });
    }

    // 获取URL参数
    const limit = parseInt(req.query.limit) || 50;
    const language = req.query.language || 'en'; // 默认英语

    // 获取题目列表（包含选项）
    const questions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.language,
        q.created_at as createdAt
      FROM questions q
      WHERE q.question_category_id = ? AND q.language = ?
      ORDER BY RAND()
      LIMIT ${limit}
    `, [categoryId, language]);

    // 为每个题目获取选项
    for (const question of questions) {
      const options = await executeQuery(`
        SELECT
          id,
          option_text as optionText,
          is_correct as isCorrect,
          option_order as optionOrder
        FROM question_options
        WHERE question_id = ?
        ORDER BY option_order
      `, [question.id]);

      question.options = options;
    }

    res.json({
      success: true,
      data: {
        questions,
        language: language,
        availableCount: questions.length
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取题目失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '获取题目失败'
    });
  }
});

// 根据分类获取题目列表
router.get('/category/:categoryId', optionalAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.categoryId);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: '无效的分类ID'
      });
    }

    // 获取URL参数
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const language = req.query.language || 'en'; // 默认英语

    // 获取题目总数
    const countResult = await executeQuery(
      'SELECT COUNT(*) as total FROM questions WHERE question_category_id = ? AND language = ?',
      [categoryId, language]
    );
    const total = countResult[0].total;

    // 获取题目列表（包含选项）
    const questions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.language,
        q.created_at as createdAt
      FROM questions q
      WHERE q.question_category_id = ? AND q.language = ?
      ORDER BY q.id ASC
      LIMIT ${limit} OFFSET ${offset}
    `, [categoryId, language]);

    // 为每个题目获取选项
    for (const question of questions) {
      const options = await executeQuery(`
        SELECT 
          id,
          option_text as optionText,
          is_correct as isCorrect,
          option_order as optionOrder
        FROM question_options
        WHERE question_id = ?
        ORDER BY option_order
      `, [question.id]);

      question.options = options;

      // 如果用户已登录，检查是否收藏了该题目
      if (req.user) {
        const bookmark = await findOne('user_bookmarks', {
          user_id: req.user.id,
          question_id: question.id
        });
        question.isBookmarked = !!bookmark;
      }
    }

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        language: language,
        availableCount: total
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取题目失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '获取题目失败'
    });
  }
});

// 获取收藏的题目（必须在/:id路由之前）
router.get('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const language = req.query.language || 'en'; // 默认英语

    let whereClause = 'ub.user_id = ?';
    const queryParams = [req.user.id];

    // 添加语言筛选
    if (language) {
      whereClause += ' AND q.language = ?';
      queryParams.push(language);
    }

    // 获取收藏题目总数
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM user_bookmarks ub
      JOIN questions q ON ub.question_id = q.id
      WHERE ${whereClause}
    `, queryParams);
    const total = countResult[0].total;

    // 获取收藏的题目列表
    const bookmarkedQuestions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.language,
        qc.name as categoryName,
        ub.created_at as bookmarkedAt
      FROM user_bookmarks ub
      JOIN questions q ON ub.question_id = q.id
      LEFT JOIN question_categories qc ON q.question_category_id = qc.id
      WHERE ${whereClause}
      ORDER BY ub.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

    // 为每个题目获取选项
    for (const question of bookmarkedQuestions) {
      const options = await executeQuery(`
        SELECT
          id,
          option_text as optionText,
          is_correct as isCorrect,
          option_order as optionOrder
        FROM question_options
        WHERE question_id = ?
        ORDER BY option_order
      `, [question.id]);

      question.options = options;
      question.isBookmarked = true;
    }

    res.json({
      success: true,
      data: {
        questions: bookmarkedQuestions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取收藏题目失败:', error);
    res.status(500).json({
      success: false,
      message: '获取收藏题目失败'
    });
  }
});

// 获取单个题目详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    // 获取题目信息
    const questions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.language,
        q.question_category_id as categoryId,
        q.created_at as createdAt,
        qc.name as categoryName
      FROM questions q
      LEFT JOIN question_categories qc ON q.question_category_id = qc.id
      WHERE q.id = ?
    `, [questionId]);

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    const question = questions[0];

    // 获取题目选项
    const options = await executeQuery(`
      SELECT 
        id,
        option_text as optionText,
        is_correct as isCorrect,
        option_order as optionOrder
      FROM question_options
      WHERE question_id = ?
      ORDER BY option_order
    `, [questionId]);

    question.options = options;

    // 如果用户已登录，检查是否收藏了该题目
    if (req.user) {
      const bookmark = await findOne('user_bookmarks', {
        user_id: req.user.id,
        question_id: questionId
      });
      question.isBookmarked = !!bookmark;
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取题目详情失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '获取题目详情失败'
    });
  }
});

// 提交答案
router.post('/submit', authenticateToken, [
  body('questionId').isInt().withMessage('题目ID必须是整数'),
  body('selectedOptionId').isInt().withMessage('选项ID必须是整数'),
  body('categoryId').isInt().withMessage('分类ID必须是整数')
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

    const { questionId, selectedOptionId, categoryId } = req.body;

    // 获取题目信息
    const question = await findOne('questions', { id: questionId });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 获取选中的选项
    const selectedOption = await findOne('question_options', { id: selectedOptionId });
    if (!selectedOption) {
      return res.status(404).json({
        success: false,
        message: '选项不存在'
      });
    }

    // 获取正确答案
    const correctOption = await findOne('question_options', {
      question_id: questionId,
      is_correct: true
    });

    const isCorrect = selectedOption.is_correct;

    // 检查是否已有练习记录，如果没有则创建
    let practiceRecord = await executeQuery(`
      SELECT id FROM user_practice_records 
      WHERE user_id = ? AND question_category_id = ? 
      AND DATE(created_at) = CURDATE()
      ORDER BY created_at DESC 
      LIMIT 1
    `, [req.user.id, categoryId]);

    let practiceRecordId;
    if (practiceRecord.length === 0) {
      // 创建新的练习记录
      practiceRecordId = await insertOne('user_practice_records', {
        user_id: req.user.id,
        question_category_id: categoryId,
        score: 0,
        total_questions: 0,
        correct_answers: 0,
        completed_at: new Date(),
        is_passed: false
      });
    } else {
      practiceRecordId = practiceRecord[0].id;
    }

    // 记录答题详情
    await insertOne('user_answer_details', {
      user_practice_record_id: practiceRecordId,
      question_id: questionId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect
    });

    // 更新练习记录统计
    await executeQuery(`
      UPDATE user_practice_records 
      SET 
        total_questions = total_questions + 1,
        correct_answers = correct_answers + ?,
        score = (correct_answers * 100.0 / total_questions),
        is_passed = (score >= (SELECT unlock_threshold FROM question_categories WHERE id = ?))
      WHERE id = ?
    `, [isCorrect ? 1 : 0, categoryId, practiceRecordId]);

    res.json({
      success: true,
      data: {
        isCorrect,
        correctOption: {
          id: correctOption.id,
          optionText: correctOption.option_text,
          optionOrder: correctOption.option_order
        },
        explanation: question.explanation
      }
    });

  } catch (error) {
    console.error('提交答案失败:', error);
    res.status(500).json({
      success: false,
      message: '提交答案失败'
    });
  }
});

// 收藏题目
router.post('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    // 检查题目是否存在
    const question = await findOne('questions', { id: questionId });
    if (!question) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 检查是否已收藏
    const existingBookmark = await findOne('user_bookmarks', {
      user_id: req.user.id,
      question_id: questionId
    });

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: '题目已收藏'
      });
    }

    // 添加收藏
    await insertOne('user_bookmarks', {
      user_id: req.user.id,
      question_id: questionId
    });

    res.json({
      success: true,
      message: '收藏成功'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('收藏题目失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '收藏题目失败'
    });
  }
});

// 取消收藏题目
router.delete('/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    // 删除收藏
    const result = await executeQuery(`
      DELETE FROM user_bookmarks 
      WHERE user_id = ? AND question_id = ?
    `, [req.user.id, questionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '收藏记录不存在'
      });
    }

    res.json({
      success: true,
      message: '取消收藏成功'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('取消收藏失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '取消收藏失败'
    });
  }
});

module.exports = router;
