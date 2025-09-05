<template>
  <div class="dashboard-page">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <h1 class="page-title">
        {{ $t('dashboard.welcomeMessage', { username: currentUser?.username || $t('dashboard.defaultUser') }) }}
      </h1>
      <p class="page-subtitle">
        {{ $t('dashboard.subtitle') }}
      </p>
      <div class="header-actions">
        <el-button type="primary" @click="startPractice">
          <el-icon><Reading /></el-icon>
          {{ $t('dashboard.startPractice') }}
        </el-button>
        <el-button @click="viewReports">
          <el-icon><Document /></el-icon>
          {{ $t('dashboard.accidentReport') }}
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon primary">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalPractices || 0 }}</div>
          <div class="stat-label">{{ $t('dashboard.practiceCountStat') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalQuestions || 0 }}</div>
          <div class="stat-label">{{ $t('dashboard.totalQuestionsStat') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">
          <el-icon><Trophy /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatScore(stats.averageScore) }}%</div>
          <div class="stat-label">{{ $t('dashboard.averageScoreStat') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon info">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.bookmarkedQuestions || 0 }}</div>
          <div class="stat-label">{{ $t('dashboard.bookmarkedQuestionsStat') }}</div>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <!-- 快速操作 -->
      <div class="content-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><Operation /></el-icon>
            {{ $t('dashboard.quickActions') }}
          </h3>
          <p class="card-description">{{ $t('dashboard.quickActionsDesc') }}</p>
        </div>
        <div class="card-content">
          <div class="quick-actions">
            <div class="action-item" @click="startPractice">
              <div class="action-icon">
                <el-icon><Reading /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('dashboard.startPractice') }}</div>
                <div class="action-desc">{{ $t('dashboard.startPracticeDesc') }}</div>
              </div>
            </div>

            <div class="action-item" @click="viewBookmarks">
              <div class="action-icon">
                <el-icon><Star /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('dashboard.bookmarkReview') }}</div>
                <div class="action-desc">{{ $t('dashboard.bookmarkReviewDesc') }}</div>
              </div>
            </div>

            <div class="action-item" @click="viewReports">
              <div class="action-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('dashboard.accidentReport') }}</div>
                <div class="action-desc">{{ $t('dashboard.accidentReportDesc') }}</div>
              </div>
            </div>

            <div class="action-item" @click="viewSchools">
              <div class="action-icon">
                <el-icon><School /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('dashboard.schoolInfo') }}</div>
                <div class="action-desc">{{ $t('dashboard.schoolInfoDesc') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近练习记录 -->
      <div class="content-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><List /></el-icon>
            {{ $t('dashboard.recentPractices') }}
          </h3>
          <el-link type="primary" @click="viewAllRecords">{{ $t('dashboard.viewAll') }}</el-link>
        </div>
        <div class="card-content">
          <div v-if="recentPractices.length === 0" class="empty-state">
            <el-icon class="empty-icon"><Document /></el-icon>
            <p class="empty-text">{{ $t('dashboard.noPracticeRecords') }}</p>
            <el-button type="primary" size="small" @click="startPractice">
              {{ $t('dashboard.startFirstPractice') }}
            </el-button>
          </div>
          <div v-else class="practice-list">
            <div
              v-for="practice in recentPractices"
              :key="practice.id"
              class="practice-item"
            >
              <div class="practice-info">
                <div class="practice-category">{{ translateCategoryName(practice.categoryName) }}</div>
                <div class="practice-time">
                  {{ formatDate(practice.completedAt) }}
                </div>
              </div>
              <div class="practice-score">
                <div class="score-value" :class="getScoreClass(practice.score)">
                  {{ formatScore(practice.score) }}%
                </div>
                <div class="score-details">
                  {{ practice.correctAnswers }}/{{ practice.totalQuestions }}
                </div>
              </div>
              <div class="practice-status">
                <el-tag
                  :type="practice.isPassed ? 'success' : 'danger'"
                  size="small"
                >
                  {{ practice.isPassed ? $t('dashboard.passed') : $t('dashboard.failed') }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分类练习统计 -->
    <div class="content-card full-width">
      <div class="card-header">
        <h3 class="card-title">
          <el-icon><PieChart /></el-icon>
          {{ $t('dashboard.categoryStats') }}
        </h3>
      </div>
      <div class="card-content">
        <div v-if="categoryStats.length === 0" class="empty-state">
          <el-icon class="empty-icon"><PieChart /></el-icon>
          <p class="empty-text">{{ $t('dashboard.noStatsData') }}</p>
        </div>
        <div v-else class="category-stats">
          <div
            v-for="category in categoryStats"
            :key="category.categoryId"
            class="category-item"
          >
            <div class="category-header">
              <h4 class="category-name">{{ translateCategoryName(category.categoryName) }}</h4>
              <div class="category-score">
                {{ $t('dashboard.averageScoreLabel') }}: {{ formatScore(category.averageScore) }}%
              </div>
            </div>
            <div class="category-progress">
              <el-progress
                :percentage="Math.round(category.averageScore || 0)"
                :color="getProgressColor(category.averageScore)"
                :stroke-width="8"
              />
            </div>
            <div class="category-details">
              <span>{{ $t('dashboard.practiceCountLabel') }}: {{ category.practiceCount }}</span>
              <span>{{ $t('dashboard.passedCountLabel') }}: {{ category.passedCount }}</span>
              <span>{{ $t('dashboard.bestScoreLabel') }}: {{ formatScore(category.bestScore) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useApiDataTranslation } from '@/utils/i18n'
import api from '@/api'
import {
  Clock,
  Document,
  Trophy,
  Star,
  Reading,
  Operation,
  List,
  PieChart,
  School
} from '@element-plus/icons-vue'

export default {
  name: 'Dashboard',
  components: {
    Clock,
    Document,
    Trophy,
    Star,
    Reading,
    Operation,
    List,
    PieChart,
    School
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t } = useI18n()
    const { translateCategoryName, shouldHideCategory } = useApiDataTranslation()
    
    const stats = ref({})
    const recentPractices = ref([])
    const categoryStats = ref([])
    const loading = ref(false)

    const currentUser = computed(() => store.getters['auth/currentUser'])

    // 获取用户统计数据
    const fetchStats = async () => {
      try {
        loading.value = true
        const response = await api.practice.getStats()
        stats.value = response.data.overall
        recentPractices.value = response.data.trend.slice(0, 5) // 最近5条
        categoryStats.value = response.data.categories
      } catch (error) {
        console.error('Error:', error)
        // 可以在这里添加错误提示，但通常dashboard页面不显示错误消息
      } finally {
        loading.value = false
      }
    }

    // 格式化分数
    const formatScore = (score) => {
      return score ? Math.round(score) : 0
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 获取分数样式类
    const getScoreClass = (score) => {
      if (score >= 90) return 'excellent'
      if (score >= 80) return 'good'
      if (score >= 60) return 'pass'
      return 'fail'
    }

    // 获取进度条颜色
    const getProgressColor = (score) => {
      if (score >= 90) return '#67c23a'
      if (score >= 80) return '#409eff'
      if (score >= 60) return '#e6a23c'
      return '#f56c6c'
    }

    // 快速操作方法
    const startPractice = () => {
      router.push('/practice')
    }

    const viewBookmarks = () => {
      router.push('/bookmarks')
    }

    const viewReports = () => {
      router.push('/accident-report')
    }

    const viewSchools = () => {
      router.push('/schools')
    }

    const viewAllRecords = () => {
      router.push('/practice/records')
    }

    onMounted(() => {
      fetchStats()
    })

    return {
      stats,
      recentPractices,
      categoryStats,
      loading,
      currentUser,
      formatScore,
      formatDate,
      getScoreClass,
      getProgressColor,
      startPractice,
      viewBookmarks,
      viewReports,
      viewSchools,
      viewAllRecords,
      translateCategoryName,
      shouldHideCategory
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-page {
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.welcome-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .page-subtitle {
    font-size: 16px;
    color: var(--el-text-color-regular);
    margin-bottom: 20px;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;

  &.primary { background: var(--el-color-primary); }
  &.success { background: var(--el-color-success); }
  &.warning { background: var(--el-color-warning); }
  &.info { background: var(--el-color-info); }
}

.stat-content {
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-top: 4px;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.content-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  &.full-width {
    grid-column: 1 / -1;
  }
}

.card-header {
  padding: 24px 24px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-description {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-top: 4px;
  }
}

.card-content {
  padding: 24px;
}

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.action-icon {
  width: 40px;
  height: 40px;
  background: var(--el-color-primary-light-8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 18px;
}

.action-text {
  .action-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 2px;
  }

  .action-desc {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;

  .empty-icon {
    font-size: 48px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 16px;
  }

  .empty-text {
    color: var(--el-text-color-regular);
    margin-bottom: 16px;
  }
}

.practice-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.practice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.practice-info {
  .practice-category {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .practice-time {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.practice-score {
  text-align: center;

  .score-value {
    font-weight: 700;
    font-size: 16px;

    &.excellent { color: var(--el-color-success); }
    &.good { color: var(--el-color-primary); }
    &.pass { color: var(--el-color-warning); }
    &.fail { color: var(--el-color-danger); }
  }

  .score-details {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.category-item {
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .category-name {
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .category-score {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.category-progress {
  margin-bottom: 12px;
}

.category-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

@media (max-width: 768px) {
  .dashboard-page {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }

  .category-stats {
    grid-template-columns: 1fr;
  }
}
</style>
