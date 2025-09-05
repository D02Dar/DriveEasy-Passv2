<template>
  <el-dropdown
    trigger="click"
    placement="bottom-end"
    @command="handleLanguageChange"
    class="modern-language-switcher"
  >
    <div class="language-trigger" :class="[`variant-${variant}`, `size-${size}`]">
      <div class="language-display">
        <span class="current-flag">{{ currentLanguage.flag }}</span>
        <span v-if="showText" class="current-name">{{ currentLanguage.name }}</span>
        <span v-if="showText" class="current-code">{{ currentLanguage.code.split('-')[0].toUpperCase() }}</span>
      </div>
      <el-icon class="dropdown-arrow" :class="{ 'is-open': dropdownVisible }">
        <ArrowDown />
      </el-icon>
    </div>

    <template #dropdown>
      <el-dropdown-menu class="modern-dropdown-menu">
        <div class="dropdown-header">
          <el-icon><Operation /></el-icon>
          <span>{{ $t('common.selectLanguage') }}</span>
        </div>

        <div class="language-list">
          <div
            v-for="lang in supportedLanguages"
            :key="lang.code"
            class="language-item"
            :class="{ 'is-active': currentLocale === lang.code }"
            @click="handleLanguageChange(lang.code)"
          >
            <div class="language-info">
              <span class="flag">{{ lang.flag }}</span>
              <div class="text-info">
                <span class="name">{{ lang.name }}</span>
                <span class="native-name">{{ lang.nativeName }}</span>
              </div>
            </div>
            <div class="language-status">
              <span v-if="currentLocale === lang.code" class="current-badge">
                {{ $t('common.current') }}
              </span>
              <el-icon v-if="currentLocale === lang.code" class="check-icon">
                <Check />
              </el-icon>
            </div>
          </div>
        </div>

        <div class="dropdown-footer">
          <span class="help-text">{{ $t('common.languageHelp') }}</span>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { setLanguage, supportedLanguages as baseSupportedLanguages } from '@/i18n'
import { ArrowDown, Check, Operation } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'LanguageSwitcher',
  components: {
    ArrowDown,
    Check,
    Operation
  },
  props: {
    // 显示变体：default, text, minimal
    variant: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'text', 'minimal'].includes(value)
    },
    // 按钮大小
    size: {
      type: String,
      default: 'default',
      validator: (value) => ['large', 'default', 'small'].includes(value)
    },
    // 是否显示文字
    showText: {
      type: Boolean,
      default: true
    }
  },
  setup() {
    const { locale, t } = useI18n()
    const store = useStore()
    const dropdownVisible = ref(false)

    // 增强的语言支持列表
    const supportedLanguages = computed(() => [
      {
        code: 'zh-CN',
        name: '中文',
        nativeName: '简体中文',
        flag: '🇨🇳'
      },
      {
        code: 'en-US',
        name: 'English',
        nativeName: 'English (US)',
        flag: '🇺🇸'
      },
      {
        code: 'th-TH',
        name: 'ไทย',
        nativeName: 'ภาษาไทย',
        flag: '🇹🇭'
      }
    ])

    // 当前语言
    const currentLocale = computed(() => locale.value)

    // 当前语言对象
    const currentLanguage = computed(() => {
      return supportedLanguages.value.find(lang => lang.code === currentLocale.value) || supportedLanguages.value[0]
    })

    // 切换语言
    const handleLanguageChange = async (langCode) => {
      if (langCode === currentLocale.value) return

      try {
        // 更新 i18n 语言
        setLanguage(langCode)

        // 更新 Vuex 状态
        await store.dispatch('app/setLanguage', langCode)

        // 显示成功消息
        ElMessage.success({
          message: t('common.languageSwitchSuccess'),
          duration: 2000,
          showClose: true
        })

        // 关闭下拉菜单
        dropdownVisible.value = false

      } catch (error) {
        ElMessage.error({
          message: t('common.languageSwitchFailed'),
          duration: 3000,
          showClose: true
        })
      }
    }

    return {
      currentLocale,
      currentLanguage,
      supportedLanguages,
      dropdownVisible,
      handleLanguageChange
    }
  }
}
</script>

<style lang="scss" scoped>
.modern-language-switcher {
  .language-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 120px;

    &:hover {
      border-color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &.variant-text {
      background: transparent;
      border: none;
      padding: 0.25rem 0.5rem;

      &:hover {
        background: var(--el-color-primary-light-9);
        transform: none;
        box-shadow: none;
      }
    }

    &.variant-minimal {
      background: transparent;
      border: none;
      padding: 0.25rem;
      min-width: auto;

      .language-display {
        gap: 0.25rem;
      }
    }

    &.size-small {
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
      min-width: 100px;
    }

    &.size-large {
      padding: 0.75rem 1rem;
      font-size: 1rem;
      min-width: 140px;
    }
  }

  .language-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;

    .current-flag {
      font-size: 1.125rem;
      line-height: 1;
    }

    .current-name {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }

    .current-code {
      font-size: 0.75rem;
      color: var(--el-text-color-secondary);
      background: var(--el-color-info-light-8);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-weight: 600;
      text-transform: uppercase;
    }
  }

  .dropdown-arrow {
    color: var(--el-text-color-secondary);
    font-size: 0.875rem;
    transition: transform 0.3s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }
}

.modern-dropdown-menu {
  min-width: 280px;
  padding: 0;
  border-radius: 0.75rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--el-border-color-light);
  overflow: hidden;

  .dropdown-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--el-color-primary-light-9);
    border-bottom: 1px solid var(--el-border-color-lighter);
    font-weight: 600;
    color: var(--el-color-primary);

    .el-icon {
      font-size: 1.125rem;
    }
  }

  .language-list {
    padding: 0.5rem 0;
    max-height: 300px;
    overflow-y: auto;
  }

  .language-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--el-color-primary-light-9);
    }

    &.is-active {
      background: var(--el-color-primary-light-8);

      .language-info .name {
        color: var(--el-color-primary);
        font-weight: 600;
      }
    }
  }

  .language-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;

    .flag {
      font-size: 1.25rem;
      line-height: 1;
    }

    .text-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;

      .name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        line-height: 1.2;
      }

      .native-name {
        font-size: 0.75rem;
        color: var(--el-text-color-secondary);
        line-height: 1.2;
      }
    }
  }

  .language-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .current-badge {
      font-size: 0.75rem;
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
      font-weight: 500;
    }

    .check-icon {
      color: var(--el-color-primary);
      font-size: 1rem;
    }
  }

  .dropdown-footer {
    padding: 0.75rem 1rem;
    background: var(--el-bg-color-page);
    border-top: 1px solid var(--el-border-color-lighter);

    .help-text {
      font-size: 0.75rem;
      color: var(--el-text-color-secondary);
      text-align: center;
      display: block;
    }
  }
}

// 深色模式支持
:deep(.el-dropdown-menu) {
  @media (prefers-color-scheme: dark) {
    background: var(--el-bg-color-overlay);
    border-color: var(--el-border-color);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .modern-language-switcher {
    .language-trigger {
      min-width: auto;

      .current-name,
      .current-code {
        display: none;
      }
    }
  }

  .modern-dropdown-menu {
    min-width: 240px;

    .language-info .text-info .native-name {
      display: none;
    }
  }
}

@media (max-width: 480px) {
  .modern-dropdown-menu {
    min-width: 200px;

    .dropdown-header,
    .language-item {
      padding: 0.5rem 0.75rem;
    }

    .language-status .current-badge {
      display: none;
    }
  }
}

// 动画效果
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modern-dropdown-menu {
  animation: slideDown 0.3s ease-out;
}

// 无障碍支持
.language-trigger:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.language-item:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
</style>
