const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, insertOne, updateOne, findOne } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 获取用户通知列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const isRead = req.query.isRead;

    let whereClause = `(n.target_type = 'all' OR (n.target_type = 'user' AND n.target_user_id = ?))
                      AND n.publish_at <= NOW()`;
    let queryParams = [req.user.id];



    // 如果指定了已读状态
    if (isRead !== undefined) {
      whereClause += ' AND COALESCE(uns.is_read, 0) = ?';
      queryParams.push(isRead === 'true' ? 1 : 0);
    }

    // 获取通知总数
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM notifications n
      LEFT JOIN user_notification_status uns ON n.id = uns.notification_id AND uns.user_id = ?
      WHERE ${whereClause}
    `, [req.user.id, ...queryParams]);
    
    const total = countResult[0].total;

    // 获取通知列表
    const notifications = await executeQuery(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.target_type as targetType,
        n.publish_at as publishAt,
        n.created_at as createdAt,
        COALESCE(uns.is_read, 0) as isRead,
        uns.read_at as readAt,
        u.username as sentByUsername
      FROM notifications n
      LEFT JOIN user_notification_status uns ON n.id = uns.notification_id AND uns.user_id = ?
      LEFT JOIN users u ON n.sent_by = u.id
      WHERE ${whereClause}
      ORDER BY n.publish_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [req.user.id, ...queryParams]);



    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取通知列表失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '获取通知列表失败'
    });
  }
});

// 获取未读通知数量
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await executeQuery(`
      SELECT COUNT(*) as count
      FROM notifications n
      LEFT JOIN user_notification_status uns ON n.id = uns.notification_id AND uns.user_id = ?
      WHERE (n.target_type = 'all' OR (n.target_type = 'user' AND n.target_user_id = ?))
        AND n.publish_at <= NOW()
        AND COALESCE(uns.is_read, 0) = 0
    `, [req.user.id, req.user.id]);

    res.json({
      success: true,
      data: {
        unreadCount: unreadCount[0].count
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('获取未读通知数量失败:', error);
    }
    res.status(500).json({
      success: false,
      message: '获取未读通知数量失败'
    });
  }
});

// 标记通知为已读
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }

    // 检查通知是否存在且用户有权限查看
    const notification = await executeQuery(`
      SELECT id
      FROM notifications
      WHERE id = ? 
        AND (target_type = 'all' OR (target_type = 'user' AND target_user_id = ?))
        AND publish_at <= NOW()
    `, [notificationId, req.user.id]);

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    // 检查是否已有状态记录
    const existingStatus = await findOne('user_notification_status', {
      user_id: req.user.id,
      notification_id: notificationId
    });

    if (existingStatus) {
      // 更新为已读
      await updateOne('user_notification_status', 
        { 
          is_read: true, 
          read_at: new Date() 
        }, 
        { 
          user_id: req.user.id, 
          notification_id: notificationId 
        }
      );
    } else {
      // 创建新的状态记录
      await insertOne('user_notification_status', {
        user_id: req.user.id,
        notification_id: notificationId,
        is_read: true,
        read_at: new Date()
      });
    }

    res.json({
      success: true,
      message: '通知已标记为已读'
    });

  } catch (error) {
    console.error('标记通知已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记通知已读失败'
    });
  }
});

// 标记所有通知为已读
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    // 获取用户所有未读通知
    const unreadNotifications = await executeQuery(`
      SELECT n.id
      FROM notifications n
      LEFT JOIN user_notification_status uns ON n.id = uns.notification_id AND uns.user_id = ?
      WHERE (n.target_type = 'all' OR (n.target_type = 'user' AND n.target_user_id = ?))
        AND n.publish_at <= NOW()
        AND COALESCE(uns.is_read, 0) = 0
    `, [req.user.id, req.user.id]);

    // 为每个未读通知创建或更新状态
    for (const notification of unreadNotifications) {
      const existingStatus = await findOne('user_notification_status', {
        user_id: req.user.id,
        notification_id: notification.id
      });

      if (existingStatus) {
        await updateOne('user_notification_status', 
          { 
            is_read: true, 
            read_at: new Date() 
          }, 
          { 
            user_id: req.user.id, 
            notification_id: notification.id 
          }
        );
      } else {
        await insertOne('user_notification_status', {
          user_id: req.user.id,
          notification_id: notification.id,
          is_read: true,
          read_at: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: `已标记 ${unreadNotifications.length} 条通知为已读`
    });

  } catch (error) {
    console.error('标记所有通知已读失败:', error);
    res.status(500).json({
      success: false,
      message: '标记所有通知已读失败'
    });
  }
});

// 管理员创建通知
router.post('/', authenticateToken, requireAdmin, [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空'),
  body('targetType').isIn(['all', 'user']).withMessage('目标类型无效'),
  body('targetUserId').custom((value) => {
    // 如果是空字符串或undefined，则跳过验证
    if (value === '' || value === undefined || value === null) {
      return true;
    }
    // 如果有值，则必须是整数
    if (!Number.isInteger(Number(value))) {
      throw new Error('目标用户ID必须是整数');
    }
    return true;
  }),
  body('publishAt').optional().custom((value) => {
    if (!value) return true;
    // 支持多种日期格式
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('发布时间格式无效');
    }
    return true;
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
      title,
      content,
      targetType,
      targetUserId,
      publishAt
    } = req.body;

    // 如果是发送给特定用户，检查用户是否存在
    if (targetType === 'user') {
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: '发送给特定用户时必须指定用户ID'
        });
      }

      const targetUser = await findOne('users', { id: targetUserId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: '目标用户不存在'
        });
      }
    }

    // 创建通知
    const notificationId = await insertOne('notifications', {
      title,
      content,
      target_type: targetType,
      target_user_id: targetType === 'user' ? targetUserId : null,
      sent_by: req.user.id,
      publish_at: publishAt ? new Date(publishAt) : new Date()
    });

    res.status(201).json({
      success: true,
      data: { notificationId },
      message: '通知创建成功'
    });

  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json({
      success: false,
      message: '创建通知失败'
    });
  }
});

// 管理员获取所有通知
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 获取通知总数
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM notifications');
    const total = countResult[0].total;

    // 获取通知列表
    const notifications = await executeQuery(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.target_type as targetType,
        n.target_user_id as targetUserId,
        n.publish_at as publishAt,
        n.created_at as createdAt,
        u1.username as sentByUsername,
        u2.username as targetUsername,
        (
          SELECT COUNT(*)
          FROM user_notification_status uns
          WHERE uns.notification_id = n.id AND uns.is_read = 1
        ) as readCount,
        (
          CASE 
            WHEN n.target_type = 'all' THEN (SELECT COUNT(*) FROM users WHERE is_active = 1)
            ELSE 1
          END
        ) as totalRecipients
      FROM notifications n
      LEFT JOIN users u1 ON n.sent_by = u1.id
      LEFT JOIN users u2 ON n.target_user_id = u2.id
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取所有通知失败:', error);
    res.status(500).json({
      success: false,
      message: '获取所有通知失败'
    });
  }
});

// 管理员更新通知
router.put('/:id', authenticateToken, requireAdmin, [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('content').notEmpty().withMessage('内容不能为空'),
  body('targetType').isIn(['all', 'user']).withMessage('目标类型无效'),
  body('targetUserId').custom((value) => {
    // 如果是空字符串或undefined，则跳过验证
    if (value === '' || value === undefined || value === null) {
      return true;
    }
    // 如果有值，则必须是整数
    if (!Number.isInteger(Number(value))) {
      throw new Error('目标用户ID必须是整数');
    }
    return true;
  }),
  body('publishAt').optional().custom((value) => {
    if (!value) return true;
    // 支持多种日期格式
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('发布时间格式无效');
    }
    return true;
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

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }

    const {
      title,
      content,
      targetType,
      targetUserId,
      publishAt
    } = req.body;

    // 检查通知是否存在
    const existingNotification = await findOne('notifications', { id: notificationId });
    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    // 如果是发送给特定用户，检查用户是否存在
    if (targetType === 'user') {
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: '发送给特定用户时必须指定用户ID'
        });
      }

      const targetUser = await findOne('users', { id: targetUserId });
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: '目标用户不存在'
        });
      }
    }

    // 更新通知
    await updateOne('notifications', {
      title,
      content,
      target_type: targetType,
      target_user_id: targetType === 'user' ? targetUserId : null,
      publish_at: publishAt ? new Date(publishAt) : existingNotification.publish_at
    }, { id: notificationId });

    res.json({
      success: true,
      data: { notificationId },
      message: '通知更新成功'
    });

  } catch (error) {
    console.error('更新通知失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通知失败'
    });
  }
});

// 管理员删除通知
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }

    // 检查通知是否存在
    const existingNotification = await findOne('notifications', { id: notificationId });
    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    // 删除相关的用户通知状态记录
    await executeQuery('DELETE FROM user_notification_status WHERE notification_id = ?', [notificationId]);

    // 删除通知
    await executeQuery('DELETE FROM notifications WHERE id = ?', [notificationId]);

    res.json({
      success: true,
      data: { notificationId },
      message: '通知删除成功'
    });

  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({
      success: false,
      message: '删除通知失败'
    });
  }
});

// 管理员获取单个通知详情
router.get('/:id/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        message: '无效的通知ID'
      });
    }

    // 获取通知详情
    const notification = await executeQuery(`
      SELECT
        n.id,
        n.title,
        n.content,
        n.target_type as targetType,
        n.target_user_id as targetUserId,
        n.publish_at as publishAt,
        n.created_at as createdAt,
        u.username as sentByUsername
      FROM notifications n
      LEFT JOIN users u ON n.sent_by = u.id
      WHERE n.id = ?
    `, [notificationId]);

    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: '通知不存在'
      });
    }

    res.json({
      success: true,
      data: notification[0]
    });

  } catch (error) {
    console.error('获取通知详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知详情失败'
    });
  }
});

module.exports = router;
