const axios = require('axios');

/**
 * IP地理位置服务
 * 使用免费的IP地理位置API获取用户的大概位置信息
 */
class IPGeolocationService {
  constructor() {
    // 主要使用ip-api.com，备用其他服务
    this.primaryEndpoint = 'http://ip-api.com/json';
    this.backupEndpoints = [
      'https://ipapi.co/json/',
      'https://api.ipify.org?format=json' // 仅获取IP，需要配合其他服务
    ];



    // 请求超时时间
    this.timeout = 5000;

    // 缓存，避免频繁请求同一IP
    this.cache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1小时缓存
  }

  /**
   * 从请求中获取客户端IP地址
   * @param {Object} req - Express请求对象
   * @returns {string} IP地址
   */
  getClientIP(req) {
    // 优先从代理头获取真实IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for 可能包含多个IP，取第一个
      return forwarded.split(',')[0].trim();
    }
    
    // 其他可能的代理头
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }
    
    // 直接连接的IP
    return req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip;
  }

  /**
   * 检查是否为本地IP地址
   * @param {string} ip - IP地址
   * @returns {boolean} 是否为本地IP
   */
  isLocalIP(ip) {
    if (!ip) return false;
    return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
  }

  /**
   * 清理和标准化IP地址
   * @param {string} ip - 原始IP地址
   * @returns {string} 清理后的IP地址
   */
  cleanIP(ip) {
    if (!ip) return null;

    // 移除IPv6前缀
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    return ip;
  }

  /**
   * 检查是否为私有IP地址
   * @param {string} ip - IP地址
   * @returns {boolean} 是否为私有IP
   */
  isPrivateIP(ip) {
    if (!ip) return false;

    // 私有IP地址范围
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
      /^::1$/,                    // IPv6 localhost
      /^fe80:/,                   // IPv6 link-local
      /^fc00:/,                   // IPv6 unique local
      /^fd00:/                    // IPv6 unique local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * 获取默认位置信息（用于私有IP或无法获取位置的情况）
   * @returns {Object} 默认位置信息
   */
  getDefaultLocation() {
    return {
      success: true,
      ip: 'private',
      country: '中国',
      countryCode: 'CN',
      region: '北京市',
      city: '北京',
      latitude: 39.9042,
      longitude: 116.4074,
      timezone: 'Asia/Shanghai',
      address: '中国, 北京市, 北京',
      source: 'default',
      isDefault: true
    };
  }

  /**
   * 检查缓存中是否有该IP的位置信息
   * @param {string} ip - IP地址
   * @returns {Object|null} 缓存的位置信息或null
   */
  getCachedLocation(ip) {
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * 缓存位置信息
   * @param {string} ip - IP地址
   * @param {Object} data - 位置数据
   */
  setCachedLocation(ip, data) {
    this.cache.set(ip, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 获取本机真实IP地理位置信息（用于localhost访问）
   * @returns {Promise<Object>} 位置信息
   */
  async getLocationFromRealIP() {
    try {
      console.log('获取本机真实IP地理位置信息');

      // 首先获取真实IP地址
      const ipResponse = await axios.get('https://api.ipify.org?format=json', {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'DriveEasy-Pass/1.0'
        }
      });

      const realIP = ipResponse.data.ip;
      console.log('获取到真实IP:', realIP);

      // 使用真实IP获取地理位置信息
      const locationData = await this.getLocationFromIPAPI(realIP);

      return {
        ...locationData,
        source: 'real-ip-api',
        realIP: realIP
      };
    } catch (error) {
      console.error('获取真实IP地理位置失败:', error.message);
      throw error;
    }
  }



  /**
   * 使用ip-api.com获取位置信息
   * @param {string} ip - IP地址
   * @returns {Promise<Object>} 位置信息
   */
  async getLocationFromIPAPI(ip) {
    try {
      const url = ip ? `${this.primaryEndpoint}/${ip}` : this.primaryEndpoint;
      const response = await axios.get(url, {
        timeout: this.timeout,
        params: {
          fields: 'status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp'
        }
      });

      const data = response.data;

      if (data.status !== 'success') {
        throw new Error(data.message || 'IP地理位置查询失败');
      }

      return {
        success: true,
        ip: data.query || ip,
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        address: this.formatAddress(data),
        source: 'ip-api.com'
      };
    } catch (error) {
      console.error('IP-API查询失败:', error.message);
      throw error;
    }
  }

  /**
   * 格式化地址字符串
   * @param {Object} data - 位置数据
   * @returns {string} 格式化的地址
   */
  formatAddress(data) {
    const parts = [];
    
    if (data.country) parts.push(data.country);
    if (data.regionName) parts.push(data.regionName);
    if (data.city) parts.push(data.city);
    
    return parts.join(', ') || '未知位置';
  }

  /**
   * 获取IP地理位置信息
   * @param {string} ip - IP地址（可选，不提供则获取当前请求IP）
   * @returns {Promise<Object>} 位置信息
   */
  async getLocation(ip = null) {
    try {
      // 清理IP地址
      const cleanedIP = this.cleanIP(ip);

      // 检查是否为本地IP地址（localhost）
      if (this.isLocalIP(cleanedIP) || this.isLocalIP(ip)) {
        console.log('检测到本地IP地址，使用百度API获取真实位置');

        // 检查缓存（使用特殊的localhost缓存键）
        const cached = this.getCachedLocation('localhost');
        if (cached) {
          console.log('返回localhost缓存的位置信息');
          return { ...cached, fromCache: true };
        }

        try {
          // 使用真实IP API获取本机真实IP和位置
          const locationData = await this.getLocationFromRealIP();

          // 缓存结果（使用localhost作为缓存键）
          this.setCachedLocation('localhost', locationData);

          return locationData;
        } catch (realIPError) {
          console.warn('真实IP API获取位置失败，回退到默认位置:', realIPError.message);
          return this.getDefaultLocation();
        }
      }

      if (!cleanedIP) {
        console.log('无效IP地址，返回默认位置');
        return this.getDefaultLocation();
      }

      // 检查是否为私有IP地址
      if (this.isPrivateIP(cleanedIP)) {
        console.log(`私有IP地址 ${cleanedIP}，返回默认位置`);
        return this.getDefaultLocation();
      }

      // 检查缓存
      const cached = this.getCachedLocation(cleanedIP);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      // 尝试获取位置信息
      const locationData = await this.getLocationFromIPAPI(cleanedIP);

      // 缓存结果
      this.setCachedLocation(cleanedIP, locationData);

      return locationData;
    } catch (error) {
      console.error('获取IP地理位置失败:', error);

      // 如果是私有IP范围错误，返回默认位置
      if (error.message && error.message.includes('private range')) {
        console.log('检测到私有IP范围错误，返回默认位置');
        return this.getDefaultLocation();
      }

      // 其他错误也返回默认位置，而不是失败
      console.log('IP地理位置查询失败，返回默认位置');
      return this.getDefaultLocation();
    }
  }

  /**
   * 从Express请求获取地理位置
   * @param {Object} req - Express请求对象
   * @returns {Promise<Object>} 位置信息
   */
  async getLocationFromRequest(req) {
    const clientIP = this.getClientIP(req);
    console.log('客户端IP:', clientIP);
    
    return await this.getLocation(clientIP);
  }

  /**
   * 清理缓存中过期的条目
   */
  cleanupCache() {
    const now = Date.now();
    for (const [ip, cached] of this.cache.entries()) {
      if (now - cached.timestamp >= this.cacheExpiry) {
        this.cache.delete(ip);
      }
    }
  }
}

// 创建单例实例
const ipGeolocationService = new IPGeolocationService();

// 定期清理缓存
setInterval(() => {
  ipGeolocationService.cleanupCache();
}, 30 * 60 * 1000); // 每30分钟清理一次

module.exports = ipGeolocationService;
