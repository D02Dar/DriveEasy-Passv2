<template>
  <div class="step-completion">
    <div class="step-header">
      <h2>{{ $t('accident.steps.completion') }}</h2>
      <p class="step-description">{{ $t('accident.steps.completionDesc') }}</p>
    </div>

    <div class="completion-content">
      <!-- 完成状态 -->
      <el-card class="status-card" shadow="never">
        <div class="status-content">
          <div class="success-icon">
            <el-icon class="check-icon"><CircleCheck /></el-icon>
          </div>
          <h3 class="success-title">{{ $t('accident.reportCompleted') }}</h3>
          <p class="success-desc">{{ $t('accident.reportCompletedDesc') }}</p>
        </div>
      </el-card>

      <!-- 撤车提醒 -->
      <el-card class="reminder-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Folder /></el-icon>
            <span>{{ $t('accident.vehicleRemovalReminder') }}</span>
          </div>
        </template>
        
        <div class="reminder-content">
          <div class="reminder-illustration">
            <div class="car-icon">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="arrow-icon">
              <el-icon><Right /></el-icon>
            </div>
            <div class="safe-zone">
              <el-icon><Lock /></el-icon>
              <span>{{ $t('accident.safeZone') }}</span>
            </div>
          </div>
          
          <div class="reminder-text">
            <h4>{{ $t('accident.immediateActions') }}</h4>
            <ul class="action-list">
              <li>{{ $t('accident.moveVehicleToSafe') }}</li>
              <li>{{ $t('accident.turnOnHazardLights') }}</li>
              <li>{{ $t('accident.setWarningTriangle') }}</li>
              <li>{{ $t('accident.avoidTrafficJam') }}</li>
            </ul>
          </div>
          
          <div class="warning-notice">
            <el-alert
              :title="$t('accident.importantNotice')"
              type="warning"
              :closable="false"
              show-icon
            >
              <template #default>
                <p>{{ $t('accident.trafficViolationWarning') }}</p>
              </template>
            </el-alert>
          </div>
        </div>
      </el-card>



      <!-- 报告摘要 -->
      <el-card class="summary-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>{{ $t('accident.reportSummary') }}</span>
          </div>
        </template>
        
        <div class="summary-content">
          <div class="summary-info">
            <div class="info-row">
              <span class="label">{{ $t('accident.reportNumber') }}：</span>
              <span class="value">{{ reportNumber }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ $t('accident.accidentTime') }}：</span>
              <span class="value">{{ formatDateTime(formData.accidentTime) }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ $t('accident.accidentLocation') }}：</span>
              <span class="value">{{ formData.accidentLocation }}</span>
            </div>
            <div class="info-row">
              <span class="label">{{ $t('accident.totalPhotos') }}：</span>
              <span class="value">{{ totalPhotos }}</span>
            </div>
          </div>
          
          <div class="summary-actions">
            <el-button 
              type="primary"
              @click="downloadReport"
              :loading="downloading"
            >
              <el-icon><Download /></el-icon>
              {{ $t('accident.downloadReport') }}
            </el-button>
            <el-button 
              @click="shareReport"
            >
              <el-icon><Share /></el-icon>
              {{ $t('accident.shareReport') }}
            </el-button>
          </div>
        </div>
      </el-card>


    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CircleCheck,
  Folder,
  Right,
  Lock,
  Document,
  Download,
  Share
} from '@element-plus/icons-vue'

const props = defineProps({
  formData: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:form-data', 'next', 'prev'])

const { t } = useI18n()

// 状态
const downloading = ref(false)

// 计算属性
const reportNumber = computed(() => {
  return `ACC${Date.now().toString().slice(-8)}`
})

const totalPhotos = computed(() => {
  if (!props.formData.photos) return 0
  return Object.values(props.formData.photos).reduce((total, photos) => total + photos.length, 0)
})

// 方法
const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  const locale = t('common.locale') === 'zh-CN' ? 'zh-CN' : 'en-US'
  return new Date(dateTime).toLocaleString(locale)
}

const downloadReport = async () => {
  try {
    downloading.value = true
    // 这里调用下载报告的API
    await new Promise(resolve => setTimeout(resolve, 2000)) // 模拟下载
    ElMessage.success(t('accident.downloadSuccess'))
  } catch (error) {
    console.error('下载报告失败:', error)
    ElMessage.error(t('accident.downloadFailed'))
  } finally {
    downloading.value = false
  }
}

const shareReport = () => {
  if (navigator.share) {
    navigator.share({
      title: t('accident.accidentReport'),
      text: t('accident.shareReportText'),
      url: window.location.href
    })
  } else {
    ElMessage.info(t('accident.shareNotSupported'))
  }
}
</script>

<style scoped>
.step-completion {
  max-width: 100%;
}

.step-header {
  margin-bottom: 24px;
  text-align: center;
}

.step-header h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px 0;
}

.step-description {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.completion-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-card,
.reminder-card,
.summary-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.status-content {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  margin-bottom: 20px;
}

.check-icon {
  font-size: 64px;
  color: #67c23a;
}

.success-title {
  font-size: 24px;
  color: #303133;
  margin: 0 0 12px 0;
}

.success-desc {
  color: #606266;
  font-size: 16px;
  margin: 0;
}

.reminder-content {
  padding: 20px 0;
}

.reminder-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f0f9ff;
  border-radius: 8px;
}

.car-icon,
.arrow-icon {
  font-size: 32px;
  color: #409eff;
}

.safe-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f0f9ff;
  border: 2px dashed #409eff;
  border-radius: 8px;
  color: #409eff;
  font-weight: 600;
}

.reminder-text h4 {
  color: #303133;
  margin: 0 0 16px 0;
}

.action-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.action-list li {
  padding: 8px 0;
  color: #606266;
  position: relative;
  padding-left: 20px;
}

.action-list li::before {
  content: '•';
  color: #409eff;
  position: absolute;
  left: 0;
  font-weight: bold;
}

.warning-notice {
  margin-top: 20px;
}




.summary-content {
  padding: 20px 0;
}

.summary-info {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  margin-bottom: 12px;
}

.label {
  font-weight: 600;
  color: #606266;
  min-width: 120px;
}

.value {
  color: #303133;
}

.summary-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}



@media (max-width: 768px) {
  .reminder-illustration {
    flex-direction: column;
    gap: 12px;
  }

  .summary-actions {
    flex-direction: column;
  }
}
</style>
