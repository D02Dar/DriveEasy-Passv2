import { getCurrentLanguage, getQuestionLanguage as originalGetQuestionLanguage } from '@/i18n'
import { useI18n } from 'vue-i18n'

/**
 * 统一的语言处理工具
 * 解决 useI18n().locale.value 和 i18n.global.locale.value 不同步的问题
 */

/**
 * 获取当前界面语言（统一接口）
 * 优先使用全局语言，确保一致性
 */
export function useCurrentLanguage() {
  const { locale } = useI18n()
  
  // 返回统一的语言获取方法
  const getLanguage = () => {
    // 优先使用全局语言，确保与其他地方一致
    return getCurrentLanguage()
  }
  
  // 返回响应式的语言值（用于模板显示）
  const displayLanguage = locale
  
  return {
    getLanguage,
    displayLanguage
  }
}

/**
 * 获取题目语言（统一接口）
 * 自动处理语言映射，确保一致性
 */
export function useQuestionLanguage() {
  const { getLanguage } = useCurrentLanguage()

  const getQuestionLang = () => {
    const currentLang = getLanguage()
    const questionLang = originalGetQuestionLanguage(currentLang)

    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 语言映射调试:', {
        currentLang,
        questionLang,
        timestamp: new Date().toISOString()
      })
    }

    return questionLang
  }

  return {
    getQuestionLang,
    getCurrentLang: getLanguage
  }
}

/**
 * 语言显示名称映射
 */
export const LANGUAGE_DISPLAY_NAMES = {
  'zh-CN': '中文',
  'en-US': 'English', 
  'th-TH': 'ไทย'
}

/**
 * 获取语言显示名称
 */
export function getLanguageDisplayName(langCode) {
  return LANGUAGE_DISPLAY_NAMES[langCode] || langCode
}

/**
 * 题目语言映射
 */
export const QUESTION_LANGUAGE_MAP = {
  'zh-CN': 'cn',
  'en-US': 'en',
  'th-TH': 'th'
}

/**
 * 检查是否为泰语界面
 */
export function isThaiInterface() {
  return getCurrentLanguage() === 'th-TH'
}

/**
 * 检查是否为中文界面
 */
export function isChineseInterface() {
  return getCurrentLanguage() === 'zh-CN'
}

/**
 * 检查是否为英文界面
 */
export function isEnglishInterface() {
  return getCurrentLanguage() === 'en-US'
}

/**
 * 语言切换后的回调处理
 * 用于需要在语言切换后执行特定操作的组件
 */
export function useLanguageChangeHandler(callback) {
  const { displayLanguage } = useCurrentLanguage()

  // 监听语言变化
  const { watch } = require('vue')

  watch(displayLanguage, (newLang, oldLang) => {
    if (newLang !== oldLang && callback) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 语言切换:', oldLang, '->', newLang)
      }
      callback(newLang, oldLang)
    }
  })
}

/**
 * 获取全局语言状态的响应式引用
 * 用于监听语言变化
 */
export function useGlobalLanguage() {
  const { getCurrentLanguage } = require('@/i18n')
  const { ref, watch } = require('vue')

  // 创建响应式的语言状态
  const globalLanguage = ref(getCurrentLanguage())

  // 监听localStorage变化来同步语言状态
  const handleStorageChange = (e) => {
    if (e.key === 'language') {
      globalLanguage.value = e.newValue || 'zh-CN'
    }
  }

  // 添加存储监听器
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange)
  }

  return {
    globalLanguage,
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }
}
