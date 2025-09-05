<template>
  <div class="language-test-page">
    <div class="test-container">
      <div class="test-header">
        <h1>{{ $t('common.appName') }}</h1>
        <p>{{ $t('home.subtitle') }}</p>
        <LanguageSwitcher />
      </div>
      
      <div class="test-content">
        <el-card class="test-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('common.language') }} {{ $t('common.settings') }}</span>
            </div>
          </template>
          
          <div class="test-items">
            <div class="test-item">
              <label>{{ $t('common.appName') }}:</label>
              <span>{{ $t('common.appName') }}</span>
            </div>
            
            <div class="test-item">
              <label>{{ $t('navigation.practice') }}:</label>
              <span>{{ $t('navigation.practice') }}</span>
            </div>
            
            <div class="test-item">
              <label>{{ $t('practice.startPractice') }}:</label>
              <span>{{ $t('practice.startPractice') }}</span>
            </div>
            
            <div class="test-item">
              <label>{{ $t('auth.loginTitle') }}:</label>
              <span>{{ $t('auth.loginTitle') }}</span>
            </div>
            
            <div class="test-item">
              <label>{{ $t('dashboard.welcome') }}:</label>
              <span>{{ $t('dashboard.welcome') }}</span>
            </div>
          </div>
        </el-card>
        
        <el-card class="test-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('home.features.title') }}</span>
            </div>
          </template>
          
          <div class="features-grid">
            <div class="feature-item">
              <h3>{{ $t('home.features.practice.title') }}</h3>
              <p>{{ $t('home.features.practice.description') }}</p>
            </div>
            
            <div class="feature-item">
              <h3>{{ $t('home.features.progress.title') }}</h3>
              <p>{{ $t('home.features.progress.description') }}</p>
            </div>
            
            <div class="feature-item">
              <h3>{{ $t('home.features.bookmarks.title') }}</h3>
              <p>{{ $t('home.features.bookmarks.description') }}</p>
            </div>
            
            <div class="feature-item">
              <h3>{{ $t('home.features.multilang.title') }}</h3>
              <p>{{ $t('home.features.multilang.description') }}</p>
            </div>
          </div>
        </el-card>
        
        <el-card class="test-card">
          <template #header>
            <div class="card-header">
              <span>{{ $t('common.settings') }}</span>
            </div>
          </template>
          
          <div class="actions">
            <el-button type="primary">{{ $t('common.save') }}</el-button>
            <el-button>{{ $t('common.cancel') }}</el-button>
            <el-button type="success">{{ $t('common.confirm') }}</el-button>
            <el-button type="warning">{{ $t('common.edit') }}</el-button>
            <el-button type="danger">{{ $t('common.delete') }}</el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

export default {
  name: 'LanguageTest',
  components: {
    LanguageSwitcher
  },
  setup() {
    const { locale, t } = useI18n()
    
    const currentLocale = computed(() => locale.value)
    
    return {
      currentLocale,
      t
    }
  }
}
</script>

<style lang="scss" scoped>
.language-test-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

.test-container {
  max-width: 1200px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 32px;
  
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
  }
  
  p {
    font-size: 16px;
    color: var(--el-text-color-regular);
    margin-bottom: 24px;
  }
}

.test-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.test-card {
  .card-header {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.test-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  
  label {
    font-weight: 600;
    color: var(--el-text-color-regular);
  }
  
  span {
    color: var(--el-text-color-primary);
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.feature-item {
  padding: 20px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: var(--el-text-color-regular);
    line-height: 1.6;
  }
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .test-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .actions {
    flex-direction: column;
  }
}
</style>
