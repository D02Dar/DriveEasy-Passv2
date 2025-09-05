<template>
  <div class="notification-center">
    <!-- 通知按钮 -->
    <el-popover
      :visible="visible"
      placement="bottom-end"
      :width="400"
      trigger="manual"
      popper-class="notification-popover"
      @update:visible="handleVisibleChange"
    >
      <template #reference>
        <el-button
          class="notification-btn"
          text
          circle
          @click="toggleNotifications"
        >
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
            <el-icon size="20"><Bell /></el-icon>
          </el-badge>
        </el-button>

        <!-- 开发环境测试按钮 -->
        <el-button
          v-if="isDevelopment"
          text
          size="small"
          @click="testRefresh"
          style="margin-left: 8px;"
        >
          刷新
        </el-button>
      </template>

      <!-- 通知内容 -->
      <div class="notification-content">
        <!-- 头部 -->
        <div class="notification-header">
          <div class="header-title">
            <el-icon><Bell /></el-icon>
            <span>{{ $t('notifications.title') }}</span>
          </div>
          <div class="header-actions">
            <el-button
              v-if="unreadCount > 0"
              text
              size="small"
              @click.stop="markAllAsRead"
              :loading="markingAllRead"
            >
              {{ $t('notifications.markAllRead') }}
            </el-button>
          </div>
        </div>

        <!-- 通知列表 -->
        <div class="notification-list">
          <el-scrollbar height="400px">
            <div v-if="loading" class="loading-container">
              <el-skeleton :rows="3" animated />
            </div>
            
            <div v-else-if="!notifications || notifications.length === 0" class="empty-state">
              <el-icon class="empty-icon"><Bell /></el-icon>
              <p>{{ $t('notifications.noNotifications') }}</p>
            </div>

            <div v-else>
              <div
                v-for="notification in notifications"
                :key="notification.id"
                class="notification-item"
                :class="{ 'unread': !notification.isRead }"
                @click.stop="markAsRead(notification)"
              >
                <div class="notification-content-wrapper">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-text">{{ notification.content }}</div>
                  <div class="notification-meta">
                    <span class="notification-time">{{ formatTime(notification.publishAt) }}</span>
                    <span v-if="notification.sentByUsername" class="notification-sender">
                      {{ $t('notifications.from') }} {{ notification.sentByUsername }}
                    </span>
                  </div>
                </div>
                <div v-if="!notification.isRead" class="unread-indicator"></div>
              </div>
            </div>
          </el-scrollbar>
        </div>

        <!-- 底部 -->
        <div class="notification-footer">
          <el-button text @click.stop="viewAllNotifications">
            {{ $t('notifications.viewAll') }}
          </el-button>
          <el-button text @click.stop="openSettings">
            <el-icon><Setting /></el-icon>
            {{ $t('notifications.settings') }}
          </el-button>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Bell, Setting } from '@element-plus/icons-vue'
import { useNotifications } from '@/services/notificationService'

export default {
  name: 'NotificationCenter',
  components: {
    Bell,
    Setting
  },
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    const {
      unreadCount,
      notifications: serviceNotifications,
      fetchNotifications,
      markAsRead: serviceMarkAsRead,
      markAllAsRead: serviceMarkAllAsRead,
      service
    } = useNotifications()

    const visible = ref(false)
    const loading = ref(false)
    const markingAllRead = ref(false)
    const isDevelopment = process.env.NODE_ENV === 'development'

    // 本地状态
    const localUnreadCount = ref(0)
    const localNotifications = ref([])

    // 监听服务状态变化
    watch(() => service.getState(), (state) => {
      localUnreadCount.value = state.unreadCount
      localNotifications.value = state.notifications
    }, { deep: true, immediate: true })

    // 获取通知列表
    const fetchNotificationsList = async () => {
      try {
        loading.value = true
        await fetchNotifications({ limit: 10 })
      } catch (error) {
        console.error('获取通知失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 切换通知面板显示
    const toggleNotifications = () => {
      visible.value = !visible.value
      if (visible.value) {
        fetchNotificationsList()
      }
    }

    // 处理显示状态变化
    const handleVisibleChange = (newVisible) => {
      visible.value = newVisible
      if (newVisible) {
        fetchNotificationsList()
      }
    }

    // 标记单个通知为已读
    const markAsRead = async (notification) => {
      if (notification.isRead) return

      try {
        await serviceMarkAsRead(notification.id)
        ElMessage.success(t('notifications.markReadSuccess'))
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
        ElMessage.success(t('notifications.allMarkedRead'))
      } catch (error) {
        console.error('标记所有通知已读失败:', error)
        ElMessage.error(t('notifications.markAllReadFailed'))
      } finally {
        markingAllRead.value = false
      }
    }

    // 查看所有通知
    const viewAllNotifications = () => {
      visible.value = false
      router.push('/notifications')
    }

    // 打开设置
    const openSettings = () => {
      visible.value = false
      router.push('/notification-settings')
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

    // 测试刷新方法
    const testRefresh = () => {
      service.refresh()
      if (visible.value) {
        fetchNotificationsList()
      }
    }

    // 点击外部关闭浮窗
    const handleClickOutside = (event) => {
      if (visible.value && !event.target.closest('.notification-center')) {
        visible.value = false
      }
    }

    // 组件挂载时获取通知列表
    onMounted(() => {
      // 主动刷新未读数量，确保数据是最新的
      service.refresh()

      // 如果有未读通知，预加载通知列表
      setTimeout(() => {
        if (service.getUnreadCount() > 0) {
          fetchNotificationsList()
        }
      }, 500)

      // 添加全局点击监听
      document.addEventListener('click', handleClickOutside)
    })

    onUnmounted(() => {
      // 移除全局点击监听
      document.removeEventListener('click', handleClickOutside)
    })

    return {
      visible,
      loading,
      markingAllRead,
      notifications: localNotifications,
      unreadCount: localUnreadCount,
      isDevelopment,
      toggleNotifications,
      handleVisibleChange,
      markAsRead,
      markAllAsRead,
      viewAllNotifications,
      openSettings,
      formatTime,
      testRefresh
    }
  }
}
</script>

<style lang="scss" scoped>
.notification-center {
  .notification-btn {
    width: 40px;
    height: 40px;

    :deep(.el-badge) {
      .el-badge__content {
        border: 2px solid var(--el-bg-color);
        top: -6px;
        right: -6px;
        min-width: 16px;
        height: 16px;
        line-height: 12px;
        font-size: 10px;
        padding: 0 3px;
        transform: scale(1);
        z-index: 10;
      }
    }
  }
}

:deep(.notification-popover) {
  padding: 0;
  
  .el-popover__arrow {
    display: none;
  }
}

.notification-content {
  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
  
  .notification-list {
    .loading-container {
      padding: 16px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 16px;
      color: var(--el-text-color-placeholder);
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
    }
    
    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      margin-bottom: 8px;
      border-radius: 8px;
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
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &.unread {
        background: var(--el-color-primary-light-9);
        border-color: var(--el-color-primary-light-7);

        .notification-title {
          font-weight: 600;
        }

        &:hover {
          background: var(--el-color-primary-light-8);
          border-color: var(--el-color-primary-light-6);
        }
      }
      
      .notification-content-wrapper {
        flex: 1;
        min-width: 0;
      }
      
      .notification-title {
        font-size: 14px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        line-height: 1.4;
      }
      
      .notification-text {
        font-size: 13px;
        color: var(--el-text-color-regular);
        line-height: 1.4;
        margin-bottom: 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      
      .notification-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: var(--el-text-color-placeholder);
        
        .notification-time {
          flex-shrink: 0;
        }
        
        .notification-sender {
          margin-left: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      
      .unread-indicator {
        width: 8px;
        height: 8px;
        background: var(--el-color-primary);
        border-radius: 50%;
        margin-left: 8px;
        margin-top: 4px;
        flex-shrink: 0;
      }
    }
  }
  
  .notification-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
