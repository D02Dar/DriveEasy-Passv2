<template>
  <div class="admin-settings">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Setting /></el-icon>
            {{ $t('common.adminSettings') }}
          </h1>
          <p class="page-subtitle">{{ $t('common.adminSettingsSubtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="saveAllSettings" :loading="saving" type="primary">
            <el-icon><Check /></el-icon>
            {{ $t('common.saveAll') }}
          </el-button>
          <el-button @click="resetSettings">
            <el-icon><RefreshLeft /></el-icon>
            {{ $t('common.reset') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 系统设置 -->
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Tools /></el-icon>
            <span>{{ $t('common.systemSettings') }}</span>
          </div>
        </template>
        
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.siteName') }}</span>
              <el-tooltip :content="$t('common.siteNameTip')" placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <el-input 
              v-model="settings.system.siteName" 
              :placeholder="$t('common.siteNamePlaceholder')"
              style="width: 300px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.siteDescription') }}</span>
            </div>
            <el-input 
              v-model="settings.system.siteDescription" 
              type="textarea"
              :rows="3"
              :placeholder="$t('common.siteDescriptionPlaceholder')"
              style="width: 100%"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.defaultLanguage') }}</span>
            </div>
            <el-select v-model="settings.system.defaultLanguage" style="width: 200px">
              <el-option label="中文" value="zh-CN" />
              <el-option label="English" value="en-US" />
              <el-option label="ไทย" value="th-TH" />
            </el-select>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.maintenanceMode') }}</span>
            </div>
            <el-switch 
              v-model="settings.system.maintenanceMode"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>
        </div>
      </el-card>

      <!-- 用户设置 -->
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>{{ $t('common.userSettings') }}</span>
          </div>
        </template>
        
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.allowRegistration') }}</span>
            </div>
            <el-switch 
              v-model="settings.user.allowRegistration"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.emailVerification') }}</span>
            </div>
            <el-switch 
              v-model="settings.user.emailVerification"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.maxUsersPerDay') }}</span>
            </div>
            <el-input-number 
              v-model="settings.user.maxUsersPerDay" 
              :min="0" 
              :max="1000"
              style="width: 200px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.sessionTimeout') }}</span>
              <el-tooltip :content="$t('common.sessionTimeoutTip')" placement="top">
                <el-icon><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
            <el-input-number 
              v-model="settings.user.sessionTimeout" 
              :min="30" 
              :max="1440"
              style="width: 200px"
            />
            <span class="setting-unit">{{ $t('common.minutes') }}</span>
          </div>
        </div>
      </el-card>

      <!-- 练习设置 -->
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>{{ $t('common.practiceSettings') }}</span>
          </div>
        </template>
        
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.questionsPerPage') }}</span>
            </div>
            <el-input-number 
              v-model="settings.practice.questionsPerPage" 
              :min="5" 
              :max="50"
              style="width: 200px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.passingScore') }}</span>
            </div>
            <el-input-number 
              v-model="settings.practice.passingScore" 
              :min="60" 
              :max="100"
              style="width: 200px"
            />
            <span class="setting-unit">{{ $t('common.points') }}</span>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.timeLimit') }}</span>
            </div>
            <el-input-number 
              v-model="settings.practice.timeLimit" 
              :min="10" 
              :max="120"
              style="width: 200px"
            />
            <span class="setting-unit">{{ $t('common.minutes') }}</span>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.allowRetake') }}</span>
            </div>
            <el-switch 
              v-model="settings.practice.allowRetake"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>
        </div>
      </el-card>

      <!-- 通知设置 -->
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Bell /></el-icon>
            <span>{{ $t('common.notificationSettings') }}</span>
          </div>
        </template>
        
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.emailNotifications') }}</span>
            </div>
            <el-switch 
              v-model="settings.notification.emailNotifications"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.pushNotifications') }}</span>
            </div>
            <el-switch 
              v-model="settings.notification.pushNotifications"
              :active-text="$t('common.enabled')"
              :inactive-text="$t('common.disabled')"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.smtpHost') }}</span>
            </div>
            <el-input 
              v-model="settings.notification.smtpHost" 
              :placeholder="$t('common.smtpHostPlaceholder')"
              style="width: 300px"
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.smtpPort') }}</span>
            </div>
            <el-input-number 
              v-model="settings.notification.smtpPort" 
              :min="1" 
              :max="65535"
              style="width: 200px"
            />
          </div>
        </div>
      </el-card>

      <!-- 地图设置 -->
      <el-card class="settings-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Location /></el-icon>
            <span>{{ $t('common.mapSettings') }}</span>
          </div>
        </template>
        
        <div class="settings-section">
          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.googleMapsApiKey') }}</span>
            </div>
            <el-input 
              v-model="settings.map.googleMapsApiKey" 
              type="password"
              :placeholder="$t('common.googleMapsApiKeyPlaceholder')"
              style="width: 400px"
              show-password
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.foursquareApiKey') }}</span>
            </div>
            <el-input 
              v-model="settings.map.foursquareApiKey" 
              type="password"
              :placeholder="$t('common.foursquareApiKeyPlaceholder')"
              style="width: 400px"
              show-password
            />
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.defaultMapCenter') }}</span>
            </div>
            <div class="map-coordinates">
              <el-input 
                v-model="settings.map.defaultLatitude" 
                :placeholder="$t('common.latitude')"
                style="width: 150px; margin-right: 10px"
              />
              <el-input 
                v-model="settings.map.defaultLongitude" 
                :placeholder="$t('common.longitude')"
                style="width: 150px"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-label">
              <span>{{ $t('common.searchRadius') }}</span>
            </div>
            <el-input-number 
              v-model="settings.map.searchRadius" 
              :min="1" 
              :max="100"
              style="width: 200px"
            />
            <span class="setting-unit">{{ $t('common.kilometers') }}</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Check,
  RefreshLeft,
  Tools,
  QuestionFilled,
  User,
  Document,
  Bell,
  Location
} from '@element-plus/icons-vue'
import api from '@/api'

const { t } = useI18n()

// 状态
const saving = ref(false)

// 设置数据
const settings = reactive({
  system: {
    siteName: '驾考练习助手',
    siteDescription: '专业的驾考学习平台，提供科目一、科目四全面题库练习',
    defaultLanguage: 'zh-CN',
    maintenanceMode: false
  },
  user: {
    allowRegistration: true,
    emailVerification: true,
    maxUsersPerDay: 100,
    sessionTimeout: 120
  },
  practice: {
    questionsPerPage: 20,
    passingScore: 90,
    timeLimit: 45,
    allowRetake: true
  },
  notification: {
    emailNotifications: true,
    pushNotifications: true,
    smtpHost: '',
    smtpPort: 587
  },
  map: {
    googleMapsApiKey: '',
    foursquareApiKey: '',
    defaultLatitude: 39.9042,
    defaultLongitude: 116.4074,
    searchRadius: 20
  }
})

// 获取设置
const fetchSettings = async () => {
  try {
    // 这里应该调用后端API获取设置
    // const response = await api.admin.getSettings()
    // Object.assign(settings, response.data)
    
    // 临时使用默认设置
    ElMessage.info(t('common.loadedDefaultSettings'))
  } catch (error) {
    console.error('获取设置失败:', error)
    ElMessage.error(t('common.fetchSettingsFailed'))
  }
}

// 保存所有设置
const saveAllSettings = async () => {
  try {
    saving.value = true
    
    // 这里应该调用后端API保存设置
    // await api.admin.saveSettings(settings)
    
    // 模拟保存延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success(t('common.savedSuccessfully'))
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error(t('common.saveFailed'))
  } finally {
    saving.value = false
  }
}

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(
      t('common.resetConfirm'),
      t('common.resetTitle'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    // 重置为默认值
    Object.assign(settings.system, {
      siteName: '驾考练习助手',
      siteDescription: '专业的驾考学习平台，提供科目一、科目四全面题库练习',
      defaultLanguage: 'zh-CN',
      maintenanceMode: false
    })
    
    Object.assign(settings.user, {
      allowRegistration: true,
      emailVerification: true,
      maxUsersPerDay: 100,
      sessionTimeout: 120
    })
    
    Object.assign(settings.practice, {
      questionsPerPage: 20,
      passingScore: 90,
      timeLimit: 45,
      allowRetake: true
    })
    
    Object.assign(settings.notification, {
      emailNotifications: true,
      pushNotifications: true,
      smtpHost: '',
      smtpPort: 587
    })
    
    Object.assign(settings.map, {
      googleMapsApiKey: '',
      foursquareApiKey: '',
      defaultLatitude: 39.9042,
      defaultLongitude: 116.4074,
      searchRadius: 20
    })
    
    ElMessage.success(t('common.resetSuccessfully'))
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置设置失败:', error)
      ElMessage.error(t('common.resetFailed'))
    }
  }
}

// 初始化
onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.admin-settings {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.title-section {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.page-subtitle {
  margin: 0;
  color: #606266;
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #606266;
  min-width: 200px;
}

.setting-unit {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}

.map-coordinates {
  display: flex;
  align-items: center;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .admin-settings {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .setting-label {
    min-width: auto;
  }
  
  .map-coordinates {
    flex-direction: column;
    gap: 8px;
  }
  
  .map-coordinates .el-input {
    width: 100% !important;
    margin-right: 0 !important;
  }
}
</style>
