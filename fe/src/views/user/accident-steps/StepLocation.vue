<template>
  <div class="step-location">
    <div class="step-header">
      <h2>{{ $t('accident.steps.location') }}</h2>
      <p class="step-description">{{ $t('accident.steps.locationDesc') }}</p>
    </div>

    <div class="location-content">
      <!-- 地图容器 -->
      <el-card class="map-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Location /></el-icon>
            <span>{{ $t('accident.accidentLocation') }}</span>
            <div class="header-actions">
              <el-button 
                type="primary" 
                size="small"
                @click="getCurrentLocation"
                :loading="locating"
              >
                <el-icon><Aim /></el-icon>
                {{ $t('accident.getCurrentLocation') }}
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- 使用统一的地图视角组件 -->
        <div class="map-container">
          <MapView
            :user-location="currentLocationData"
            :markers="locationMarkers"
            :map-height="isMobile ? 250 : mapHeight"
            :initial-zoom="15"
            :show-location-button="false"
            :show-location-info="false"
            :locating="locating"
            :loading-text="$t('accident.mapLoading')"
            @map-ready="handleMapReady"
            @marker-click="handleMarkerClick"
            @map-click="handleMapClick"
          />
        </div>
      </el-card>

      <!-- 手动输入地址 -->
      <el-card class="address-input-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Location /></el-icon>
            <span>手动输入地址</span>
          </div>
        </template>

        <div class="address-input-section">
          <el-input
            v-model="localFormData.location.address"
            type="textarea"
            :rows="3"
            :placeholder="$t('accident.locationAddressPlaceholder')"
            @input="updateFormData"
          />
          <div class="input-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>{{ $t('accident.locationInputTip') }}</span>
          </div>
        </div>
      </el-card>





      <!-- 位置确认 -->
      <el-card class="confirmation-card" shadow="never">
        <div class="confirmation-content">
          <div class="location-summary">
            <h4>{{ $t('accident.locationSummary') }}</h4>
            <div class="summary-item">
              <span class="label">{{ $t('accident.coordinates') }}：</span>
              <span class="value">
                {{ localFormData.location.latitude || '-' }},
                {{ localFormData.location.longitude || '-' }}
              </span>
            </div>
            <div class="summary-item">
              <span class="label">{{ $t('accident.address') }}：</span>
              <span class="value">{{ localFormData.location.address || '-' }}</span>
            </div>

          </div>
          
          <div class="action-buttons">
            <el-button
              type="primary"
              :disabled="!isLocationValid"
              @click="confirmLocation"
            >
              {{ $t('accident.confirmLocation') }}
            </el-button>
            <el-button
              type="info"
              plain
              @click="skipLocation"
            >
              {{ $t('accident.skipLocationInfo') }}
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponsive } from '@/composables/useResponsive'
import { ElMessage } from 'element-plus'
import { Location, Aim, Plus, Minus, InfoFilled } from '@element-plus/icons-vue'
import googleMapsUtil from '@/utils/googleMaps'
import { useAutoLocation } from '@/composables/useAutoLocation'
import MapView from '@/components/MapView.vue'
import api from '@/api'

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
const { isMobile } = useResponsive()

// 使用自动定位组合式函数
const {
  locating,
  userLocation,
  autoLocate,
  manualLocate
} = useAutoLocation({
  onLocationSuccess: (location) => {
    // 定位成功后更新表单数据
    localFormData.location.latitude = location.latitude?.toString() || null
    localFormData.location.longitude = location.longitude?.toString() || null
    localFormData.location.address = location.address || ''

    // 更新地图中心和标记
    if (mapLoaded.value && location.latitude && location.longitude) {
      const zoomLevel = location.source === 'browser' ? 16 : 12
      googleMapsUtil.setCenter(
        location.latitude,
        location.longitude,
        zoomLevel
      )
      addLocationMarker()
    }

    updateFormData()
  }
})

// 引用
const mapContainer = ref(null)
const locationForm = ref(null)

// 状态
const mapLoaded = ref(false)
const mapHeight = ref(400)

// 本地表单数据
const localFormData = reactive({
  location: {
    latitude: null,
    longitude: null,
    address: '',
    landmarks: ''
  }
})



// 计算属性
const isLocationValid = computed(() => {
  // 位置信息变为可选，只要有地址或坐标之一即可
  return localFormData.location.address ||
         (localFormData.location.latitude && localFormData.location.longitude)
})

// 当前位置数据（用于MapView）
const currentLocationData = computed(() => {
  if (localFormData.location.latitude && localFormData.location.longitude) {
    return {
      latitude: parseFloat(localFormData.location.latitude),
      longitude: parseFloat(localFormData.location.longitude),
      address: localFormData.location.address || t('accident.accidentLocationMarker')
    }
  }
  return null
})

// 位置标记（用于MapView）
const locationMarkers = computed(() => {
  if (currentLocationData.value) {
    return [{
      latitude: currentLocationData.value.latitude,
      longitude: currentLocationData.value.longitude,
      name: t('accident.accidentLocationMarker'),
      address: currentLocationData.value.address
    }]
  }
  return []
})

// 方法
const getCurrentLocation = async () => {
  try {
    await manualLocate()
  } catch (error) {
    console.error(t('accident.manualLocationFailed') + ':', error)
  }
}

// 移除这个方法，因为我们现在使用geocodingService

const initMap = async () => {
  try {
    if (!mapContainer.value) return

    await googleMapsUtil.initMap(mapContainer.value, {
      zoom: 15,
      center: { lat: 39.9042, lng: 116.4074 } // 默认北京
    })

    mapLoaded.value = true

    // 如果有当前位置，居中到当前位置
    if (localFormData.location.latitude && localFormData.location.longitude) {
      googleMapsUtil.setCenter(
        parseFloat(localFormData.location.latitude),
        parseFloat(localFormData.location.longitude),
        16
      )

      // 添加当前位置标记
      addLocationMarker()
    }

    ElMessage.success(t('accident.mapLoaded'))
  } catch (error) {
    console.error(t('accident.mapInitFailed') + ':', error)
    ElMessage.error(t('accident.mapLoadFailed'))
  }
}

const addLocationMarker = () => {
  if (!mapLoaded.value || !localFormData.location.latitude || !localFormData.location.longitude) return

  // 清除现有标记
  googleMapsUtil.clearMarkers()

  // 添加位置标记
  const marker = {
    latitude: parseFloat(localFormData.location.latitude),
    longitude: parseFloat(localFormData.location.longitude),
    name: t('accident.accidentLocation'),
    address: localFormData.location.address || t('accident.currentLocation')
  }

  googleMapsUtil.addMarker(marker)
}

const zoomIn = () => {
  if (googleMapsUtil.map) {
    const currentZoom = googleMapsUtil.map.getZoom()
    googleMapsUtil.map.setZoom(currentZoom + 1)
  }
}

const zoomOut = () => {
  if (googleMapsUtil.map) {
    const currentZoom = googleMapsUtil.map.getZoom()
    googleMapsUtil.map.setZoom(currentZoom - 1)
  }
}

// MapView 事件处理方法
const handleMapReady = (map) => {
  mapLoaded.value = true
  console.log(t('accident.accidentMapReady'))
}

const handleMarkerClick = (event) => {
  console.log('标记点击:', event)
}

const handleMapClick = (event) => {
  // 用户点击地图时设置位置
  localFormData.location.latitude = event.lat.toFixed(6)
  localFormData.location.longitude = event.lng.toFixed(6)

  // 可以选择性地获取地址信息
  // 这里可以调用反向地理编码服务

  updateFormData()
  ElMessage.success(t('accident.accidentLocationSet'))
}







const confirmLocation = () => {
  if (!isLocationValid.value) {
    ElMessage.error(t('accident.pleaseEnterLocationOrGetLocation'))
    return
  }

  ElMessage.success(t('accident.locationInfoConfirmed'))
  emit('next')
}

// 跳过位置信息
const skipLocation = () => {
  // 清空位置信息
  localFormData.location.latitude = null
  localFormData.location.longitude = null
  localFormData.location.address = ''
  updateFormData()

  ElMessage.info(t('accident.locationInfoSkipped'))
  emit('next')
}

const updateFormData = () => {
  console.log(t('accident.updateLocationData') + ':', localFormData.location)
  emit('update:form-data', {
    location: { ...localFormData.location }
  })
}

// 初始化
onMounted(async () => {
  // 如果有现有位置数据，加载它们
  if (props.formData.location) {
    Object.assign(localFormData.location, props.formData.location)
  }

  // 等待DOM更新后初始化地图
  await nextTick()
  await initMap()

  // 如果没有现有位置数据，自动尝试获取位置
  if (!localFormData.location.latitude && !localFormData.location.longitude && !localFormData.location.address) {
    // 首次进入页面时自动获取位置（静默模式）
    await autoLocate()
  }
})

onUnmounted(() => {
  // 清理地图资源
  googleMapsUtil.destroy()
})
</script>

<style scoped>
.step-location {
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

.location-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-card,
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

.map-container {
  position: relative;
}

.map-view {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  background: #f5f7fa;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
}

.loading-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.map-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.location-form {
  padding: 0;
}



.confirmation-content {
  padding: 20px;
}

.location-summary {
  margin-bottom: 20px;
}

.location-summary h4 {
  margin: 0 0 16px 0;
  color: #303133;
}

.summary-item {
  display: flex;
  margin-bottom: 8px;
}

.label {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
}

.value {
  color: #303133;
  flex: 1;
}

.action-buttons {
  text-align: center;
}

@media (max-width: 768px) {
  .step-header h2 {
    font-size: 20px;
  }

  .location-content {
    gap: 16px;
  }

  .map-height {
    height: 250px;
  }

  .quick-locations {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .location-button {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    font-size: 14px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .confirmation-content {
    padding: 16px;
  }

  .summary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .map-controls {
    top: 8px;
    right: 8px;
  }
}
</style>
