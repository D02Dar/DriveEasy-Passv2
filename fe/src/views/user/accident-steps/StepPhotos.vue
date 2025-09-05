<template>
  <div class="step-photos">
    <div class="step-header">
      <h2>{{ $t('accident.steps.photos') }}</h2>
      <p class="step-description">{{ $t('accident.steps.photosDesc') }}</p>
    </div>

    <div class="photos-content">
      <!-- 拍照指引 -->
      <el-card class="guide-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Camera /></el-icon>
            <span>{{ $t('accident.photoGuide') }}</span>
          </div>
        </template>
        
        <div class="guide-content">
          <div class="guide-tips">
            <div class="tip-item">
              <el-icon class="tip-icon"><InfoFilled /></el-icon>
              <span>{{ $t('accident.photoTip1') }}</span>
            </div>
            <div class="tip-item">
              <el-icon class="tip-icon"><InfoFilled /></el-icon>
              <span>{{ $t('accident.photoTip2') }}</span>
            </div>
            <div class="tip-item">
              <el-icon class="tip-icon"><InfoFilled /></el-icon>
              <span>{{ $t('accident.photoTip3') }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 照片分类上传 -->
      <div class="photo-categories">
        <div 
          v-for="category in photoCategories" 
          :key="category.type"
          class="photo-category"
        >
          <el-card class="category-card" shadow="never">
            <template #header>
              <div class="category-header">
                <div class="category-info">
                  <el-icon><component :is="category.icon" /></el-icon>
                  <span class="category-title">{{ category.title }}</span>
                  <el-tag 
                    :type="category.required ? 'danger' : 'info'" 
                    size="small"
                  >
                    {{ category.required ? $t('common.required') : $t('common.optional') }}
                  </el-tag>
                </div>
                <div class="photo-count">
                  {{ getPhotoCount(category.type) }}/{{ category.maxCount }}
                </div>
              </div>
            </template>
            
            <div class="category-content">
              <div class="category-description">
                {{ category.description }}
              </div>
              
              <!-- 示例图片 -->
              <div class="example-image">
                <img :src="category.exampleImage" :alt="category.title" />
                <div class="example-overlay">
                  <span>{{ $t('accident.examplePhoto') }}</span>
                </div>
              </div>
              
              <!-- 上传区域 -->
              <div class="upload-area">
                <el-upload
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :data="{ photoType: category.type }"
                  :file-list="getPhotoList(category.type)"
                  :limit="category.maxCount"
                  :accept="'image/*'"
                  :before-upload="beforeUpload"
                  :on-success="(response, file) => onUploadSuccess(response, file, category.type)"
                  :on-error="onUploadError"
                  :on-remove="(file) => onRemovePhoto(file, category.type)"
                  list-type="picture-card"
                  class="photo-uploader"
                  name="photo"
                >
                  <div class="upload-trigger">
                    <el-icon><Plus /></el-icon>
                    <div class="upload-text">{{ $t('accident.uploadPhoto') }}</div>
                  </div>
                </el-upload>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 上传进度 -->
      <el-card v-if="uploadProgress.total > 0" class="progress-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Upload /></el-icon>
            <span>{{ $t('accident.uploadProgress') }}</span>
          </div>
        </template>
        
        <div class="progress-content">
          <el-progress 
            :percentage="uploadProgressPercentage"
            :status="uploadProgress.status"
            :stroke-width="8"
          />
          <div class="progress-text">
            {{ $t('accident.uploadedCount', { 
              current: uploadProgress.completed, 
              total: uploadProgress.total 
            }) }}
          </div>
        </div>
      </el-card>

      <!-- 照片预览 -->
      <el-card class="preview-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><View /></el-icon>
            <span>{{ $t('accident.photoPreview') }}</span>
            <div class="header-actions">
              <el-button 
                type="primary" 
                size="small"
                @click="previewAllPhotos"
                :disabled="totalPhotoCount === 0"
              >
                {{ $t('accident.previewAll') }}
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="preview-content">
          <div v-if="totalPhotoCount === 0" class="empty-state">
            <el-icon class="empty-icon"><Picture /></el-icon>
            <p>{{ $t('accident.noPhotosUploaded') }}</p>
          </div>
          
          <div v-else class="photo-summary">
            <div 
              v-for="category in photoCategories" 
              :key="category.type"
              class="summary-item"
              v-show="getPhotoCount(category.type) > 0"
            >
              <div class="summary-header">
                <span class="summary-title">{{ category.title }}</span>
                <el-tag size="small">{{ getPhotoCount(category.type) }}</el-tag>
              </div>
              <div class="summary-photos">
                <div 
                  v-for="photo in getPhotoList(category.type)" 
                  :key="photo.uid"
                  class="summary-photo"
                  @click="previewPhoto(photo)"
                >
                  <img :src="photo.url" :alt="photo.name" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 确认提交 -->
      <el-card class="confirmation-card" shadow="never">
        <div class="confirmation-content">
          <div class="upload-summary">
            <h4>{{ $t('accident.uploadSummary') }}</h4>
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">{{ $t('accident.totalPhotos') }}：</span>
                <span class="stat-value">{{ totalPhotoCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">{{ $t('accident.requiredPhotos') }}：</span>
                <span class="stat-value" :class="{ 'complete': requiredPhotosComplete }">
                  {{ requiredPhotoCount }}/{{ totalRequiredPhotos }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <el-button 
              type="primary"
              :disabled="!canProceed"
              @click="confirmPhotos"
            >
              {{ $t('accident.confirmPhotos') }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 照片预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="$t('accident.photoPreview')"
      width="80%"
      :fullscreen="isMobile"
    >
      <div class="preview-dialog-content">
        <img 
          v-if="currentPreviewPhoto"
          :src="currentPreviewPhoto.url" 
          :alt="currentPreviewPhoto.name"
          class="preview-image"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { useResponsive } from '@/composables/useResponsive'
import {
  Camera,
  InfoFilled,
  Plus,
  Upload,
  View,
  Picture,
  Folder,
  Document
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

const emit = defineEmits(['update:form-data', 'next', 'prev', 'auto-save'])

const { t } = useI18n()
const { isMobile } = useResponsive()
const store = useStore()

// 状态
const previewDialogVisible = ref(false)
const currentPreviewPhoto = ref(null)
const uploadProgress = reactive({
  total: 0,
  completed: 0,
  status: 'success'
})

// 本地表单数据
const localFormData = reactive({
  photos: {
    frontView: [],
    rearView: [],
    damageDetail: [],
    scenePanorama: [],
    driverLicense: [],
    vehicleLicense: []
  }
})

// 照片分类配置
const photoCategories = ref([
  {
    type: 'frontView',
    title: t('accident.frontViewPhoto'),
    description: t('accident.frontViewDesc'),
    icon: 'Folder',
    required: true,
    maxCount: 2,
    exampleImage: '/images/examples/front-view.jpg'
  },
  {
    type: 'rearView',
    title: t('accident.rearViewPhoto'),
    description: t('accident.rearViewDesc'),
    icon: 'Folder',
    required: true,
    maxCount: 2,
    exampleImage: '/images/examples/rear-view.jpg'
  },
  {
    type: 'damageDetail',
    title: t('accident.damageDetailPhoto'),
    description: t('accident.damageDetailDesc'),
    icon: 'Camera',
    required: true,
    maxCount: 4,
    exampleImage: '/images/examples/damage-detail.jpg'
  },
  {
    type: 'scenePanorama',
    title: t('accident.scenePanoramaPhoto'),
    description: t('accident.scenePanoramaDesc'),
    icon: 'View',
    required: true,
    maxCount: 2,
    exampleImage: '/images/examples/scene-panorama.jpg'
  },
  {
    type: 'driverLicense',
    title: t('accident.driverLicensePhoto'),
    description: t('accident.driverLicenseDesc'),
    icon: 'Document',
    required: false,
    maxCount: 2,
    exampleImage: '/images/examples/driver-license.jpg'
  },
  {
    type: 'vehicleLicense',
    title: t('accident.vehicleLicensePhoto'),
    description: t('accident.vehicleLicenseDesc'),
    icon: 'Document',
    required: false,
    maxCount: 2,
    exampleImage: '/images/examples/vehicle-license.jpg'
  }
])

// 上传配置
const uploadUrl = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}/accidents/temp/photos`
})

const uploadHeaders = computed(() => {
  const token = store.getters['auth/token']
  return token ? { Authorization: `Bearer ${token}` } : {}
})

// 计算属性
const totalPhotoCount = computed(() => {
  return Object.values(localFormData.photos).reduce((total, photos) => total + photos.length, 0)
})

const requiredPhotoCount = computed(() => {
  return photoCategories.value
    .filter(cat => cat.required)
    .reduce((total, cat) => total + getPhotoCount(cat.type), 0)
})

const totalRequiredPhotos = computed(() => {
  return photoCategories.value
    .filter(cat => cat.required)
    .reduce((total, cat) => total + cat.maxCount, 0)
})

const requiredPhotosComplete = computed(() => {
  return photoCategories.value
    .filter(cat => cat.required)
    .every(cat => getPhotoCount(cat.type) > 0)
})

const canProceed = computed(() => {
  return requiredPhotosComplete.value
})

const uploadProgressPercentage = computed(() => {
  if (uploadProgress.total === 0) return 0
  return Math.round((uploadProgress.completed / uploadProgress.total) * 100)
})

// 方法
const getPhotoCount = (type) => {
  return localFormData.photos[type]?.length || 0
}

const getPhotoList = (type) => {
  return localFormData.photos[type] || []
}

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error(t('accident.onlyImageAllowed'))
    return false
  }
  if (!isLt10M) {
    ElMessage.error(t('accident.imageSizeLimit'))
    return false
  }
  
  uploadProgress.total++
  return true
}

const onUploadSuccess = async (response, file, photoType) => {
  uploadProgress.completed++

  if (response.success) {
    const photoData = {
      uid: file.uid,
      name: file.name,
      url: response.data.imageUrl,
      photoType: photoType
    }

    localFormData.photos[photoType].push(photoData)
    updateFormData()

    // 自动保存草稿，确保照片数据不丢失
    await autoSaveDraft()

    ElMessage.success(t('accident.uploadSuccess'))
  } else {
    ElMessage.error(response.message || t('accident.uploadFailed'))
  }
}

const onUploadError = (error, file, fileList) => {
  uploadProgress.completed++
  uploadProgress.status = 'exception'
  console.error('Upload failed:', error)

  // 尝试解析错误信息
  let errorMessage = t('common.error')
  try {
    if (error.response && error.response.data) {
      const responseData = typeof error.response.data === 'string'
        ? JSON.parse(error.response.data)
        : error.response.data

      if (responseData.message) {
        errorMessage = responseData.message
      }
    } else if (error.message) {
      errorMessage = error.message
    }
  } catch (parseError) {
    console.error('Failed to parse error message:', parseError)
  }

  ElMessage.error(errorMessage)
}

const onRemovePhoto = async (file, photoType) => {
  const index = localFormData.photos[photoType].findIndex(photo => photo.uid === file.uid)
  if (index > -1) {
    localFormData.photos[photoType].splice(index, 1)
    updateFormData()

    // 删除照片后也自动保存草稿
    await autoSaveDraft()
  }
}

const previewPhoto = (photo) => {
  currentPreviewPhoto.value = photo
  previewDialogVisible.value = true
}

const previewAllPhotos = () => {
  // 实现所有照片预览功能
  ElMessage.info(t('accident.previewAllPhotos'))
}

const confirmPhotos = () => {
  if (!canProceed.value) {
    ElMessage.error(t('accident.pleaseUploadRequiredPhotos'))
    return
  }
  
  ElMessage.success(t('accident.photosConfirmed'))
  emit('next')
}

const updateFormData = () => {
  emit('update:form-data', {
    photos: { ...localFormData.photos }
  })
}

// 自动保存草稿
const autoSaveDraft = async () => {
  try {
    // 触发父组件的自动保存
    emit('auto-save')
  } catch (error) {
    console.error('自动保存失败:', error)
    // 自动保存失败不显示错误消息，避免打扰用户
  }
}

// 监听props变化，同步照片数据
watch(() => props.formData.photos, (newPhotos) => {
  if (newPhotos) {
    // 清空现有数据
    Object.keys(localFormData.photos).forEach(key => {
      localFormData.photos[key] = []
    })

    // 转换数据格式以适配el-upload组件
    Object.keys(newPhotos).forEach(photoType => {
      if (Array.isArray(newPhotos[photoType])) {
        localFormData.photos[photoType] = newPhotos[photoType].map(photo => {
          // 确保每个照片对象有el-upload需要的属性
          return {
            uid: photo.uid || photo.id || Date.now() + Math.random(),
            name: photo.name || photo.caption || 'photo.jpg',
            url: photo.url || photo.imageUrl,
            photoType: photoType,
            status: 'success' // el-upload需要的状态
          }
        })
      }
    })
  }
}, { immediate: true, deep: true })

// 初始化 - 现在通过watch处理
// if (props.formData.photos) {
//   Object.assign(localFormData.photos, props.formData.photos)
// }
</script>

<style scoped>
.step-photos {
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

.photos-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.guide-card,
.category-card,
.progress-card,
.preview-card,
.confirmation-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.guide-tips {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.tip-icon {
  color: #409eff;
}

.photo-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-title {
  font-weight: 600;
}

.photo-count {
  font-size: 14px;
  color: #909399;
}

.category-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.example-image {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
}

.example-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.example-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
}

.upload-area {
  width: 100%;
}

:deep(.photo-uploader .el-upload-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.photo-uploader .el-upload--picture-card) {
  width: 80px;
  height: 80px;
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c939d;
}

.upload-text {
  font-size: 12px;
  margin-top: 4px;
}

.progress-content {
  padding: 16px 0;
}

.progress-text {
  text-align: center;
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.photo-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-item {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-title {
  font-weight: 600;
  color: #303133;
}

.summary-photos {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-photo {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;
}

.summary-photo:hover {
  transform: scale(1.05);
}

.summary-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.confirmation-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.upload-summary h4 {
  margin: 0 0 16px 0;
  color: #303133;
  text-align: center;
}

.summary-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: #606266;
}

.stat-value {
  font-weight: 600;
  color: #303133;
}

.stat-value.complete {
  color: #67c23a;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.preview-dialog-content {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

@media (max-width: 768px) {
  .photo-categories {
    grid-template-columns: 1fr;
  }
  
  .summary-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
