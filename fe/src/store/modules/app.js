const state = {
  language: 'zh-CN',
  theme: 'light',
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  deviceType: 'desktop'
}

const mutations = {
  SET_LANGUAGE(state, language) {
    state.language = language
    localStorage.setItem('language', language)
  },
  
  SET_THEME(state, theme) {
    state.theme = theme
    localStorage.setItem('theme', theme)
  },
  
  SET_SIDEBAR_COLLAPSED(state, collapsed) {
    state.sidebarCollapsed = collapsed
  },

  SET_SIDEBAR_MOBILE_OPEN(state, open) {
    state.sidebarMobileOpen = open
  },
  
  SET_DEVICE_TYPE(state, deviceType) {
    state.deviceType = deviceType
  }
}

const actions = {
  setLanguage({ commit }, language) {
    commit('SET_LANGUAGE', language)
  },
  
  setTheme({ commit }, theme) {
    commit('SET_THEME', theme)
  },
  
  toggleSidebar({ commit, state }) {
    commit('SET_SIDEBAR_COLLAPSED', !state.sidebarCollapsed)
  },

  toggleMobileSidebar({ commit, state }) {
    commit('SET_SIDEBAR_MOBILE_OPEN', !state.sidebarMobileOpen)
  },

  closeMobileSidebar({ commit }) {
    commit('SET_SIDEBAR_MOBILE_OPEN', false)
  },
  
  setDeviceType({ commit }, deviceType) {
    commit('SET_DEVICE_TYPE', deviceType)
  }
}

const getters = {
  language: state => state.language,
  theme: state => state.theme,
  sidebarCollapsed: state => state.sidebarCollapsed,
  sidebarMobileOpen: state => state.sidebarMobileOpen,
  deviceType: state => state.deviceType,
  isMobile: state => state.deviceType === 'mobile'
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
