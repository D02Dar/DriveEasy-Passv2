<template>
  <div id="app">
    <AppLayout>
      <router-view :key="$route.name" />
    </AppLayout>
  </div>
</template>

<script>
import { AppLayout } from '@/components/layout'
import notificationService from '@/services/notificationService'

export default {
  name: 'App',
  components: {
    AppLayout
  },
  data() {
    return {
      notificationServiceTimeout: null
    }
  },
  mounted() {
    // 应用初始化
    this.initApp()

    // 监听登录状态变化
    this.$store.watch(
      (state) => state.auth.isAuthenticated,
      (isAuthenticated) => {
        if (!isAuthenticated) {
          // 用户登出后停止通知轮询并重置状态
          notificationService.reset()
        }
        // 登录后的通知服务启动由全局路由守卫处理，避免重复
      }
    )

    // 注意：路由变化的通知服务处理已移到全局路由守卫中，避免重复监听

    // HMR调试信息
    if (import.meta.hot) {
      import.meta.hot.on('vite:error', (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('HMR错误:', err)
        }
      })
    }
  },
  beforeDestroy() {
    // 清除定时器
    if (this.notificationServiceTimeout) {
      clearTimeout(this.notificationServiceTimeout)
    }
    // 组件销毁前停止通知轮询
    notificationService.stopPolling()
  },
  methods: {
    async initApp() {
      // 检查用户登录状态
      await this.$store.dispatch('auth/checkAuth')

      // 通知服务的启动由全局路由守卫处理，避免重复

      // 设置主题
      this.setTheme()

      // 设置语言
      this.setLanguage()
    },

    setTheme() {
      const theme = localStorage.getItem('theme') || 'light'
      document.documentElement.setAttribute('data-theme', theme)
    },

    setLanguage() {
      // 不要重置语言，只同步当前状态
      // i18n 已经在初始化时正确设置了语言
      const currentLanguage = localStorage.getItem('language')
      if (currentLanguage) {
        this.$store.commit('app/SET_LANGUAGE', currentLanguage)
        document.documentElement.lang = currentLanguage
      }
    },

    // 注意：通知服务管理已移到全局路由守卫中，此方法已废弃
  }
}

// HMR支持
if (import.meta.hot) {
  import.meta.hot.accept()
}
</script>

<style lang="scss">
// 全局样式重置
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
  color: var(--el-text-color-primary);
  background-color: var(--el-bg-color);
}

// 滚动条样式
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-darker);
}

// 响应式断点
@media (max-width: 768px) {
  .el-container {
    flex-direction: column;
  }
}
</style>
