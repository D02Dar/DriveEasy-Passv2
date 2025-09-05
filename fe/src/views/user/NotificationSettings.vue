<template>
  <div class="notification-settings-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Setting /></el-icon>
            {{ $t('notificationSettings.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('notificationSettings.subtitle') }}</p>
        </div>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>{{ $t('notificationSettings.preferences') }}</span>
            <el-button 
              type="primary" 
              @click="saveSettings" 
              :loading="saving"
            >
              {{ $t('common.save') }}
            </el-button>
          </div>
        </template>

        <div class="settings-content">
          <!-- 全局通知开关 -->
          <div class="setting-item">
            <div class="setting-info">
              <h3>{{ $t('notificationSettings.enableNotifications') }}</h3>
              <p>{{ $t('notificationSettings.enableNotificationsDesc') }}</p>
            </div>
            <el-switch
              v-model="settings.enabled"
              size="large"
              @change="handleGlobalToggle"
            />
          </div>

          <el-divider />

          <!-- 通知类型设置 -->
          <div class="notification-types" :class="{ disabled: !settings.enabled }">
            <h3 class="section-title">{{ $t('notificationSettings.notificationTypes') }}</h3>
            
            <div class="type-list">
              <div 
                v-for="type in notificationTypes" 
                :key="type.key"
                class="type-item"
              >
                <div class="type-info">
                  <div class="type-header">
                    <el-icon class="type-icon" :style="{ color: type.color }">
                      <component :is="type.icon" />
                    </el-icon>
                    <h4>{{ type.name }}</h4>
                  </div>
                  <p class="type-description">{{ type.description }}</p>
                </div>
                <div class="type-controls">
                  <el-switch
                    v-model="settings.types[type.key]"
                    :disabled="!settings.enabled"
                  />
                </div>
              </div>
            </div>
          </div>

          <el-divider />

          <!-- 推送方式设置 -->
          <div class="push-methods" :class="{ disabled: !settings.enabled }">
            <h3 class="section-title">{{ $t('notificationSettings.pushMethods') }}</h3>
            
            <div class="method-list">
              <div class="method-item">
                <div class="method-info">
                  <h4>{{ $t('notificationSettings.browserNotification') }}</h4>
                  <p>{{ $t('notificationSettings.browserNotificationDesc') }}</p>
                </div>
                <div class="method-controls">
                  <el-switch
                    v-model="settings.browserNotification"
                    :disabled="!settings.enabled"
                    @change="handleBrowserNotificationToggle"
                  />
                </div>
              </div>

              <div class="method-item">
                <div class="method-info">
                  <h4>{{ $t('notificationSettings.soundNotification') }}</h4>
                  <p>{{ $t('notificationSettings.soundNotificationDesc') }}</p>
                </div>
                <div class="method-controls">
                  <el-switch
                    v-model="settings.soundNotification"
                    :disabled="!settings.enabled"
                  />
                </div>
              </div>
            </div>
          </div>

          <el-divider />

          <!-- 免打扰时间设置 -->
          <div class="quiet-hours" :class="{ disabled: !settings.enabled }">
            <h3 class="section-title">{{ $t('notificationSettings.quietHours') }}</h3>
            <p class="section-description">{{ $t('notificationSettings.quietHoursDesc') }}</p>
            
            <div class="quiet-hours-controls">
              <el-switch
                v-model="settings.quietHours.enabled"
                :disabled="!settings.enabled"
              />
              
              <div v-if="settings.quietHours.enabled" class="time-range">
                <el-time-picker
                  v-model="settings.quietHours.startTime"
                  format="HH:mm"
                  placeholder="开始时间"
                  :disabled="!settings.enabled"
                />
                <span class="time-separator">{{ $t('notificationSettings.to') }}</span>
                <el-time-picker
                  v-model="settings.quietHours.endTime"
                  format="HH:mm"
                  placeholder="结束时间"
                  :disabled="!settings.enabled"
                />
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 测试通知 -->
    <div class="test-section">
      <el-card>
        <template #header>
          <span>{{ $t('notificationSettings.testNotification') }}</span>
        </template>
        
        <div class="test-content">
          <p>{{ $t('notificationSettings.testNotificationDesc') }}</p>
          <el-button 
            type="primary" 
            @click="sendTestNotification"
            :loading="testing"
            :disabled="!settings.enabled"
          >
            <el-icon><Bell /></el-icon>
            {{ $t('notificationSettings.sendTest') }}
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Setting, 
  Bell, 
  Message, 
  Warning, 
  InfoFilled, 
  SuccessFilled,
  CircleCheck
} from '@element-plus/icons-vue'

export default {
  name: 'NotificationSettings',
  components: {
    Setting,
    Bell,
    Message,
    Warning,
    InfoFilled,
    SuccessFilled,
    CircleCheck
  },
  setup() {
    const { t } = useI18n()

    const saving = ref(false)
    const testing = ref(false)

    // 通知设置
    const settings = reactive({
      enabled: true,
      types: {
        system: true,
        announcement: true,
        practice: true,
        achievement: false,
        reminder: true
      },
      browserNotification: false,
      soundNotification: true,
      quietHours: {
        enabled: false,
        startTime: null,
        endTime: null
      }
    })

    // 通知类型配置
    const notificationTypes = [
      {
        key: 'system',
        name: t('notificationSettings.systemNotifications'),
        description: t('notificationSettings.systemNotificationsDesc'),
        icon: 'InfoFilled',
        color: '#409EFF'
      },
      {
        key: 'announcement',
        name: t('notificationSettings.announcements'),
        description: t('notificationSettings.announcementsDesc'),
        icon: 'Bell',
        color: '#E6A23C'
      },
      {
        key: 'practice',
        name: t('notificationSettings.practiceNotifications'),
        description: t('notificationSettings.practiceNotificationsDesc'),
        icon: 'Message',
        color: '#67C23A'
      },
      {
        key: 'achievement',
        name: t('notificationSettings.achievements'),
        description: t('notificationSettings.achievementsDesc'),
        icon: 'SuccessFilled',
        color: '#F56C6C'
      },
      {
        key: 'reminder',
        name: t('notificationSettings.reminders'),
        description: t('notificationSettings.remindersDesc'),
        icon: 'Warning',
        color: '#909399'
      }
    ]

    // 加载设置
    const loadSettings = () => {
      const savedSettings = localStorage.getItem('notificationSettings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          Object.assign(settings, parsed)
        } catch (error) {
          console.error('加载通知设置失败:', error)
        }
      }
    }

    // 保存设置
    const saveSettings = async () => {
      try {
        saving.value = true
        
        // 保存到本地存储
        localStorage.setItem('notificationSettings', JSON.stringify(settings))
        
        // 这里可以添加保存到服务器的逻辑
        // await api.user.updateNotificationSettings(settings)
        
        ElMessage.success(t('notificationSettings.saveSuccess'))
      } catch (error) {
        console.error('保存通知设置失败:', error)
        ElMessage.error(t('notificationSettings.saveFailed'))
      } finally {
        saving.value = false
      }
    }

    // 处理全局开关
    const handleGlobalToggle = (enabled) => {
      if (!enabled) {
        ElMessageBox.confirm(
          t('notificationSettings.disableConfirm'),
          t('common.warning'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        ).catch(() => {
          settings.enabled = true
        })
      }
    }

    // 处理浏览器通知开关
    const handleBrowserNotificationToggle = async (enabled) => {
      if (enabled) {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') {
            settings.browserNotification = false
            ElMessage.warning(t('notificationSettings.permissionDenied'))
          }
        } else {
          settings.browserNotification = false
          ElMessage.warning(t('notificationSettings.notSupported'))
        }
      }
    }

    // 发送测试通知
    const sendTestNotification = () => {
      testing.value = true
      
      setTimeout(() => {
        // 浏览器通知
        if (settings.browserNotification && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(t('notificationSettings.testTitle'), {
            body: t('notificationSettings.testMessage'),
            icon: '/favicon.ico'
          })
        }
        
        // 应用内通知
        ElMessage({
          message: t('notificationSettings.testMessage'),
          type: 'success',
          duration: 3000
        })
        
        testing.value = false
      }, 1000)
    }

    onMounted(() => {
      loadSettings()
    })

    return {
      saving,
      testing,
      settings,
      notificationTypes,
      saveSettings,
      handleGlobalToggle,
      handleBrowserNotificationToggle,
      sendTestNotification
    }
  }
}
</script>

<style lang="scss" scoped>
.notification-settings-page {
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
}

.settings-section, .test-section {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.settings-content {
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;

    .setting-info {
      flex: 1;

      h3 {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: var(--el-text-color-primary);
      }

      p {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }
  }

  .section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
  }

  .section-description {
    color: var(--el-text-color-regular);
    margin-bottom: 16px;
  }

  .disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.type-list, .method-list {
  .type-item, .method-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    margin-bottom: 12px;
    transition: all 0.3s;

    &:hover {
      border-color: var(--el-color-primary);
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    }

    .type-info, .method-info {
      flex: 1;

      .type-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .type-icon {
          font-size: 18px;
        }

        h4 {
          margin: 0;
          font-size: 16px;
          color: var(--el-text-color-primary);
        }
      }

      h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        color: var(--el-text-color-primary);
      }

      .type-description, p {
        margin: 0;
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }
  }
}

.quiet-hours-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .time-range {
    display: flex;
    align-items: center;
    gap: 12px;

    .time-separator {
      color: var(--el-text-color-regular);
    }
  }
}

.test-content {
  text-align: center;
  padding: 20px;

  p {
    margin-bottom: 20px;
    color: var(--el-text-color-regular);
  }
}

@media (max-width: 768px) {
  .setting-item, .type-item, .method-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quiet-hours-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
