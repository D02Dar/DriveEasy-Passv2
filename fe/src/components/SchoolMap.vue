<template>
  <div class="school-map-container">
    <!-- 地图卡片 - 复用 accident-report 的地图视角 -->
    <el-card class="map-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><LocationInformation /></el-icon>
          <span>{{ $t('schools.mapView') }}</span>
          <div class="header-actions">
            <el-button
              type="primary"
              size="small"
              @click="centerOnUser"
              :disabled="!userLocation"
              :loading="locating"
            >
              <el-icon><LocationInformation /></el-icon>
              {{ $t('schools.centerOnMe') }}
            </el-button>
            <el-button
              size="small"
              @click="refreshMap"
              :loading="loading"
            >
              <el-icon><Refresh /></el-icon>
              {{ $t('common.refresh') }}
            </el-button>
          </div>
        </div>
      </template>

      <!-- 使用统一的地图视角组件 -->
      <div class="map-container">
        <MapView
          :user-location="userLocation"
          :markers="schoolMarkers"
          :map-height="500"
          :initial-zoom="13"
          :show-location-button="false"
          :show-location-info="true"
          :locating="locating"
          loading-text="正在加载驾校地图..."
          @map-ready="handleMapReady"
          @marker-click="handleMarkerClick"
          @center-on-user="handleCenterOnUser"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { LocationInformation, Refresh } from '@element-plus/icons-vue'
import MapView from '@/components/MapView.vue'
import googleMapsUtil from '@/utils/googleMaps'

export default {
  name: 'SchoolMap',
  components: {
    MapView,
    LocationInformation,
    Refresh
  },
  props: {
    schools: {
      type: Array,
      default: () => []
    },
    userLocation: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    locating: {
      type: Boolean,
      default: false
    }
  },
  emits: ['school-click', 'refresh', 'center-on-user'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const mapLoaded = ref(false)

    // 转换驾校数据为地图标记格式
    const schoolMarkers = computed(() => {
      return props.schools.map(school => ({
        latitude: school.latitude,
        longitude: school.longitude,
        name: school.name,
        address: school.address,
        id: school.id,
        source: school.source,
        distance: school.distance,
        isPartner: school.isPartner,
        phone: school.phone,
        websiteUrl: school.websiteUrl
      }))
    })

    // 居中到用户位置
    const centerOnUser = () => {
      emit('center-on-user')
    }

    // 刷新地图
    const refreshMap = () => {
      emit('refresh')
    }

    // MapView 事件处理方法
    const handleMapReady = (map) => {
      mapLoaded.value = true
    }

    const handleMarkerClick = (event) => {
      if (event.type === 'marker') {
        emit('school-click', event.data)
      }
    }

    const handleCenterOnUser = () => {
      emit('center-on-user')
    }



    return {
      t,
      schoolMarkers,
      centerOnUser,
      refreshMap,
      handleMapReady,
      handleMarkerClick,
      handleCenterOnUser,
      LocationInformation,
      Refresh
    }
  }
}
</script>

<style scoped>
.school-map-container {
  width: 100%;
}

.map-card {
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
</style>
