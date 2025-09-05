<template>
  <div class="app-sidebar" :class="{ collapsed: isCollapsed, 'mobile-open': isMobileOpen }">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <el-icon><CaretRight /></el-icon>
        </div>
        <el-text v-show="!isCollapsed" class="brand-title" size="large" tag="h2">
          {{ isAdminArea ? $t('nav.adminDashboard') : $t('common.appName') }}
        </el-text>
      </div>
      <el-button
        class="collapse-btn"
        :icon="isCollapsed ? Expand : Fold"
        text
        circle
        @click="toggleCollapse"
      />
    </div>

    <!-- 用户信息 -->
    <div class="sidebar-user" v-if="currentUser">
      <el-avatar :size="isCollapsed ? 32 : 48" :src="currentUser.avatar">
        <el-icon><User /></el-icon>
      </el-avatar>
      <div v-show="!isCollapsed" class="user-info">
        <el-text class="username" size="default" tag="div">{{ currentUser.username }}</el-text>
        <el-text class="user-role" size="small" type="info" tag="div">{{ userRoleText }}</el-text>
      </div>
      <!-- 通知中心 - 仅在用户区显示 -->
      <div v-if="!isAdminArea" class="notification-center-container">
        <NotificationCenter />
      </div>
    </div>

    <!-- 导航菜单 -->
    <el-menu
      :default-active="currentActiveIndex"
      :collapse="isCollapsed"
      :collapse-transition="true"
      :unique-opened="false"
      class="sidebar-menu"
      @select="handleMenuSelect"
    >
      <!-- 主要功能菜单 -->
      <el-menu-item-group v-show="!isCollapsed" :title="$t('nav.mainFeatures')">
        <el-menu-item
          v-for="item in navigationItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <el-badge
              v-if="item.path === '/notifications'"
              :value="unreadCount"
              :max="99"
              :hidden="unreadCount === 0"
              :show-zero="false"
              type="danger"
            >
              <component :is="item.icon" />
            </el-badge>
            <component v-else :is="item.icon" />
          </el-icon>

          <template #title>{{ item.name }}</template>
        </el-menu-item>
      </el-menu-item-group>

      <!-- 折叠状态下的主要功能菜单 -->
      <template v-if="isCollapsed">
        <el-menu-item
          v-for="item in navigationItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <el-badge
              v-if="item.path === '/notifications'"
              :value="unreadCount"
              :max="99"
              :hidden="unreadCount === 0"
              :show-zero="false"
              type="danger"
            >
              <component :is="item.icon" />
            </el-badge>
            <component v-else :is="item.icon" />
          </el-icon>
          <template #title>{{ item.name }}</template>
        </el-menu-item>
      </template>

      <!-- 管理员专用菜单 -->
      <template v-if="isAdminArea">
        <el-menu-item-group v-show="!isCollapsed" :title="$t('nav.systemManagement')">
          <el-menu-item
            v-for="item in adminItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <template #title>{{ item.name }}</template>
          </el-menu-item>
        </el-menu-item-group>

        <!-- 折叠状态下的管理员菜单 -->
        <template v-if="isCollapsed">
          <el-menu-item
            v-for="item in adminItems"
            :key="item.path"
            :index="item.path"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <template #title>{{ item.name }}</template>
          </el-menu-item>
        </template>
      </template>
    </el-menu>

    <!-- 底部操作 -->
    <div class="sidebar-footer">
      <!-- 返回用户区/管理区切换 -->
      <el-button
        v-if="isAdmin"
        class="footer-btn switch-btn"
        :icon="isAdminArea ? User : Setting"
        text
        @click="switchArea"
      >
        <span v-show="!isCollapsed">
          {{ isAdminArea ? $t('nav.userCenter') : $t('nav.adminDashboard') }}
        </span>
      </el-button>

      <!-- 语言切换 -->
      <el-dropdown
        class="language-dropdown"
        :class="{ collapsed: isCollapsed }"
        trigger="click"
        placement="top-start"
      >
        <el-button
          class="footer-btn language-btn"
          :icon="Operation"
          text
        >
          <span v-show="!isCollapsed">{{ $t('nav.languageSettings') }}</span>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="lang in supportedLanguages"
              :key="lang.code"
              :command="lang.code"
              @click="changeLanguage(lang.code)"
            >
              <span class="language-flag">{{ lang.flag }}</span>
              <span class="language-name">{{ lang.name }}</span>
              <el-icon v-if="currentLanguage === lang.code" class="language-check">
                <Check />
              </el-icon>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <!-- 退出登录 -->
      <el-button
        class="footer-btn logout-btn"
        :icon="SwitchButton"
        text
        @click="handleLogout"
      >
        <span v-show="!isCollapsed">{{ $t('nav.logout') }}</span>
      </el-button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { setLanguage, supportedLanguages, getCurrentLanguage } from '@/i18n'
import NotificationCenter from '@/components/common/NotificationCenter.vue'
import { useNotifications } from '@/services/notificationService'
import {
  CaretRight,
  User,
  Expand,
  Fold,
  House,
  Reading,
  Document,
  Star,
  School,
  Setting,
  SwitchButton,
  DataBoard,
  Folder,
  TrendCharts,
  Bell,
  Operation,
  Check
} from '@element-plus/icons-vue'

export default {
  name: 'AppSidebar',
  components: {
    NotificationCenter,
    CaretRight,
    User,
    Expand,
    Fold,
    House,
    Reading,
    Document,
    Star,
    School,
    Setting,
    SwitchButton,
    DataBoard,
    Folder,
    TrendCharts,
    Bell,
    Operation,
    Check
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const route = useRoute()
    const { t } = useI18n()
    const { unreadCount, setUnreadCountForTesting, service } = useNotifications()

    // 本地状态
    const localUnreadCount = ref(0)

    // 监听服务状态变化 - 只监听unreadCount，避免深度监听
    watch(() => service.getState().unreadCount, (newCount) => {
      localUnreadCount.value = newCount
    }, { immediate: true })

    // 测试方法
    const testBadge = () => {
      const testCount = Math.floor(Math.random() * 10) + 1
      setUnreadCountForTesting(testCount)
    }

    // 在开发环境下暴露测试方法到全局
    if (process.env.NODE_ENV === 'development') {
      window.testNotificationBadge = testBadge
    }

    const isCollapsed = ref(false)
    const isMobileOpen = computed(() => store.getters['app/sidebarMobileOpen'])

    // 计算属性
    const currentUser = computed(() => store.getters['auth/currentUser'])
    const isAdmin = computed(() => store.getters['auth/userRole'] === 'admin')
    const isAdminArea = computed(() => route.path.startsWith('/admin'))
    
    const userRoleText = computed(() => {
      return isAdmin.value ? t('nav.admin') : t('nav.user')
    })

    // 用户区导航菜单
    const userNavItems = computed(() => [
      { name: t('nav.userCenter'), path: '/dashboard', icon: 'House' },
      { name: t('nav.practiceBank'), path: '/practice', icon: 'Reading' },
      { name: t('nav.accidentRecord'), path: '/accident-report', icon: 'Document' },
      { name: t('nav.bookmarkedQuestions'), path: '/bookmarks', icon: 'Star' },
      { name: t('nav.notifications'), path: '/notifications', icon: 'Bell' },
      { name: t('nav.schoolInfo'), path: '/schools', icon: 'School' },
      { name: t('nav.personalProfile'), path: '/profile', icon: 'User' }
    ])

    // 管理员区导航菜单
    const adminNavItems = computed(() => [
      { name: t('nav.adminDashboard'), path: '/admin/dashboard', icon: 'DataBoard' },
      { name: t('nav.questionManagement'), path: '/admin/questions', icon: 'Folder' },
      { name: t('nav.userManagement'), path: '/admin/users', icon: 'User' }
    ])

    // 管理员专用功能
    const adminItems = computed(() => [
      { name: t('nav.systemSettings'), path: '/admin/settings', icon: 'Setting' },
      { name: t('nav.notificationManagement'), path: '/admin/notifications', icon: 'Bell' }
    ])

    // 当前导航菜单
    const navigationItems = computed(() => {
      return isAdminArea.value ? adminNavItems.value : userNavItems.value
    })

    // 当前激活的菜单项
    const currentActiveIndex = computed(() => {
      return route.path
    })

    // 当前语言
    const currentLanguage = computed(() => getCurrentLanguage())

    // 方法
    const toggleCollapse = () => {
      isCollapsed.value = !isCollapsed.value
      // 同步到Vuex store
      store.dispatch('app/toggleSidebar')
      // 保存状态到本地存储
      localStorage.setItem('sidebar-collapsed', isCollapsed.value.toString())
    }

    const handleMenuSelect = (index) => {
      router.push(index)
    }

    const switchArea = () => {
      const targetPath = isAdminArea.value ? '/dashboard' : '/admin/dashboard'
      router.push(targetPath)
    }

    const changeLanguage = (langCode) => {
      setLanguage(langCode)
      ElMessage.success(t('messages.success'))
    }

    const handleLogout = async () => {
      try {
        await ElMessageBox.confirm(t('auth.confirmLogout'), t('common.confirm'), {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        })
        
        await store.dispatch('auth/logout')
        ElMessage.success(t('messages.success'))
        router.push('/')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('messages.error'))
        }
      }
    }

    // 初始化折叠状态
    const initCollapsedState = () => {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved !== null) {
        isCollapsed.value = saved === 'true'
        // 同步到Vuex store
        store.commit('app/SET_SIDEBAR_COLLAPSED', isCollapsed.value)
      } else {
        // 如果没有本地存储，使用store中的状态
        isCollapsed.value = store.getters['app/sidebarCollapsed']
      }
    }

    // 组件挂载时初始化
    initCollapsedState()

    return {
      isCollapsed,
      isMobileOpen,
      currentUser,
      isAdmin,
      isAdminArea,
      userRoleText,
      navigationItems,
      adminItems,
      currentActiveIndex,
      currentLanguage,
      supportedLanguages,
      unreadCount: localUnreadCount,
      toggleCollapse,
      handleMenuSelect,
      switchArea,
      changeLanguage,
      handleLogout,
      // 图标组件
      CaretRight,
      User,
      Expand,
      Fold,
      Setting,
      Operation,
      SwitchButton,
      Check
    }
  }
}
</script>

<style lang="scss" scoped>
.app-sidebar {
  width: 260px;
  height: 100vh;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

  &.collapsed {
    width: 64px;
  }

  @media (max-width: 768px) {
    transform: translateX(-100%);
    transition: transform 0.3s ease, width 0.3s ease;

    &.mobile-open {
      transform: translateX(0);
      z-index: 2000;
    }
  }
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.brand-logo {
  width: 32px;
  height: 32px;
  background: var(--el-color-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}

.brand-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 0.3s ease;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.sidebar-user {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.user-info {
  flex: 1;
  min-width: 0;
  transition: opacity 0.3s ease;
}

.username {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  margin-top: 2px;
}

.notification-center-container {
  margin-left: auto;
  display: flex;
  align-items: center;
}

// Element Plus Menu 样式覆盖
.sidebar-menu {
  flex: 1;
  border: none;
  background: transparent;

  :deep(.el-menu-item-group__title) {
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-regular);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  :deep(.el-menu-item) {
    height: 48px;
    line-height: 48px;
    margin: 2px 8px;
    border-radius: 6px;

    &:hover {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }

    &.is-active {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary);
      font-weight: 500;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--el-color-primary);
        border-radius: 0 2px 2px 0;
      }
    }

    .el-icon {
      width: 20px;
      height: 20px;
      font-size: 18px;

      :deep(.el-badge) {
        .el-badge__content {
          border: 2px solid var(--el-bg-color);
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          line-height: 12px;
          padding: 0 4px;
          top: -8px;
          right: -8px;
        }
      }
    }
  }

  // 折叠状态样式
  &.el-menu--collapse {
    :deep(.el-menu-item) {
      padding: 0 16px;

      .el-icon {
        margin-right: 0;
      }
    }
  }
}

.sidebar-footer {
  border-top: 1px solid var(--el-border-color-lighter);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-btn {
  width: 100%;
  height: 40px;
  justify-content: flex-start;
  padding: 0 12px;
  border-radius: 6px;

  .el-icon {
    width: 20px;
    height: 20px;
    font-size: 18px;
    margin-right: 12px;
  }

  span {
    flex: 1;
    text-align: left;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

.switch-btn {
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
  padding-bottom: 8px;
  border-radius: 6px 6px 0 0;
}

.language-dropdown {
  width: 100%;

  &.collapsed {
    :deep(.el-dropdown) {
      width: 100%;
    }
  }
}

.language-btn {
  width: 100%;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;

  .language-flag {
    font-size: 16px;
  }

  .language-name {
    flex: 1;
  }

  .language-check {
    color: var(--el-color-primary);
    font-size: 14px;
  }
}

.logout-btn {
  color: var(--el-color-danger);

  &:hover {
    background: var(--el-color-danger-light-9);
    color: var(--el-color-danger);
  }
}

// 折叠状态样式
.app-sidebar.collapsed {
  .sidebar-header {
    padding: 4px;
    flex-direction: column;
    gap: 4px;
    min-height: auto;
  }

  .sidebar-brand {
    justify-content: center;
    gap: 0;
  }

  .collapse-btn {
    width: 24px;
    height: 24px;
    font-size: 14px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);

    &:hover {
      background: var(--el-color-primary-light-8);
      border-color: var(--el-color-primary-light-6);
    }
  }

  .sidebar-user {
    flex-direction: column;
    gap: 8px;
    padding: 16px 8px;

    .notification-center-container {
      margin-left: 0;
    }
  }

  .footer-btn {
    justify-content: center;
    padding: 0 8px;

    .el-icon {
      margin-right: 0;
    }
  }

  .switch-btn {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}



// 滚动条样式
:deep(.el-menu) {
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--el-border-color-dark);
  }
}


</style>
