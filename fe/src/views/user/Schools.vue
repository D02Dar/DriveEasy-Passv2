<template>
  <div class="schools-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><School /></el-icon>
            {{ $t('schools.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('schools.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="getCurrentLocation" :loading="locating">
            <el-icon><Location /></el-icon>
            {{ locating ? $t('schools.locating') : $t('schools.getLocation') }}
          </el-button>
          <el-button @click="refreshSchools" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ $t('common.refresh') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <div class="filter-card">
        <div class="filter-content">
          <el-input
            v-model="searchKeyword"
            :placeholder="$t('schools.searchPlaceholder')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
            style="width: 300px"
          />
          <el-select
            v-model="filterPartner"
            :placeholder="$t('schools.filterType')"
            clearable
            @change="handlePartnerFilter"
            style="width: 150px"
          >
            <el-option :label="$t('schools.partnerSchool')" :value="true" />
            <el-option :label="$t('schools.regularSchool')" :value="false" />
          </el-select>
          <el-select
            v-model="sortBy"
            :placeholder="$t('schools.sortBy')"
            @change="handleSort"
            style="width: 150px"
          >
            <el-option :label="$t('schools.defaultSort')" value="default" />
            <el-option :label="$t('schools.nearestDistance')" value="distance" />
            <el-option :label="$t('schools.nameSort')" value="name" />
          </el-select>
          <!-- 距离筛选 -->
          <el-select
            v-model="distanceFilter"
            :placeholder="$t('schools.filterByDistance')"
            clearable
            @change="handleDistanceFilter"
            style="width: 180px"
            :disabled="!userLocation"
          >
            <el-option :label="$t('schools.within1km')" value="1" />
            <el-option :label="$t('schools.within3km')" value="3" />
            <el-option :label="$t('schools.within5km')" value="5" />
            <el-option :label="$t('schools.within10km')" value="10" />
            <el-option :label="$t('schools.within20km')" value="20" />
            <el-option :label="$t('schools.within50km')" value="50" />
          </el-select>
          <!-- 位置设置按钮 -->
          <el-button @click="showLocationDialog = true" type="primary" plain>
            <el-icon><Location /></el-icon>
            {{ $t('schools.setLocation') }}
          </el-button>

          <el-button @click="clearFilters">{{ $t('schools.clearFilters') }}</el-button>

          <!-- 视图切换 -->
          <div class="view-toggle">
            <el-radio-group v-model="viewMode" @change="handleViewModeChange">
              <el-radio-button value="list">
                <el-icon><List /></el-icon>
                {{ $t('schools.listView') }}
              </el-radio-button>
              <el-radio-button value="map">
                <el-icon><LocationInformation /></el-icon>
                {{ $t('schools.mapView') }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- Google Places集成开关 -->
          <div class="google-places-toggle">
            <el-switch
              v-model="includeGooglePlaces"
              :active-text="$t('schools.includeGooglePlaces')"
              @change="handleGooglePlacesToggle"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 位置信息 -->
    <div v-if="userLocation" class="location-info">
      <div class="location-card">
        <el-icon><LocationInformation /></el-icon>
        <span>{{ $t('schools.currentLocation') }}: {{ (userLocation && userLocation.address) || $t('schools.locationObtained') }}</span>
        <el-button size="small" @click="searchNearby" :disabled="loading">
          {{ $t('schools.searchNearby') }}
        </el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 空状态 -->
    <div v-else-if="schools.length === 0" class="empty-state">
      <el-icon class="empty-icon"><School /></el-icon>
      <h3>{{ searchKeyword || filterPartner !== null ? $t('schools.noSchoolsFound') : $t('schools.noSchoolsInfo') }}</h3>
      <p>{{ searchKeyword || filterPartner !== null ? $t('schools.tryOtherConditions') : $t('schools.tryLaterOrContact') }}</p>
      <el-button type="primary" @click="clearFilters">
        {{ $t('schools.searchAgain') }}
      </el-button>
    </div>

    <!-- 地图视图 -->
    <div v-if="viewMode === 'map' && !loading && schools.length > 0" class="map-section">
      <SchoolMap
        :schools="schools"
        :user-location="userLocation"
        :loading="loading"
        :locating="locating"
        @school-click="viewSchoolDetail"
        @refresh="refreshSchools"
        @center-on-user="getCurrentLocation"
      />
    </div>

    <!-- 驾校列表 -->
    <div v-else-if="viewMode === 'list' && !loading && schools.length > 0" class="schools-container">
      <div class="schools-grid">
        <div
          v-for="school in schools"
          :key="school.id"
          class="school-card"
          @click="viewSchoolDetail(school)"
        >
          <div class="school-header">
            <div class="school-logo">
              <img v-if="school.logoUrl" :src="school.logoUrl" :alt="school.name" />
              <el-icon v-else><School /></el-icon>
            </div>
            <div class="school-info">
              <h3 class="school-name">{{ school.name }}</h3>
              <div class="school-badges">
                <el-tag v-if="school.isPartner" type="success" size="small">
                  {{ $t('schools.partnerSchool') }}
                </el-tag>
                <span v-if="school.distance" class="distance-tag">
                  {{ formatDistance(school.distance) }}
                </span>
              </div>
            </div>
          </div>

          <div class="school-content">
            <div class="school-address">
              <el-icon><LocationInformation /></el-icon>
              <span>{{ school.address || $t('schools.addressNotProvided') }}</span>
            </div>
            <div v-if="school.description" class="school-description">
              {{ school.description }}
            </div>
          </div>

          <div class="school-footer">
            <div class="contact-info">
              <div v-if="school.phone" class="contact-item">
                <el-icon><Phone /></el-icon>
                <span>{{ school.phone }}</span>
              </div>
              <div v-if="school.lineId" class="contact-item">
                <el-icon><ChatLineSquare /></el-icon>
                <span>Line: {{ school.lineId }}</span>
              </div>
            </div>
            <div class="school-actions">
              <el-button
                size="small"
                @click.stop="callSchool(school)"
                :disabled="!school.phone"
              >
                <el-icon><Phone /></el-icon>
                {{ $t('schools.makeCall') }}
              </el-button>
              <el-button
                size="small"
                type="primary"
                @click.stop="navigateToSchool(school)"
                :disabled="!school.latitude || !school.longitude"
              >
                <el-icon><Guide /></el-icon>
                {{ $t('schools.navigate') }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 48]"
          :total="totalSchools"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          :small="isMobile"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="responsive-pagination"
        />
      </div>
    </div>

    <!-- 驾校详情对话框 -->
    <el-dialog
      v-model="schoolDetailVisible"
      :title="selectedSchool?.name"
      :width="isMobile ? '95%' : '800px'"
      :fullscreen="isMobile"
      :before-close="handleCloseSchoolDetail"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <div v-if="selectedSchool" class="school-detail-content">
        <div class="detail-header">
          <div class="detail-logo">
            <img v-if="selectedSchool.logoUrl" :src="selectedSchool.logoUrl" :alt="selectedSchool.name" />
            <el-icon v-else><School /></el-icon>
          </div>
          <div class="detail-info">
            <h2 class="detail-name">{{ selectedSchool.name }}</h2>
            <div class="detail-badges">
              <el-tag v-if="selectedSchool.isPartner" type="success">
                {{ $t('schools.partnerSchool') }}
              </el-tag>
              <span v-if="selectedSchool.distance" class="distance-info">
                {{ $t('schools.distanceFromYou', { distance: formatDistance(selectedSchool.distance) }) }}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>{{ $t('schools.basicInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ $t('schools.address') }}:</label>
              <span>{{ selectedSchool.address || $t('schools.notProvided') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ $t('schools.phone') }}:</label>
              <span>{{ selectedSchool.phone || $t('schools.notProvided') }}</span>
            </div>
            <div class="detail-item">
              <label>Line ID:</label>
              <span>{{ selectedSchool.lineId || $t('schools.notProvided') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ $t('schools.website') }}:</label>
              <span v-if="selectedSchool.websiteUrl">
                <el-link :href="selectedSchool.websiteUrl" target="_blank" type="primary">
                  {{ $t('schools.visitWebsite') }}
                </el-link>
              </span>
              <span v-else>{{ $t('schools.notProvided') }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedSchool.description" class="detail-section">
          <h4>{{ $t('schools.schoolIntroduction') }}</h4>
          <p class="description-text">{{ selectedSchool.description }}</p>
        </div>

        <div v-if="selectedSchool.latitude && selectedSchool.longitude" class="detail-section">
          <h4>{{ $t('schools.locationInfo') }}</h4>
          <div class="detail-map-container">
            <MapView
              :markers="selectedSchoolMarker ? [selectedSchoolMarker] : []"
              :map-height="300"
              :initial-zoom="16"
              :initial-center="{ lat: parseFloat(selectedSchool.latitude), lng: parseFloat(selectedSchool.longitude) }"
              :show-location-button="false"
              :show-location-info="false"
              loading-text="正在加载驾校位置..."
              @map-ready="handleDetailMapReady"
            />
            <div class="coordinates-info">
              <small>{{ $t('schools.coordinates') }}: {{ selectedSchool.latitude }}, {{ selectedSchool.longitude }}</small>
            </div>
          </div>
        </div>

        <div class="detail-actions" :class="{ 'mobile-actions': isMobile }">
          <el-button
            v-if="selectedSchool.phone"
            @click="callSchool(selectedSchool)"
            type="primary"
            :size="isMobile ? 'large' : 'default'"
            class="action-button"
          >
            <el-icon><Phone /></el-icon>
            {{ $t('schools.makeCall') }}
          </el-button>
          <el-button
            v-if="selectedSchool.latitude && selectedSchool.longitude"
            type="success"
            @click="navigateToSchool(selectedSchool)"
            :size="isMobile ? 'large' : 'default'"
            class="action-button"
          >
            <el-icon><Guide /></el-icon>
            {{ $t('schools.navigateToSchool') }}
          </el-button>
          <el-button
            v-if="selectedSchool.websiteUrl"
            @click="visitWebsite(selectedSchool)"
            type="info"
            :size="isMobile ? 'large' : 'default'"
            class="action-button"
          >
            <el-icon><Link /></el-icon>
            {{ $t('schools.visitWebsite') }}
          </el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="schoolDetailVisible = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>

    <!-- 位置设置对话框 -->
    <el-dialog
      v-model="showLocationDialog"
      :title="$t('schools.locationSettings')"
      :width="isMobile ? '95%' : '500px'"
      :fullscreen="isMobile"
      :before-close="handleCloseLocationDialog"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <div class="location-settings">
        <el-tabs v-model="locationTab" @tab-change="handleLocationTabChange">
          <!-- 当前位置 -->
          <el-tab-pane :label="$t('schools.currentLocation')" name="current">
            <div class="location-option">
              <el-button
                @click="getCurrentLocation"
                :loading="locating"
                type="primary"
                style="width: 100%"
              >
                <el-icon><Location /></el-icon>
                {{ locating ? $t('schools.locating') : $t('schools.getCurrentLocation') }}
              </el-button>
              <div v-if="userLocation && userLocation.latitude" class="current-location-info">
                <p>{{ $t('schools.currentLocationInfo') }}</p>
                <p>{{ $t('schools.latitude') }}: {{ userLocation.latitude.toFixed(6) }}</p>
                <p>{{ $t('schools.longitude') }}: {{ userLocation.longitude.toFixed(6) }}</p>
              </div>
            </div>
          </el-tab-pane>

          <!-- 测试位置 -->
          <el-tab-pane :label="$t('schools.testLocations')" name="test">
            <div class="test-locations">
              <el-radio-group v-model="selectedTestLocation" @change="handleTestLocationChange">
                <div class="test-location-item" v-for="location in testLocations" :key="location.name">
                  <el-radio :value="location.name">
                    <div class="location-info">
                      <div class="location-name">{{ location.name }}</div>
                      <div class="location-coords">
                        {{ $t('schools.latitude') }}: {{ location.latitude }},
                        {{ $t('schools.longitude') }}: {{ location.longitude }}
                      </div>
                    </div>
                  </el-radio>
                </div>
              </el-radio-group>
            </div>
          </el-tab-pane>

          <!-- 自定义位置 -->
          <el-tab-pane :label="$t('schools.customLocation')" name="custom">
            <div class="custom-location">
              <el-form :model="customLocation" label-width="80px">
                <el-form-item :label="$t('schools.latitude')">
                  <el-input-number
                    v-model="customLocation.latitude"
                    :min="-90"
                    :max="90"
                    :precision="6"
                    :step="0.000001"
                    style="width: 100%"
                    :placeholder="$t('schools.enterLatitude')"
                  />
                </el-form-item>
                <el-form-item :label="$t('schools.longitude')">
                  <el-input-number
                    v-model="customLocation.longitude"
                    :min="-180"
                    :max="180"
                    :precision="6"
                    :step="0.000001"
                    style="width: 100%"
                    :placeholder="$t('schools.enterLongitude')"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button
                    @click="applyCustomLocation"
                    type="primary"
                    :disabled="!isValidCustomLocation"
                    style="width: 100%"
                  >
                    {{ $t('schools.applyLocation') }}
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <template #footer>
        <el-button @click="showLocationDialog = false">{{ $t('common.close') }}</el-button>
      </template>
    </el-dialog>


  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { useAutoLocation } from '@/composables/useAutoLocation'
import SchoolMap from '@/components/SchoolMap.vue'
import MapView from '@/components/MapView.vue'
import {
  School,
  Location,
  Refresh,
  Search,
  LocationInformation,
  Phone,
  ChatLineSquare,
  Guide,
  Link,
  List
} from '@element-plus/icons-vue'

export default {
  name: 'Schools',
  components: {
    SchoolMap,
    MapView,
    School,
    Location,
    Refresh,
    Search,
    LocationInformation,
    Phone,
    ChatLineSquare,
    Guide,
    Link,
    List
  },
  setup() {
    const { t } = useI18n()
    const loading = ref(false)

    // 使用自动定位组合式函数
    const {
      locating,
      userLocation,
      autoLocate,
      manualLocate,
      hasLocation
    } = useAutoLocation({
      onLocationSuccess: (location) => {
        // 定位成功后自动获取驾校列表
        fetchSchools()
      }
    })

    // 移动端检测
    const isMobile = ref(false)

    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 768
    }

    onMounted(() => {
      checkMobile()
      window.addEventListener('resize', checkMobile)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile)
    })
    const schools = ref([])
    const searchKeyword = ref('')
    const filterPartner = ref(null)
    const sortBy = ref('default')
    const distanceFilter = ref(null) // 距离筛选
    const currentPage = ref(1)
    const pageSize = ref(12)
    const totalSchools = ref(0)
    const viewMode = ref('list') // 'list' 或 'map'
    const includeGooglePlaces = ref(true) // 是否包含Google Places数据
    
    const schoolDetailVisible = ref(false)
    const selectedSchool = ref(null)

    // 位置设置相关
    const showLocationDialog = ref(false)
    const locationTab = ref('current')
    const selectedTestLocation = ref('')
    const customLocation = ref({
      latitude: null,
      longitude: null
    })



    // 测试位置数据
    const testLocations = ref([
      {
        name: t('schools.testLocation.bangkok'),
        latitude: 13.7563,
        longitude: 100.5018
      },
      {
        name: t('schools.testLocation.chiangMai'),
        latitude: 18.7883,
        longitude: 98.9853
      },
      {
        name: t('schools.testLocation.phuket'),
        latitude: 7.8804,
        longitude: 98.3923
      },
      {
        name: t('schools.testLocation.pattaya'),
        latitude: 12.9236,
        longitude: 100.8825
      },
      {
        name: t('schools.testLocation.huaHin'),
        latitude: 12.5664,
        longitude: 99.9581
      }
    ])

    // 获取驾校列表
    const fetchSchools = async () => {
      try {
        loading.value = true

        // 如果有用户位置，使用nearby接口获取带距离的数据
        if (userLocation.value) {
          const params = {
            lat: userLocation.value.latitude,
            lng: userLocation.value.longitude,
            radius: 50, // 50公里范围
            includeFoursquare: includeGooglePlaces.value
          }

          const response = await api.schools.getNearby(params)
          let allSchools = response.data.schools

          // 应用搜索筛选
          if (searchKeyword.value) {
            const keyword = searchKeyword.value.toLowerCase()
            allSchools = allSchools.filter(school =>
              school.name.toLowerCase().includes(keyword) ||
              (school.address && school.address.toLowerCase().includes(keyword)) ||
              (school.description && school.description.toLowerCase().includes(keyword))
            )
          }

          // 应用合作伙伴筛选
          if (filterPartner.value !== null) {
            allSchools = allSchools.filter(school => school.isPartner === filterPartner.value)
          }

          // 应用距离筛选
          if (distanceFilter.value) {
            const maxDistance = parseFloat(distanceFilter.value)
            allSchools = allSchools.filter(school =>
              school.distance && school.distance <= maxDistance
            )
          }

          // 应用排序
          if (sortBy.value === 'distance') {
            allSchools.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
          } else if (sortBy.value === 'name') {
            allSchools.sort((a, b) => a.name.localeCompare(b.name))
          }

          // 应用分页
          const startIndex = (currentPage.value - 1) * pageSize.value
          const endIndex = startIndex + pageSize.value
          schools.value = allSchools.slice(startIndex, endIndex)
          totalSchools.value = allSchools.length

        } else {
          // 没有用户位置时，使用普通接口
          const params = {
            page: currentPage.value,
            limit: pageSize.value
          }

          if (searchKeyword.value) {
            params.search = searchKeyword.value
          }

          if (filterPartner.value !== null) {
            params.isPartner = filterPartner.value
          }

          const response = await api.schools.getAll(params)
          schools.value = response.data.schools
          totalSchools.value = response.data.pagination.total
        }
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('schools.fetchSchoolsFailed'))
      } finally {
        loading.value = false
      }
    }

    // 计算两点间距离（使用 Haversine 公式）
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371 // 地球半径（公里）
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLon = (lon2 - lon1) * Math.PI / 180
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    }

    // 格式化距离
    const formatDistance = (distance) => {
      if (!distance) return ''
      if (distance < 1) {
        return `${Math.round(distance * 1000)}${t('schools.meters')}`
      } else {
        return `${distance.toFixed(1)}${t('schools.kilometers')}`
      }
    }

    // 获取当前位置（手动触发）
    const getCurrentLocation = async () => {
      try {
        await manualLocate()
      } catch (error) {
        console.error('手动获取位置失败:', error)
      }
    }

    // 搜索附近驾校
    const searchNearby = async () => {
      if (!userLocation.value) {
        ElMessage.warning(t('schools.pleaseGetLocationFirst'))
        return
      }

      try {
        loading.value = true
        const response = await api.schools.getNearby({
          lat: userLocation.value.latitude,
          lng: userLocation.value.longitude,
          radius: 20, // 20公里范围
          includeFoursquare: includeGooglePlaces.value
        })

        schools.value = response.data.schools
        totalSchools.value = response.data.schools.length

        // 显示数据源信息
        if (response.data.sources) {
          const { local, googlePlaces } = response.data.sources
          console.log(`Found ${local} local schools and ${googlePlaces} Google Places schools`)

          if (googlePlaces > 0) {
            ElMessage.success(t('schools.foundNearbySchoolsWithGooglePlaces', {
              total: schools.value.length,
              local,
              googlePlaces
            }))
          } else {
            ElMessage.success(t('schools.foundNearbySchools', { count: schools.value.length }))
          }
        } else {
          ElMessage.success(t('schools.foundNearbySchools', { count: schools.value.length }))
        }
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('schools.searchNearbyFailed'))
      } finally {
        loading.value = false
      }
    }

    // 搜索处理
    const handleSearch = () => {
      currentPage.value = 1
      fetchSchools()
    }

    // 合作伙伴筛选
    const handlePartnerFilter = () => {
      currentPage.value = 1
      fetchSchools()
    }

    // 排序处理
    const handleSort = () => {
      if (sortBy.value === 'distance' && !userLocation.value) {
        ElMessage.warning(t('schools.pleaseGetLocationFirst'))
        sortBy.value = 'default'
        return
      }
      fetchSchools()
    }

    // 距离筛选处理
    const handleDistanceFilter = () => {
      if (distanceFilter.value && !userLocation.value) {
        ElMessage.warning(t('schools.pleaseGetLocationFirst'))
        distanceFilter.value = null
        return
      }
      currentPage.value = 1
      fetchSchools()
    }

    // 清除筛选
    const clearFilters = () => {
      searchKeyword.value = ''
      filterPartner.value = null
      sortBy.value = 'default'
      distanceFilter.value = null
      currentPage.value = 1
      fetchSchools()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      fetchSchools()
    }

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      fetchSchools()
    }

    // 查看驾校详情
    const viewSchoolDetail = (school) => {
      console.log('Schools.vue viewSchoolDetail 被调用:', school);
      selectedSchool.value = school
      schoolDetailVisible.value = true
      console.log('详情对话框状态:', schoolDetailVisible.value);
    }

    // 拨打电话
    const callSchool = (school) => {
      if (school.phone) {
        window.location.href = `tel:${school.phone}`
      } else {
        ElMessage.warning(t('messages.warning'))
      }
    }

    // 导航到驾校
    const navigateToSchool = (school) => {
      if (school.latitude && school.longitude) {
        const url = `https://www.google.com/maps?q=${school.latitude},${school.longitude}`
        window.open(url, '_blank')
      } else {
        ElMessage.warning(t('messages.warning'))
      }
    }

    // 访问网站
    const visitWebsite = (school) => {
      if (school.websiteUrl) {
        window.open(school.websiteUrl, '_blank')
      } else {
        ElMessage.warning(t('messages.warning'))
      }
    }

    // 刷新驾校列表
    const refreshSchools = () => {
      fetchSchools()
    }

    // 关闭详情对话框
    const handleCloseSchoolDetail = () => {
      schoolDetailVisible.value = false
      selectedSchool.value = null
    }

    // 视图模式切换
    const handleViewModeChange = (mode) => {
      viewMode.value = mode
    }

    // Google Places集成开关
    const handleGooglePlacesToggle = (value) => {
      includeGooglePlaces.value = value
      // 如果当前有用户位置，重新搜索附近驾校
      if (userLocation.value) {
        searchNearby()
      }
    }

    // 位置设置相关方法
    const handleCloseLocationDialog = () => {
      showLocationDialog.value = false
    }

    const handleLocationTabChange = (tab) => {
      locationTab.value = tab
    }

    const handleTestLocationChange = (locationName) => {
      const location = testLocations.value.find(loc => loc.name === locationName)
      if (location) {
        userLocation.value = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.name
        }
        ElMessage.success(t('schools.testLocationSet', { location: location.name }))
        fetchSchools() // 重新获取驾校列表
        showLocationDialog.value = false
      }
    }

    const applyCustomLocation = () => {
      if (isValidCustomLocation.value) {
        userLocation.value = {
          latitude: customLocation.value.latitude,
          longitude: customLocation.value.longitude,
          address: `${t('schools.customLocation')}: ${customLocation.value.latitude.toFixed(6)}, ${customLocation.value.longitude.toFixed(6)}`
        }
        ElMessage.success(t('schools.customLocationSet'))
        fetchSchools() // 重新获取驾校列表
        showLocationDialog.value = false
      }
    }



    // 计算属性：验证自定义位置是否有效
    const isValidCustomLocation = computed(() => {
      return customLocation.value.latitude !== null &&
             customLocation.value.longitude !== null &&
             customLocation.value.latitude >= -90 &&
             customLocation.value.latitude <= 90 &&
             customLocation.value.longitude >= -180 &&
             customLocation.value.longitude <= 180
    })

    // 计算属性：选中驾校的地图标记
    const selectedSchoolMarker = computed(() => {
      if (!selectedSchool.value || !selectedSchool.value.latitude || !selectedSchool.value.longitude) {
        return null
      }

      return {
        latitude: selectedSchool.value.latitude,
        longitude: selectedSchool.value.longitude,
        name: selectedSchool.value.name,
        address: selectedSchool.value.address,
        id: selectedSchool.value.id,
        source: selectedSchool.value.source,
        isPartner: selectedSchool.value.isPartner,
        phone: selectedSchool.value.phone,
        websiteUrl: selectedSchool.value.websiteUrl
      }
    })

    // 详情地图准备就绪处理
    const handleDetailMapReady = (map) => {
      console.log('驾校详情地图已准备就绪')
    }

    onMounted(async () => {
      // 首次进入页面时自动获取位置（静默模式）
      await autoLocate()
      // 获取驾校列表
      fetchSchools()
    })

    return {
      loading,
      locating,
      schools,
      isMobile,
      searchKeyword,
      filterPartner,
      sortBy,
      distanceFilter,
      currentPage,
      pageSize,
      totalSchools,
      schoolDetailVisible,
      selectedSchool,
      userLocation,
      viewMode,
      includeGooglePlaces,
      formatDistance,
      getCurrentLocation,
      searchNearby,
      handleSearch,
      handlePartnerFilter,
      handleSort,
      handleDistanceFilter,
      clearFilters,
      handleSizeChange,
      handleCurrentChange,
      viewSchoolDetail,
      callSchool,
      navigateToSchool,
      visitWebsite,
      refreshSchools,
      handleCloseSchoolDetail,
      handleViewModeChange,
      handleGooglePlacesToggle,
      // 位置设置相关
      showLocationDialog,
      locationTab,
      selectedTestLocation,
      customLocation,
      testLocations,
      isValidCustomLocation,
      handleCloseLocationDialog,
      handleLocationTabChange,
      handleTestLocationChange,
      applyCustomLocation,
      // 详情地图相关
      selectedSchoolMarker,
      handleDetailMapReady,
      // 图标
      School,
      Location,
      Refresh,
      Search,
      LocationInformation,
      Phone,
      ChatLineSquare,
      Guide,
      Link,
      List
    }
  }
}
</script>

<style lang="scss" scoped>
.schools-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

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

.header-actions {
  display: flex;
  gap: 12px;
}

.filter-section {
  margin-bottom: 24px;
}

.filter-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.view-toggle {
  margin-left: auto;
}

.google-places-toggle {
  display: flex;
  align-items: center;
}

.map-section {
  margin-bottom: 24px;
}

.location-info {
  margin-bottom: 24px;
}

.location-card {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--el-color-primary);

  .el-icon {
    font-size: 20px;
  }

  span {
    flex: 1;
    font-weight: 500;
  }

  .location-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.empty-state {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .empty-icon {
    font-size: 64px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 20px;
  }

  h3 {
    color: var(--el-text-color-primary);
    margin-bottom: 10px;
  }

  p {
    color: var(--el-text-color-regular);
    margin-bottom: 20px;
  }
}

.schools-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.schools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.school-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.school-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.school-logo {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .el-icon {
    font-size: 28px;
    color: var(--el-text-color-placeholder);
  }
}

.school-info {
  flex: 1;
}

.school-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
  line-height: 1.3;
}

.school-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.distance-tag {
  font-size: 12px;
  color: var(--el-color-info);
  background: var(--el-color-info-light-9);
  padding: 2px 6px;
  border-radius: 4px;
}

.school-content {
  margin-bottom: 16px;
}

.school-address {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--el-text-color-regular);

  .el-icon {
    color: var(--el-color-primary);
  }
}

.school-description {
  color: var(--el-text-color-regular);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.school-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);

  .el-icon {
    color: var(--el-color-primary);
  }
}

.school-actions {
  display: flex;
  gap: 8px;
}

/* 分页组件响应式优化 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--el-border-color-lighter);

  .responsive-pagination {
    max-width: 100%;
    overflow-x: auto;

    /* 隐藏滚动条但保持滚动功能 */
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

.school-detail-content {
  .detail-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .detail-logo {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    overflow: hidden;
    background: var(--el-fill-color-light);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .el-icon {
      font-size: 36px;
      color: var(--el-text-color-placeholder);
    }
  }

  .detail-info {
    flex: 1;
  }

  .detail-name {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .detail-badges {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .distance-info {
    font-size: 14px;
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .detail-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      font-weight: 500;
      color: var(--el-text-color-regular);
      min-width: 60px;
    }

    span {
      color: var(--el-text-color-primary);
    }
  }

  .description-text {
    line-height: 1.6;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-lighter);
    padding: 16px;
    border-radius: 6px;
  }

  .map-placeholder {
    text-align: center;
    padding: 40px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;
    color: var(--el-text-color-regular);

    .el-icon {
      font-size: 48px;
      color: var(--el-text-color-placeholder);
      margin-bottom: 12px;
    }

    p {
      margin: 8px 0;
    }
  }

  .detail-map-container {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    background: var(--el-bg-color);

    .coordinates-info {
      padding: 8px 12px;
      background: var(--el-fill-color-lighter);
      border-top: 1px solid var(--el-border-color-lighter);
      text-align: center;

      small {
        color: var(--el-text-color-regular);
        font-size: 12px;
      }
    }
  }

  .detail-actions {
    display: flex;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

@media (max-width: 768px) {
  .schools-page {
    /* 移除重复的padding，由AppLayout的page-content处理 */
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }

  .schools-grid {
    grid-template-columns: 1fr;
  }

  .school-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .detail-header {
    flex-direction: column;
    text-align: center;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-actions {
    flex-direction: column;
  }
}

/* 位置设置对话框样式 */
.location-settings {
  .location-option {
    text-align: center;
    padding: 20px;
  }

  .current-location-info {
    margin-top: 16px;
    padding: 16px;
    background: var(--el-color-success-light-9);
    border-radius: 8px;
    border: 1px solid var(--el-color-success-light-7);

    p {
      margin: 4px 0;
      font-size: 14px;
      color: var(--el-text-color-regular);

      &:first-child {
        font-weight: 500;
        color: var(--el-color-success);
      }
    }
  }

  .test-locations {
    .test-location-item {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }

      .location-info {
        .location-name {
          font-weight: 500;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
        }

        .location-coords {
          font-size: 12px;
          color: var(--el-text-color-secondary);
        }
      }
    }
  }

  .custom-location {
    padding: 20px;
  }
}

/* 移动端对话框优化 */
.mobile-dialog {
  :deep(.el-dialog) {
    margin: 0 !important;
    max-height: 100vh;
    border-radius: 0;
    width: 100% !important;

    .el-dialog__header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--el-border-color-light);

      .el-dialog__title {
        font-size: 18px;
        font-weight: 600;
      }

      .el-dialog__headerbtn {
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;

        .el-dialog__close {
          font-size: 20px;
        }
      }
    }

    .el-dialog__body {
      padding: 20px;
      max-height: calc(100vh - 140px);
      overflow-y: auto;
    }

    .el-dialog__footer {
      padding: 16px 20px;
      border-top: 1px solid var(--el-border-color-light);
      background: var(--el-bg-color-page);
    }
  }
}

/* 移动端操作按钮优化 */
.mobile-actions {
  flex-direction: column;
  gap: 12px;

  .action-button {
    width: 100%;
    height: 48px;
    font-size: 16px;
  }
}

/* 移动端详情内容优化 */
@media (max-width: 768px) {
  .school-detail-content {
    .detail-header {
      flex-direction: column;
      text-align: center;
      gap: 16px;

      .detail-logo {
        align-self: center;
      }

      .detail-info {
        .detail-name {
          font-size: 20px;
        }

        .detail-badges {
          justify-content: center;
        }
      }
    }

    .detail-grid {
      grid-template-columns: 1fr;
      gap: 16px;

      .detail-item {
        padding: 16px;
        background: var(--el-fill-color-lighter);
        border-radius: 8px;

        label {
          font-size: 14px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          margin-bottom: 8px;
          display: block;
        }

        span, p {
          font-size: 16px;
          line-height: 1.5;
        }
      }
    }

    .detail-actions {
      margin-top: 24px;
    }
  }

  .location-settings {
    .location-option {
      padding: 16px;
    }

    .test-locations {
      .test-location-item {
        margin-bottom: 12px;
        padding: 16px;

        .location-info {
          .location-name {
            font-size: 16px;
            margin-bottom: 8px;
          }

          .location-coords {
            font-size: 14px;
          }
        }
      }
    }

    .custom-location {
      padding: 16px;
    }
  }

  .pagination-container {
    margin-top: 16px;
    padding-top: 16px;

    .responsive-pagination {
      :deep(.el-pagination) {
        justify-content: center;
        flex-wrap: nowrap;

        .el-pager {
          li {
            min-width: 32px;
            height: 32px;
            line-height: 32px;
            font-size: 14px;
            margin: 0 2px;
          }
        }

        .btn-prev,
        .btn-next {
          min-width: 32px;
          height: 32px;
          line-height: 32px;
          font-size: 14px;
          margin: 0 2px;
        }

        .el-pagination__total,
        .el-pagination__sizes,
        .el-pagination__jump {
          display: none; /* 在移动端隐藏这些元素 */
        }
      }
    }
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .pagination-container {
    .responsive-pagination {
      :deep(.el-pagination) {
        .el-pager {
          li {
            min-width: 28px;
            height: 28px;
            line-height: 28px;
            font-size: 12px;
            margin: 0 1px;
          }
        }

        .btn-prev,
        .btn-next {
          min-width: 28px;
          height: 28px;
          line-height: 28px;
          font-size: 12px;
          margin: 0 1px;
        }
      }
    }
  }
}
</style>
