<template>
  <div class="home home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              <span class="title-line">Professional Driving Test</span>
              <span class="title-line">Practice Platform</span>
            </h1>
            <p class="hero-subtitle">
              Provides subject 1 and subject 4 question bank practice, accident records, driving school information inquiry and other functions.
            </p>
            <div class="hero-actions">
              <el-button
                type="primary"
                size="large"
                class="register-btn"
                @click="handlePrimaryAction"
              >
                {{ isAuthenticated ? $t('home.hero.startPractice') : 'Register Now' }}
              </el-button>
            </div>
          </div>
          <div class="hero-illustration">
            <div class="illustration-container">
              <img 
                src="/images/hero-car.svg" 
                alt="Driving Practice Platform" 
                class="hero-car-svg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="section-container">
        <div class="section-header">
          <h2 class="section-title">{{ $t('home.features.title') }}</h2>
          <p class="section-subtitle">{{ $t('home.features.subtitle') }}</p>
        </div>

        <div class="features-grid">
          <div
            class="feature-card"
            v-for="(feature, index) in features"
            :key="feature.key"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <div class="feature-icon">
              <el-icon :size="32"><component :is="feature.icon" /></el-icon>
            </div>
            <h3 class="feature-title">{{ $t(feature.title) }}</h3>
            <p class="feature-description">{{ $t(feature.description) }}</p>
            <div class="feature-link">
              <router-link :to="feature.link" class="learn-more">
                {{ $t('home.features.learnMore') }}
                <el-icon><ArrowRight /></el-icon>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats" v-if="statsData.length > 0">
      <div class="section-container">
        <div class="stats-grid">
          <div
            class="stat-card"
            v-for="(stat, index) in statsData"
            :key="stat.key"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <div class="stat-icon">
              <el-icon><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number" :data-target="stat.value">{{ stat.displayValue }}</div>
              <div class="stat-label">{{ $t(stat.label) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="section-container">
        <div class="cta-content">
          <h2 class="cta-title">{{ $t('home.cta.title') }}</h2>
          <p class="cta-subtitle">{{ $t('home.cta.subtitle') }}</p>
          <div class="cta-actions">
            <el-button
              type="primary"
              size="large"
              @click="handleGetStarted"
            >
              {{ $t('home.cta.getStarted') }}
            </el-button>
            <el-button
              size="large"
              @click="handleLearnMore"
            >
              {{ $t('home.cta.learnMore') }}
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="section-container">
        <div class="footer-content">
          <div class="footer-main">
            <div class="footer-brand">
              <div class="brand-logo">
                <el-icon><CaretRight /></el-icon>
              </div>
              <h3 class="brand-name">{{ $t('common.appName') }}</h3>
              <p class="brand-description">{{ $t('home.footer.description') }}</p>
            </div>

            <div class="footer-links">
              <div class="link-group">
                <h4 class="link-title">{{ $t('home.footer.features') }}</h4>
                <ul class="link-list">
                  <li><router-link to="/practice">{{ $t('home.footer.practice') }}</router-link></li>
                  <li><router-link to="/accident-report">{{ $t('home.footer.accident') }}</router-link></li>
                  <li><router-link to="/schools">{{ $t('home.footer.schools') }}</router-link></li>
                </ul>
              </div>

              <div class="link-group">
                <h4 class="link-title">{{ $t('home.footer.support') }}</h4>
                <ul class="link-list">
                  <li><a href="#" @click.prevent="handleHelp">{{ $t('home.footer.help') }}</a></li>
                  <li><a href="#" @click.prevent="handleFAQ">{{ $t('home.footer.faq') }}</a></li>
                  <li><a href="#" @click.prevent="handleContact">{{ $t('home.footer.contact') }}</a></li>
                </ul>
              </div>

              <div class="link-group">
                <h4 class="link-title">{{ $t('home.footer.legal') }}</h4>
                <ul class="link-list">
                  <li><a href="#" @click.prevent="handlePrivacy">{{ $t('home.footer.privacy') }}</a></li>
                  <li><a href="#" @click.prevent="handleTerms">{{ $t('home.footer.terms') }}</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div class="footer-bottom">
            <div class="footer-copyright">
              <p>{{ $t('common.appName') }}. {{ $t('home.footer.rights') }}</p>
            </div>
            <div class="footer-language">
              <LanguageSwitcher variant="text" size="small" :show-text="true" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import {
  Document,
  TrendCharts,
  Star,
  Warning,
  Trophy,
  CaretRight,
  VideoPlay,
  ArrowRight,
  DataBoard,
  User,
  Check
} from '@element-plus/icons-vue'

export default {
  name: 'Home',
  components: {
    LanguageSwitcher,
    Document,
    TrendCharts,
    Star,
    Warning,
    Trophy,
    CaretRight,
    VideoPlay,
    ArrowRight,
    DataBoard,
    User,
    Check
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t } = useI18n()

    // 响应式数据
    const statsData = ref([])
    const loading = ref(false)

    // 计算属性
    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])

    // Hero区域统计数据
    const heroStats = computed(() => [
      { key: 'questions', value: '10K+', label: 'home.hero.stats.questions' },
      { key: 'users', value: '5K+', label: 'home.hero.stats.users' },
      { key: 'success', value: '95%', label: 'home.hero.stats.success' }
    ])

    // 功能特色数据
    const features = computed(() => [
      {
        key: 'practice',
        icon: 'Document',
        title: 'home.features.practice.title',
        description: 'home.features.practice.description',
        link: '/practice'
      },
      {
        key: 'progress',
        icon: 'TrendCharts',
        title: 'home.features.progress.title',
        description: 'home.features.progress.description',
        link: '/dashboard'
      },
      {
        key: 'bookmarks',
        icon: 'Star',
        title: 'home.features.bookmarks.title',
        description: 'home.features.bookmarks.description',
        link: '/bookmarks'
      },
      {
        key: 'accident',
        icon: 'Warning',
        title: 'home.features.accident.title',
        description: 'home.features.accident.description',
        link: '/accident-report'
      }
    ])

    // 方法
    const handlePrimaryAction = () => {
      if (isAuthenticated.value) {
        router.push('/practice')
      } else {
        router.push('/register')
      }
    }

    const handleSecondaryAction = () => {
      // 播放演示视频或跳转到介绍页面
      ElMessage.info(t('home.messages.demoComingSoon'))
    }

    const handleGetStarted = () => {
      if (isAuthenticated.value) {
        router.push('/dashboard')
      } else {
        router.push('/register')
      }
    }

    const handleLearnMore = () => {
      // 滚动到功能介绍区域
      const featuresSection = document.querySelector('.features')
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' })
      }
    }

    // 页脚链接处理
    const handleHelp = () => {
      ElMessage.info(t('home.messages.helpComingSoon'))
    }

    const handleFAQ = () => {
      ElMessage.info(t('home.messages.faqComingSoon'))
    }

    const handleContact = () => {
      ElMessage.info(t('home.messages.contactComingSoon'))
    }

    const handlePrivacy = () => {
      ElMessage.info(t('home.messages.privacyComingSoon'))
    }

    const handleTerms = () => {
      ElMessage.info(t('home.messages.termsComingSoon'))
    }

    // 获取统计数据
    const fetchStats = async () => {
      try {
        loading.value = true
        // TODO: 从API获取真实统计数据
        // const response = await api.getStats()

        // 模拟数据，后续替换为真实API调用
        await new Promise(resolve => setTimeout(resolve, 1000))

        statsData.value = [
          {
            key: 'totalQuestions',
            icon: 'Document',
            value: 10000,
            displayValue: '10,000+',
            label: 'home.stats.totalQuestions'
          },
          {
            key: 'activeUsers',
            icon: 'User',
            value: 5000,
            displayValue: '5,000+',
            label: 'home.stats.activeUsers'
          },
          {
            key: 'successRate',
            icon: 'Check',
            value: 95,
            displayValue: '95%',
            label: 'home.stats.successRate'
          },
          {
            key: 'practiceCount',
            icon: 'DataBoard',
            value: 50000,
            displayValue: '50K+',
            label: 'home.stats.practiceCount'
          }
        ]
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        // 使用默认数据
        statsData.value = []
      } finally {
        loading.value = false
      }
    }

    // 生命周期
    onMounted(() => {
      fetchStats()
    })

    return {
      isAuthenticated,
      heroStats,
      features,
      statsData,
      loading,
      handlePrimaryAction,
      handleSecondaryAction,
      handleGetStarted,
      handleLearnMore,
      handleHelp,
      handleFAQ,
      handleContact,
      handlePrivacy,
      handleTerms
    }
  }
}
</script>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
  width: 100%;
}

// 通用容器
.section-container {
  max-width: 100%;
  margin: 0;
  padding: 0;
  width: 100%;
}

// Hero Section
.hero {
  min-height: 80vh;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
  overflow: hidden;
}

.hero-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 2rem;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  min-height: 60vh;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
    min-height: auto;
  }

  @media (max-width: 768px) {
    gap: 2rem;
  }
}

.hero-text {
  .hero-title {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1.5rem;
    color: white;

    .title-line {
      display: block;
    }
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.6;
    margin-bottom: 2.5rem;
    color: rgba(255, 255, 255, 0.9);
    max-width: 500px;

    @media (max-width: 968px) {
      max-width: none;
    }
  }

  .hero-actions {
    .register-btn {
      background: white;
      color: #667eea;
      border: none;
      padding: 1rem 2.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.95);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      }
    }
  }
}

.hero-illustration {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .illustration-container {
    width: 100%;
    max-width: 400px;
    height: auto;
    min-height: 300px;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;

    @media (max-width: 968px) {
      max-width: 350px;
      min-height: 263px;
    }

    @media (max-width: 768px) {
      max-width: 300px;
      min-height: 225px;
      padding: 0.5rem;
    }

    @media (max-width: 480px) {
      max-width: 250px;
      min-height: 188px;
    }

    @media (max-width: 360px) {
      max-width: 200px;
      min-height: 150px;
    }
  }

  .hero-car-svg {
    width: 100%;
    height: auto;
    max-width: 400px;
    max-height: 300px;
    object-fit: contain;
    filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1));
    transition: all 0.3s ease;
    display: block;
    margin: 0 auto;

    &:hover {
      transform: scale(1.05);
      filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.15));
    }

    @media (max-width: 968px) {
      max-width: 350px;
      max-height: 263px;
    }

    @media (max-width: 768px) {
      max-width: 300px;
      max-height: 225px;
    }

    @media (max-width: 480px) {
      max-width: 250px;
      max-height: 188px;
    }

    @media (max-width: 360px) {
      max-width: 200px;
      max-height: 150px;
    }
  }
}




// Features Section
.features {
  padding: 6rem 2rem;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;

  .section-title {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 1rem;
  }

  .section-subtitle {
    font-size: 1.125rem;
    color: var(--el-text-color-regular);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.feature-card {
  background: white;
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(30px);

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    border-color: var(--el-color-primary-light-7);
  }
}

.feature-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--el-color-primary-light-8), var(--el-color-primary-light-9));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  color: var(--el-color-primary);
  transition: all 0.3s ease;

  .el-icon {
    font-size: 2rem;
  }

  .feature-card:hover & {
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-dark-2));
    color: white;
    transform: scale(1.1);
  }
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 1rem;
}

.feature-description {
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.feature-link {
  .learn-more {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--el-color-primary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;

    &:hover {
      color: var(--el-color-primary-dark-2);
      transform: translateX(4px);
    }

    .el-icon {
      font-size: 0.875rem;
      transition: transform 0.3s ease;
    }

    &:hover .el-icon {
      transform: translateX(4px);
    }
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Stats Section
.stats {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-dark-2));
  color: white;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
    opacity: 0.3;
  }
}

.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  text-align: center;
  padding: 1.5rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out forwards;
  animation-delay: var(--delay);
  opacity: 0;
  transform: translateY(30px);

  &:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.15);
  }
}

.stat-icon {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: white;

  .el-icon {
    font-size: 1.5rem;
  }
}

.stat-content {
  .stat-number {
    font-size: 2.5rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    background: linear-gradient(45deg, #ffffff, #f0f9ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-label {
    font-size: 1rem;
    opacity: 0.9;
    font-weight: 500;
  }
}

// CTA Section
.cta {
  padding: 6rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  text-align: center;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;

  .cta-title {
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 1rem;
  }

  .cta-subtitle {
    font-size: 1.125rem;
    color: var(--el-text-color-regular);
    margin-bottom: 2.5rem;
    line-height: 1.6;
  }
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: center;
  }
}

// Footer
.footer {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23dots)"/></svg>');
  }
}

.footer-content {
  position: relative;
  z-index: 1;
  padding: 4rem 2rem 2rem;

  @media (max-width: 768px) {
    padding: 3rem 1rem 1.5rem;
  }
}

.footer-main {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 4rem;
  margin-bottom: 3rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }
}

.footer-brand {
  .brand-logo {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, var(--el-color-primary), var(--el-color-primary-dark-2));
    border-radius: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
    color: white;
    font-size: 1.5rem;

    @media (max-width: 1024px) {
      margin: 0 auto 1.5rem;
    }
  }

  .brand-name {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: white;
  }

  .brand-description {
    color: #cbd5e1;
    line-height: 1.6;
    max-width: 300px;

    @media (max-width: 1024px) {
      margin: 0 auto;
    }
  }
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.link-group {
  .link-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: white;
  }

  .link-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      margin-bottom: 0.75rem;

      a {
        color: #cbd5e1;
        text-decoration: none;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;

        &:hover {
          color: white;
          transform: translateX(4px);
        }
      }
    }
  }
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
}

.footer-copyright {
  color: #94a3b8;
  font-size: 0.875rem;
}

.footer-language {
  :deep(.language-switcher) {
    .el-button {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: white;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }
    }
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .hero-container {
    padding: 2rem 1rem;
  }

  .section-container {
    padding: 0 1.5rem;
  }
}

@media (max-width: 768px) {
  .hero {
    min-height: 80vh;
    padding: 2rem 0;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.125rem;
  }

  .features {
    padding: 4rem 0;
  }

  .stats {
    padding: 3rem 0;
  }

  .cta {
    padding: 4rem 0;
  }
}

@media (max-width: 480px) {
  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .hero-actions {
    width: 100%;

    .el-button {
      width: 100%;
      max-width: 300px;
    }
  }

  .features-grid {
    gap: 1rem;
  }

  .feature-card {
    padding: 2rem 1.5rem;
  }
}

// 深色模式支持
@media (prefers-color-scheme: dark) {
  .features {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  }

  .feature-card {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .cta {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
}

// 打印样式
@media print {
  .hero-shapes,
  .floating-cards,
  .hero-visual {
    display: none;
  }

  .hero {
    background: white;
    color: black;
    min-height: auto;
    padding: 2rem 0;
  }

  .stats,
  .cta,
  .footer {
    display: none;
  }
}
</style>
