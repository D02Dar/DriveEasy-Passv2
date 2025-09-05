<template>
  <div class="app-layout" :class="layoutClass">
    <!-- 顶部导航栏 (公共页面使用) -->
    <AppNavbar v-if="showNavbar" />
    
    <!-- 侧边栏 (用户和管理员页面使用) -->
    <AppSidebar v-if="showSidebar" />
    
    <!-- 主内容区域 -->
    <main class="main-content" :class="mainContentClass">
      <!-- 移动端顶部栏 -->
      <div v-if="showSidebar" class="mobile-header">
        <el-button
          class="mobile-menu-btn"
          text
          @click="toggleMobileSidebar"
        >
          <el-icon><Menu /></el-icon>
        </el-button>
        <h1 class="mobile-title">{{ getMobileTitle() }}</h1>
        <div class="mobile-actions">
          <!-- 可以添加其他移动端操作按钮 -->
        </div>
      </div>

      <!-- 面包屑导航 -->
      <div v-if="showBreadcrumb && detectedLayoutType !== 'public'" class="breadcrumb-container">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item
            v-for="item in breadcrumbItems"
            :key="item.path"
            :to="item.path"
          >
            {{ item.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      
      <!-- 页面内容 -->
      <div class="page-content">
        <slot />
      </div>
    </main>

    <!-- 移动端遮罩层 -->
    <div
      v-if="showMobileOverlay"
      class="mobile-overlay"
      @click="closeMobileSidebar"
    />
  </div>
</template>

<script>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import AppNavbar from './AppNavbar.vue'
import AppSidebar from './AppSidebar.vue'
import { Menu } from '@element-plus/icons-vue'

export default {
  name: 'AppLayout',
  components: {
    AppNavbar,
    AppSidebar,
    Menu
  },
  props: {
    // 布局类型: 'public' | 'user' | 'admin'
    layoutType: {
      type: String,
      default: 'auto' // 自动检测
    },
    // 是否显示面包屑
    showBreadcrumb: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const route = useRoute()
    const store = useStore()
    const { t } = useI18n()

    // 计算属性
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const isAdmin = computed(() => store.getters['auth/userRole'] === 'admin')
    
    // 缓存路径检测结果
    const pathCache = ref(new Map())

    // 自动检测布局类型
    const detectedLayoutType = computed(() => {
      if (props.layoutType !== 'auto') {
        return props.layoutType
      }

      const path = route.path

      // 检查缓存
      if (pathCache.value.has(path)) {
        return pathCache.value.get(path)
      }

      let layoutType
      if (path.startsWith('/admin')) {
        layoutType = 'admin'
      } else if (path.startsWith('/dashboard') ||
                 path.startsWith('/practice') ||
                 path.startsWith('/profile') ||
                 path.startsWith('/bookmarks') ||
                 path.startsWith('/accident-report') ||
                 path.startsWith('/schools') ||
                 path.startsWith('/notifications') ||
                 path.startsWith('/notification-settings')) {
        layoutType = 'user'
      } else {
        layoutType = 'public'
      }

      // 缓存结果
      pathCache.value.set(path, layoutType)
      return layoutType
    })

    // 显示控制
    const showNavbar = computed(() => {
      return detectedLayoutType.value === 'public'
    })

    const showSidebar = computed(() => {
      return ['user', 'admin'].includes(detectedLayoutType.value) && isAuthenticated.value
    })

    const showMobileOverlay = computed(() => {
      return store.getters['app/sidebarMobileOpen']
    })

    // 样式类
    const layoutClass = computed(() => {
      return {
        'layout-public': detectedLayoutType.value === 'public',
        'layout-user': detectedLayoutType.value === 'user',
        'layout-admin': detectedLayoutType.value === 'admin',
        'has-sidebar': showSidebar.value,
        'has-navbar': showNavbar.value,
        'sidebar-collapsed': store.getters['app/sidebarCollapsed']
      }
    })

    const mainContentClass = computed(() => {
      return {
        'with-sidebar': showSidebar.value,
        'with-navbar': showNavbar.value,
        'sidebar-collapsed': store.getters['app/sidebarCollapsed']
      }
    })

    // 面包屑导航
    const breadcrumbItems = computed(() => {
      const items = []
      const pathSegments = route.path.split('/').filter(Boolean)
      
      // 根据路径生成面包屑
      if (detectedLayoutType.value === 'admin') {
        items.push({ name: t('nav.adminDashboard'), path: '/admin/dashboard' })
      } else if (detectedLayoutType.value === 'user') {
        items.push({ name: t('nav.userCenter'), path: '/dashboard' })
      } else {
        items.push({ name: t('nav.home'), path: '/' })
      }

      // 根据当前路由添加面包屑项
      const routeMap = {
        'dashboard': t('nav.userCenter'),
        'practice': t('nav.practice'),
        'bookmarks': t('nav.bookmarks'),
        'profile': t('nav.profile'),
        'accident-report': t('nav.accidentReport'),
        'schools': t('nav.schools'),
        'notifications': t('nav.notifications'),
        'notification-settings': t('nav.notificationSettings'),
        'admin': {
          'dashboard': '管理后台',
          'questions': t('nav.questionManagement'),
          'users': t('nav.userManagement'),
          'settings': t('nav.settings'),
          'notifications': t('nav.notifications')
        }
      }

      if (pathSegments.length > 1) {
        const currentPage = pathSegments[pathSegments.length - 1]
        if (detectedLayoutType.value === 'admin' && routeMap.admin[currentPage]) {
          if (currentPage !== 'dashboard') {
            items.push({ 
              name: routeMap.admin[currentPage], 
              path: route.path 
            })
          }
        } else if (routeMap[currentPage]) {
          if (currentPage !== 'dashboard') {
            items.push({ 
              name: routeMap[currentPage], 
              path: route.path 
            })
          }
        }
      }

      return items
    })

    // 方法
    const toggleMobileSidebar = () => {
      store.dispatch('app/toggleMobileSidebar')
    }

    const closeMobileSidebar = () => {
      store.dispatch('app/closeMobileSidebar')
    }

    const getMobileTitle = () => {
      const routeMap = {
        'dashboard': t('nav.userCenter'),
        'practice': t('nav.practice'),
        'bookmarks': t('nav.bookmarks'),
        'profile': t('nav.profile'),
        'accident-report': t('nav.accidentReport'),
        'schools': t('pageTitle.schools'),
        'notifications': t('nav.notifications'),
        'notification-settings': t('nav.notificationSettings')
      }

      const pathSegments = route.path.split('/').filter(Boolean)
      const currentPage = pathSegments[pathSegments.length - 1]

      if (detectedLayoutType.value === 'admin') {
        return t('nav.adminDashboard')
      } else {
        return routeMap[currentPage] || t('common.appName')
      }
    }

    // 监听路由变化，自动关闭移动端侧边栏
    watch(route, (newRoute, oldRoute) => {
      // 只在路径真正改变时执行
      if (newRoute.path !== oldRoute?.path) {
        if (store.getters['app/sidebarMobileOpen']) {
          store.dispatch('app/closeMobileSidebar')
        }
      }
    })

    return {
      detectedLayoutType,
      showNavbar,
      showSidebar,
      showMobileOverlay,
      layoutClass,
      mainContentClass,
      breadcrumbItems,
      toggleMobileSidebar,
      closeMobileSidebar,
      getMobileTitle
    }
  }
}

// HMR支持
if (import.meta.hot) {
  import.meta.hot.accept()
}
</script>

<style lang="scss" scoped>
.app-layout {
  min-height: 100vh;
  background: #f5f7fa;

  &.layout-public {
    .main-content {
      padding-top: 0 !important;
    }

    .page-content {
      padding: 0 !important;
    }
  }

  &.layout-user,
  &.layout-admin {
    .main-content {
      margin-left: 260px;
      transition: margin-left 0.3s ease;

      @media (max-width: 768px) {
        margin-left: 0;
      }
    }

    &.sidebar-collapsed .main-content {
      margin-left: 64px;

      @media (max-width: 768px) {
        margin-left: 0;
      }
    }
  }
}

.main-content {
  min-height: 100vh;
  background: #f5f7fa;
  transition: margin-left 0.3s ease;

  &.with-navbar {
    padding-top: 0 !important;
  }

  &.with-sidebar {
    margin-left: 260px;

    &.sidebar-collapsed {
      margin-left: 64px;
    }

    @media (max-width: 768px) {
      margin-left: 0;
      padding-top: 60px; // 为移动端头部留出空间

      &.sidebar-collapsed {
        margin-left: 0;
      }
    }
  }
}

.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: white;
  border-bottom: 1px solid var(--el-border-color-light);
  z-index: 999;
  padding: 0 16px;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    display: flex;
  }

  .mobile-menu-btn {
    font-size: 20px;
    color: var(--el-text-color-primary);
  }

  .mobile-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0;
  }

  .mobile-actions {
    width: 40px; // 保持对称
  }
}

.breadcrumb-container {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 0;

  .el-breadcrumb {
    font-size: 14px;
  }
}

.page-content {
  padding: 24px;
  min-height: calc(100vh - 120px);

  @media (max-width: 768px) {
    padding: 16px;
    min-height: calc(100vh - 60px);
  }
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  
  @media (min-width: 769px) {
    display: none;
  }
}

// 响应式调整
@media (max-width: 768px) {
  .app-layout.has-sidebar .main-content {
    margin-left: 0;
  }
}
</style>
