import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'
import geocodingService from '@/utils/geocoding'

/**
 * 自动定位组合式函数
 * 提供首次进入页面时的自动IP定位功能
 * 可在多个页面间复用
 */
export function useAutoLocation(options = {}) {
  const {
    silent = false, // 是否静默模式（不显示消息提示）
    onLocationSuccess = null, // 定位成功回调
    onLocationError = null, // 定位失败回调
    autoTrigger = true // 是否自动触发定位
  } = options

  const locating = ref(false)
  const userLocation = ref(null)

  /**
   * 获取当前位置（基于IP的自动定位逻辑）
   * 优先使用浏览器精确定位，失败后回退到IP定位
   */
  const getCurrentLocation = async () => {
    try {
      locating.value = true
      if (!silent) {
        ElMessage.info('正在获取位置信息...')
      }

      // 检查是否为HTTPS环境
      const isHttps = window.location.protocol === 'https:'

      if (isHttps) {
        // HTTPS环境，尝试使用浏览器地理位置API
        try {
          const locationData = await geocodingService.getCurrentLocationWithAddress()

          console.log('浏览器获取到的位置信息:', locationData)
          
          userLocation.value = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            address: locationData.address,
            source: 'browser'
          }

          if (!silent) {
            ElMessage.success(`精确位置: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`)
          }

          // 调用成功回调
          if (onLocationSuccess) {
            onLocationSuccess(userLocation.value)
          }

          return userLocation.value
        } catch (browserError) {
          console.warn('浏览器地理位置获取失败，尝试IP地理位置:', browserError)
        }
      }

      // HTTP环境或浏览器地理位置失败，使用IP地理位置服务
      try {
        // 检查是否为localhost访问
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '::1'

        let response

        if (isLocalhost) {
          // localhost访问，使用真实IP API获取真实位置
          console.log('检测到localhost访问，使用真实IP API获取真实位置')
          try {
            response = await api.geolocation.getLocalhost()
          } catch (localhostError) {
            console.warn('localhost定位失败，回退到普通定位:', localhostError)
            // 回退到普通定位逻辑
            try {
              response = await api.geolocation.getCurrent()
            } catch (authError) {
              response = await api.geolocation.getPublic()
            }
          }
        } else {
          // 非localhost访问，使用普通定位逻辑
          try {
            response = await api.geolocation.getCurrent()
          } catch (authError) {
            // 如果认证失败，使用公开接口
            response = await api.geolocation.getPublic()
          }
        }

        if (response.success) {
          const ipLocationData = response.data
          console.log('IP地理位置信息:', ipLocationData)

          userLocation.value = {
            latitude: ipLocationData.latitude,
            longitude: ipLocationData.longitude,
            address: ipLocationData.address || `${ipLocationData.city || ''}, ${ipLocationData.region || ''}, ${ipLocationData.country || ''}`,
            source: ipLocationData.source || 'ip',
            isDefault: ipLocationData.isDefault || false
          }

          // 根据数据源显示不同的消息
          let locationSource = '大概位置'
          if (ipLocationData.isDefault) {
            locationSource = '默认位置'
          } else if (ipLocationData.source === 'baidu-api') {
            locationSource = '真实位置'
          }

          if (!silent) {
            ElMessage.success(`${locationSource}获取成功: ${ipLocationData.address}`)
          }

          // 调用成功回调
          if (onLocationSuccess) {
            onLocationSuccess(userLocation.value)
          }

          return userLocation.value
        } else {
          throw new Error(response.message || 'IP地理位置获取失败')
        }
      } catch (ipError) {
        if (!silent) {
          ElMessage.warning('无法获取位置信息')
        }

        // 调用失败回调
        if (onLocationError) {
          onLocationError(ipError)
        }

        throw ipError
      }
    } catch (error) {
      if (!silent) {
        ElMessage.warning('无法获取位置信息')
      }

      // 调用失败回调
      if (onLocationError) {
        onLocationError(error)
      }

      throw error
    } finally {
      locating.value = false
    }
  }

  /**
   * 自动定位（首次进入页面时调用）
   * 静默模式，不显示过多提示信息
   */
  const autoLocate = async () => {
    try {
      // 临时设置为静默模式
      const originalSilent = silent
      const tempOptions = { ...options, silent: true }

      // 直接调用定位逻辑，但使用静默模式
      locating.value = true

      // 检查是否为HTTPS环境
      const isHttps = window.location.protocol === 'https:'

      if (isHttps) {
        // HTTPS环境，尝试使用浏览器地理位置API
        try {
          const locationData = await geocodingService.getCurrentLocationWithAddress()
          console.log('浏览器获取到的位置信息:', locationData)

          userLocation.value = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            address: locationData.address,
            source: 'browser'
          }

          // 调用成功回调
          if (onLocationSuccess) {
            onLocationSuccess(userLocation.value)
          }

          return userLocation.value
        } catch (browserError) {
          console.warn('浏览器地理位置获取失败，尝试IP地理位置:', browserError)
        }
      }

      // HTTP环境或浏览器地理位置失败，使用IP地理位置服务
      try {
        // 检查是否为localhost访问
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '::1'

        let response

        if (isLocalhost) {
          // localhost访问，使用百度API获取真实位置
          try {
            response = await api.geolocation.getLocalhost()
          } catch (localhostError) {
            // 回退到普通定位逻辑
            try {
              response = await api.geolocation.getCurrent()
            } catch (authError) {
              response = await api.geolocation.getPublic()
            }
          }
        } else {
          // 非localhost访问，使用普通定位逻辑
          try {
            response = await api.geolocation.getCurrent()
          } catch (authError) {
            response = await api.geolocation.getPublic()
          }
        }

        if (response.success) {
          const ipLocationData = response.data

          userLocation.value = {
            latitude: ipLocationData.latitude,
            longitude: ipLocationData.longitude,
            address: ipLocationData.address || `${ipLocationData.city || ''}, ${ipLocationData.region || ''}, ${ipLocationData.country || ''}`,
            source: 'ip',
            isDefault: ipLocationData.isDefault || false
          }

          // 调用成功回调
          if (onLocationSuccess) {
            onLocationSuccess(userLocation.value)
          }

          return userLocation.value
        }
      } catch (ipError) {
        // IP地理位置获取失败，静默处理
      }
    } catch (error) {
      // 自动定位失败时不显示错误信息，静默处理
    } finally {
      locating.value = false
    }
  }

  /**
   * 手动定位（用户主动点击获取位置时调用）
   * 显示详细的提示信息
   */
  const manualLocate = async () => {
    return await getCurrentLocation()
  }

  /**
   * 重置位置信息
   */
  const resetLocation = () => {
    userLocation.value = null
  }

  /**
   * 检查是否有位置信息
   */
  const hasLocation = () => {
    return userLocation.value && userLocation.value.latitude && userLocation.value.longitude
  }

  return {
    locating,
    userLocation,
    getCurrentLocation,
    autoLocate,
    manualLocate,
    resetLocation,
    hasLocation
  }
}
