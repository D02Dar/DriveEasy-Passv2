/**
 * Google Maps 工具类
 * 提供地图初始化、标记管理、地点搜索等功能
 */

class GoogleMapsUtil {
  constructor() {
    this.map = null;
    this.markers = [];
    this.infoWindow = null;
    this.placesService = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * 等待 Google Maps API 加载完成
   * @returns {Promise<boolean>}
   */
  async waitForLoad() {
    if (this.isLoaded) {
      return true;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve) => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(true);
        return;
      }

      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          this.isLoaded = true;
          resolve(true);
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };

      // 监听自定义事件
      window.addEventListener('google-maps-loaded', () => {
        this.isLoaded = true;
        resolve(true);
      });

      checkGoogleMaps();
    });

    return this.loadPromise;
  }

  /**
   * 初始化地图
   * @param {HTMLElement} container - 地图容器元素
   * @param {Object} options - 地图配置选项
   * @returns {Promise<google.maps.Map>}
   */
  async initMap(container, options = {}) {
    await this.waitForLoad();

    const defaultOptions = {
      zoom: 13,
      center: { lat: 39.9042, lng: 116.4074 }, // 北京天安门
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapId: 'DEMO_MAP_ID', // 添加 Map ID 以支持 Advanced Markers
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
      rotateControl: true,
      fullscreenControl: true,
      gestureHandling: 'cooperative'
    };

    const mapOptions = { ...defaultOptions, ...options };
    this.map = new google.maps.Map(container, mapOptions);
    
    // 初始化信息窗口
    this.infoWindow = new google.maps.InfoWindow();
    
    // 初始化Places服务 - 使用新的Places API
    // 注意：新的Places API不需要在这里初始化服务对象

    return this.map;
  }

  /**
   * 获取用户当前位置
   * @returns {Promise<{lat: number, lng: number}>}
   */
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置服务'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`获取位置失败: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5分钟缓存
        }
      );
    });
  }

  /**
   * 设置地图中心点
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @param {number} zoom - 缩放级别
   */
  setCenter(lat, lng, zoom = null) {
    if (!this.map) return;
    
    const center = new google.maps.LatLng(lat, lng);
    this.map.setCenter(center);
    
    if (zoom !== null) {
      this.map.setZoom(zoom);
    }
  }

  /**
   * 清除所有标记
   */
  clearMarkers() {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
  }

  /**
   * 添加标记
   * @param {Object} school - 驾校信息
   * @param {Function} onDetailCallback - 查看详情回调函数
   * @returns {google.maps.marker.AdvancedMarkerElement|google.maps.Marker}
   */
  addMarker(school, onDetailCallback = null) {
    if (!this.map || !school.latitude || !school.longitude) return null;

    const position = new google.maps.LatLng(school.latitude, school.longitude);

    // 创建信息窗口内容，传入详情回调
    const infoContent = this.createInfoWindowContent(school, onDetailCallback);

    let marker;

    // 尝试使用新的 AdvancedMarkerElement，如果不可用则回退到旧的 Marker
    try {
      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement && this.map.getMapId()) {
        // 使用新的 AdvancedMarkerElement（需要 Map ID）
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: position,
          map: this.map,
          title: school.name,
        });

        // AdvancedMarkerElement 使用不同的事件处理方式
        marker.addListener('click', () => {
          this.infoWindow.setContent(infoContent);
          this.infoWindow.open(this.map, marker);
        });
      } else {
        throw new Error('AdvancedMarkerElement not available or Map ID missing');
      }
    } catch (error) {
      // 回退到旧的 Marker API
      console.warn('Using deprecated google.maps.Marker as fallback:', error.message);

      // 根据数据源选择不同的图标
      let icon = {
        url: school.source === 'google_places'
          ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
          : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      };

      marker = new google.maps.Marker({
        position: position,
        map: this.map,
        title: school.name,
        icon: icon,
        animation: google.maps.Animation.DROP
      });

      // 旧的 Marker 事件处理
      marker.addListener('click', () => {
        this.infoWindow.setContent(infoContent);
        this.infoWindow.open(this.map, marker);
      });
    }

    this.markers.push(marker);
    return marker;
  }

  /**
   * 创建信息窗口内容
   * @param {Object} school - 驾校信息
   * @param {Function} onDetailClick - 查看详情回调函数
   * @returns {string}
   */
  createInfoWindowContent(school, onDetailClick = null) {
    const rating = school.rating ? `⭐ ${school.rating}` : '';
    const phone = school.phone ? `<i class="el-icon-phone" style="margin-right: 4px;"></i>${school.phone}` : '';
    const website = school.website ? `<a href="${school.website}" target="_blank"><i class="el-icon-link" style="margin-right: 4px;"></i>官网</a>` : '';
    const distance = school.distance ? `<i class="el-icon-location" style="margin-right: 4px;"></i>${(school.distance / 1000).toFixed(1)}km` : '';

    // 将回调函数存储到全局对象中，以便在内联事件中调用
    const callbackId = `callback_${school.id}_${Date.now()}`;
    if (onDetailClick) {
      window[callbackId] = () => {
        onDetailClick(school);
      };
    }

    const phoneCallbackId = `phoneCallback_${school.id}_${Date.now()}`;
    if (phone) {
      window[phoneCallbackId] = () => {
        window.location.href = `tel:${school.phone}`;
      };
    }

    const content = `
      <div style="max-width: 300px; padding: 10px;">
        <h3 style="margin: 0 0 10px 0; color: #409EFF;">${school.name}</h3>
        <p style="margin: 5px 0; color: #666;">${school.address || ''}</p>
        ${rating ? `<p style="margin: 5px 0;">${rating}</p>` : ''}
        ${distance ? `<p style="margin: 5px 0;">${distance}</p>` : ''}
        ${phone ? `<p style="margin: 5px 0;">${phone}</p>` : ''}
        ${website ? `<p style="margin: 5px 0;">${website}</p>` : ''}
        <p style="margin: 5px 0; font-size: 12px; color: #999;">
          数据来源: ${school.source === 'google_places' ? 'Google Places' : '本地数据'}
        </p>
        <div style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
          ${onDetailClick ? `<button onclick="window['${callbackId}']()" style="
            background: #409EFF;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            flex: 1;
            min-width: 90px;
            transition: background-color 0.3s;
          " onmouseover="this.style.background='#337ecc'" onmouseout="this.style.background='#409EFF'">查看详情</button>` : ''}
          ${phone ? `<button onclick="window['${phoneCallbackId}']()" style="
            background: #67C23A;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            flex: 1;
            min-width: 90px;
            transition: background-color 0.3s;
          " onmouseover="this.style.background='#529b2e'" onmouseout="this.style.background='#67C23A'"><i class="el-icon-phone" style="margin-right: 4px;"></i>拨打电话</button>` : ''}
        </div>
      </div>
    `;

    return content;
  }

  /**
   * 显示多个驾校标记
   * @param {Array} schools - 驾校列表
   * @param {Function} onDetailClick - 查看详情回调
   */
  showSchools(schools, onDetailClick = null) {
    this.clearMarkers();

    if (!schools || schools.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    schools.forEach(school => {
      const marker = this.addMarker(school, onDetailClick);
      if (marker) {
        bounds.extend(marker.getPosition());
      }
    });

    // 调整地图视野以包含所有标记
    if (schools.length > 1) {
      this.map.fitBounds(bounds);
    } else if (schools.length === 1) {
      this.setCenter(schools[0].latitude, schools[0].longitude, 15);
    }
  }

  /**
   * 搜索附近的地点
   * @param {number} lat - 纬度
   * @param {number} lng - 经度
   * @param {string} keyword - 搜索关键词
   * @param {number} radius - 搜索半径（米）
   * @returns {Promise<Array>}
   */
  async searchNearbyPlaces(lat, lng, keyword = 'driving school', radius = 5000) {
    await this.waitForLoad();

    try {
      // 尝试使用新的 Places API
      if (google.maps.places && google.maps.places.Place) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('New Places API is available but searchNearbyPlaces needs backend implementation');
        }
        // 新的 Places API 需要通过后端调用，这里暂时返回空数组
        return [];
      } else {
        // 回退到旧的 Places API（带警告抑制）
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using deprecated PlacesService as fallback');
        }

        if (!this.placesService) {
          this.placesService = new google.maps.places.PlacesService(this.map);
        }

        return new Promise((resolve, reject) => {
          const request = {
            location: new google.maps.LatLng(lat, lng),
            radius: radius,
            keyword: keyword,
            type: ['school']
          };

          this.placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              resolve(results || []);
            } else {
              reject(new Error(`Places search failed: ${status}`));
            }
          });
        });
      }
    } catch (error) {
      console.error('Places search error:', error);
      return [];
    }
  }

  /**
   * 获取地点详细信息
   * @param {string} placeId - Google Place ID
   * @returns {Promise<Object>}
   */
  async getPlaceDetails(placeId) {
    await this.waitForLoad();

    try {
      // 尝试使用新的 Places API
      if (google.maps.places && google.maps.places.Place) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('New Places API is available but getPlaceDetails needs backend implementation');
        }
        // 新的 Places API 需要通过后端调用，这里暂时返回空对象
        return {};
      } else {
        // 回退到旧的 Places API（带警告抑制）
        if (process.env.NODE_ENV === 'development') {
          console.warn('Using deprecated PlacesService as fallback');
        }

        if (!this.placesService) {
          this.placesService = new google.maps.places.PlacesService(this.map);
        }

        return new Promise((resolve, reject) => {
          const request = {
            placeId: placeId,
            fields: ['name', 'formatted_address', 'geometry', 'rating', 'formatted_phone_number', 'website', 'opening_hours', 'photos']
          };

          this.placesService.getDetails(request, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              resolve(place);
            } else {
              reject(new Error(`Place details failed: ${status}`));
            }
          });
        });
      }
    } catch (error) {
      console.error('Place details error:', error);
      return {};
    }
  }

  /**
   * 销毁地图实例
   */
  destroy() {
    this.clearMarkers();
    this.map = null;
    this.infoWindow = null;
    if (this.placesService) {
      this.placesService = null;
    }
  }
}

// 创建单例实例
const googleMapsUtil = new GoogleMapsUtil();

export default googleMapsUtil;
