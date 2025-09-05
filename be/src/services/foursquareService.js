const axios = require('axios');

class FoursquareService {
  constructor() {
    this.apiKey = process.env.FOURSQUARE_API_KEY;
    // 使用Legacy API v3端点
    this.baseURL = 'https://api.foursquare.com/v3/places';

    if (!this.apiKey) {
      console.warn('Foursquare API key not found in environment variables');
    } else {
      console.log('Foursquare API key loaded:', this.apiKey.substring(0, 10) + '...');
    }

    // Foursquare API配置

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': this.apiKey,  // Legacy API不使用Bearer前缀
        'Accept': 'application/json'
        // Legacy API不需要X-Places-Api-Version头部
      },
      timeout: 15000
    });
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
        throw new Error('Foursquare API key not configured');
      }

      const params = {
        ll: `${latitude},${longitude}`,
        radius: radius,
        query: 'driving school', // 搜索关键词
        limit: limit,
        fields: 'fsq_id,name,location,distance,tel,website,rating,price,photos,hours,description,categories'
      };

      console.log('Foursquare API request params:', params);
      console.log('Using API Key:', this.apiKey.substring(0, 10) + '...');
      console.log('Axios config:', {
        baseURL: this.client.defaults.baseURL,
        timeout: this.client.defaults.timeout
      });

      const response = await this.client.get('/search', { params });

      console.log('Foursquare API response:', {
        status: response.status,
        resultCount: response.data.results?.length || 0
      });

      return this.formatDrivingSchools(response.data.results || []);
    } catch (error) {
      console.error('Foursquare API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      // 如果是API配额用完或其他API错误，返回空数组而不是抛出错误
      if (error.response?.status === 429) {
        console.warn('Foursquare API rate limit exceeded');
      }

      return [];
    }
  }

  /**
   * 获取地点详细信息
   * @param {string} fsqId - Foursquare地点ID
   * @returns {Promise<Object>} 地点详细信息
   */
  async getPlaceDetails(fsqId) {
    try {
      if (!this.apiKey) {
        throw new Error('Foursquare API key not configured');
      }

      const params = {
        fields: 'fsq_id,name,location,tel,website,rating,price,photos,hours,description,social_media,email'
      };

      const response = await this.client.get(`/${fsqId}`, { params });
      return this.formatDrivingSchool(response.data);
    } catch (error) {
      console.error('Foursquare place details error:', error.message);
      return null;
    }
  }

  /**
   * 格式化驾校数据列表
   * @param {Array} places - Foursquare返回的地点数据
   * @returns {Array} 格式化后的驾校数据
   */
  formatDrivingSchools(places) {
    return places.map(place => this.formatDrivingSchool(place));
  }

  /**
   * 格式化单个驾校数据
   * @param {Object} place - Foursquare地点数据
   * @returns {Object} 格式化后的驾校数据
   */
  formatDrivingSchool(place) {
    const location = place.location || {};
    const photos = place.photos || [];
    
    return {
      id: `fsq_${place.fsq_id}`, // 添加前缀以区分Foursquare数据
      fsqId: place.fsq_id,
      name: place.name,
      address: location.formatted_address || 
               `${location.address || ''} ${location.locality || ''} ${location.region || ''}`.trim(),
      latitude: location.latitude,
      longitude: location.longitude,
      phone: place.tel,
      website: place.website,
      description: place.description,
      rating: place.rating,
      price: place.price,
      distance: place.distance, // 距离（米）
      logoUrl: photos.length > 0 ? `${photos[0].prefix}300x300${photos[0].suffix}` : null,
      photos: photos.map(photo => ({
        url: `${photo.prefix}300x300${photo.suffix}`,
        original: `${photo.prefix}original${photo.suffix}`
      })),
      hours: place.hours,
      source: 'foursquare', // 标识数据来源
      isPartner: false, // Foursquare数据不是合作伙伴
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 搜索通用地点（用于更广泛的搜索）
   * @param {number} latitude - 纬度
   * @param {number} longitude - 经度
   * @param {string} query - 搜索关键词
   * @param {number} radius - 搜索半径（米）
   * @param {number} limit - 返回结果数量限制
   * @returns {Promise<Array>} 地点列表
   */
  async searchPlaces(latitude, longitude, query = 'driving school', radius = 10000, limit = 20) {
    try {
      if (!this.apiKey) {
        throw new Error('Foursquare API key not configured');
      }

      const params = {
        ll: `${latitude},${longitude}`,
        query: query,
        radius: radius,
        limit: limit,
        fields: 'fsq_id,name,location,distance,tel,website,rating,price,photos,categories'
      };

      const response = await this.client.get('/search', { params });
      
      // 过滤出可能是驾校的地点
      const results = response.data.results || [];
      const drivingSchools = results.filter(place => {
        const categories = place.categories || [];
        const name = place.name.toLowerCase();
        
        // 检查分类或名称中是否包含驾校相关关键词
        return categories.some(cat => 
          cat.name.toLowerCase().includes('driving') || 
          cat.name.toLowerCase().includes('school')
        ) || 
        name.includes('driving') || 
        name.includes('school') ||
        name.includes('驾校') ||
        name.includes('驾驶') ||
        name.includes('学车');
      });

      return this.formatDrivingSchools(drivingSchools);
    } catch (error) {
      console.error('Foursquare places search error:', error.message);
      return [];
    }
  }
}

module.exports = new FoursquareService();
