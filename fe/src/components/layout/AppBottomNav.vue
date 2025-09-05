<template>
  <div v-if="showBottomNav" class="app-bottom-nav">
    <div class="bottom-nav-container">
      <router-link 
        v-for="item in navItems" 
        :key="item.name"
        :to="item.path" 
        class="nav-item"
        :class="{ active: isActiveRoute(item.path) }"
      >
        <div class="nav-icon">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <div v-if="item.badge" class="nav-badge">{{ item.badge }}</div>
        </div>
        <span class="nav-text">{{ item.name }}</span>
      </router-link>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import {
  House,
  Reading,
  Document,
  Star,
  User,
  DataBoard,
  Folder,
  TrendCharts,
  Setting
} from '@element-plus/icons-vue'

export default {
  name: 'AppBottomNav',
  components: {
    House,
    Reading,
    Document,
    Star,
    User,
    DataBoard,
    Folder,
    TrendCharts,
    Setting
  },
  setup() {
    const route = useRoute()
    const store = useStore()
    const { t } = useI18n()

    // 计算属性
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const isAdmin = computed(() => store.getters['auth/userRole'] === 'admin')
    const isAdminArea = computed(() => route.path.startsWith('/admin'))

    // 显示条件：移动端 + 已登录 + 在用户或管理员区域
    const showBottomNav = computed(() => {
      return isAuthenticated.value && 
             (route.path.startsWith('/dashboard') || 
              route.path.startsWith('/practice') || 
              route.path.startsWith('/bookmarks') ||
              route.path.startsWith('/profile') ||
              route.path.startsWith('/accident-report') ||
              route.path.startsWith('/admin'))
    })

    // 用户区导航项
    const userNavItems = computed(() => [
      { name: t('nav.home'), path: '/dashboard', icon: 'House' },
      { name: t('nav.practice'), path: '/practice', icon: 'Reading' },
      { name: t('nav.accident'), path: '/accident-report', icon: 'Document' },
      { name: t('nav.bookmarks'), path: '/bookmarks', icon: 'Star' },
      { name: t('nav.profile'), path: '/profile', icon: 'User' }
    ])

    // 管理员区导航项
    const adminNavItems = computed(() => [
      { name: t('nav.overview'), path: '/admin/dashboard', icon: 'DataBoard' },
      { name: t('nav.questions'), path: '/admin/questions', icon: 'Folder' },
      { name: t('nav.users'), path: '/admin/users', icon: 'User' },
      { name: t('nav.settings'), path: '/admin/settings', icon: 'Setting' }
    ])

    // 当前导航项
    const navItems = computed(() => {
      return isAdminArea.value ? adminNavItems.value : userNavItems.value
    })

    // 方法
    const isActiveRoute = (path) => {
      return route.path === path || route.path.startsWith(path + '/')
    }

    return {
      showBottomNav,
      navItems,
      isActiveRoute
    }
  }
}
</script>

<style lang="scss" scoped>
.app-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border-top: 1px solid var(--el-border-color-light);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  
  // 只在移动端显示
  @media (min-width: 769px) {
    display: none;
  }
}

.bottom-nav-container {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  max-width: 100%;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  transition: all 0.3s ease;
  border-radius: 8px;
  min-width: 60px;
  position: relative;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.active {
    color: var(--el-color-primary);
    
    .nav-icon {
      transform: scale(1.1);
    }
  }
}

.nav-icon {
  position: relative;
  font-size: 20px;
  transition: transform 0.3s ease;

  .nav-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: var(--el-color-danger);
    color: white;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 8px;
    min-width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}

.nav-text {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  text-align: center;
}

// 为底部导航预留空间
:global(body) {
  @media (max-width: 768px) {
    padding-bottom: 80px;
  }
}
</style>
