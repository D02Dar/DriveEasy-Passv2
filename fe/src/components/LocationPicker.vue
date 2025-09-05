<template>
  <div class="location-picker">
    <!-- 地图容器 -->
    <el-card class="map-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Location /></el-icon>
          <span>{{ title || '选择位置' }}</span>
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
      
      <div class="map-container">
        <div
          ref="mapContainer"
          class="map-view"
          :style="{ height: (isMobile ? 250 : mapHeight) + 'px' }"
          v-show="mapLoaded"
        >
        </div>

        <!-- 地图加载中 -->
        <div v-show="!mapLoaded" class="map-loading">
          <el-icon class="loading-icon"><Location /></el-icon>
          <p>{{ $t('accident.mapLoading') }}</p>
        </div>
        
        <!-- 地图控制按钮 -->
        <div class="map-controls">
          <el-button-group>
            <el-button 
              size="small"
              @click="zoomIn"
              :disabled="!mapLoaded"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
            <el-button 
              size="small"
              @click="zoomOut"
              :disabled="!mapLoaded"
            >
              <el-icon><Minus /></el-icon>
            </el-button>
          </el-button-group>
        </div>
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
          v-model="localLocationData.address"
          type="textarea"
          :rows="3"
          :placeholder="addressPlaceholder || '请输入详细地址'"
          @input="updateLocationData"
        />
        <div class="input-tip">
          <el-icon><InfoFilled /></el-icon>
          <span>提示：请尽量详细描述地点，包括省市区、街道、门牌号等信息</span>
        </div>
      </div>
    </el-card>

    <!-- 位置确认 -->
    <el-card class="confirmation-card" shadow="never" v-if="showConfirmation">
      <div class="confirmation-content">
        <div class="location-summary">
          <h4>{{ $t('accident.locationSummary') }}</h4>
          <div class="summary-item">
            <span class="label">{{ $t('accident.coordinates') }}：</span>
            <span class="value">
              {{ localLocationData.latitude || '-' }},
              {{ localLocationData.longitude || '-' }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">{{ $t('accident.address') }}：</span>
            <span class="value">{{ localLocationData.address || '-' }}</span>
          </div>
        </div>
        
        <div class="action-buttons">
          <el-button
            type="primary"
            :disabled="!isLocationValid"
            @click="confirmLocation"
          >
            {{ confirmText || $t('accident.confirmLocation') }}
          </el-button>
          <el-button
            v-if="allowSkip"
            type="info"
            plain
            @click="skipLocation"
          >
            跳过位置信息
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponsive } from '@/composables/useResponsive'
import { ElMessage } from 'element-plus'
import { Location, Aim, Plus, Minus, InfoFilled } from '@element-plus/icons-vue'
import googleMapsUtil from '@/utils/googleMaps'
import { useAutoLocation } from '@/composables/useAutoLocation'

const props = defineProps({
  // 位置数据
  locationData: {
    type: Object,
    default: () => ({
      latitude: null,
      longitude: null,
      address: ''
    })
  },
  // 组件配置
  title: {
    type: String,
    default: '选择位置'
  },
  addressPlaceholder: {
    type: String,
    default: '请输入详细地址'
  },
  confirmText: {
    type: String,
    default: ''
  },
  showConfirmation: {
    type: Boolean,
    default: true
  },
  allowSkip: {
    type: Boolean,
    default: false
  },
  mapHeight: {
    type: Number,
    default: 400
  },
  autoLocate: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:locationData', 'confirm', 'skip'])

const { t } = useI18n()
const { isMobile } = useResponsive()

// 使用自动定位组合式函数
const { 
  locating, 
  userLocation, 
  autoLocate: performAutoLocate, 
  manualLocate 
} = useAutoLocation({
  onLocationSuccess: (location) => {
    // 定位成功后更新表单数据
    localLocationData.latitude = location.latitude?.toString() || null
    localLocationData.longitude = location.longitude?.toString() || null
    localLocationData.address = location.address || ''
    
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
    
    updateLocationData()
  }
})

// 引用
const mapContainer = ref(null)

// 状态
const mapLoaded = ref(false)

// 本地位置数据
const localLocationData = reactive({
  latitude: null,
  longitude: null,
  address: ''
})

// 计算属性
const isLocationValid = computed(() => {
  return localLocationData.address ||
         (localLocationData.latitude && localLocationData.longitude)
})

// 方法
const getCurrentLocation = async () => {
  try {
    await manualLocate()
  } catch (error) {
    console.error('手动获取位置失败:', error)
  }
}

const initMap = async () => {
  try {
    if (!mapContainer.value) return

    await googleMapsUtil.initMap(mapContainer.value, {
      zoom: 15,
      center: { lat: 39.9042, lng: 116.4074 } // 默认北京
    })

    mapLoaded.value = true

    // 如果有当前位置，居中到当前位置
    if (localLocationData.latitude && localLocationData.longitude) {
      googleMapsUtil.setCenter(
        parseFloat(localLocationData.latitude),
        parseFloat(localLocationData.longitude),
        16
      )

      // 添加当前位置标记
      addLocationMarker()
    }

    ElMessage.success(t('accident.mapLoaded'))
  } catch (error) {
    console.error('地图初始化失败:', error)
    ElMessage.error(t('accident.mapLoadFailed'))
  }
}

const addLocationMarker = () => {
  if (!mapLoaded.value || !localLocationData.latitude || !localLocationData.longitude) return

  // 清除现有标记
  googleMapsUtil.clearMarkers()

  // 添加位置标记
  const marker = {
    latitude: parseFloat(localLocationData.latitude),
    longitude: parseFloat(localLocationData.longitude),
    name: props.title || '选择位置',
    address: localLocationData.address || '当前位置'
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

const confirmLocation = () => {
  if (!isLocationValid.value) {
    ElMessage.error('请输入地址或获取位置信息')
    return
  }

  ElMessage.success('位置信息已确认')
  emit('confirm', { ...localLocationData })
}

const skipLocation = () => {
  // 清空位置信息
  localLocationData.latitude = null
  localLocationData.longitude = null
  localLocationData.address = ''
  updateLocationData()

  ElMessage.info('已跳过位置信息')
  emit('skip')
}

const updateLocationData = () => {
  emit('update:locationData', { ...localLocationData })
}

// 监听外部数据变化
watch(() => props.locationData, (newData) => {
  if (newData) {
    Object.assign(localLocationData, newData)
  }
}, { immediate: true, deep: true })

// 初始化
onMounted(async () => {
  // 如果有现有位置数据，加载它们
  if (props.locationData) {
    Object.assign(localLocationData, props.locationData)
  }

  // 等待DOM更新后初始化地图
  await nextTick()
  await initMap()

  // 如果没有现有位置数据且启用自动定位，自动尝试获取位置
  if (props.autoLocate && !localLocationData.latitude && !localLocationData.longitude && !localLocationData.address) {
    await performAutoLocate()
  }
})

onUnmounted(() => {
  // 清理地图资源
  googleMapsUtil.destroy()
})
</script>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.map-card,
.address-input-card,
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

.address-input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #409eff;
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

/* 移动端适配 */
@media (max-width: 768px) {
  .location-picker {
    gap: 16px;
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
