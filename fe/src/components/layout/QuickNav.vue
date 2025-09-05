<template>
  <div class="quick-nav" :class="{ visible: isVisible }">
    <div class="quick-nav-trigger" @click="toggleNav">
      <el-icon><Menu /></el-icon>
    </div>
    
    <transition name="slide-fade">
      <div v-show="isOpen" class="quick-nav-menu">
        <div class="nav-header">
          <span class="nav-title">{{ $t('nav.quickNavigation') }}/span>
          <el-button text @click="closeNav">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        
        <div class="nav-content">
          <!-- 常用功能 -->
          <div class="nav-section">
            <div class="section-title">{{ $t('nav.commonFeatures') }}/div>
            <div class="nav-items">
              <router-link 
                v-for="item in quickNavItems" 
                :key="item.name"
                :to="item.path" 
                class="nav-item"
                @click="closeNav"
              >
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.name }}</span>
              </router-link>
            </div>
          </div>

          <!-- 最近访问 -->
          <div v-if="recentPages.length > 0" class="nav-section">
            <div class="section-title">最近访问</div>
            <div class="nav-items">
              <router-link 
                v-for="page in recentPages" 
                :key="page.path"
                :to="page.path" 
                class="nav-item recent-item"
                @click="closeNav"
              >
                <el-icon><Clock /></el-icon>
                <span>{{ page.name }}</span>
              </router-link>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="nav-section">
            <div class="section-title">快捷操作</div>
            <div class="nav-items">
              <div class="nav-item action-item" @click="startRandomPractice">
                <el-icon><Refresh /></el-icon>
                <span>随机练习</span>
              </div>
              <div class="nav-item action-item" @click="viewBookmarks">
                <el-icon><Star /></el-icon>
                <span>我的收藏</span>
              </div>
              <div class="nav-item action-item" @click="checkProgress">
                <el-icon><TrendCharts /></el-icon>
                <span>学习进度</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useStore } from 'vuex'
import {
  Menu,
  Close,
  Clock,
  Refresh,
  Star,
  TrendCharts,
  Reading,
  Document,
  User,
  House,
  School
} from '@element-plus/icons-vue'

export default {
  name: 'QuickNav',
  components: {
    Menu,
    Close,
    Clock,
    Refresh,
    Star,
    TrendCharts,
    Reading,
    Document,
    User,
    House,
    School
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    const store = useStore()
    
    const isOpen = ref(false)
    const isVisible = ref(false)
    const recentPages = ref([])

    // 计算属性
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const isAdminArea = computed(() => route.path.startsWith('/admin'))

    // 快速导航项
    const quickNavItems = computed(() => {
      if (!isAuthenticated.value) return []
      
      if (isAdminArea.value) {
        return [
          { name: '管理后台', path: '/admin/dashboard', icon: 'House' },
          { name: '题目管理', path: '/admin/questions', icon: 'Document' },
          { name: '用户管理', path: '/admin/users', icon: 'User' }
        ]
      } else {
        return [
          { name: '用户中心', path: '/dashboard', icon: 'House' },
          { name: '题库练习', path: '/practice', icon: 'Reading' },
          { name: t('stats.accidentRecords'), path: '/accident-report', icon: 'Document' },
          { name: '驾校信息', path: '/schools', icon: 'School' }
        ]
      }
    })

    // 方法
    const toggleNav = () => {
      isOpen.value = !isOpen.value
    }

    const closeNav = () => {
      isOpen.value = false
    }

    const startRandomPractice = () => {
      router.push('/practice?mode=random')
      closeNav()
    }

    const viewBookmarks = () => {
      router.push('/bookmarks')
      closeNav()
    }

    const checkProgress = () => {
      router.push('/dashboard#progress')
      closeNav()
    }

    // 监听滚动，控制显示/隐藏
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      isVisible.value = scrollTop > 200
    }

    // 记录页面访问历史
    const recordPageVisit = () => {
      if (!isAuthenticated.value) return
      
      const currentPage = {
        name: route.meta?.title || '未知页面',
        path: route.path,
        timestamp: Date.now()
      }

      // 从本地存储获取历史记录
      const stored = localStorage.getItem('recent-pages')
      let history = stored ? JSON.parse(stored) : []
      
      // 移除重复项
      history = history.filter(page => page.path !== currentPage.path)
      
      // 添加到开头
      history.unshift(currentPage)
      
      // 只保留最近5个
      history = history.slice(0, 5)
      
      // 保存到本地存储
      localStorage.setItem('recent-pages', JSON.stringify(history))
      recentPages.value = history
    }

    // 加载历史记录
    const loadRecentPages = () => {
      const stored = localStorage.getItem('recent-pages')
      if (stored) {
        recentPages.value = JSON.parse(stored)
      }
    }

    // 生命周期
    onMounted(() => {
      window.addEventListener('scroll', handleScroll)
      loadRecentPages()
      recordPageVisit()
    })

    onUnmounted(() => {
      window.removeEventListener('scroll', handleScroll)
    })

    // 监听路由变化 - 使用watch替代afterEach避免重复监听
    watch(route, (newRoute, oldRoute) => {
      // 只在路径真正改变时执行
      if (newRoute.path !== oldRoute?.path) {
        recordPageVisit()
        closeNav()
      }
    })

    return {
      isOpen,
      isVisible,
      recentPages,
      quickNavItems,
      toggleNav,
      closeNav,
      startRandomPractice,
      viewBookmarks,
      checkProgress
    }
  }
}
</script>

<style lang="scss" scoped>
.quick-nav {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 999;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s ease;

  &.visible {
    opacity: 1;
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    bottom: 120px;
    right: 16px;
  }
}

.quick-nav-trigger {
  width: 56px;
  height: 56px;
  background: var(--el-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;

  &:hover {
    background: var(--el-color-primary-dark-2);
    transform: scale(1.1);
  }

  .el-icon {
    font-size: 24px;
  }
}

.quick-nav-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--el-color-primary-light-9);
  border-bottom: 1px solid var(--el-border-color-light);

  .nav-title {
    font-weight: 600;
    color: var(--el-color-primary);
  }
}

.nav-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 0;
}

.nav-section {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 20px 8px;
  }
}

.nav-items {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  text-decoration: none;
  color: var(--el-text-color-primary);
  transition: background 0.3s;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.recent-item {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }

  &.action-item {
    color: var(--el-color-info);

    &:hover {
      background: var(--el-color-info-light-9);
    }
  }

  .el-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  span {
    font-weight: 500;
  }
}

// 动画
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}
</style>
