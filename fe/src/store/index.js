import { createStore } from 'vuex'
import auth from './modules/auth'
import app from './modules/app'

const store = createStore({
  modules: {
    auth,
    app
  },

  state: {
    // 分离不同类型的加载状态
    routeLoading: false,  // 路由切换加载
    apiLoading: false,    // API请求加载
    error: null
  },

  mutations: {
    SET_ROUTE_LOADING(state, loading) {
      state.routeLoading = loading
    },

    SET_API_LOADING(state, loading) {
      state.apiLoading = loading
    },

    SET_ERROR(state, error) {
      state.error = error
    },

    CLEAR_ERROR(state) {
      state.error = null
    }
  },

  actions: {
    setRouteLoading({ commit }, loading) {
      commit('SET_ROUTE_LOADING', loading)
    },

    setApiLoading({ commit }, loading) {
      commit('SET_API_LOADING', loading)
    },

    // 保持向后兼容
    setLoading({ commit }, loading) {
      commit('SET_API_LOADING', loading)
    },

    setError({ commit }, error) {
      commit('SET_ERROR', error)
    },

    clearError({ commit }) {
      commit('CLEAR_ERROR')
    }
  },

  getters: {
    isRouteLoading: state => state.routeLoading,
    isApiLoading: state => state.apiLoading,
    // 任一加载状态为true时显示加载
    isLoading: state => state.routeLoading || state.apiLoading,
    hasError: state => !!state.error,
    errorMessage: state => state.error
  }
})

export default store
