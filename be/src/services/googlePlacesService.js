const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseURL = 'https://places.googleapis.com/v1/places';
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found in environment variables');
    } else {
      console.log('Google Maps API key loaded:', this.apiKey.substring(0, 10) + '...');
    }

    // Google Places API配置
    const clientConfig = {
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey
      },
      timeout: 30000
    };



    this.client = axios.create(clientConfig);
  }

  /**
   * 搜索附近的驾校
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @param {number} radius - 搜索半径（米）
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 驾校列表
   */
  async searchNearbyDrivingSchools(latitude, longitude, radius = 5000, limit = 20) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      // 使用文本搜索来查找驾校，因为Google Places API没有driving_school类型
      const requestBody = {
        textQuery: 'driving school',
        maxResultCount: Math.min(limit, 20),
        locationBias: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude
            },
            radius: radius
          }
        }
      };

      const headers = {
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.priceLevel,places.photos,places.currentOpeningHours,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri'
      };

      console.log('Google Places API request:', {
        url: `${this.baseURL}:searchText`,
        body: requestBody,
        headers: headers
      });

      const response = await this.client.post(':searchText', requestBody, { headers });

      console.log('Google Places API response:', {
        status: response.status,
        resultCount: response.data.places?.length || 0
      });

      return this.formatDrivingSchools(response.data.places || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Google Places API error:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });

        // 如果是API配额用完或其他API错误，返回空数组而不是抛出错误
        if (error.response?.status === 429) {
          console.warn('Google Places API rate limit exceeded');
        } else if (error.code === 'ECONNABORTED') {
          console.warn('Google Places API request timeout');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          console.warn('Google Places API connection failed');
        }
      }

      return [];
    }
  }

  /**
   * 获取地点详细信息
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>} 地点详细信息
   */
  async getPlaceDetails(placeId) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const headers = {
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,businessStatus,priceLevel,photos,currentOpeningHours,regularOpeningHours,websiteUri,nationalPhoneNumber,internationalPhoneNumber,googleMapsUri,reviews,editorialSummary'
      };

      const response = await this.client.get(`/${placeId}`, { headers });
      return this.formatDrivingSchool(response.data);
    } catch (error) {
      console.error('Google Places place details error:', error.message);
      return null;
    }
  }

  /**
   * 格式化驾校数据列表
   * @param {Array} places - Google Places返回的地点数据
   * @returns {Array} 格式化后的驾校数据
   */
  formatDrivingSchools(places) {
    return places.map(place => this.formatDrivingSchool(place));
  }

  /**
   * 格式化单个驾校数据
   * @param {Object} place - Google Places地点数据
   * @returns {Object} 格式化后的驾校数据
   */
  formatDrivingSchool(place) {
    const location = place.location || {};
    const photos = place.photos || [];
    
    // 计算距离（如果有的话）
    let distance = null;
    if (place.distance) {
      distance = place.distance;
    }

    return {
      id: `gmp_${place.id}`, // 添加前缀以区分Google Maps数据
      googlePlaceId: place.id,
      name: place.displayName?.text || place.name,
      address: place.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      phone: place.nationalPhoneNumber || place.internationalPhoneNumber,
      website: place.websiteUri,
      description: place.editorialSummary?.text || '',
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      businessStatus: place.businessStatus,
      distance: distance, // 距离（米）
      logoUrl: photos.length > 0 ? this.getPhotoUrl(photos[0], 300, 300) : null,
      photos: photos.slice(0, 5).map(photo => ({
        url: this.getPhotoUrl(photo, 300, 300),
        original: this.getPhotoUrl(photo, 1600, 1200)
      })),
      openingHours: this.formatOpeningHours(place.currentOpeningHours || place.regularOpeningHours),
      googleMapsUri: place.googleMapsUri,
      source: 'google_places', // 标识数据来源
      isPartner: false, // Google Places数据不是合作伙伴
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 获取照片URL
   * @param {Object} photo - 照片对象
   * @param {number} maxWidth - 最大宽度
   * @param {number} maxHeight - 最大高度
   * @returns {string} 照片URL
   */
  getPhotoUrl(photo, maxWidth = 400, maxHeight = 400) {
    if (!photo || !photo.name) return null;
    
    // Google Places Photo API URL
    return `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}&key=${this.apiKey}`;
  }

  /**
   * 格式化营业时间
   * @param {Object} openingHours - 营业时间对象
   * @returns {Object} 格式化后的营业时间
   */
  formatOpeningHours(openingHours) {
    if (!openingHours) return null;

    return {
      openNow: openingHours.openNow,
      periods: openingHours.periods || [],
      weekdayDescriptions: openingHours.weekdayDescriptions || []
    };
  }

  /**
   * 搜索驾校（文本搜索）
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @param {string} query - 搜索关键词
   * @param {number} radius - 搜索半径（米）
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 驾校列表
   */
  async searchPlaces(latitude, longitude, query = 'driving school', radius = 10000, limit = 20) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const requestBody = {
        textQuery: `driving school ${query}`,  // 确保搜索驾校
        maxResultCount: Math.min(limit, 20),
        locationBias: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude
            },
            radius: radius
          }
        }
      };

      const headers = {
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.priceLevel,places.photos,places.currentOpeningHours,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri'
      };

      const response = await this.client.post(':searchText', requestBody, { headers });

      // 直接返回结果，因为已经在API级别限制了类型
      const results = response.data.places || [];
      return this.formatDrivingSchools(results);
    } catch (error) {
      console.error('Google Places text search error:', error.message);
      return [];
    }
  }
}

module.exports = new GooglePlacesService();
