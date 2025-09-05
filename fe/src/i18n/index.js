import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'
import thTH from './locales/th-TH.json'

// 获取浏览器语言
function getBrowserLanguage() {
  const language = navigator.language || navigator.userLanguage
  if (language.startsWith('zh')) return 'zh-CN'
  if (language.startsWith('en')) return 'en-US'
  if (language.startsWith('th')) return 'th-TH'
  return 'zh-CN' // 默认中文
}

// 获取存储的语言或浏览器语言
function getDefaultLanguage() {
  return localStorage.getItem('language') || getBrowserLanguage()
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: getDefaultLanguage(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'th-TH': thTH
  },
  globalInjection: true // 全局注入 $t
})

export default i18n

// 切换语言的辅助函数
export function setLanguage(locale) {
  i18n.global.locale.value = locale
  localStorage.setItem('language', locale)
  
  // 更新 Element Plus 语言
  updateElementPlusLocale(locale)
  
  // 更新 HTML lang 属性
  document.documentElement.lang = locale
}

// 更新 Element Plus 语言
function updateElementPlusLocale(locale) {
  // 这个函数将在 main.js 中被重写
}

// 导出设置 Element Plus 语言更新函数的方法
export function setElementPlusLocaleUpdater(updater) {
  updateElementPlusLocale = updater
}

// 获取当前语言
export function getCurrentLanguage() {
  return i18n.global.locale.value
}

// 获取支持的语言列表
export const supportedLanguages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'th-TH', name: 'ไทย', flag: '🇹🇭' }
]

// 界面语言到题目语言的映射
export function getQuestionLanguage(uiLanguage = null) {
  const currentLang = uiLanguage || getCurrentLanguage()
  const languageMap = {
    'zh-CN': 'cn',
    'en-US': 'en',
    'th-TH': 'th'
  }

  const result = languageMap[currentLang] || 'en'

  return result
}
