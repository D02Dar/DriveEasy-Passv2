const express = require('express');
const router = express.Router();
const ipGeolocationService = require('../services/ipGeolocationService');
const { authenticateToken } = require('../middleware/auth');

/**
 * 获取当前用户的IP地理位置
 * GET /api/geolocation/current
 */
router.get('/current', authenticateToken, async (req, res) => {
  try {
    console.log('获取IP地理位置请求');
    
    // 从请求中获取地理位置
    const locationData = await ipGeolocationService.getLocationFromRequest(req);
    
    if (!locationData.success) {
      return res.status(400).json({
        success: false,
        message: locationData.message || '无法获取地理位置',
        error: locationData.error
      });
    }

    // 返回位置信息
    res.json({
      success: true,
      message: '地理位置获取成功',
      data: {
        ip: locationData.ip,
        country: locationData.country,
        countryCode: locationData.countryCode,
        region: locationData.region,
        city: locationData.city,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timezone: locationData.timezone,
        address: locationData.address,
        source: locationData.source,
        fromCache: locationData.fromCache || false
      }
    });

  } catch (error) {
    console.error('获取IP地理位置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取指定IP的地理位置（管理员功能）
 * GET /api/geolocation/ip/:ip
 */
router.get('/ip/:ip', authenticateToken, async (req, res) => {
  try {
    // 检查是否为管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，仅管理员可查询指定IP'
      });
    }

    const { ip } = req.params;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP地址不能为空'
      });
    }

    console.log('查询指定IP地理位置:', ip);
    
    const locationData = await ipGeolocationService.getLocation(ip);
    
    if (!locationData.success) {
      return res.status(400).json({
        success: false,
        message: locationData.message || '无法获取地理位置',
        error: locationData.error
      });
    }

    res.json({
      success: true,
      message: '地理位置获取成功',
      data: locationData
    });

  } catch (error) {
    console.error('获取指定IP地理位置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取当前IP地理位置（公开接口，不需要认证）
 * GET /api/geolocation/public
 */
router.get('/public', async (req, res) => {
  try {
    console.log('获取公开IP地理位置请求');

    // 从请求中获取地理位置
    const locationData = await ipGeolocationService.getLocationFromRequest(req);

    if (!locationData.success) {
      return res.status(400).json({
        success: false,
        message: locationData.message || '无法获取地理位置',
        error: locationData.error
      });
    }

    // 返回位置信息（不包含IP地址等敏感信息）
    res.json({
      success: true,
      message: '地理位置获取成功',
      data: {
        country: locationData.country,
        countryCode: locationData.countryCode,
        region: locationData.region,
        city: locationData.city,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timezone: locationData.timezone,
        address: locationData.address,
        source: locationData.source,
        isDefault: locationData.isDefault || false,
        fromCache: locationData.fromCache || false
      }
    });

  } catch (error) {
    console.error('获取公开IP地理位置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 获取localhost的真实IP地理位置（使用百度API）
 * GET /api/geolocation/localhost
 */
router.get('/localhost', async (req, res) => {
  try {
    console.log('获取localhost真实IP地理位置请求');

    // 直接使用真实IP API获取本机真实IP和位置
    const locationData = await ipGeolocationService.getLocationFromRealIP();

    if (!locationData.success) {
      return res.status(400).json({
        success: false,
        message: locationData.message || '无法获取地理位置',
        error: locationData.error
      });
    }

    // 返回位置信息
    res.json({
      success: true,
      message: 'localhost地理位置获取成功',
      data: {
        ip: locationData.ip,
        country: locationData.country,
        countryCode: locationData.countryCode,
        region: locationData.region,
        city: locationData.city,
        district: locationData.district,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timezone: locationData.timezone,
        isp: locationData.isp,
        address: locationData.address,
        source: locationData.source,
        adcode: locationData.adcode,
        zipcode: locationData.zipcode,
        fromCache: locationData.fromCache || false
      }
    });

  } catch (error) {
    console.error('获取localhost地理位置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
});

/**
 * 测试IP地理位置服务
 * GET /api/geolocation/test
 */
router.get('/test', async (req, res) => {
  try {
    // 获取一些测试IP的位置信息
    const testIPs = [
      '8.8.8.8',      // Google DNS
      '1.1.1.1',      // Cloudflare DNS
      '114.114.114.114' // 114 DNS
    ];

    const results = [];
    
    for (const ip of testIPs) {
      try {
        const locationData = await ipGeolocationService.getLocation(ip);
        results.push({
          ip,
          success: locationData.success,
          data: locationData.success ? {
            country: locationData.country,
            city: locationData.city,
            address: locationData.address
          } : null,
          error: locationData.error
        });
      } catch (error) {
        results.push({
          ip,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'IP地理位置服务测试完成',
      data: {
        testResults: results,
        serviceStatus: 'operational'
      }
    });

  } catch (error) {
    console.error('IP地理位置服务测试失败:', error);
    res.status(500).json({
      success: false,
      message: '服务测试失败',
      error: error.message
    });
  }
});

module.exports = router;
