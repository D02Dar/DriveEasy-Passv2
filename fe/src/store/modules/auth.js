import api from '@/api'
import { ElMessage } from 'element-plus'
import i18n from '@/i18n'
import Cookies from 'js-cookie'

const TOKEN_KEY = 'driving_exam_token'
const USER_KEY = 'driving_exam_user'

const state = {
  token: Cookies.get(TOKEN_KEY) || null,
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  isAuthenticated: !!(Cookies.get(TOKEN_KEY) && localStorage.getItem(USER_KEY)),
  checkingAuth: false
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
    if (token) {
      Cookies.set(TOKEN_KEY, token, { expires: 7 })
    } else {
      Cookies.remove(TOKEN_KEY)
    }
  },
  
  SET_USER(state, user) {
    state.user = user
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  },
  
  SET_AUTHENTICATED(state, isAuthenticated) {
    state.isAuthenticated = isAuthenticated
  },

  SET_CHECKING_AUTH(state, checking) {
    state.checkingAuth = checking
  },
  
  UPDATE_USER_PROFILE(state, profile) {
    if (state.user) {
      state.user = { ...state.user, ...profile }
      localStorage.setItem(USER_KEY, JSON.stringify(state.user))
    }
  }
}

const actions = {
  // 登录
  async login({ commit }, credentials) {
    try {
      const response = await api.auth.login(credentials)
      const { token, user } = response.data // 后端返回的数据在data字段中

      commit('SET_TOKEN', token)
      commit('SET_USER', user)
      commit('SET_AUTHENTICATED', true)

      ElMessage.success(i18n.global.t('auth.loginSuccess'))
      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.message || i18n.global.t('auth.loginFailed')
      ElMessage.error(message)
      return { success: false, message }
    }
  },
  
  // 注册
  async register({ commit }, userData) {
    try {
      const response = await api.auth.register(userData)
      const { token, user } = response.data // 后端返回的数据在data字段中

      commit('SET_TOKEN', token)
      commit('SET_USER', user)
      commit('SET_AUTHENTICATED', true)

      ElMessage.success(i18n.global.t('auth.registerSuccess'))
      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.message || i18n.global.t('auth.registerFailed')
      ElMessage.error(message)
      return { success: false, message }
    }
  },
  
  // 登出
  async logout({ commit }) {
    try {
      await api.auth.logout()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      commit('SET_TOKEN', null)
      commit('SET_USER', null)
      commit('SET_AUTHENTICATED', false)
      ElMessage.success(i18n.global.t('auth.logoutSuccess'))
    }
  },

  // 清除认证信息（不调用API，用于401错误处理）
  clearAuth({ commit }) {
    commit('SET_TOKEN', null)
    commit('SET_USER', null)
    commit('SET_AUTHENTICATED', false)
  },
  
  // 检查认证状态
  async checkAuth({ commit, state }) {
    if (!state.token) {
      commit('SET_AUTHENTICATED', false)
      return false
    }

    // 防止重复检查
    if (state.checkingAuth) {
      return state.isAuthenticated
    }

    commit('SET_CHECKING_AUTH', true)

    try {
      const response = await api.auth.getProfile()
      const user = response.data // 后端返回的数据在data字段中

      commit('SET_USER', user)
      commit('SET_AUTHENTICATED', true)
      return true
    } catch (error) {
      console.error('Auth check failed:', error.message)
      // Token无效，清除认证信息
      commit('SET_TOKEN', null)
      commit('SET_USER', null)
      commit('SET_AUTHENTICATED', false)
      return false
    } finally {
      commit('SET_CHECKING_AUTH', false)
    }
  },
  
  // 更新用户资料
  async updateProfile({ commit }, profileData) {
    try {
      const response = await api.auth.updateProfile(profileData)
      const updatedUser = response.data // 后端返回的数据在data字段中

      commit('UPDATE_USER_PROFILE', updatedUser)
      ElMessage.success(i18n.global.t('messages.updateSuccess'))
      return { success: true, user: updatedUser }
    } catch (error) {
      const message = error.response?.data?.message || i18n.global.t('messages.updateFailed')
      ElMessage.error(message)
      return { success: false, message }
    }
  },
  
  // 修改密码
  async changePassword({ commit }, passwordData) {
    try {
      await api.auth.changePassword(passwordData)
      ElMessage.success(i18n.global.t('profile.changePasswordSuccess'))
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || i18n.global.t('profile.changePasswordFailed')
      ElMessage.error(message)
      return { success: false, message }
    }
  }
}

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  currentUser: state => state.user,
  userRole: state => state.user?.role || null,
  userId: state => state.user?.id || null,
  userName: state => state.user?.username || '',
  userEmail: state => state.user?.email || '',
  userAvatar: state => state.user?.avatar_url || '',
  isAdmin: state => state.user?.role === 'admin',
  token: state => state.token
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
