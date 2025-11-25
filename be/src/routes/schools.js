const express = require('express');
const { executeQuery, findOne, findMany } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');
const googlePlacesService = require('../services/googlePlacesService');

const router = express.Router();

// 获取所有驾校信息
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const isPartner = req.query.isPartner;

    let whereClause = '1=1';
    const queryParams = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR address LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (isPartner !== undefined) {
      whereClause += ' AND is_partner = ?';
      queryParams.push(isPartner === 'true' ? 1 : 0);
    }

    // 获取驾校总数
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM driving_schools WHERE ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;

    // 获取驾校列表
    const schools = await executeQuery(`
      SELECT
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        line_id as lineId,
        website_url as websiteUrl,
        description,
        is_partner as isPartner,
        logo_url as logoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM driving_schools
      WHERE ${whereClause}
      ORDER BY is_partner DESC, name ASC
      LIMIT ${limit} OFFSET ${offset}
    `, queryParams);

    res.json({
      success: true,
      data: {
        schools,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('获取驾校列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取驾校列表失败'
    });
  }
});

// 根据位置获取附近的驾校（集成Foursquare数据）
router.get('/nearby', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 10, includeFoursquare = 'true' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: '缺少位置参数'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
      return res.status(400).json({
        success: false,
        message: '位置参数格式错误'
      });
    }

    // 获取本地数据库中的驾校
    const localSchools = await executeQuery(`
      SELECT
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        line_id as lineId,
        website_url as websiteUrl,
        description,
        is_partner as isPartner,
        logo_url as logoUrl,
        'local' as source,
        created_at as createdAt,
        updated_at as updatedAt,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
          )
        ) AS distance
      FROM driving_schools
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      HAVING distance <= ?
      ORDER BY distance ASC
      LIMIT 100
    `, [latitude, longitude, latitude, searchRadius]);

    let allSchools = [...localSchools];

    // 如果启用Google Places集成，获取Google Places数据
    if (includeFoursquare === 'true') {
      try {
        console.log('Fetching Google Places data...');
        const googlePlacesSchools = await googlePlacesService.searchNearbyDrivingSchools(
          latitude,
          longitude,
          searchRadius * 1000, // 转换为米
          25
        );

        console.log(`Found ${googlePlacesSchools.length} Google Places schools`);

        // 为Google Places数据计算距离
        const googlePlacesWithDistance = googlePlacesSchools.map(school => {
          if (school.latitude && school.longitude) {
            // 使用 Haversine 公式计算距离
            const R = 6371; // 地球半径（公里）
            const dLat = (school.latitude - latitude) * Math.PI / 180;
            const dLon = (school.longitude - longitude) * Math.PI / 180;
            const a =
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(latitude * Math.PI / 180) * Math.cos(school.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            school.distance = R * c;
          }
          return school;
        });

        // 合并Google Places数据
        allSchools = [...allSchools, ...googlePlacesWithDistance];
      } catch (googlePlacesError) {
        console.error('Google Places API error:', googlePlacesError.message);
        // 继续使用本地数据，不因为Google Places错误而失败
      }
    }

    // 如果总结果数量过少，使用默认本地驾校兜底，保证至少有3家
    if (allSchools.length < 3) {
      const defaultSchools = [
        {
          id: 'default_1',
          name: '示例驾校一',
          nameZh: '示例驾校一',
          nameEn: 'Example Driving School 1',
          nameTh: 'โรงเรียนสอนขับรถตัวอย่าง 1',
          address: '北京市某路 1 号',
          addressZh: '北京市某路 1 号',
          addressEn: 'No.1, Some Road, Beijing, China',
          addressTh: 'ถนนตัวอย่าง 1 กรุงปักกิ่ง ประเทศจีน',
          latitude: 39.9042,
          longitude: 116.4074,
          phone: '',
          lineId: null,
          websiteUrl: null,
          description: '本地默认驾校示例，供API兜底展示使用',
          descriptionZh: '本地默认驾校示例，供API兜底展示使用',
          descriptionEn: 'Local default driving school example for API fallback display.',
          descriptionTh: 'ตัวอย่างโรงเรียนสอนขับรถในพื้นที่ สำหรับใช้เป็นข้อมูลสำรองของ API',
          isPartner: 0,
          logoUrl: null,
          source: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'default_2',
          name: '示例驾校二',
          nameZh: '示例驾校二',
          nameEn: 'Example Driving School 2',
          nameTh: 'โรงเรียนสอนขับรถตัวอย่าง 2',
          address: '北京市某路 2 号',
          addressZh: '北京市某路 2 号',
          addressEn: 'No.2, Some Road, Beijing, China',
          addressTh: 'ถนนตัวอย่าง 2 กรุงปักกิ่ง ประเทศจีน',
          latitude: 39.9142,
          longitude: 116.4174,
          phone: '',
          lineId: null,
          websiteUrl: null,
          description: '本地默认驾校示例，供API兜底展示使用',
          descriptionZh: '本地默认驾校示例，供API兜底展示使用',
          descriptionEn: 'Local default driving school example for API fallback display.',
          descriptionTh: 'ตัวอย่างโรงเรียนสอนขับรถในพื้นที่ สำหรับใช้เป็นข้อมูลสำรองของ API',
          isPartner: 0,
          logoUrl: null,
          source: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'default_3',
          name: '示例驾校三',
          nameZh: '示例驾校三',
          nameEn: 'Example Driving School 3',
          nameTh: 'โรงเรียนสอนขับรถตัวอย่าง 3',
          address: '北京市某路 3 号',
          addressZh: '北京市某路 3 号',
          addressEn: 'No.3, Some Road, Beijing, China',
          addressTh: 'ถนนตัวอย่าง 3 กรุงปักกิ่ง ประเทศจีน',
          latitude: 39.8942,
          longitude: 116.3974,
          phone: '',
          lineId: null,
          websiteUrl: null,
          description: '本地默认驾校示例，供API兜底展示使用',
          descriptionZh: '本地默认驾校示例，供API兜底展示使用',
          descriptionEn: 'Local default driving school example for API fallback display.',
          descriptionTh: 'ตัวอย่างโรงเรียนสอนขับรถในพื้นที่ สำหรับใช้เป็นข้อมูลสำรองของ API',
          isPartner: 0,
          logoUrl: null,
          source: 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const existingKeySet = new Set(
        allSchools.map(s => `${s.name || ''}_${s.address || ''}`)
      );

      const R = 6371; // 地球半径（公里）

      for (const school of defaultSchools) {
        if (allSchools.length >= 3) break;

        const key = `${school.name || ''}_${school.address || ''}`;
        if (existingKeySet.has(key)) {
          continue;
        }

        if (school.latitude && school.longitude) {
          const dLat = (school.latitude - latitude) * Math.PI / 180;
          const dLon = (school.longitude - longitude) * Math.PI / 180;
          const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(school.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          school.distance = R * c;
        } else {
          school.distance = null;
        }

        allSchools.push(school);
        existingKeySet.add(key);
      }
    }

    // 按距离排序并限制结果数量
    allSchools.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    allSchools = allSchools.slice(0, 200); // 增加返回数量以支持前端分页

    res.json({
      success: true,
      data: {
        schools: allSchools,
        searchCenter: {
          latitude,
          longitude
        },
        searchRadius,
        sources: {
          local: localSchools.length,
          googlePlaces: allSchools.length - localSchools.length
        }
      }
    });

  } catch (error) {
    console.error('获取附近驾校失败:', error);
    res.status(500).json({
      success: false,
      message: '获取附近驾校失败'
    });
  }
});

// 获取合作驾校
router.get('/partners', optionalAuth, async (req, res) => {
  try {
    const partnerSchools = await executeQuery(`
      SELECT
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        line_id as lineId,
        website_url as websiteUrl,
        description,
        logo_url as logoUrl,
        created_at as createdAt
      FROM driving_schools
      WHERE is_partner = 1
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: partnerSchools
    });

  } catch (error) {
    console.error('获取合作驾校失败:', error);
    res.status(500).json({
      success: false,
      message: '获取合作驾校失败'
    });
  }
});

// 获取单个驾校详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const schoolId = parseInt(req.params.id);

    if (isNaN(schoolId)) {
      return res.status(400).json({
        success: false,
        message: '无效的驾校ID'
      });
    }

    // 获取驾校详情
    const schools = await executeQuery(`
      SELECT
        id,
        name,
        address,
        latitude,
        longitude,
        phone,
        line_id as lineId,
        website_url as websiteUrl,
        description,
        is_partner as isPartner,
        logo_url as logoUrl,
        created_at as createdAt,
        updated_at as updatedAt
      FROM driving_schools
      WHERE id = ?
    `, [schoolId]);

    if (schools.length === 0) {
      return res.status(404).json({
        success: false,
        message: '驾校不存在'
      });
    }

    const school = schools[0];

    res.json({
      success: true,
      data: school
    });

  } catch (error) {
    console.error('获取驾校详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取驾校详情失败'
    });
  }
});

// 获取Foursquare地点详细信息
router.get('/foursquare/:fsqId', optionalAuth, async (req, res) => {
  try {
    const { fsqId } = req.params;

    if (!fsqId) {
      return res.status(400).json({
        success: false,
        message: '缺少Foursquare地点ID'
      });
    }

    const placeDetails = await foursquareService.getPlaceDetails(fsqId);

    if (!placeDetails) {
      return res.status(404).json({
        success: false,
        message: '未找到该地点信息'
      });
    }

    res.json({
      success: true,
      data: placeDetails
    });

  } catch (error) {
    console.error('获取Foursquare地点详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取地点详情失败'
    });
  }
});

// 搜索驾校（支持关键词搜索 + Foursquare集成）
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { lat, lng, query, radius = 10, includeFoursquare = 'true' } = req.query;

    if (!lat || !lng || !query) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的搜索参数'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(searchRadius)) {
      return res.status(400).json({
        success: false,
        message: '位置参数格式错误'
      });
    }

    let allSchools = [];

    // 如果启用Google Places集成，搜索Google Places数据
    if (includeFoursquare === 'true') {
      try {
        const googlePlacesSchools = await googlePlacesService.searchPlaces(
          latitude,
          longitude,
          query,
          searchRadius * 1000, // 转换为米
          20
        );

        allSchools = [...allSchools, ...googlePlacesSchools];
      } catch (googlePlacesError) {
        console.error('Google Places search error:', googlePlacesError.message);
      }
    }

    // 按距离排序
    allSchools.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    res.json({
      success: true,
      data: {
        schools: allSchools,
        searchCenter: {
          latitude,
          longitude
        },
        searchRadius,
        query
      }
    });

  } catch (error) {
    console.error('搜索驾校失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索驾校失败'
    });
  }
});

module.exports = router;
