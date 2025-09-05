<template>
  <div class="notifications-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Bell /></el-icon>
            {{ $t('notifications.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('notifications.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button
            v-if="unreadCount > 0"
            type="primary"
            @click="markAllAsRead"
            :loading="markingAllRead"
          >
            <el-icon><Check /></el-icon>
            {{ $t('notifications.markAllRead') }}
          </el-button>
          <el-button @click="refreshNotifications" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ $t('common.refresh') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters-section">
      <el-card>
        <div class="filters">
          <el-radio-group v-model="currentFilter" @change="handleFilterChange">
            <el-radio-button value="all">{{ $t('notifications.all') }}</el-radio-button>
            <el-radio-button value="unread">{{ $t('notifications.unread') }}</el-radio-button>
            <el-radio-button value="read">{{ $t('notifications.read') }}</el-radio-button>
          </el-radio-group>
          
          <div class="filter-info">
            <span class="total-count">
              {{ $t('notifications.totalCount', { count: pagination.total }) }}
            </span>
            <span v-if="unreadCount > 0" class="unread-count">
              {{ $t('notifications.unreadCount', { count: unreadCount }) }}
            </span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 通知列表 -->
    <div class="notifications-section">
      <el-card>
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <div v-else-if="notifications.length === 0" class="empty-state">
          <el-icon class="empty-icon"><Bell /></el-icon>
          <h3>{{ $t('notifications.noNotifications') }}</h3>
          <p>{{ $t('notifications.noNotificationsDesc') }}</p>
        </div>

        <div v-else class="notifications-list">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'unread': !notification.isRead }"
            @click="markAsRead(notification)"
          >
            <div class="notification-main">
              <div class="notification-header">
                <h4 class="notification-title">{{ notification.title }}</h4>
                <div class="notification-meta">
                  <span class="notification-time">{{ formatTime(notification.publishAt) }}</span>
                  <span v-if="notification.sentByUsername" class="notification-sender">
                    {{ $t('notifications.from') }} {{ notification.sentByUsername }}
                  </span>
                </div>
              </div>
              <div class="notification-content">{{ notification.content }}</div>
              <div v-if="notification.readAt" class="read-info">
                {{ $t('notifications.readAt', { time: formatTime(notification.readAt) }) }}
              </div>
            </div>
            <div v-if="!notification.isRead" class="unread-indicator"></div>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="pagination.totalPages > 1" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            :page-size="pagination.limit"
            :total="pagination.total"
            layout="prev, pager, next, jumper, total"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Bell, Check, Refresh } from '@element-plus/icons-vue'
import { useNotifications } from '@/services/notificationService'

export default {
  name: 'Notifications',
  components: {
    Bell,
    Check,
    Refresh
  },
  setup() {
    const { t } = useI18n()
    const {
      unreadCount: serviceUnreadCount,
      notifications: serviceNotifications,
      fetchNotifications,
      markAsRead: serviceMarkAsRead,
      markAllAsRead: serviceMarkAllAsRead,
      service
    } = useNotifications()

    const loading = ref(false)
    const markingAllRead = ref(false)
    const currentFilter = ref('all')

    // 使用服务的状态而不是本地状态
    const notifications = serviceNotifications
    const unreadCount = serviceUnreadCount

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    })

    // 不需要监听，直接使用服务状态

    // 获取通知列表
    const fetchNotificationsList = async (force = false) => {
      // 防止重复请求
      if (loading.value && !force) {
        return
      }

      try {
        loading.value = true
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }

        if (currentFilter.value !== 'all') {
          params.isRead = currentFilter.value === 'read'
        }

        const data = await fetchNotifications(params)
        // 不需要设置 notifications，因为 fetchNotifications 会更新全局状态
        pagination.total = data?.pagination?.total || 0
        pagination.totalPages = data?.pagination?.totalPages || 0

      } catch (error) {
        console.error('获取通知失败:', error)
        ElMessage.error(t('notifications.fetchFailed'))
      } finally {
        loading.value = false
      }
    }

    // 标记单个通知为已读
    const markAsRead = async (notification) => {
      if (notification.isRead) return

      try {
        await serviceMarkAsRead(notification.id)
        // 更新本地显示状态
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      } catch (error) {
        console.error('标记通知已读失败:', error)
        ElMessage.error(t('notifications.markReadFailed'))
      }
    }

    // 标记所有通知为已读
    const markAllAsRead = async () => {
      try {
        markingAllRead.value = true
        await serviceMarkAllAsRead()
        // 不需要手动更新状态，serviceMarkAllAsRead 会更新全局状态
        ElMessage.success(t('notifications.allMarkedRead'))
      } catch (error) {
        console.error('标记所有通知已读失败:', error)
        ElMessage.error(t('notifications.markAllReadFailed'))
      } finally {
        markingAllRead.value = false
      }
    }

    // 刷新通知
    const refreshNotifications = () => {
      fetchNotificationsList(true) // 强制刷新
      service.refresh()
    }

    // 处理筛选器变化
    const handleFilterChange = () => {
      pagination.page = 1
      fetchNotificationsList()
    }

    // 处理页码变化
    const handlePageChange = (page) => {
      pagination.page = page
      fetchNotificationsList()
    }

    // 格式化时间
    const formatTime = (timeString) => {
      if (!timeString) return ''
      
      const time = new Date(timeString)
      const now = new Date()
      const diff = now - time
      
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)
      
      if (minutes < 1) return t('notifications.justNow')
      if (minutes < 60) return t('notifications.minutesAgo', { minutes })
      if (hours < 24) return t('notifications.hoursAgo', { hours })
      if (days < 7) return t('notifications.daysAgo', { days })
      
      return time.toLocaleDateString()
    }

    onMounted(() => {
      fetchNotificationsList()
    })

    return {
      loading,
      markingAllRead,
      notifications,
      currentFilter,
      unreadCount,
      pagination,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      handleFilterChange,
      handlePageChange,
      formatTime
    }
  }
}
</script>

<style lang="scss" scoped>
.notifications-page {
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-subtitle {
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.filters-section {
  margin-bottom: 24px;
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .filter-info {
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: var(--el-text-color-regular);
    
    .unread-count {
      color: var(--el-color-primary);
      font-weight: 600;
    }
  }
}

.notifications-section {
  .loading-container {
    padding: 24px;
  }
  
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    
    .empty-icon {
      font-size: 64px;
      color: var(--el-text-color-placeholder);
      margin-bottom: 20px;
    }
    
    h3 {
      color: var(--el-text-color-primary);
      margin-bottom: 10px;
    }
    
    p {
      color: var(--el-text-color-regular);
    }
  }
  
  .notifications-list {
    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 20px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid var(--el-border-color-lighter);
      cursor: pointer;
      transition: all 0.3s;
      background: var(--el-bg-color);

      &:last-child {
        margin-bottom: 0;
      }

      &:hover {
        background: var(--el-fill-color-light);
        border-color: var(--el-border-color);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.unread {
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary-light-7);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--el-color-primary);
          border-radius: 4px 0 0 4px;
        }

        .notification-title {
          font-weight: 600;
        }

        &:hover {
          background: var(--el-color-primary-light-8);
          border-color: var(--el-color-primary-light-6);
        }
      }
      
      .notification-main {
        flex: 1;
        min-width: 0;
      }
      
      .notification-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
        
        .notification-title {
          font-size: 16px;
          color: var(--el-text-color-primary);
          margin: 0;
          line-height: 1.4;
        }
        
        .notification-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          font-size: 12px;
          color: var(--el-text-color-placeholder);
          flex-shrink: 0;
          margin-left: 16px;
          
          .notification-time {
            white-space: nowrap;
          }
          
          .notification-sender {
            white-space: nowrap;
          }
        }
      }
      
      .notification-content {
        font-size: 14px;
        color: var(--el-text-color-regular);
        line-height: 1.6;
        margin-bottom: 8px;
      }
      
      .read-info {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
      }
      
      .unread-indicator {
        width: 10px;
        height: 10px;
        background: var(--el-color-primary);
        border-radius: 50%;
        margin-left: 16px;
        margin-top: 6px;
        flex-shrink: 0;
        box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary-light-8);
        animation: pulse 2s infinite;
      }
    }
  }
  
  .pagination-container {
    display: flex;
    justify-content: center;
    padding: 24px 0;
    margin-top: 24px;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary-light-8);
  }
  50% {
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 8px var(--el-color-primary-light-9);
  }
  100% {
    box-shadow: 0 0 0 2px var(--el-bg-color), 0 0 0 4px var(--el-color-primary-light-8);
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .filters {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    
    .filter-info {
      justify-content: center;
    }
  }
  
  .notification-item {
    .notification-header {
      flex-direction: column;
      gap: 8px;
      
      .notification-meta {
        align-items: flex-start;
        margin-left: 0;
      }
    }
  }
}
</style>
