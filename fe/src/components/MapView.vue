<template>
  <div class="map-view-container">
    <!-- 地图容器 -->
    <div class="map-wrapper">
      <div
        ref="mapContainer"
        class="map-display"
        :style="{ height: mapHeight + 'px' }"
        v-show="mapLoaded"
      ></div>

      <!-- 地图加载中 -->
      <div v-show="!mapLoaded" class="map-loading">
        <el-icon class="loading-icon"><Location /></el-icon>
        <p>{{ loadingText || t('accident.loadingMap') }}</p>
      </div>
      
      <!-- 地图控制按钮 -->
      <div class="map-controls">
        <el-button-group>
          <el-button 
            size="small"
            @click="zoomIn"
            :disabled="!mapLoaded"
            :title="t('accident.zoomInTitle')"
          >
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button 
            size="small"
            @click="zoomOut"
            :disabled="!mapLoaded"
            :title="t('accident.zoomOutTitle')"
          >
            <el-icon><Minus /></el-icon>
          </el-button>
        </el-button-group>
        
        <!-- 定位按钮 -->
        <el-button 
          v-if="showLocationButton"
          size="small"
          @click="centerOnUser"
          :disabled="!userLocation"
          :loading="locating"
          :title="t('accident.centerOnMyLocation')"
          class="location-btn"
        >
          <el-icon><Aim /></el-icon>
        </el-button>
      </div>

      <!-- 当前位置标记信息 -->
      <div v-if="showLocationInfo && userLocation" class="location-info-overlay">
        <div class="location-card">
          <el-icon><LocationInformation /></el-icon>
          <div class="location-details">
            <div class="location-address">{{ userLocation.address || '当前位置' }}</div>
            <div class="location-coords">
              {{ userLocation.latitude?.toFixed(6) }}, {{ userLocation.longitude?.toFixed(6) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponsive } from '@/composables/useResponsive'
import { ElMessage } from 'element-plus'
import { Location, Plus, Minus, Aim, LocationInformation } from '@element-plus/icons-vue'
import googleMapsUtil from '@/utils/googleMaps'

const props = defineProps({
  // 用户位置
  userLocation: {
    type: Object,
    default: null
  },
  // 标记点数据（驾校、事故地点等）
  markers: {
    type: Array,
    default: () => []
  },
  // 地图高度
  mapHeight: {
    type: Number,
    default: 400
  },
  // 初始缩放级别
  initialZoom: {
    type: Number,
    default: 13
  },
  // 初始中心点
  initialCenter: {
    type: Object,
    default: () => ({ lat: 39.9042, lng: 116.4074 })
  },
  // 是否显示定位按钮
  showLocationButton: {
    type: Boolean,
    default: true
  },
  // 是否显示位置信息覆盖层
  showLocationInfo: {
    type: Boolean,
    default: true
  },
  // 定位状态
  locating: {
    type: Boolean,
    default: false
  },
  // 加载文本
  loadingText: {
    type: String,
    default: ''
  },
  // 地图配置选项
  mapOptions: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['map-ready', 'marker-click', 'center-on-user', 'map-click'])

const { t } = useI18n()
const { isMobile } = useResponsive()

// 引用
const mapContainer = ref(null)

// 状态
const mapLoaded = ref(false)

// 计算属性
const effectiveMapHeight = computed(() => {
  return isMobile.value ? Math.min(props.mapHeight, 300) : props.mapHeight
})

// 方法
const initMap = async () => {
  try {
    if (!mapContainer.value) return

    const mapOptions = {
      zoom: props.initialZoom,
      center: props.initialCenter,
      ...props.mapOptions
    }

    await googleMapsUtil.initMap(mapContainer.value, mapOptions)
    mapLoaded.value = true

    // 如果有用户位置，居中到用户位置
    if (props.userLocation) {
      centerToUserLocation()
    }

    // 显示标记点
    if (props.markers.length > 0) {
      showMarkers()
    }

    // 添加地图点击事件
    googleMapsUtil.map.addListener('click', (event) => {
      emit('map-click', {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      })
    })

    emit('map-ready', googleMapsUtil.map)
    
    if (!props.loadingText) {
      ElMessage.success(t('accident.mapLoadComplete'))
    }
  } catch (error) {
    console.error('地图初始化失败:', error)
    ElMessage.error(t('accident.mapLoadError'))
  }
}

const centerToUserLocation = () => {
  if (props.userLocation && props.userLocation.latitude && props.userLocation.longitude) {
    const zoomLevel = props.userLocation.source === 'browser' ? 16 : 14
    googleMapsUtil.setCenter(
      props.userLocation.latitude,
      props.userLocation.longitude,
      zoomLevel
    )
    
    // 添加用户位置标记
    addUserLocationMarker()
  }
}

const addUserLocationMarker = () => {
  if (!mapLoaded.value || !props.userLocation) return

  const userMarker = {
    latitude: props.userLocation.latitude,
    longitude: props.userLocation.longitude,
    name: '我的位置',
    address: props.userLocation.address || '当前位置',
    icon: 'user-location' // 特殊图标标识
  }

  googleMapsUtil.addMarker(userMarker, (marker) => {
    emit('marker-click', { type: 'user-location', data: userMarker })
  })
}

const showMarkers = () => {
  if (!mapLoaded.value || !props.markers.length) return

  // 清除现有标记（除了用户位置标记）
  googleMapsUtil.clearMarkers()

  // 重新添加用户位置标记
  if (props.userLocation) {
    addUserLocationMarker()
  }

  // 添加其他标记
  props.markers.forEach(marker => {
    googleMapsUtil.addMarker(marker, (clickedMarker) => {
      console.log('MapView 收到详情点击事件:', marker);
      emit('marker-click', { type: 'marker', data: marker })
    })
  })

  // 如果有多个标记，调整视图以显示所有标记
  if (props.markers.length > 1) {
    const bounds = new google.maps.LatLngBounds()
    
    // 添加用户位置到边界
    if (props.userLocation) {
      bounds.extend(new google.maps.LatLng(props.userLocation.latitude, props.userLocation.longitude))
    }
    
    // 添加所有标记到边界
    props.markers.forEach(marker => {
      if (marker.latitude && marker.longitude) {
        bounds.extend(new google.maps.LatLng(marker.latitude, marker.longitude))
      }
    })
    
    googleMapsUtil.map.fitBounds(bounds)
  }
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

const centerOnUser = () => {
  if (props.userLocation) {
    centerToUserLocation()
  } else {
    emit('center-on-user')
  }
}

const setCenter = (lat, lng, zoom = null) => {
  if (googleMapsUtil.map) {
    googleMapsUtil.setCenter(lat, lng, zoom)
  }
}

const addMarker = (marker) => {
  if (googleMapsUtil.map) {
    return googleMapsUtil.addMarker(marker, (clickedMarker) => {
      emit('marker-click', { type: 'marker', data: marker })
    })
  }
}

const clearMarkers = () => {
  if (googleMapsUtil.map) {
    googleMapsUtil.clearMarkers()
  }
}

// 监听器
watch(() => props.userLocation, (newLocation) => {
  if (mapLoaded.value && newLocation) {
    centerToUserLocation()
  }
}, { deep: true })

watch(() => props.markers, (newMarkers) => {
  if (mapLoaded.value) {
    showMarkers()
  }
}, { deep: true })

// 生命周期
onMounted(async () => {
  await nextTick()
  await initMap()
})

onUnmounted(() => {
  googleMapsUtil.destroy()
})

// 暴露方法给父组件
defineExpose({
  setCenter,
  addMarker,
  clearMarkers,
  zoomIn,
  zoomOut,
  centerOnUser
})
</script>

<style scoped>
.map-view-container {
  width: 100%;
  height: 100%;
}

.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
}

.map-display {
  width: 100%;
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
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.location-btn {
  margin-top: 8px;
}

.location-info-overlay {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 1000;
  pointer-events: none;
}

.location-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
}

.location-card .el-icon {
  font-size: 20px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.location-details {
  flex: 1;
  min-width: 0;
}

.location-address {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-coords {
  font-size: 12px;
  color: #909399;
  font-family: monospace;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .map-controls {
    top: 8px;
    right: 8px;
  }

  .location-info-overlay {
    bottom: 8px;
    left: 8px;
    right: 8px;
  }

  .location-card {
    padding: 8px 12px;
  }

  .location-address {
    font-size: 14px;
  }

  .location-coords {
    font-size: 11px;
  }
}

/* 深色模式适配 */
@media (prefers-color-scheme: dark) {
  .location-card {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .location-address {
    color: #ffffff;
  }

  .location-coords {
    color: #cccccc;
  }
}
</style>
