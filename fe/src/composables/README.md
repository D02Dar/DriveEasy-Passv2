# 自动定位组合式函数 (useAutoLocation)

## 概述

`useAutoLocation` 是一个可复用的 Vue 3 组合式函数，提供基于IP的自动定位功能。它被设计用于在多个页面间共享定位逻辑，特别是首次进入页面时的自动定位需求。

## 功能特性

### 🎯 智能定位策略
- **HTTPS环境**: 优先使用浏览器精确地理位置API
- **HTTP环境或浏览器定位失败**: 自动回退到IP地理位置服务
- **双重IP定位接口**: 先尝试认证接口，失败后使用公开接口

### 🔄 两种定位模式
- **自动定位 (autoLocate)**: 首次进入页面时静默获取位置，不显示过多提示
- **手动定位 (manualLocate)**: 用户主动触发，显示详细的提示信息

### 📍 位置数据格式
```javascript
{
  latitude: number,      // 纬度
  longitude: number,     // 经度
  accuracy?: number,     // 精度（仅浏览器定位）
  address: string,       // 格式化地址
  source: 'browser'|'ip', // 位置来源
  isDefault?: boolean    // 是否为默认位置（仅IP定位）
}
```

## 使用方法

### 基本用法

```javascript
import { useAutoLocation } from '@/composables/useAutoLocation'

export default {
  setup() {
    const { 
      locating,        // 定位状态
      userLocation,    // 位置信息
      autoLocate,      // 自动定位
      manualLocate,    // 手动定位
      hasLocation      // 检查是否有位置
    } = useAutoLocation()

    // 页面加载时自动定位
    onMounted(async () => {
      await autoLocate()
    })

    return {
      locating,
      userLocation,
      manualLocate
    }
  }
}
```

### 高级配置

```javascript
const { locating, userLocation, autoLocate } = useAutoLocation({
  silent: false,  // 是否静默模式
  onLocationSuccess: (location) => {
    // 定位成功回调
    console.log('定位成功:', location)
  },
  onLocationError: (error) => {
    // 定位失败回调
    console.error('定位失败:', error)
  }
})
```

## 当前使用页面

### 1. Schools 页面 (`/schools`)
- 首次进入时自动获取位置
- 定位成功后自动获取附近驾校
- 用户可手动重新定位

### 2. AccidentReport 页面 (`/accident-report/wizard?step=2`)
- 首次进入时自动获取位置
- 定位成功后更新地图中心和表单数据
- 支持地图交互和手动定位

## API 参考

### 参数选项 (options)

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| silent | boolean | false | 是否静默模式（不显示消息提示） |
| onLocationSuccess | function | null | 定位成功回调函数 |
| onLocationError | function | null | 定位失败回调函数 |
| autoTrigger | boolean | true | 是否自动触发定位 |

### 返回值

| 属性 | 类型 | 描述 |
|------|------|------|
| locating | Ref\<boolean\> | 定位状态 |
| userLocation | Ref\<Object\> | 位置信息对象 |
| getCurrentLocation | function | 通用定位函数 |
| autoLocate | function | 自动定位（静默模式） |
| manualLocate | function | 手动定位（显示提示） |
| resetLocation | function | 重置位置信息 |
| hasLocation | function | 检查是否有位置信息 |

## 技术实现

### 定位优先级
1. **HTTPS + 浏览器API**: 最高精度，需要用户授权
2. **IP地理位置服务**: 中等精度，无需用户授权
3. **默认位置**: 最低精度，服务不可用时的备选方案

### 错误处理
- 浏览器定位失败时自动回退到IP定位
- 认证接口失败时使用公开接口
- 所有错误都有适当的日志记录
- 自动定位失败时静默处理，不影响用户体验

### 性能优化
- 使用Vue 3的响应式系统
- 避免重复的API调用
- 合理的错误重试机制

## 注意事项

1. **HTTPS要求**: 浏览器地理位置API仅在HTTPS环境下可用
2. **用户权限**: 浏览器定位需要用户授权
3. **网络依赖**: IP定位需要网络连接
4. **精度差异**: 不同定位方式的精度差异较大

## 未来扩展

- [ ] 支持缓存机制，避免频繁请求
- [ ] 添加位置历史记录
- [ ] 支持自定义定位服务提供商
- [ ] 添加位置验证功能
