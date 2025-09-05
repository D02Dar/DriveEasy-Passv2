import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import enUs from 'element-plus/dist/locale/en.mjs'
import th from 'element-plus/dist/locale/th.mjs'

// i18n
import i18n, { setElementPlusLocaleUpdater, getCurrentLanguage } from './i18n'

// 全局样式
import './styles/index.scss'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Element Plus 语言映射
const elementPlusLocales = {
  'zh-CN': zhCn,
  'en-US': enUs,
  'th-TH': th
}

// 获取当前Element Plus语言
function getCurrentElementPlusLocale() {
  const currentLang = getCurrentLanguage()
  return elementPlusLocales[currentLang] || zhCn
}

// 设置Element Plus语言更新函数
setElementPlusLocaleUpdater((locale) => {
  // 这里可以动态更新Element Plus语言
  // 由于Element Plus在初始化后不能直接更改语言，
  // 实际项目中可能需要重新挂载组件或使用其他方法
})

// 使用插件
app.use(store)
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: getCurrentElementPlusLocale(),
  size: 'default'
})



// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  // 生产环境下移除console.log，开发环境保留错误日志
  if (process.env.NODE_ENV === 'development') {
    console.error('Vue全局错误:', err)
    console.error('错误信息:', info)
    console.error('组件实例:', vm)
    console.error('错误堆栈:', err.stack)

    // 检查是否是导致页面重载的错误
    if (err.message && err.message.includes('reload')) {
      console.error('检测到可能导致页面重载的错误!')
    }
  }
}

// 挂载应用
app.mount('#app')
