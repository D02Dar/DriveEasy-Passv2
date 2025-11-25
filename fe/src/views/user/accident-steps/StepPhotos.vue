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
      :title="previewDialogTitle"
      width="90%"
      :fullscreen="isMobile"
      class="photo-preview-dialog"
    >
      <div class="preview-dialog-content">
        <!-- 单张照片预览 -->
        <div v-if="previewMode === 'single'" class="single-preview">
          <div class="preview-image-container">
            <img 
              v-if="currentPreviewPhoto"
              :src="currentPreviewPhoto.url" 
              :alt="currentPreviewPhoto.name"
              class="preview-image"
              @click="toggleZoom"
            />
            <div v-if="isZoomed" class="zoom-overlay" @click="toggleZoom"></div>
          </div>
          <div class="preview-info">
            <h4>{{ currentPreviewPhoto?.name }}</h4>
            <p>{{ getPhotoCategoryTitle(currentPreviewPhoto?.photoType) }}</p>
            <div class="preview-actions">
              <el-button @click="downloadPhoto(currentPreviewPhoto)">
                <el-icon><Download /></el-icon>
                {{ $t('common.download') }}
              </el-button>
              <el-button type="danger" @click="deletePhoto(currentPreviewPhoto)">
                <el-icon><Delete /></el-icon>
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 多张照片画廊预览 -->
        <div v-else-if="previewMode === 'gallery'" class="gallery-preview">
          <div class="gallery-header">
            <div class="gallery-info">
              <span>{{ $t('accident.photoGallery') }}</span>
              <el-tag size="small">{{ currentPhotoIndex + 1 }} / {{ allPhotos.length }}</el-tag>
            </div>
            <div class="gallery-actions">
              <el-button @click="downloadAllPhotos">
                <el-icon><Download /></el-icon>
                {{ $t('accident.downloadAll') }}
              </el-button>
            </div>
          </div>
          
          <div class="gallery-content">
            <div class="gallery-navigation">
              <el-button 
                :disabled="currentPhotoIndex === 0"
                @click="previousPhoto"
                class="nav-button"
              >
                <el-icon><ArrowLeft /></el-icon>
              </el-button>
            </div>
            
            <div class="gallery-image-container">
              <img 
                :src="allPhotos[currentPhotoIndex]?.url" 
                :alt="allPhotos[currentPhotoIndex]?.name"
                class="gallery-image"
                @click="toggleZoom"
              />
              <div v-if="isZoomed" class="zoom-overlay" @click="toggleZoom"></div>
            </div>
            
            <div class="gallery-navigation">
              <el-button 
                :disabled="currentPhotoIndex === allPhotos.length - 1"
                @click="nextPhoto"
                class="nav-button"
              >
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div class="gallery-footer">
            <div class="photo-info">
              <h4>{{ allPhotos[currentPhotoIndex]?.name }}</h4>
              <p>{{ getPhotoCategoryTitle(allPhotos[currentPhotoIndex]?.photoType) }}</p>
            </div>
            <div class="photo-actions">
              <el-button @click="downloadPhoto(allPhotos[currentPhotoIndex])">
                <el-icon><Download /></el-icon>
                {{ $t('common.download') }}
              </el-button>
              <el-button type="danger" @click="deletePhoto(allPhotos[currentPhotoIndex])">
                <el-icon><Delete /></el-icon>
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </div>
          
          <!-- 缩略图导航 -->
          <div class="thumbnail-nav">
            <div 
              v-for="(photo, index) in allPhotos" 
              :key="photo.uid"
              :class="['thumbnail', { active: index === currentPhotoIndex }]"
              @click="goToPhoto(index)"
            >
              <img :src="photo.url" :alt="photo.name" />
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useResponsive } from '@/composables/useResponsive'
import {
  Camera,
  InfoFilled,
  Plus,
  Upload,
  View,
  Picture,
  Folder,
  Document,
  Download,
  Delete,
  ArrowLeft,
  ArrowRight
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
const previewMode = ref('single') // 'single' 或 'gallery'
const currentPhotoIndex = ref(0)
const isZoomed = ref(false)
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
    exampleImage: '/images/examples/qian.png'
  },
  {
    type: 'rearView',
    title: t('accident.rearViewPhoto'),
    description: t('accident.rearViewDesc'),
    icon: 'Folder',
    required: true,
    maxCount: 2,
    exampleImage: '/images/examples/hou.png'
  },
  {
    type: 'damageDetail',
    title: t('accident.damageDetailPhoto'),
    description: t('accident.damageDetailDesc'),
    icon: 'Camera',
    required: true,
    maxCount: 4,
    exampleImage: '/images/examples/shun.png'
  },
  {
    type: 'scenePanorama',
    title: t('accident.scenePanoramaPhoto'),
    description: t('accident.scenePanoramaDesc'),
    icon: 'View',
    required: true,
    maxCount: 2,
    exampleImage: '/images/examples/ce.png'
  },
  {
    type: 'driverLicense',
    title: t('accident.driverLicensePhoto'),
    description: t('accident.driverLicenseDesc'),
    icon: 'Document',
    required: false,
    maxCount: 2,
    exampleImage: '/images/examples/jiashi.png'
  },
  {
    type: 'vehicleLicense',
    title: t('accident.vehicleLicensePhoto'),
    description: t('accident.vehicleLicenseDesc'),
    icon: 'Document',
    required: false,
    maxCount: 2,
    exampleImage: '/images/examples/xingshi.png'
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

// 预览相关计算属性
const allPhotos = computed(() => {
  const photos = []
  Object.values(localFormData.photos).forEach(photoList => {
    photos.push(...photoList)
  })
  return photos
})

const previewDialogTitle = computed(() => {
  if (previewMode.value === 'gallery') {
    return t('accident.photoGallery')
  }
  return t('accident.photoPreview')
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
  previewMode.value = 'single'
  previewDialogVisible.value = true
}

const previewAllPhotos = () => {
  if (allPhotos.value.length === 0) {
    ElMessage.warning(t('accident.noPhotosToPreview'))
    return
  }
  
  previewMode.value = 'gallery'
  currentPhotoIndex.value = 0
  previewDialogVisible.value = true
}

// 画廊导航方法
const nextPhoto = () => {
  if (currentPhotoIndex.value < allPhotos.value.length - 1) {
    currentPhotoIndex.value++
  }
}

const previousPhoto = () => {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--
  }
}

const goToPhoto = (index) => {
  currentPhotoIndex.value = index
}

// 缩放功能
const toggleZoom = () => {
  isZoomed.value = !isZoomed.value
}

// 获取照片分类标题
const getPhotoCategoryTitle = (photoType) => {
  const category = photoCategories.value.find(cat => cat.type === photoType)
  return category ? category.title : ''
}

// 下载照片
const downloadPhoto = (photo) => {
  if (!photo) return
  
  const link = document.createElement('a')
  link.href = photo.url
  link.download = photo.name
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  ElMessage.success(t('accident.downloadSuccess'))
}

// 下载所有照片
const downloadAllPhotos = () => {
  if (allPhotos.value.length === 0) {
    ElMessage.warning(t('accident.noPhotosToDownload'))
    return
  }
  
  // 创建ZIP下载（这里简化处理，实际项目中可能需要后端支持）
  allPhotos.value.forEach((photo, index) => {
    setTimeout(() => {
      downloadPhoto(photo)
    }, index * 500) // 延迟下载避免浏览器阻止
  })
  
  ElMessage.success(t('accident.downloadAllSuccess'))
}

// 删除照片
const deletePhoto = async (photo) => {
  if (!photo) return
  
  try {
    await ElMessageBox.confirm(
      t('accident.confirmDeletePhoto'),
      t('common.warning'),
      {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      }
    )
    
    // 从对应分类中删除照片
    const photoType = photo.photoType
    const index = localFormData.photos[photoType].findIndex(p => p.uid === photo.uid)
    if (index > -1) {
      localFormData.photos[photoType].splice(index, 1)
      updateFormData()
      await autoSaveDraft()
      
      // 如果是在画廊模式中删除，需要调整索引
      if (previewMode.value === 'gallery') {
        if (currentPhotoIndex.value >= allPhotos.value.length) {
          currentPhotoIndex.value = Math.max(0, allPhotos.value.length - 1)
        }
        
        // 如果没有照片了，关闭对话框
        if (allPhotos.value.length === 0) {
          previewDialogVisible.value = false
        }
      } else {
        // 单张预览模式，删除后关闭对话框
        previewDialogVisible.value = false
      }
      
      ElMessage.success(t('accident.deleteSuccess'))
    }
  } catch (error) {
    // 用户取消删除
  }
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

// 键盘导航支持
const handleKeydown = (event) => {
  if (!previewDialogVisible.value) return
  
  if (previewMode.value === 'gallery') {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        previousPhoto()
        break
      case 'ArrowRight':
        event.preventDefault()
        nextPhoto()
        break
      case 'Escape':
        event.preventDefault()
        previewDialogVisible.value = false
        break
    }
  } else if (previewMode.value === 'single') {
    if (event.key === 'Escape') {
      event.preventDefault()
      previewDialogVisible.value = false
    }
  }
}

// 监听键盘事件
watch(previewDialogVisible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

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
  height: 80vh;
  display: flex;
  flex-direction: column;
}

/* 单张照片预览样式 */
.single-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  transition: transform 0.3s ease;
}

.preview-image.zoomed {
  transform: scale(2);
  cursor: zoom-out;
}

.zoom-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  cursor: zoom-out;
}

.preview-info {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
}

.preview-info h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.preview-info p {
  margin: 0 0 16px 0;
  color: #606266;
  font-size: 14px;
}

.preview-actions {
  display: flex;
  gap: 12px;
}

/* 画廊预览样式 */
.gallery-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: white;
}

.gallery-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gallery-actions {
  display: flex;
  gap: 8px;
}

.gallery-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #f5f7fa;
}

.gallery-navigation {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}

.gallery-navigation:first-child {
  left: 20px;
}

.gallery-navigation:last-child {
  right: 20px;
}

.nav-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.nav-button:hover {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.gallery-image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 100%;
}

.gallery-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  transition: transform 0.3s ease;
}

.gallery-image.zoomed {
  transform: scale(2);
  cursor: zoom-out;
}

.gallery-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
}

.photo-info h4 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 16px;
}

.photo-info p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.photo-actions {
  display: flex;
  gap: 8px;
}

/* 缩略图导航 */
.thumbnail-nav {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e4e7ed;
  overflow-x: auto;
}

.thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.thumbnail:hover {
  border-color: #409eff;
  transform: scale(1.05);
}

.thumbnail.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .gallery-content {
    flex-direction: column;
  }
  
  .gallery-navigation {
    position: static;
    transform: none;
    margin: 10px 0;
  }
  
  .gallery-navigation:first-child,
  .gallery-navigation:last-child {
    position: static;
  }
  
  .gallery-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .photo-actions {
    width: 100%;
    justify-content: center;
  }
  
  .thumbnail-nav {
    padding: 12px;
  }
  
  .thumbnail {
    width: 50px;
    height: 50px;
  }
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
