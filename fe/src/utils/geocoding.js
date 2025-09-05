/**
 * 地理编码工具类
 * 提供经纬度与地址之间的转换功能
 */

class GeocodingService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  }

  /**
   * 获取用户当前位置
   * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置服务'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        },
        (error) => {
          let message = '获取位置失败'
          switch(error.code) {
            case error.PERMISSION_DENIED:
              message = '用户拒绝了位置权限请求'
              break
            case error.POSITION_UNAVAILABLE:
              message = '位置信息不可用'
              break
            case error.TIMEOUT:
              message = '获取位置超时'
              break
          }
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分钟缓存
        }
      )
    })
  }

  /**
   * 反向地理编码：将经纬度转换为地址
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @returns {Promise<string>} 格式化的地址
   */
  async reverseGeocode(latitude, longitude) {
    try {
      // 方法1：使用Google Maps Geocoding API（如果有API Key）
      if (this.apiKey) {
        return await this.reverseGeocodeWithGoogle(latitude, longitude)
      }
      
      // 方法2：使用浏览器内置的地理编码（如果Google Maps已加载）
      if (window.google && window.google.maps) {
        return await this.reverseGeocodeWithGoogleMaps(latitude, longitude)
      }
      
      // 方法3：使用免费的地理编码服务
      return await this.reverseGeocodeWithOpenStreetMap(latitude, longitude)
    } catch (error) {
      console.error('地理编码失败:', error)
      // 如果所有方法都失败，返回经纬度格式
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  }

  /**
   * 使用Google Geocoding API进行反向地理编码
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @returns {Promise<string>} 格式化的地址
   */
  async reverseGeocodeWithGoogle(latitude, longitude) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}&language=zh-CN`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address
    }
    
    throw new Error('Google Geocoding API failed')
  }

  /**
   * 使用Google Maps JavaScript API进行反向地理编码
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @returns {Promise<string>} 格式化的地址
   */
  async reverseGeocodeWithGoogleMaps(latitude, longitude) {
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder()
      const latlng = new google.maps.LatLng(latitude, longitude)
      
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results.length > 0) {
          resolve(results[0].formatted_address)
        } else {
          reject(new Error('Google Maps Geocoding failed'))
        }
      })
    })
  }

  /**
   * 使用OpenStreetMap Nominatim进行反向地理编码（免费服务）
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @returns {Promise<string>} 格式化的地址
   */
  async reverseGeocodeWithOpenStreetMap(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-CN,zh,en`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DriveEasy-Pass/1.0'
      }
    })
    
    const data = await response.json()
    
    if (data && data.display_name) {
      return data.display_name
    }
    
    throw new Error('OpenStreetMap Nominatim failed')
  }

  /**
   * 获取当前位置并转换为地址
   * @returns {Promise<{latitude: number, longitude: number, address: string}>}
   */
  async getCurrentLocationWithAddress() {
    const location = await this.getCurrentLocation()
    const address = await this.reverseGeocode(location.latitude, location.longitude)
    
    return {
      ...location,
      address
    }
  }

  /**
   * 格式化地址（简化长地址）
   * @param {string} address - 原始地址
   * @returns {string} 简化后的地址
   */
  formatAddress(address) {
    if (!address) return ''
    
    // 移除邮政编码
    address = address.replace(/\d{5,6}/g, '')
    
    // 移除国家信息
    address = address.replace(/中国|China/g, '')
    
    // 移除多余的逗号和空格
    address = address.replace(/,\s*,/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim()
    
    return address
  }
}

export default new GeocodingService()
