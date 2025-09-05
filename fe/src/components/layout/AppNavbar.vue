<template>
  <header class="app-navbar">
    <div class="navbar-container">
      <!-- Logo区域 -->
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">
          <div class="brand-logo">
            <el-icon><CaretRight /></el-icon>
          </div>
          <h1 class="brand-title">{{ $t('common.appName') }}</h1>
        </router-link>
      </div>

      <!-- 桌面端导航菜单 -->
      <nav class="navbar-nav desktop-nav">
        <router-link 
          v-for="item in publicNavItems" 
          :key="item.name"
          :to="item.path" 
          class="nav-link"
          :class="{ active: isActiveRoute(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          {{ item.name }}
        </router-link>
      </nav>

      <!-- 右侧操作区 -->
      <div class="navbar-actions">
        <!-- 语言切换器 -->
        <LanguageSwitcher
          variant="default"
          size="small"
          :show-text="!isMobile"
          class="language-switcher-nav"
        />

        <!-- 未登录状态 -->
        <template v-if="!isAuthenticated">
          <router-link to="/login" class="nav-link">{{ $t('common.login') }}</router-link>
          <el-button type="primary" size="small" @click="$router.push('/register')">
            {{ $t('common.register') }}
          </el-button>
        </template>

        <!-- 已登录状态 -->
        <template v-else>
          <!-- 用户菜单 -->
          <el-dropdown @command="handleUserCommand" trigger="click">
            <div class="user-menu-trigger">
              <el-avatar :size="32" :src="currentUser?.avatar">
                <el-icon><User /></el-icon>
              </el-avatar>
              <span class="username">{{ currentUser?.username }}</span>
              <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="dashboard">
                  <el-icon><House /></el-icon>
                  {{ $t('navigation.userCenter') }}
                </el-dropdown-item>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  {{ $t('navigation.profile') }}
                </el-dropdown-item>
                <el-dropdown-item command="bookmarks">
                  <el-icon><Star /></el-icon>
                  {{ $t('navigation.bookmarks') }}
                </el-dropdown-item>
                <el-dropdown-item v-if="isAdmin" command="admin" divided>
                  <el-icon><Setting /></el-icon>
                  {{ $t('navigation.adminPanel') }}
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  {{ $t('navigation.logout') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>

        <!-- 移动端菜单按钮 -->
        <el-button
          class="mobile-menu-btn"
          text
          @click="toggleMobileMenu"
        >
          <el-icon><Menu /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 移动端导航抽屉 -->
    <el-drawer
      v-model="mobileMenuVisible"
      :title="$t('navigation.mobileMenu')"
      direction="rtl"
      size="280px"
      :with-header="false"
    >
      <div class="mobile-nav">
        <!-- 用户信息 -->
        <div v-if="isAuthenticated" class="mobile-user-info">
          <el-avatar :size="48" :src="currentUser?.avatar">
            <el-icon><User /></el-icon>
          </el-avatar>
          <div class="user-details">
            <div class="username">{{ currentUser?.username }}</div>
            <div class="user-role">{{ isAdmin ? $t('navigation.adminRole') : $t('navigation.userRole') }}</div>
          </div>
        </div>

        <!-- 导航菜单 -->
        <div class="mobile-nav-items">
          <!-- 公共菜单 -->
          <div class="nav-section">
            <div class="section-title">{{ $t('navigation.mainFeatures') }}</div>
            <router-link 
              v-for="item in publicNavItems" 
              :key="item.name"
              :to="item.path" 
              class="mobile-nav-item"
              @click="closeMobileMenu"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.name }}</span>
            </router-link>
          </div>

          <!-- 用户菜单 -->
          <div v-if="isAuthenticated" class="nav-section">
            <div class="section-title">{{ $t('navigation.userCenter') }}</div>
            <router-link 
              v-for="item in userNavItems" 
              :key="item.name"
              :to="item.path" 
              class="mobile-nav-item"
              @click="closeMobileMenu"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.name }}</span>
            </router-link>
          </div>

          <!-- 管理员菜单 -->
          <div v-if="isAdmin" class="nav-section">
            <div class="section-title">{{ $t('navigation.adminPanel') }}</div>
            <router-link 
              v-for="item in adminNavItems" 
              :key="item.name"
              :to="item.path" 
              class="mobile-nav-item"
              @click="closeMobileMenu"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.name }}</span>
            </router-link>
          </div>

          <!-- 设置 -->
          <div class="nav-section">
            <div class="section-title">{{ $t('common.settings') }}</div>
            <div class="mobile-nav-item language-item">
              <el-icon><Operation /></el-icon>
              <span>{{ $t('common.language') }}</span>
              <div class="language-switcher-mobile">
                <LanguageSwitcher variant="text" size="small" :show-text="false" />
              </div>
            </div>
          </div>

          <!-- 登录/退出 -->
          <div class="nav-section">
            <template v-if="!isAuthenticated">
              <router-link to="/login" class="mobile-nav-item" @click="closeMobileMenu">
                <el-icon><User /></el-icon>
                <span>{{ $t('common.login') }}</span>
              </router-link>
              <router-link to="/register" class="mobile-nav-item" @click="closeMobileMenu">
                <el-icon><UserFilled /></el-icon>
                <span>{{ $t('common.register') }}</span>
              </router-link>
            </template>
            <template v-else>
              <div class="mobile-nav-item logout-item" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                <span>{{ $t('common.logout') }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </el-drawer>
  </header>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import {
  CaretRight,
  Menu,
  User,
  UserFilled,
  House,
  Star,
  Setting,
  SwitchButton,
  ArrowDown,
  Reading,
  Document,
  School,
  DataBoard,
  Folder,
  TrendCharts,
  Operation
} from '@element-plus/icons-vue'

export default {
  name: 'AppNavbar',
  components: {
    LanguageSwitcher,
    CaretRight,
    Menu,
    User,
    UserFilled,
    House,
    Star,
    Setting,
    SwitchButton,
    ArrowDown,
    Reading,
    Document,
    School,
    DataBoard,
    Folder,
    TrendCharts,
    Operation
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const { t } = useI18n()
    
    const mobileMenuVisible = ref(false)
    const isMobile = ref(false)

    // 检测移动端
    const checkMobile = () => {
      isMobile.value = window.innerWidth <= 768
    }

    // 初始化移动端检测
    onMounted(() => {
      checkMobile()
      window.addEventListener('resize', checkMobile)
    })

    // 清理事件监听器
    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile)
    })

    // 计算属性
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const currentUser = computed(() => store.getters['auth/currentUser'])
    const isAdmin = computed(() => store.getters['auth/userRole'] === 'admin')

    // 导航菜单配置
    const publicNavItems = []

    const userNavItems = computed(() => [
      { name: t('navigation.dashboard'), path: '/dashboard', icon: 'House' },
      { name: t('navigation.practice'), path: '/practice', icon: 'Reading' },
      { name: t('navigation.accident'), path: '/accident-report', icon: 'Document' },
      { name: t('navigation.bookmarks'), path: '/bookmarks', icon: 'Star' },
      { name: t('navigation.profile'), path: '/profile', icon: 'User' }
    ])

    const adminNavItems = computed(() => [
      { name: t('navigation.admin.dashboard'), path: '/admin/dashboard', icon: 'DataBoard' },
      { name: t('navigation.admin.questions'), path: '/admin/questions', icon: 'Folder' },
      { name: t('navigation.admin.users'), path: '/admin/users', icon: 'User' }
    ])

    // 方法
    const isActiveRoute = (path) => {
      return route.path === path || route.path.startsWith(path + '/')
    }

    const toggleMobileMenu = () => {
      mobileMenuVisible.value = !mobileMenuVisible.value
    }

    const closeMobileMenu = () => {
      mobileMenuVisible.value = false
    }

    const handleUserCommand = (command) => {
      switch (command) {
        case 'dashboard':
          router.push('/dashboard')
          break
        case 'profile':
          router.push('/profile')
          break
        case 'bookmarks':
          router.push('/bookmarks')
          break
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'logout':
          handleLogout()
          break
      }
    }

    const handleLogout = async () => {
      try {
        await ElMessageBox.confirm(t('navigation.logoutConfirm'), t('common.warning'), {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        })

        await store.dispatch('auth/logout')
        ElMessage.success(t('navigation.logoutSuccess'))
        router.push('/')
        closeMobileMenu()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('navigation.logoutFailed'))
        }
      }
    }

    return {
      mobileMenuVisible,
      isMobile,
      isAuthenticated,
      currentUser,
      isAdmin,
      publicNavItems,
      userNavItems,
      adminNavItems,
      isActiveRoute,
      toggleMobileMenu,
      closeMobileMenu,
      handleUserCommand,
      handleLogout
    }
  }
}
</script>

<style lang="scss" scoped>
.app-navbar {
  background: white;
  border-bottom: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.navbar-brand {
  .brand-link {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
  }

  .brand-logo {
    width: 40px;
    height: 40px;
    background: var(--el-color-primary);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
  }

  .brand-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin: 0;
  }
}

.desktop-nav {
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 768px) {
    display: none;
  }
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  .language-switcher-nav {
    @media (max-width: 768px) {
      display: none;
    }
  }
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: var(--el-fill-color-light);
  }

  .username {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .dropdown-icon {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.mobile-menu-btn {
  display: none;

  @media (max-width: 768px) {
    display: flex;
  }
}

// 移动端导航样式
.mobile-nav {
  padding: 24px 0;
}

.mobile-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 24px;

  .user-details {
    .username {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .user-role {
      font-size: 12px;
      color: var(--el-text-color-regular);
      margin-top: 2px;
    }
  }
}

.nav-section {
  margin-bottom: 24px;

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 24px 12px;
  }
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  text-decoration: none;
  color: var(--el-text-color-primary);
  transition: background 0.3s;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.router-link-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    border-right: 3px solid var(--el-color-primary);
  }

  &.logout-item {
    cursor: pointer;
    color: var(--el-color-danger);

    &:hover {
      background: var(--el-color-danger-light-9);
    }
  }

  span {
    font-weight: 500;
  }

  &.language-item {
    justify-content: space-between;
    cursor: default;

    &:hover {
      background: transparent;
    }

    .language-switcher-mobile {
      margin-left: auto;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .navbar-container {
    padding: 0 16px;
  }

  .brand-title {
    font-size: 18px;
  }

  .navbar-actions .nav-link,
  .navbar-actions .el-button {
    display: none;
  }

  .navbar-actions .user-menu-trigger {
    display: none;
  }
}
</style>
