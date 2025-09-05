# 地图视角功能复用

## 概述

成功将 `/accident-report/wizard?id=7&step=2` 页面（StepLocation.vue）的地图视角功能复用到 `/schools` 页面的地图视角（SchoolMap.vue）中。

## 复用的功能

### 🎯 地图缩放控制
- **放大按钮**: 点击增加地图缩放级别
- **缩小按钮**: 点击减少地图缩放级别
- **按钮状态**: 地图未加载时禁用按钮
- **工具提示**: 鼠标悬停显示功能说明

### 🎨 视觉设计
- **位置**: 地图左上角固定位置
- **样式**: 与 accident-report 页面保持一致的按钮组样式
- **响应式**: 移动端适配，调整按钮位置
- **层级**: 高 z-index 确保按钮始终可见

## 技术实现

### 1. 模板结构
```vue
<!-- 地图控制按钮（复用 accident-report 的地图视角） -->
<div class="map-zoom-controls">
  <el-button-group>
    <el-button 
      size="small"
      @click="zoomIn"
      :disabled="!mapLoaded"
      title="放大"
    >
      <el-icon><Plus /></el-icon>
    </el-button>
    <el-button 
      size="small"
      @click="zoomOut"
      :disabled="!mapLoaded"
      title="缩小"
    >
      <el-icon><Minus /></el-icon>
    </el-button>
  </el-button-group>
</div>
```

### 2. 功能函数
```javascript
// 地图控制函数（复用 accident-report 的地图视角）
const zoomIn = () => {
  if (googleMapsUtil.map) {
    const currentZoom = googleMapsUtil.map.getZoom()
    googleMapsUtil.map.setZoom(currentZoom + 1)
  }
}

const zoomOut = () => {
  if (googleMapsUtil.map) {
    const currentZoom = googleMapsUtil.map.getZoom()
    googleMapsUtil.map.setZoom(currentZoom - 1)
  }
}
```

### 3. 样式定义
```css
/* 地图缩放控制按钮（复用 accident-report 的地图视角） */
.map-zoom-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .map-zoom-controls {
    top: 8px;
    left: 8px;
  }
}
```

## 修改的文件

### SchoolMap.vue
- **新增导入**: `Plus`, `Minus` 图标
- **新增模板**: 地图缩放控制按钮组
- **新增函数**: `zoomIn`, `zoomOut` 地图控制函数
- **新增样式**: `.map-zoom-controls` 样式定义
- **更新导出**: 在 return 中添加新函数和图标

## 功能对比

| 功能 | StepLocation.vue | SchoolMap.vue | 状态 |
|------|------------------|---------------|------|
| 地图缩放控制 | ✅ | ✅ | 已复用 |
| 地图类型控制 | ✅ (Google Maps 内置) | ✅ (Google Maps 内置) | 共享 |
| 街景控制 | ✅ (Google Maps 内置) | ✅ (Google Maps 内置) | 共享 |
| 全屏控制 | ✅ (Google Maps 内置) | ✅ (Google Maps 内置) | 共享 |
| 手势处理 | ✅ (cooperative) | ✅ (cooperative) | 共享 |
| 位置标记 | ✅ | ✅ | 各自实现 |
| 信息窗口 | ✅ | ✅ | 共享工具类 |

## 用户体验改进

### 1. 统一的交互体验
- 两个页面的地图操作方式完全一致
- 用户在不同页面间切换时无需重新学习

### 2. 增强的地图控制
- 除了原有的鼠标滚轮缩放，现在还有明确的按钮控制
- 触屏设备上的缩放操作更加便捷

### 3. 视觉一致性
- 按钮样式、位置、行为与 accident-report 页面保持一致
- 整体设计语言统一

## 技术优势

### 1. 代码复用
- 避免重复实现相同功能
- 降低维护成本

### 2. 一致性保证
- 统一的地图交互逻辑
- 相同的用户体验

### 3. 可扩展性
- 基于 googleMapsUtil 工具类的统一实现
- 便于后续添加更多地图功能

## 注意事项

1. **样式命名**: 使用 `.map-zoom-controls` 避免与现有 `.map-controls` 冲突
2. **位置选择**: 放置在左上角，避免与统计面板重叠
3. **响应式设计**: 移动端适配，确保在小屏幕上也能正常使用
4. **状态管理**: 按钮状态与地图加载状态同步

## 未来扩展

可以考虑进一步复用的功能：
- [ ] 地图样式切换（卫星视图、地形视图等）
- [ ] 测距工具
- [ ] 绘图工具
- [ ] 位置搜索框
- [ ] 路线规划功能
