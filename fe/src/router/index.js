import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'
import { ElMessage } from 'element-plus'
import i18n from '@/i18n'
import notificationService from '@/services/notificationService'

// 路由组件懒加载
const Home = () => import('@/views/Home.vue')
const Login = () => import('@/views/auth/Login.vue')
const Register = () => import('@/views/auth/Register.vue')
const Dashboard = () => import('@/views/user/Dashboard.vue')
const Practice = () => import('@/views/user/Practice.vue')
const PracticeDetail = () => import('@/views/user/PracticeDetail.vue')
const PracticeRecords = () => import('@/views/user/PracticeRecords.vue')
const Bookmarks = () => import('@/views/user/Bookmarks.vue')
const Profile = () => import('@/views/user/Profile.vue')
const AccidentReport = () => import('@/views/user/AccidentReport.vue')
// 暂时使用静态导入来避免动态导入问题
// const AccidentReportWizard = () => import('@/views/user/AccidentReportWizard.vue')
import AccidentReportWizard from '@/views/user/AccidentReportWizard.vue'
const Schools = () => import('@/views/user/Schools.vue')
const AdminDashboard = () => import('@/views/admin/Dashboard.vue')
const AdminQuestions = () => import('@/views/admin/Questions.vue')
const AdminUsers = () => import('@/views/admin/Users.vue')
const AdminNotifications = () => import('@/views/admin/Notifications.vue')

const NotFound = () => import('@/views/error/NotFound.vue')
const LanguageTest = () => import('@/views/test/LanguageTest.vue')

// 路由配置
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'home',
      requiresAuth: false
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: 'login',
      requiresAuth: false,
      hideForAuth: true
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: {
      title: 'register',
      requiresAuth: false,
      hideForAuth: true
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: {
      title: 'userCenter',
      requiresAuth: true
    }
  },
  {
    path: '/practice',
    name: 'Practice',
    component: Practice,
    meta: {
      title: 'practice',
      requiresAuth: true
    }
  },
  {
    path: '/practice/:categoryId',
    name: 'PracticeDetail',
    component: PracticeDetail,
    meta: {
      title: 'startPractice',
      requiresAuth: true
    }
  },
  {
    path: '/practice/records',
    name: 'PracticeRecords',
    component: PracticeRecords,
    meta: {
      title: 'practiceRecords',
      requiresAuth: true
    }
  },
  {
    path: '/bookmarks',
    name: 'Bookmarks',
    component: Bookmarks,
    meta: {
      title: 'bookmarks',
      requiresAuth: true
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: {
      title: 'profile',
      requiresAuth: true
    }
  },
  {
    path: '/accident-report',
    name: 'AccidentReport',
    component: AccidentReport,
    meta: {
      title: 'accidentReport',
      requiresAuth: true
    }
  },
  {
    path: '/accident-report/wizard',
    name: 'AccidentReportWizard',
    component: AccidentReportWizard,
    meta: {
      title: 'createAccidentReport',
      requiresAuth: true
    }
  },
  {
    path: '/schools',
    name: 'Schools',
    component: Schools,
    meta: {
      title: 'schools',
      requiresAuth: false
    }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/user/Notifications.vue'),
    meta: {
      title: 'notifications',
      requiresAuth: true
    }
  },
  {
    path: '/notification-settings',
    name: 'NotificationSettings',
    component: () => import('@/views/user/NotificationSettings.vue'),
    meta: {
      title: 'notificationSettings',
      requiresAuth: true
    }
  },
  // 管理员路由
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: {
      title: 'adminDashboard',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/questions',
    name: 'AdminQuestions',
    component: AdminQuestions,
    meta: {
      title: 'questionManagement',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: AdminUsers,
    meta: {
      title: 'userManagement',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/notifications',
    name: 'AdminNotifications',
    component: AdminNotifications,
    meta: {
      title: 'notificationManagement',
      requiresAuth: true,
      requiresAdmin: true
    }
  },

  // 测试页面
  {
    path: '/test/language',
    name: 'LanguageTest',
    component: LanguageTest,
    meta: {
      title: 'languageTest',
      requiresAuth: false
    }
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: {
      title: 'notFound'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置路由加载状态
  store.dispatch('setRouteLoading', true)

  try {
    // 设置页面标题
    document.title = to.meta.title ? `${i18n.global.t('pageTitle.' + to.meta.title)} - ${i18n.global.t('common.appName')}` : i18n.global.t('common.appName')

    // 如果有token但未认证，先检查认证状态
    const token = store.getters['auth/token']
    let isAuthenticated = store.getters['auth/isAuthenticated']

    // 更严格的认证检查条件，避免重复检查
    if (token && !isAuthenticated && !store.state.auth.checkingAuth &&
        to.meta.requiresAuth && to.name !== from.name) {
      try {
        // 尝试验证token有效性
        isAuthenticated = await store.dispatch('auth/checkAuth')
      } catch (error) {
        console.error('认证检查失败:', error)
        isAuthenticated = false
      }
    }

    const userRole = store.getters['auth/userRole']

    // 如果需要认证但用户未登录
    if (to.meta.requiresAuth && !isAuthenticated) {
      ElMessage.warning(i18n.global.t('messages.unauthorized'))
      store.dispatch('setRouteLoading', false) // 清除加载状态
      next('/login')
      return
    }

    // 如果已登录用户访问登录/注册页面
    if (to.meta.hideForAuth && isAuthenticated) {
      store.dispatch('setRouteLoading', false) // 清除加载状态
      next('/dashboard')
      return
    }

    // 如果需要管理员权限但用户不是管理员
    if (to.meta.requiresAdmin && userRole !== 'admin') {
      ElMessage.error(i18n.global.t('messages.forbidden'))
      store.dispatch('setRouteLoading', false) // 清除加载状态
      next('/dashboard')
      return
    }

    next()
  } catch (error) {
    console.error('路由守卫中发生错误:', error)
    store.dispatch('setRouteLoading', false) // 清除加载状态
    next(false) // 取消导航
  }
})

// 路由完成后清除路由加载状态并管理通知服务
router.afterEach((to, from) => {
  // 立即清除路由加载状态，避免与页面组件的API请求加载状态冲突
  store.dispatch('setRouteLoading', false)

  // 管理通知服务（无论是否路由变化都检查，确保服务状态正确）
  if (store.getters['auth/isAuthenticated']) {
    setTimeout(() => {
      const isInAdminArea = to.path.startsWith('/admin')
      const isCurrentlyPolling = notificationService.isPolling()

      if (isInAdminArea) {
        // 如果在管理区域且正在轮询，则停止
        if (isCurrentlyPolling) {
          notificationService.stopPolling()
        }
      } else {
        // 如果不在管理区域且未在轮询，则启动
        if (!isCurrentlyPolling) {
          notificationService.startPolling()
        }
      }
    }, 100) // 100ms防抖
  }
})

export default router
