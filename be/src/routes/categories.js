const express = require('express');
const { findMany, executeQuery } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 获取所有题目分类
router.get('/', optionalAuth, async (req, res) => {
  try {
    // 获取所有题目分类（包括父分类和子分类）
    const categories = await executeQuery(`
      SELECT
        id,
        name,
        description,
        parent_category_id as parentCategoryId,
        unlock_threshold as unlockThreshold,
        sort_order as sortOrder,
        created_at as createdAt
      FROM question_categories
      ORDER BY parent_category_id ASC, sort_order ASC
    `);

    // 构建分类树结构
    const parentCategories = categories.filter(cat => cat.parentCategoryId === null);
    const childCategories = categories.filter(cat => cat.parentCategoryId !== null);

    const categoriesWithChildren = parentCategories.map(parent => ({
      ...parent,
      children: childCategories.filter(child => child.parentCategoryId === parent.id)
    }));

    // 如果用户已登录，获取每个分类的练习统计
    if (req.user) {
      for (const category of categoriesWithChildren) {
        // 获取父分类统计
        const parentStats = await executeQuery(`
          SELECT
            COUNT(*) as totalPractices,
            AVG(score) as averageScore,
            MAX(score) as bestScore,
            COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices
          FROM user_practice_records
          WHERE user_id = ? AND question_category_id = ?
        `, [req.user.id, category.id]);

        category.stats = parentStats[0];

        // 获取子分类统计
        for (const child of category.children) {
          const childStats = await executeQuery(`
            SELECT
              COUNT(*) as totalPractices,
              AVG(score) as averageScore,
              MAX(score) as bestScore,
              COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices
            FROM user_practice_records
            WHERE user_id = ? AND question_category_id = ?
          `, [req.user.id, child.id]);

          child.stats = childStats[0];
        }
      }
    }

    res.json({
      success: true,
      data: categoriesWithChildren
    });

  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    });
  }
});

// 获取单个分类详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    if (isNaN(categoryId)) {
      return res.status(400).json({
        success: false,
        message: '无效的分类ID'
      });
    }

    // 获取分类信息
    const categories = await executeQuery(`
      SELECT
        id,
        name,
        description,
        parent_category_id as parentCategoryId,
        unlock_threshold as unlockThreshold,
        sort_order as sortOrder,
        created_at as createdAt
      FROM question_categories
      WHERE id = ?
    `, [categoryId]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    const category = categories[0];

    // 获取题目总数
    const questionCount = await executeQuery(`
      SELECT COUNT(*) as total
      FROM questions
      WHERE question_category_id = ?
    `, [categoryId]);

    category.questionCount = questionCount[0].total;

    // 如果用户已登录，获取练习统计
    if (req.user) {
      const stats = await executeQuery(`
        SELECT
          COUNT(*) as totalPractices,
          AVG(score) as averageScore,
          MAX(score) as bestScore,
          COUNT(CASE WHEN is_passed = 1 THEN 1 END) as passedPractices,
          MAX(completed_at) as lastPracticeAt
        FROM user_practice_records
        WHERE user_id = ? AND question_category_id = ?
      `, [req.user.id, categoryId]);

      category.stats = stats[0];
    }

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('获取分类详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分类详情失败'
    });
  }
});

module.exports = router;
