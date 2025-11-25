<template>
  <div class="bookmarks-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Star /></el-icon>
            {{ t('practice.bookmarkedQuestions') }}
          </h1>
          <p class="page-subtitle">{{ t('practice.reviewBookmarkedQuestions') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="startBookmarkPractice" type="primary">
            <el-icon><Reading /></el-icon>
            {{ t('practice.startReview') }}
          </el-button>
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            {{ t('practice.backToPractice') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalBookmarks }}</div>
          <div class="stat-label">{{ t('practice.bookmarkedQuestions') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ categoryCount }}</div>
          <div class="stat-label">{{ t('practice.category') }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="filter-card">
        <div class="filter-content">
          <el-input
            v-model="searchKeyword"
            :placeholder="t('common.search')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
            style="width: 300px"
          />
          <el-select
            v-model="selectedCategory"
            :placeholder="t('practice.category')"
            clearable
            @change="handleCategoryChange"
            style="width: 200px"
          >
            <el-option
              v-for="category in categories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
          <el-button @click="clearFilters">{{ t('common.clearFilters') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 空状态 -->
    <div v-else-if="bookmarkedQuestions.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Star /></el-icon>
      <h3>{{ searchKeyword || selectedCategory ? t('practice.noQuestionsFound') : t('practice.noBookmarks') }}</h3>
      <p>{{ searchKeyword || selectedCategory ? t('practice.tryOtherConditions') : t('practice.bookmarkDescription') }}</p>
      <el-button type="primary" @click="goToPractice">
        {{ t('practice.goPractice') }}
      </el-button>
    </div>

    <!-- 题目列表 -->
    <div v-else class="questions-container">
      <div class="questions-list">
        <div
          v-for="(question, index) in bookmarkedQuestions"
          :key="question.id"
          class="question-card"
        >
          <div class="question-header">
            <div class="question-number">{{ t('practice.questionNumber', { number: (currentPage - 1) * pageSize + index + 1 }) }}</div>
            <div class="question-category">{{ question.categoryName }}</div>
            <div class="question-actions">
              <el-button
                size="small"
                @click="toggleBookmark(question)"
                type="warning"
              >
                <el-icon><Star /></el-icon>
                {{ t('practice.unbookmark') }}
              </el-button>
            </div>
          </div>

          <div class="question-content">
            <div class="question-text">{{ question.questionText }}</div>
            <div v-if="question.imageUrl" class="question-image">
              <img :src="question.imageUrl" :alt="question.questionText" />
            </div>
          </div>

          <div class="question-options">
            <div
              v-for="(option, optionIndex) in question.options"
              :key="option.id"
              class="option-item"
              :class="{
                'correct': option.isCorrect,
                'show-answer': showAnswers[question.id]
              }"
            >
              <div class="option-prefix">
                {{ getOptionPrefix(optionIndex) }}
              </div>
              <div class="option-text">{{ option.optionText }}</div>
              <div v-if="showAnswers[question.id] && option.isCorrect" class="option-mark">
                <el-icon><Check /></el-icon>
              </div>
            </div>
          </div>

          <div class="question-footer">
            <div class="question-info">
              <span class="bookmark-time">
                {{ t('practice.bookmarkTime') }}: {{ formatDate(question.bookmarkedAt) }}
              </span>
            </div>
            <div class="question-controls">
              <el-button
                size="small"
                @click="toggleAnswer(question.id)"
              >
                {{ showAnswers[question.id] ? t('practice.hideAnswer') : t('practice.showAnswer') }}
              </el-button>
            </div>
          </div>

          <!-- 答案解析 -->
          <div v-if="showAnswers[question.id]" class="explanation-section">
            <div v-if="question.explanation" class="explanation-content">
              <h4 class="explanation-title">{{ t('practice.answerExplanation') }}</h4>
              <p class="explanation-text">{{ question.explanation }}</p>
            </div>
            <div v-if="question.correctAnswerText" class="explanation-detail">
              <p>{{ question.correctAnswerText }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="totalBookmarks"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          :small="isMobile"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="responsive-pagination"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useQuestionLanguage } from '@/utils/language'
import { getCurrentLanguage } from '@/i18n'
import i18n from '@/i18n'
import {
  Star,
  Reading,
  ArrowLeft,
  Document,
  Search,
  Check
} from '@element-plus/icons-vue'

export default {
  name: 'Bookmarks',
  components: {
    Star,
    Reading,
    ArrowLeft,
    Document,
    Search,
    Check
  },
  setup() {
    const { t, locale } = useI18n()
    const router = useRouter()

    // 使用统一的语言处理工具
    const { getQuestionLang } = useQuestionLanguage()
    
    const loading = ref(false)
    const bookmarkedQuestions = ref([])
    const totalBookmarks = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(20)
    const searchKeyword = ref('')
    const selectedCategory = ref('')
    const showAnswers = reactive({})

    // 移动端检测
    const isMobile = computed(() => {
      return window.innerWidth <= 768
    })

    const categories = computed(() => {
      const categorySet = new Set()
      bookmarkedQuestions.value.forEach(q => {
        if (q.categoryName) {
          categorySet.add(q.categoryName)
        }
      })
      return Array.from(categorySet)
    })

    const categoryCount = computed(() => categories.value.length)

    // 获取收藏题目
    const fetchBookmarkedQuestions = async () => {
      try {
        loading.value = true
        const params = {
          page: currentPage.value,
          limit: pageSize.value,
          language: getQuestionLang() // 使用统一的语言处理工具
        }

        if (searchKeyword.value) {
          params.search = searchKeyword.value
        }

        if (selectedCategory.value) {
          params.category = selectedCategory.value
        }

        const response = await api.questions.getBookmarks(params)
        bookmarkedQuestions.value = response.data.questions
        totalBookmarks.value = response.data.pagination.total
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        loading.value = false
      }
    }

    // 获取选项前缀
    const getOptionPrefix = (index) => {
      return String.fromCharCode(65 + index) // A, B, C, D
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 切换答案显示
    const toggleAnswer = (questionId) => {
      showAnswers[questionId] = !showAnswers[questionId]
    }

    // 取消收藏
    const toggleBookmark = async (question) => {
      try {
        await ElMessageBox.confirm(
          t('practice.confirmRemoveBookmark'),
          t('practice.confirmOperation'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        await api.questions.unbookmark(question.id)
        ElMessage.success(t('messages.success'))
        
        // 从列表中移除
        const index = bookmarkedQuestions.value.findIndex(q => q.id === question.id)
        if (index > -1) {
          bookmarkedQuestions.value.splice(index, 1)
          totalBookmarks.value--
        }
      } catch (error) {
        if (error !== 'cancel') {
          ElMessage.error(t('messages.error'))
        }
      }
    }

    // 搜索处理
    const handleSearch = () => {
      currentPage.value = 1
      fetchBookmarkedQuestions()
    }

    // 分类筛选
    const handleCategoryChange = () => {
      currentPage.value = 1
      fetchBookmarkedQuestions()
    }

    // 清除筛选
    const clearFilters = () => {
      searchKeyword.value = ''
      selectedCategory.value = ''
      currentPage.value = 1
      fetchBookmarkedQuestions()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      fetchBookmarkedQuestions()
    }

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      fetchBookmarkedQuestions()
    }

    // 开始收藏题目练习
    const startBookmarkPractice = () => {
      if (totalBookmarks.value === 0) {
        ElMessage.warning(t('messages.warning'))
        return
      }
      
      // 跳转到收藏题目练习页面
      // 使用特殊的路由参数来标识这是收藏题目练习
      router.push({
        path: '/practice/bookmarks',
        query: {
          mode: 'bookmark',
          showAnswer: 'true' // 收藏题目练习模式显示答案
        }
      })
    }

    // 返回练习页面
    const goBack = () => {
      router.push('/practice')
    }

    // 去练习题目
    const goToPractice = () => {
      router.push('/practice')
    }

    // 监听语言变化，自动重新加载收藏题目
    // 直接监听i18n全局locale的变化
    watch(() => i18n.global.locale.value, (newLang, oldLang) => {
      if (newLang !== oldLang) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 Bookmarks i18n.global.locale变化:', oldLang, '->', newLang)
        }
        // 当语言变化时，重新获取收藏题目
        currentPage.value = 1
        fetchBookmarkedQuestions()
      }
    })

    // 同时监听组件内的locale变化作为备用
    watch(locale, (newLocale, oldLocale) => {
      if (newLocale !== oldLocale) {
        // 当语言变化时，重新获取收藏题目
        currentPage.value = 1
        fetchBookmarkedQuestions()
      }
    })

    onMounted(() => {
      fetchBookmarkedQuestions()
    })

    return {
      t,
      loading,
      bookmarkedQuestions,
      totalBookmarks,
      currentPage,
      pageSize,
      searchKeyword,
      selectedCategory,
      showAnswers,
      categories,
      categoryCount,
      isMobile,
      getOptionPrefix,
      formatDate,
      toggleAnswer,
      toggleBookmark,
      handleSearch,
      handleCategoryChange,
      clearFilters,
      handleSizeChange,
      handleCurrentChange,
      startBookmarkPractice,
      goBack,
      goToPractice,
      // 图标
      Star,
      Reading,
      ArrowLeft,
      Document,
      Search,
      Check
    }
  }
}
</script>

<style lang="scss" scoped>
.bookmarks-page {
  background: #f5f7fa;
  min-height: 100vh;
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
    display: flex;
    align-items: center;
    gap: 12px;
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

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: var(--el-color-warning-light-8);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-warning);
  font-size: 24px;
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

.filter-section {
  margin-bottom: 24px;
}

.filter-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
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
    margin-bottom: 20px;
  }
}

.questions-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.questions-list {
  padding: 24px;
}

.question-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-number {
  font-size: 14px;
  color: var(--el-color-primary);
  font-weight: 600;
}

.question-category {
  font-size: 14px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 4px 8px;
  border-radius: 4px;
}

.question-content {
  margin-bottom: 20px;
}

.question-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
}

.question-image {
  text-align: center;

  img {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.question-options {
  margin-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  margin-bottom: 8px;
  transition: all 0.3s;

  &.show-answer.correct {
    border-color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }
}

.option-prefix {
  width: 24px;
  height: 24px;
  background: var(--el-fill-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  line-height: 1.5;
}

.option-mark {
  color: var(--el-color-success);
  font-size: 18px;
}

.question-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.bookmark-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.explanation-section {
  margin-top: 16px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.explanation-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.explanation-text,
.explanation-detail p {
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 分页组件响应式优化 */
.pagination-container {
  padding: 24px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;

  .responsive-pagination {
    max-width: 100%;
    overflow-x: auto;

    /* 隐藏滚动条但保持滚动功能 */
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }

  .question-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .question-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .pagination-container {
    padding: 16px 8px;

    .responsive-pagination {
      :deep(.el-pagination) {
        justify-content: center;
        flex-wrap: nowrap;

        .el-pager {
          li {
            min-width: 32px;
            height: 32px;
            line-height: 32px;
            font-size: 14px;
            margin: 0 2px;
          }
        }

        .btn-prev,
        .btn-next {
          min-width: 32px;
          height: 32px;
          line-height: 32px;
          font-size: 14px;
          margin: 0 2px;
        }

        .el-pagination__total,
        .el-pagination__sizes,
        .el-pagination__jump {
          display: none; /* 在移动端隐藏这些元素 */
        }
      }
    }
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .pagination-container {
    .responsive-pagination {
      :deep(.el-pagination) {
        .el-pager {
          li {
            min-width: 28px;
            height: 28px;
            line-height: 28px;
            font-size: 12px;
            margin: 0 1px;
          }
        }

        .btn-prev,
        .btn-next {
          min-width: 28px;
          height: 28px;
          line-height: 28px;
          font-size: 12px;
          margin: 0 1px;
        }
      }
    }
  }
}
</style>
