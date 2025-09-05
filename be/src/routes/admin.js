const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeTransaction, findOne, findMany, insertOne, updateOne, deleteOne } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 所有管理员路由都需要管理员权限
router.use(authenticateToken, requireAdmin);

// 获取管理员统计数据
router.get('/stats', async (req, res) => {
  try {
    // 获取用户统计
    const userStats = await executeQuery(`
      SELECT
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as todayNewUsers
      FROM users
    `);

    // 获取题目统计
    const questionStats = await executeQuery(`
      SELECT
        COUNT(*) as totalQuestions,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as todayNewQuestions
      FROM questions
    `);

    // 获取分类统计
    const categoryStats = await executeQuery(`
      SELECT COUNT(*) as totalCategories
      FROM question_categories
    `);

    // 获取练习统计
    const practiceStats = await executeQuery(`
      SELECT
        COUNT(*) as totalPractices,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as todayPractices,
        AVG(score) as averageScore,
        COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices
      FROM user_practice_records
    `);

    // 获取最近7天用户注册趋势
    const userTrend = await executeQuery(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // 获取最近7天练习趋势
    const practiceTrend = await executeQuery(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        AVG(score) as averageScore
      FROM user_practice_records
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        users: userStats[0],
        questions: questionStats[0],
        categories: categoryStats[0],
        practices: practiceStats[0],
        accidents: {
          totalReports: 0,
          todayReports: 0
        },
        trends: {
          users: userTrend,
          practices: practiceTrend
        }
      }
    });

  } catch (error) {
    console.error('获取管理员统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});



// 用户管理
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    let whereClause = '1=1';
    const queryParams = [];

    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      queryParams.push(role);
    }

    // 获取用户总数
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 获取用户列表
    const users = await executeQuery(`
      SELECT
        id,
        username,
        email,
        role,
        is_active as isActive,
        language_preference as languagePreference,
        last_login_at as lastLoginAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 获取单个用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }

    // 获取用户基本信息
    const users = await executeQuery(`
      SELECT
        id,
        username,
        email,
        role,
        is_active as isActive,
        language_preference as languagePreference,
        last_login_at as lastLoginAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    // 获取用户练习统计
    const practiceStats = await executeQuery(`
      SELECT
        COUNT(*) as totalPractices,
        AVG(score) as averageScore,
        SUM(total_questions) as totalQuestions,
        SUM(correct_answers) as totalCorrectAnswers,
        MAX(score) as bestScore,
        MIN(score) as worstScore
      FROM user_practice_records
      WHERE user_id = ?
    `, [userId]);

    user.practiceStats = practiceStats[0];

    // 获取收藏题目数量
    const bookmarkCount = await executeQuery(`
      SELECT COUNT(*) as total
      FROM user_bookmarks
      WHERE user_id = ?
    `, [userId]);

    user.bookmarkCount = bookmarkCount[0].total;

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户详情失败'
    });
  }
});

// 更新用户信息
router.put('/users/:id', [
  body('email').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('role').optional().isIn(['user', 'admin']).withMessage('角色必须是user或admin'),
  body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值'),
  body('languagePreference').optional().isIn(['zh', 'en', 'th']).withMessage('语言设置无效')
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

    const userId = parseInt(req.params.id);
    const { email, role, isActive, languagePreference } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }

    // 检查用户是否存在
    const user = await findOne('users', { id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 构建更新数据
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (languagePreference !== undefined) updateData.language_preference = languagePreference;

    // 如果有邮箱更新，检查是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await findOne('users', { email });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被其他用户使用'
        });
      }
    }

    // 更新用户信息
    await updateOne('users', updateData, { id: userId });

    res.json({
      success: true,
      message: '用户信息更新成功'
    });

  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
});

// 删除用户
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: '无效的用户ID'
      });
    }

    // 检查是否是当前用户
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    // 检查用户是否存在
    const user = await findOne('users', { id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 删除用户（级联删除相关数据）
    await deleteOne('users', { id: userId });

    res.json({
      success: true,
      message: '用户删除成功'
    });

  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '删除用户失败'
    });
  }
});

// 题目管理 - 获取题目列表
router.get('/questions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const categoryId = req.query.categoryId || '';
    const questionType = req.query.questionType || '';
    const language = req.query.language || '';

    let whereClause = '1=1';
    const queryParams = [];

    if (search) {
      whereClause += ' AND q.question_text LIKE ?';
      queryParams.push(`%${search}%`);
    }

    if (categoryId) {
      whereClause += ' AND q.question_category_id = ?';
      queryParams.push(categoryId);
    }

    if (questionType) {
      whereClause += ' AND q.question_type = ?';
      queryParams.push(questionType);
    }

    if (language) {
      whereClause += ' AND q.language = ?';
      queryParams.push(language);
    }

    // 获取题目总数
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM questions q WHERE ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 获取题目列表
    const questions = await executeQuery(`
      SELECT
        q.id,
        q.question_text as questionText,
        q.question_type as questionType,
        q.explanation,
        q.image_url as imageUrl,
        q.language,
        q.created_at as createdAt,
        qc.name as categoryName,
        u.username as createdByUsername,
        (SELECT COUNT(*) FROM question_options WHERE question_id = q.id) as optionsCount
      FROM questions q
      JOIN question_categories qc ON q.question_category_id = qc.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取题目列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取题目列表失败'
    });
  }
});

// 创建题目
router.post('/questions', [
  body('questionText').notEmpty().withMessage('题目内容不能为空'),
  body('questionType').isIn(['single_choice', 'multiple_choice', 'true_false']).withMessage('题目类型无效'),
  body('categoryId').isInt().withMessage('分类ID必须是整数'),
  body('options').isArray({ min: 2 }).withMessage('选项至少需要2个'),
  body('explanation').optional().custom((value) => {
    if (value === null || value === undefined || typeof value === 'string') {
      return true;
    }
    throw new Error('解释必须是字符串或null');
  })
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
      questionText,
      questionType,
      categoryId,
      explanation,

      imageUrl,
      options
    } = req.body;

    // 检查分类是否存在
    const category = await findOne('question_categories', { id: categoryId });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 验证选项
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个正确答案'
      });
    }

    if (questionType === 'single_choice' && correctOptions.length > 1) {
      return res.status(400).json({
        success: false,
        message: '单选题只能有一个正确答案'
      });
    }

    // 创建题目
    const questionId = await insertOne('questions', {
      question_text: questionText,
      question_type: questionType,
      question_category_id: categoryId,
      explanation: explanation || null,
      language: language || 'en', // 默认英语
      image_url: imageUrl || null,
      created_by: req.user.id
    });

    // 创建选项
    const optionQueries = options.map((option, index) => ({
      sql: `INSERT INTO question_options
            (question_id, option_text, is_correct, option_order)
            VALUES (?, ?, ?, ?)`,
      params: [questionId, option.optionText, option.isCorrect, option.optionOrder || index + 1]
    }));

    await executeTransaction(optionQueries);

    res.status(201).json({
      success: true,
      data: { questionId },
      message: '题目创建成功'
    });

  } catch (error) {
    console.error('创建题目失败:', error);
    res.status(500).json({
      success: false,
      message: '创建题目失败'
    });
  }
});

// 获取单个题目详情
router.get('/questions/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    // 获取题目基本信息
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
        qc.name as categoryName,
        u.username as createdByUsername
      FROM questions q
      LEFT JOIN question_categories qc ON q.question_category_id = qc.id
      LEFT JOIN users u ON q.created_by = u.id
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

    // 格式化返回数据
    const questionData = {
      ...question,
      options: options.map(option => ({
        ...option,
        isCorrect: Boolean(option.isCorrect)
      }))
    };

    res.json({
      success: true,
      data: questionData,
      message: '获取题目详情成功'
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

// 更新题目
router.put('/questions/:id', [
  body('questionText').notEmpty().withMessage('题目内容不能为空'),
  body('questionType').isIn(['single_choice', 'multiple_choice', 'true_false']).withMessage('题目类型无效'),
  body('options').isArray({ min: 2 }).withMessage('选项至少需要2个')
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

    const questionId = parseInt(req.params.id);
    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    const {
      questionText,
      questionType,
      categoryId,
      explanation,
      language,
      imageUrl,
      options
    } = req.body;

    // 验证题目是否存在
    const existingQuestion = await findOne('questions', { id: questionId });
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 验证选项
    const correctOptions = options.filter(opt => opt.isCorrect);
    if (correctOptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '至少需要一个正确答案'
      });
    }

    if (questionType === 'single_choice' && correctOptions.length > 1) {
      return res.status(400).json({
        success: false,
        message: '单选题只能有一个正确答案'
      });
    }

    // 获取默认分类ID（如果没有提供categoryId）
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const defaultCategory = await findOne('question_categories', { name: 'categories.allQuestions' });
      finalCategoryId = defaultCategory ? defaultCategory.id : 5; // 使用正确的分类ID
    }

    // 构建更新查询
    const queries = [];

    // 更新题目基本信息
    queries.push({
      sql: `UPDATE questions
            SET question_text = ?, question_type = ?, explanation = ?,
                language = ?, image_url = ?, question_category_id = ?, updated_at = NOW()
            WHERE id = ?`,
      params: [questionText, questionType, explanation, language || 'en', imageUrl, finalCategoryId, questionId]
    });

    // 删除原有选项
    queries.push({
      sql: 'DELETE FROM question_options WHERE question_id = ?',
      params: [questionId]
    });

    // 执行更新和删除
    await executeTransaction(queries);

    // 插入新选项
    const optionQueries = options.map((option, index) => ({
      sql: `INSERT INTO question_options
            (question_id, option_text, is_correct, option_order)
            VALUES (?, ?, ?, ?)`,
      params: [questionId, option.optionText, option.isCorrect, option.optionOrder || index + 1]
    }));

    await executeTransaction(optionQueries);

    res.json({
      success: true,
      data: { questionId },
      message: '题目更新成功'
    });

  } catch (error) {
    console.error('更新题目失败:', error);
    res.status(500).json({
      success: false,
      message: '更新题目失败'
    });
  }
});

// 删除题目
router.delete('/questions/:id', async (req, res) => {
  try {
    const questionId = parseInt(req.params.id);

    if (isNaN(questionId)) {
      return res.status(400).json({
        success: false,
        message: '无效的题目ID'
      });
    }

    // 验证题目是否存在
    const existingQuestion = await findOne('questions', { id: questionId });
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: '题目不存在'
      });
    }

    // 删除题目（选项会因为外键约束自动删除）
    const queries = [
      {
        sql: 'DELETE FROM question_options WHERE question_id = ?',
        params: [questionId]
      },
      {
        sql: 'DELETE FROM questions WHERE id = ?',
        params: [questionId]
      }
    ];

    await executeTransaction(queries);

    res.json({
      success: true,
      data: { questionId },
      message: '题目删除成功'
    });

  } catch (error) {
    console.error('删除题目失败:', error);
    res.status(500).json({
      success: false,
      message: '删除题目失败'
    });
  }
});

// 批量导入题目
router.post('/questions/batch-import', [
  body('questions').isArray({ min: 1 }).withMessage('题目列表不能为空'),
  body('questions.*.questionText').notEmpty().withMessage('题目内容不能为空'),
  body('questions.*.questionType').isIn(['single_choice', 'multiple_choice', 'true_false']).withMessage('题目类型无效'),
  body('questions.*.categoryId').isInt().withMessage('分类ID必须是整数'),
  body('questions.*.options').isArray({ min: 2 }).withMessage('选项至少需要2个')
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

    const { questions } = req.body;
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // 逐个处理题目
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      try {
        const {
          questionText,
          questionType,
          categoryId,
          explanation,
          language,
          imageUrl,
          difficultyLevel,
          options
        } = question;

        // 检查分类是否存在
        const category = await findOne('question_categories', { id: categoryId });
        if (!category) {
          results.failed++;
          results.errors.push(`第${i + 1}题：分类ID ${categoryId} 不存在`);
          continue;
        }

        // 验证选项
        const correctOptions = options.filter(opt => opt.isCorrect);
        if (correctOptions.length === 0) {
          results.failed++;
          results.errors.push(`第${i + 1}题：至少需要一个正确答案`);
          continue;
        }

        if (questionType === 'single_choice' && correctOptions.length > 1) {
          results.failed++;
          results.errors.push(`第${i + 1}题：单选题只能有一个正确答案`);
          continue;
        }

        if (questionType === 'true_false' && options.length !== 2) {
          results.failed++;
          results.errors.push(`第${i + 1}题：判断题必须有且仅有2个选项`);
          continue;
        }

        // 创建题目
        const questionId = await insertOne('questions', {
          question_text: questionText,
          question_type: questionType,
          question_category_id: categoryId,
          explanation: explanation || null,
          language: language || 'en', // 默认英语
          image_url: imageUrl || null,
          difficulty_level: difficultyLevel || null,
          created_by: req.user.id
        });

        // 创建选项
        const optionQueries = options.map((option, index) => ({
          sql: `INSERT INTO question_options
                (question_id, option_text, is_correct, option_order)
                VALUES (?, ?, ?, ?)`,
          params: [questionId, option.optionText, option.isCorrect, option.optionOrder || index + 1]
        }));

        await executeTransaction(optionQueries);
        results.success++;

      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`处理第${i + 1}题失败:`, error);
        }
        results.failed++;
        results.errors.push(`第${i + 1}题：${error.message}`);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `批量导入完成：成功 ${results.success} 题，失败 ${results.failed} 题`
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('批量导入题目失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '批量导入题目失败'
    });
  }
});

module.exports = router;
