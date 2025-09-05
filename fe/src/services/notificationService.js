import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

// 全局通知状态
const notificationState = reactive({
  unreadCount: 0,
  notifications: [],
  isPolling: false,
  pollingInterval: null,
  fetchingUnreadCount: false
})

// 轮询间隔（毫秒）
const POLLING_INTERVAL = 30000 // 30秒
const INITIAL_DELAY = 1000 // 初始延迟1秒

class NotificationService {
  constructor() {
    this.listeners = new Set()
    this.setupVisibilityListener()
  }

  // 设置页面可见性监听
  setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && notificationState.isPolling) {
          // 页面变为可见时，立即刷新一次
          this.fetchUnreadCount()
        }
      })
    }
  }

  // 获取通知状态
  getState() {
    return notificationState
  }

  // 测试方法：手动设置未读数量（仅用于调试）
  setUnreadCountForTesting(count) {
    if (process.env.NODE_ENV === 'development') {
      notificationState.unreadCount = count
      this.notifyListeners()
    }
  }

  // 添加状态监听器
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // 通知所有监听器
  notifyListeners() {
    this.listeners.forEach(callback => callback(notificationState))
  }

  // 开始轮询
  startPolling() {
    if (notificationState.isPolling) {
      return
    }

    notificationState.isPolling = true

    // 延迟一小段时间后获取，避免与页面初始化冲突
    setTimeout(() => {
      this.fetchUnreadCount()
    }, INITIAL_DELAY)

    // 设置定时轮询
    notificationState.pollingInterval = setInterval(() => {
      this.fetchUnreadCount()
    }, POLLING_INTERVAL)
  }

  // 停止轮询
  stopPolling() {
    if (!notificationState.isPolling) return

    notificationState.isPolling = false

    if (notificationState.pollingInterval) {
      clearInterval(notificationState.pollingInterval)
      notificationState.pollingInterval = null
    }
  }

  // 获取未读通知数量
  async fetchUnreadCount() {
    // 防止重复请求
    if (notificationState.fetchingUnreadCount) {
      return
    }

    try {
      notificationState.fetchingUnreadCount = true
      const response = await api.notifications.getUnreadCount()
      // API响应拦截器已经解包了response.data，所以这里直接访问data
      const newCount = response?.data?.unreadCount || 0

      // 如果未读数量增加，显示提示
      if (newCount > notificationState.unreadCount) {
        const increase = newCount - notificationState.unreadCount
        if (notificationState.unreadCount > 0) { // 不是首次加载
          // 检查通知设置
          if (this.checkNotificationSettings() && !this.isInQuietHours()) {
            ElMessage({
              message: `您有 ${increase} 条新通知`,
              type: 'info',
              duration: 3000,
              showClose: true
            })

            // 播放通知声音
            this.playNotificationSound()

            // 显示浏览器通知
            this.showBrowserNotification(
              '新通知',
              `您有 ${increase} 条新通知`
            )
          }
        }
      }

      notificationState.unreadCount = newCount
      this.notifyListeners()
    } catch (error) {
      console.error('获取未读通知数量失败:', error)
    } finally {
      notificationState.fetchingUnreadCount = false
    }
  }

  // 获取通知列表
  async fetchNotifications(params = {}) {
    try {
      const response = await api.notifications.getAll({
        limit: 10,
        ...params
      })

      // API响应拦截器已经解包了response.data
      notificationState.notifications = response?.data?.notifications || []
      this.notifyListeners()

      return response?.data || { notifications: [], pagination: {} }
    } catch (error) {
      console.error('获取通知列表失败:', error)
      throw error
    }
  }

  // 标记单个通知为已读
  async markAsRead(notificationId) {
    try {
      await api.notifications.markAsRead(notificationId)
      
      // 更新本地状态
      const notification = notificationState.notifications?.find(n => n.id === notificationId)
      if (notification && !notification.isRead) {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
        notificationState.unreadCount = Math.max(0, notificationState.unreadCount - 1)
        this.notifyListeners()
      }
      
      return true
    } catch (error) {
      console.error('标记通知已读失败:', error)
      throw error
    }
  }

  // 标记所有通知为已读
  async markAllAsRead() {
    try {
      await api.notifications.markAllAsRead()
      
      // 更新本地状态
      notificationState.notifications?.forEach(notification => {
        notification.isRead = true
        notification.readAt = new Date().toISOString()
      })
      notificationState.unreadCount = 0
      this.notifyListeners()
      
      return true
    } catch (error) {
      console.error('标记所有通知已读失败:', error)
      throw error
    }
  }

  // 创建新通知（管理员功能）
  async createNotification(data) {
    try {
      const response = await api.notifications.create(data)
      
      // 如果创建成功，刷新通知列表
      this.fetchUnreadCount()
      
      return response.data
    } catch (error) {
      console.error('创建通知失败:', error)
      throw error
    }
  }

  // 重置状态（用于登出时）
  reset() {
    this.stopPolling()
    notificationState.unreadCount = 0
    notificationState.notifications = []
    this.notifyListeners()
  }

  // 手动刷新
  refresh() {
    this.fetchUnreadCount()
  }

  // 获取未读数量（同步方法）
  getUnreadCount() {
    return notificationState.unreadCount
  }

  // 获取通知列表（同步方法）
  getNotifications() {
    return notificationState.notifications
  }

  // 检查是否正在轮询
  isPolling() {
    return notificationState.isPolling
  }

  // 检查通知设置
  checkNotificationSettings() {
    const settings = this.getNotificationSettings()
    return settings.enabled
  }

  // 获取通知设置
  getNotificationSettings() {
    const defaultSettings = {
      enabled: true,
      types: {
        system: true,
        announcement: true,
        practice: true,
        achievement: false,
        reminder: true
      },
      browserNotification: false,
      soundNotification: true,
      quietHours: {
        enabled: false,
        startTime: null,
        endTime: null
      }
    }

    const savedSettings = localStorage.getItem('notificationSettings')
    if (savedSettings) {
      try {
        return { ...defaultSettings, ...JSON.parse(savedSettings) }
      } catch (error) {
        console.error('解析通知设置失败:', error)
      }
    }

    return defaultSettings
  }

  // 检查是否在免打扰时间
  isInQuietHours() {
    const settings = this.getNotificationSettings()
    if (!settings.quietHours.enabled || !settings.quietHours.startTime || !settings.quietHours.endTime) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const startTime = new Date(settings.quietHours.startTime)
    const endTime = new Date(settings.quietHours.endTime)

    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

    if (startMinutes <= endMinutes) {
      // 同一天内的时间范围
      return currentTime >= startMinutes && currentTime <= endMinutes
    } else {
      // 跨天的时间范围
      return currentTime >= startMinutes || currentTime <= endMinutes
    }
  }

  // 显示浏览器通知
  showBrowserNotification(title, body, icon = '/favicon.ico') {
    const settings = this.getNotificationSettings()

    if (!settings.enabled || !settings.browserNotification || this.isInQuietHours()) {
      return
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon,
        tag: 'driving-assistant-notification'
      })
    }
  }

  // 播放通知声音
  playNotificationSound() {
    const settings = this.getNotificationSettings()

    if (!settings.enabled || !settings.soundNotification || this.isInQuietHours()) {
      return
    }

    // 这里可以播放通知声音
    // 可以使用 Web Audio API 或者 HTML5 Audio
    try {
      const audio = new Audio('/notification-sound.mp3')
      audio.volume = 0.5
      audio.play().catch(error => {
        console.log('播放通知声音失败:', error)
      })
    } catch (error) {
      console.log('通知声音不可用:', error)
    }
  }
}

// 创建单例实例
const notificationService = new NotificationService()

// 导出服务实例和状态
export default notificationService
export { notificationState }

// 导出 Vue 组合式函数
export function useNotifications() {
  const state = notificationState

  return {
    // 状态 - 直接返回响应式状态，不包装在新的ref中
    unreadCount: computed(() => state.unreadCount),
    notifications: computed(() => state.notifications),
    isPolling: computed(() => state.isPolling),

    // 方法
    startPolling: () => notificationService.startPolling(),
    stopPolling: () => notificationService.stopPolling(),
    fetchNotifications: (params) => notificationService.fetchNotifications(params),
    markAsRead: (id) => notificationService.markAsRead(id),
    markAllAsRead: () => notificationService.markAllAsRead(),
    refresh: () => notificationService.refresh(),

    // 测试方法（仅开发环境）
    setUnreadCountForTesting: (count) => notificationService.setUnreadCountForTesting(count),

    // 服务实例
    service: notificationService
  }
}
