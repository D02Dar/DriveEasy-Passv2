<template>
  <div class="practice-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">{{ $t('practice.title') }}</h1>
          <p class="page-subtitle">{{ $t('practice.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="viewBookmarks">
            <el-icon><Star /></el-icon>
            {{ $t('practice.bookmarkedQuestions') }}
          </el-button>
          <el-button @click="viewRecords">
            <el-icon><List /></el-icon>
            {{ $t('practice.practiceRecords') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 题目分类列表 -->
    <div v-else class="categories-container">
      <div v-if="categories.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <h3>{{ $t('practice.noCategoriesAvailable') }}</h3>
        <p>{{ $t('practice.contactAdminToAddCategories') }}</p>
      </div>

      <div v-else class="categories-grid">
        <div
            v-for="category in categories"
            :key="category.id"
            class="category-card"
            @click="selectCategory(category)"
        >
          <div class="category-header">
            <div class="category-icon">
              <el-icon><Reading /></el-icon>
            </div>
            <div class="category-info">
              <h3 class="category-name">
                {{ translateCategoryName(category.name) }}
              </h3>
              <p class="category-description">
                {{ translateCategoryName(category.description) }}
              </p>
            </div>
          </div>

          <div class="category-stats" v-if="category.stats">
            <div class="stat-item">
              <span class="stat-label">{{ $t('practice.practiceCount') }}</span>
              <span class="stat-value">{{ category.stats.totalPractices || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ $t('practice.averageScore') }}</span>
              <span class="stat-value">{{ formatScore(category.stats.averageScore) }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ $t('practice.bestScore') }}</span>
              <span class="stat-value">{{ formatScore(category.stats.bestScore) }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ $t('practice.passedCount') }}</span>
              <span class="stat-value">{{ category.stats.passedPractices || 0 }}</span>
            </div>
          </div>

          <div class="category-progress" v-if="category.stats">
            <div class="progress-info">
              <span>{{ $t('practice.masteryLevel') }}</span>
              <span>{{ formatScore(category.stats.averageScore) }}%</span>
            </div>
            <el-progress
                :percentage="Math.round(category.stats.averageScore || 0)"
                :color="getProgressColor(category.stats.averageScore)"
                :stroke-width="6"
            />
          </div>

          <div class="category-actions">
            <el-button
                type="primary"
                size="small"
                @click.stop="startPractice(category)"
            >
              {{ $t('practice.startPractice') }}
            </el-button>
            <el-button
                size="small"
                @click.stop="viewCategoryDetail(category)"
            >
              {{ $t('practice.viewDetails') }}
            </el-button>
          </div>

          <!-- 子分类 -->
          <div v-if="category.children && category.children.length > 0" class="subcategories">
            <h4 class="subcategories-title">{{ $t('practice.subcategories') }}</h4>
            <div class="subcategories-list">
              <div
                  v-for="child in category.children"
                  :key="child.id"
                  class="subcategory-item"
                  @click.stop="selectCategory(child)"
              >
                <div class="subcategory-info">
                  <span class="subcategory-name">{{ child.name }}</span>
                  <span class="subcategory-stats" v-if="child.stats">
                    {{ child.stats.totalPractices || 0 }}{{ $t('practice.practiceCountSuffix') }}
                  </span>
                </div>
                <div class="subcategory-score" v-if="child.stats">
                  {{ formatScore(child.stats.averageScore) }}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏题目复习区域 -->
    <div class="bookmarks-section">
      <div class="section-card">
        <div class="section-header">
          <div class="section-info">
            <h3 class="section-title">
              <el-icon><Star /></el-icon>
              {{ $t('practice.bookmarkReview') }}
            </h3>
            <p class="section-description">{{ $t('practice.reviewBookmarkedQuestions') }}</p>
          </div>
          <el-button type="warning" @click="viewBookmarks">
            {{ $t('practice.startReview') }}
          </el-button>
        </div>
        <div class="section-stats">
          <div class="stat-item">
            <span class="stat-label">{{ $t('practice.bookmarkedQuestions') }}</span>
            <span class="stat-value">{{ bookmarkCount }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 练习设置对话框 -->
    <el-dialog
        v-model="settingsVisible"
        :title="$t('practice.practiceSettings')"
        width="500px"
        :before-close="handleCloseSettings"
    >
      <el-form :model="practiceSettings" label-width="100px">
        <el-form-item :label="$t('practice.questionCount')">
          <el-select v-model="practiceSettings.questionCount" style="width: 100%">
            <el-option :label="$t('practice.questionCountOptions.10')" :value="10" />
            <el-option :label="$t('practice.questionCountOptions.20')" :value="20" />
            <el-option :label="$t('practice.questionCountOptions.30')" :value="30" />
            <el-option :label="$t('practice.questionCountOptions.50')" :value="50" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('practice.practiceMode')">
          <el-radio-group v-model="practiceSettings.mode">
            <el-radio value="practice">{{ $t('practice.practiceModeName') }}</el-radio>
            <el-radio value="exam">{{ $t('practice.examModeName') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('practice.showAnswer')">
          <el-switch
              v-model="practiceSettings.showAnswer"
              :active-text="$t('practice.showImmediately')"
              :inactive-text="$t('practice.showAfterSubmit')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmPracticeSettings">
          {{ $t('practice.startPractice') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { useCategoryTranslation } from '@/utils/i18n'
import {
  Star,
  List,
  Document,
  Reading
} from '@element-plus/icons-vue'

export default {
  name: 'Practice',
  components: {
    Star,
    List,
    Document,
    Reading
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t } = useI18n()
    const { translateCategoryName } = useCategoryTranslation()

    const categories = ref([])
    const loading = ref(false)
    const settingsVisible = ref(false)
    const selectedCategory = ref(null)
    const bookmarkCount = ref(0)

    const practiceSettings = ref({
      questionCount: 20,
      mode: 'practice',
      showAnswer: true
    })

    const currentUser = computed(() => store.getters['auth/currentUser'])

    // 获取题目分类
    const fetchCategories = async () => {
      try {
        loading.value = true
        const response = await api.categories.getAll()
        categories.value = response.data
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('practice.fetchCategoriesFailed'))
      } finally {
        loading.value = false
      }
    }

    // 获取收藏题目数量
    const fetchBookmarkCount = async () => {
      try {
        const response = await api.practice.getStats()
        bookmarkCount.value = response.data.overall.bookmarkedQuestions || 0
      } catch (error) {
        console.error('Error:', error)
      }
    }

    // 格式化分数
    const formatScore = (score) => {
      return score ? Math.round(score) : 0
    }

    // 获取进度条颜色
    const getProgressColor = (score) => {
      if (score >= 90) return '#67c23a'
      if (score >= 80) return '#409eff'
      if (score >= 60) return '#e6a23c'
      return '#f56c6c'
    }

    // 选择分类
    const selectCategory = (category) => {
      selectedCategory.value = category
      settingsVisible.value = true
    }

    // 开始练习
    const startPractice = (category) => {
      selectedCategory.value = category
      settingsVisible.value = true
    }

    // 确认练习设置
    const confirmPracticeSettings = async () => {
      if (!selectedCategory.value) return

      try {
        // 创建练习会话
        const response = await api.practice.createSession({
          categoryId: selectedCategory.value.id,
          questionCount: practiceSettings.value.questionCount
        })

        settingsVisible.value = false

        // 跳转到练习详情页
        router.push(`/practice/${selectedCategory.value.id}?sessionId=${response.data.sessionId}&mode=${practiceSettings.value.mode}&showAnswer=${practiceSettings.value.showAnswer}`)
      } catch (error) {
        ElMessage.error(t('practice.createSessionFailed'))
      }
    }

    // 查看分类详情
    const viewCategoryDetail = (category) => {
      router.push(`/practice/${category.id}`)
    }

    // 查看收藏题目
    const viewBookmarks = () => {
      router.push('/bookmarks')
    }

    // 查看练习记录
    const viewRecords = () => {
      router.push('/practice/records')
    }

    // 关闭设置对话框
    const handleCloseSettings = () => {
      settingsVisible.value = false
      selectedCategory.value = null
    }

    onMounted(async () => {
      // 并行加载数据，减少加载时间
      try {
        await Promise.all([
          fetchCategories(),
          fetchBookmarkCount()
        ])
      } catch (error) {
        console.error('Page data loading failed:', error)
      }
    })

    return {
      categories,
      loading,
      settingsVisible,
      selectedCategory,
      practiceSettings,
      bookmarkCount,
      currentUser,
      translateCategoryName,
      formatScore,
      getProgressColor,
      selectCategory,
      startPractice,
      confirmPracticeSettings,
      viewCategoryDetail,
      viewBookmarks,
      viewRecords,
      handleCloseSettings
    }
  }
}
</script>

<style lang="scss" scoped>
.practice-page {
  background: #f5f7fa;
  min-height: calc(100vh - 120px);
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .page-subtitle {
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.categories-container {
  margin-bottom: 24px;
}

.empty-state {
  background: white;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

  .empty-icon {
    font-size: 64px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 20px;
  }

  h3 {
    color: var(--el-text-color-primary);
    margin-bottom: 10px;
  }

  p {
    color: var(--el-text-color-regular);
  }
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.category-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
}

.category-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.category-icon {
  width: 48px;
  height: 48px;
  background: var(--el-color-primary-light-8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 24px;
  flex-shrink: 0;
}

.category-info {
  flex: 1;

  .category-name {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .category-description {
    color: var(--el-text-color-regular);
    line-height: 1.5;
  }
}

.category-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .stat-label {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
}

.category-progress {
  margin-bottom: 20px;

  .progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.category-actions {
  display: flex;
  gap: 12px;
}

.subcategories {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);

  .subcategories-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
  }
}

.subcategories-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subcategory-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: var(--el-color-primary-light-9);
  }
}

.subcategory-info {
  .subcategory-name {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .subcategory-stats {
    font-size: 12px;
    color: var(--el-text-color-regular);
    margin-left: 8px;
  }
}

.subcategory-score {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.bookmarks-section {
  margin-bottom: 24px;
}

.section-card {
  background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
  border-radius: 12px;
  padding: 24px;
  color: white;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-info {
  .section-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-description {
    opacity: 0.9;
  }
}

.section-stats {
  display: flex;
  gap: 24px;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-label {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
    }
  }
}

@media (max-width: 768px) {

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .categories-grid {
    grid-template-columns: 1fr;
  }

  .category-stats {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>