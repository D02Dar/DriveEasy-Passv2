<template>
  <div class="practice-detail-page">
    <!-- 练习头部 -->
    <div class="practice-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft">
          {{ $t('common.back') }}
        </el-button>
        <div class="practice-info">
          <h2 class="practice-title">
            {{ getCategoryDisplayName() }}
          </h2>
          <p class="practice-subtitle">{{ practiceMode === 'exam' ? $t('practice.examMode') : $t('practice.practiceMode') }}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="progress-info">
          <span>{{ $t('practice.progress') }}: {{ currentQuestionIndex + 1 }}/{{ questions.length }}</span>
          <el-progress
            :percentage="questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : null"
            :stroke-width="6"
            :show-text="false"
          />
        </div>
        <div class="score-info" v-if="practiceMode === 'practice'">
          <span>{{ $t('practice.score') }}: {{ score }}%</span>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 练习完成 -->
    <div v-else-if="isCompleted" class="completion-container">
      <div class="completion-card">
        <div class="completion-header">
          <div class="completion-icon" :class="isPassed ? 'success' : 'fail'">
            <el-icon v-if="isPassed"><SuccessFilled /></el-icon>
            <el-icon v-else><CloseBold /></el-icon>
          </div>
          <h2 class="completion-title">
            {{ isPassed ? $t('practice.passedTitle') : $t('practice.failedTitle') }}
          </h2>
          <p class="completion-subtitle">
            {{ isPassed ? $t('practice.passedSubtitle') : $t('practice.failedSubtitle') }}
          </p>
        </div>

        <div class="completion-stats">
          <div class="stat-item">
            <div class="stat-value">{{ score }}%</div>
            <div class="stat-label">{{ $t('practice.finalScore') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ correctAnswers }}</div>
            <div class="stat-label">{{ $t('practice.correctCount') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ questions.length }}</div>
            <div class="stat-label">{{ $t('practice.totalCount') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatTime(practiceTime) }}</div>
            <div class="stat-label">{{ $t('practice.timeUsed') }}</div>
          </div>
        </div>

        <div class="completion-actions">
          <el-button @click="reviewAnswers">{{ $t('practice.reviewAnswers') }}</el-button>
          <el-button @click="restartPractice">{{ $t('practice.restartPractice') }}</el-button>
          <el-button type="primary" @click="goBack">{{ $t('practice.backToList') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 题目练习 -->
    <div v-else-if="currentQuestion" class="question-container">
      <div class="question-card">
        <!-- 题目内容 -->
        <div class="question-content">
          <div class="question-number">
            {{ $t('practice.questionNumber', { number: currentQuestionIndex + 1 }) }}
          </div>
          <div class="question-text">
            {{ currentQuestion.questionText }}
          </div>
          <div v-if="currentQuestion.imageUrl" class="question-image">
            <img :src="currentQuestion.imageUrl" :alt="currentQuestion.questionText" />
          </div>
        </div>

        <!-- 选项列表 -->
        <div class="options-container">
          <div
            v-for="(option, index) in currentQuestion.options"
            :key="option.id"
            class="option-item"
            :class="{
              'selected': selectedOptionId === option.id,
              'correct': showAnswer && option.isCorrect,
              'incorrect': showAnswer && selectedOptionId === option.id && !option.isCorrect,
              'disabled': showAnswer
            }"
            @click="selectOption(option)"
          >
            <div class="option-prefix">
              {{ getOptionPrefix(index) }}
            </div>
            <div class="option-text">
              {{ option.optionText }}
            </div>
            <div v-if="showAnswer && option.isCorrect" class="option-mark">
              <el-icon><Check /></el-icon>
            </div>
          </div>
        </div>

        <!-- 答案解析 -->
        <div v-if="showAnswer && currentQuestion.explanation" class="explanation-container">
          <h4 class="explanation-title">{{ $t('practice.answerExplanation') }}</h4>
          <p class="explanation-text">{{ currentQuestion.explanation }}</p>
          <p v-if="currentQuestion.correctAnswerText" class="explanation-detail">
            {{ currentQuestion.correctAnswerText }}
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="question-actions">
          <div class="action-left">
            <el-button
              v-if="!showAnswer"
              @click="bookmarkQuestion"
              :type="currentQuestion.isBookmarked ? 'warning' : 'default'"
              :icon="Star"
            >
              {{ currentQuestion.isBookmarked ? $t('practice.bookmarked') : $t('practice.bookmark') }}
            </el-button>
          </div>
          <div class="action-right">
            <el-button
              v-if="currentQuestionIndex > 0"
              @click="previousQuestion"
              :disabled="!showAnswer"
            >
              {{ $t('practice.previousQuestion') }}
            </el-button>
            <el-button
              v-if="!showAnswer"
              type="primary"
              @click="submitAnswer"
              :disabled="!selectedOptionId"
            >
              {{ $t('practice.submitAnswer') }}
            </el-button>
            <el-button
              v-else-if="currentQuestionIndex < questions.length - 1"
              type="primary"
              @click="nextQuestion"
            >
              {{ $t('practice.nextQuestion') }}
            </el-button>
            <el-button
              v-else
              type="success"
              @click="completePractice"
            >
              {{ $t('practice.completePractice') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-icon class="empty-icon"><Document /></el-icon>
      <h3>{{ $t('practice.noQuestions') }}</h3>
      <p>{{ $t('practice.noQuestionsDesc') }}</p>
      <p class="language-info">{{ $t('common.current') }}{{ $t('common.language') }}: {{ currentLanguageDisplay }}</p>
      <el-button type="primary" @click="goBack">{{ $t('practice.backToList') }}</el-button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useCategoryTranslation } from '@/utils/i18n'
import { useCurrentLanguage, useQuestionLanguage, getLanguageDisplayName } from '@/utils/language'
import { getCurrentLanguage } from '@/i18n'
import i18n from '@/i18n'
import {
  ArrowLeft,
  Star,
  Check,
  Document,
  SuccessFilled,
  CloseBold
} from '@element-plus/icons-vue'

export default {
  name: 'PracticeDetail',
  components: {
    ArrowLeft,
    Star,
    Check,
    Document,
    SuccessFilled,
    CloseBold
  },
  setup() {
    const { t, locale } = useI18n()
    const route = useRoute()
    const router = useRouter()
    const { translateCategoryName } = useCategoryTranslation()

    // 使用统一的语言处理工具
    const { getQuestionLang, getCurrentLang } = useQuestionLanguage()
    
    const categoryId = ref(parseInt(route.params.categoryId) || 1) // 默认使用分类ID 1
    const sessionId = ref(route.query.sessionId)
    const practiceMode = ref(route.query.mode || 'practice')
    const showAnswerImmediately = ref(route.query.showAnswer === 'true')
    const isBookmarkPractice = ref(route.path === '/practice/bookmarks')
    
    const loading = ref(false)
    const questions = ref([])
    const currentQuestionIndex = ref(0)
    const selectedOptionId = ref(null)
    const showAnswer = ref(false)
    const answers = ref([])
    const startTime = ref(Date.now())
    const isCompleted = ref(false)
    const categoryName = ref('')

    const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])
    const correctAnswers = computed(() => answers.value.filter(a => a.isCorrect).length)
    const score = computed(() => {
      if (answers.value.length === 0) return 0
      return Math.round((correctAnswers.value / answers.value.length) * 100)
    })
    const practiceTime = computed(() => Date.now() - startTime.value)
    const isPassed = computed(() => score.value >= 80)

    // 当前语言显示（使用统一工具）
    const currentLanguageDisplay = computed(() => {
      return getLanguageDisplayName(getCurrentLang())
    })

    // 获取题目列表
    const fetchQuestions = async () => {
      try {
        loading.value = true
        let response
        // 使用统一的语言处理工具
        const questionLanguage = getQuestionLang()

        // 强制调试信息
        console.log('🔍 PracticeDetail fetchQuestions 详细调试:', {
          currentUILang: getCurrentLanguage(),
          i18nGlobalLocale: i18n.global.locale.value,
          questionLang: questionLanguage,
          categoryId: categoryId.value,
          sessionId: sessionId.value,
          isBookmarkPractice: isBookmarkPractice.value,
          timestamp: new Date().toISOString(),
          route: route.path,
          params: route.params
        })

        // 如果是收藏题目练习模式
        if (isBookmarkPractice.value) {
          response = await api.questions.getBookmarks({
            language: questionLanguage,
            limit: 50 // 收藏题目练习可以更多一些
          })
        } else if (sessionId.value) {
          // 即使有sessionId，也要检查语言是否匹配
          try {
            const sessionResponse = await api.practice.getSessionQuestions(sessionId.value)
            const sessionLanguage = sessionResponse.data.language
            const sessionQuestionCount = sessionResponse.data.questions?.length || 20

            console.log('🔍 Session语言检查:', {
              sessionLanguage,
              expectedLanguage: questionLanguage,
              sessionQuestionCount,
              match: sessionLanguage === questionLanguage
            })

            // 如果session的语言与当前期望的语言匹配，使用session数据
            if (sessionLanguage === questionLanguage) {
              response = sessionResponse
            } else {
              // 语言不匹配，重新获取正确语言的题目，使用与session相同的题目数量
              console.log('🔄 语言不匹配，重新获取题目，数量:', sessionQuestionCount)
              response = await api.questions.getByCategoryWithLanguage(categoryId.value, {
                limit: sessionQuestionCount,
                language: questionLanguage
              })
            }
          } catch (error) {
            console.log('🔄 Session获取失败，使用语言获取题目，默认20道')
            response = await api.questions.getByCategoryWithLanguage(categoryId.value, {
              limit: 20,
              language: questionLanguage
            })
          }
        } else {
          response = await api.questions.getByCategoryWithLanguage(categoryId.value, {
            limit: 20,
            language: questionLanguage
          })
        }
        questions.value = response.data.questions || []
        const availableCount = response.data.availableCount || questions.value.length
        const requestedLanguage = response.data.language



        // 如果题目数量很少，给用户提示
        if (questions.value.length < 50 && requestedLanguage === 'th') {
          ElMessage.warning({
            message: t('practice.fewQuestionsWarning', { count: questions.value.length, language: currentLanguageDisplay.value }),
            duration: 5000
          })
        }

        // 获取分类信息（仅在非收藏题目练习模式下）
        if (!isBookmarkPractice.value && categoryId.value) {
          const categoryResponse = await api.categories.getById(categoryId.value)
          categoryName.value = categoryResponse.data.name
        }
      } catch (error) {
        ElMessage.error(t('messages.error'))
      } finally {
        loading.value = false
      }
    }

    // 获取分类显示名称
    const getCategoryDisplayName = () => {
      if (isBookmarkPractice.value) {
        return t('practice.bookmarkedQuestions')
      }
      return translateCategoryName(categoryName.value) || t('practice.allQuestions')
    }

    // 获取选项前缀
    const getOptionPrefix = (index) => {
      return String.fromCharCode(65 + index) // A, B, C, D
    }

    // 选择选项
    const selectOption = (option) => {
      if (showAnswer.value) return
      selectedOptionId.value = option.id
    }

    // 提交答案
    const submitAnswer = async () => {
      if (!selectedOptionId.value) return

      try {
        const response = await api.questions.submitAnswer({
          questionId: currentQuestion.value.id,
          selectedOptionId: selectedOptionId.value,
          categoryId: isBookmarkPractice.value ? 5 : categoryId.value // 收藏题目练习使用分类ID 5
        })

        // 记录答案
        answers.value.push({
          questionId: currentQuestion.value.id,
          selectedOptionId: selectedOptionId.value,
          isCorrect: response.data.isCorrect
        })

        showAnswer.value = true

        // 如果是练习模式且设置了立即显示答案
        if (practiceMode.value === 'practice' && showAnswerImmediately.value) {
          // 显示答案解析
        } else {
          // 自动进入下一题
          setTimeout(() => {
            nextQuestion()
          }, 1500)
        }
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      }
    }

    // 下一题
    const nextQuestion = () => {
      if (currentQuestionIndex.value < questions.value.length - 1) {
        currentQuestionIndex.value++
        selectedOptionId.value = null
        showAnswer.value = false
      } else {
        completePractice()
      }
    }

    // 上一题
    const previousQuestion = () => {
      if (currentQuestionIndex.value > 0) {
        currentQuestionIndex.value--
        selectedOptionId.value = null
        showAnswer.value = false
      }
    }

    // 收藏题目
    const bookmarkQuestion = async () => {
      try {
        if (currentQuestion.value.isBookmarked) {
          await api.questions.unbookmark(currentQuestion.value.id)
          currentQuestion.value.isBookmarked = false
          ElMessage.success(t('messages.success'))
        } else {
          await api.questions.bookmark(currentQuestion.value.id)
          currentQuestion.value.isBookmarked = true
          ElMessage.success(t('messages.success'))
        }
      } catch (error) {
        ElMessage.error(t('messages.error'))
      }
    }

    // 完成练习
    const completePractice = async () => {
      try {
        if (sessionId.value) {
          await api.practice.updateSession(sessionId.value, {
            score: score.value,
            correctAnswers: correctAnswers.value,
            duration: Math.round(practiceTime.value / 1000),
            isCompleted: true
          })
        }
        isCompleted.value = true
      } catch (error) {
        ElMessage.error(t('messages.error'))
      }
    }

    // 查看答案
    const reviewAnswers = () => {
      // 重置到第一题，显示所有答案
      currentQuestionIndex.value = 0
      showAnswer.value = true
      isCompleted.value = false
    }

    // 重新练习
    const restartPractice = () => {
      currentQuestionIndex.value = 0
      selectedOptionId.value = null
      showAnswer.value = false
      answers.value = []
      startTime.value = Date.now()
      isCompleted.value = false
    }

    // 返回
    const goBack = () => {
      router.push('/practice')
    }

    // 格式化时间
    const formatTime = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // 页面离开确认
    const handleBeforeUnload = (event) => {
      if (!isCompleted.value && answers.value.length > 0) {
        event.preventDefault()
        event.returnValue = '您的练习尚未完成，确定要离开吗？'
      }
    }

    // 监听语言变化，自动重新加载题目
    // 使用全局语言状态确保同步
    const currentGlobalLanguage = ref(getCurrentLanguage())

    // 直接监听i18n全局locale的变化
    watch(() => i18n.global.locale.value, (newLang, oldLang) => {
      if (newLang !== oldLang) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 PracticeDetail i18n.global.locale变化:', oldLang, '->', newLang)
          console.log('🔄 当前路由:', route.path, route.params)
        }

        currentGlobalLanguage.value = newLang

        // 如果在练习页面，强制刷新页面以确保语言切换生效
        if (route.path.includes('/practice/')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 强制刷新练习页面以应用语言变化')
          }
          window.location.reload()
          return
        }

        // 重置练习状态
        currentQuestionIndex.value = 0
        selectedOptionId.value = null
        showAnswer.value = false
        answers.value = []
        startTime.value = Date.now()
        isCompleted.value = false

        // 重新获取题目
        fetchQuestions()
      }
    }, { immediate: false, flush: 'post' })

    // 同时监听组件内的locale变化作为备用
    watch(locale, (newLocale, oldLocale) => {
      if (newLocale !== oldLocale && newLocale !== currentGlobalLanguage.value) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 PracticeDetail 组件locale变化:', oldLocale, '->', newLocale)
        }

        currentGlobalLanguage.value = newLocale

        // 重置练习状态
        currentQuestionIndex.value = 0
        selectedOptionId.value = null
        showAnswer.value = false
        answers.value = []
        startTime.value = Date.now()
        isCompleted.value = false

        // 重新获取题目
        fetchQuestions()
      }
    })

    onMounted(() => {
      // 确保语言状态同步
      currentGlobalLanguage.value = i18n.global.locale.value
      fetchQuestions()
      window.addEventListener('beforeunload', handleBeforeUnload)
    })

    // 添加额外的语言同步检查
    watch(() => i18n.global.locale.value, (newLang, oldLang) => {
      if (newLang !== currentGlobalLanguage.value) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 PracticeDetail 强制语言同步:', currentGlobalLanguage.value, '->', newLang)
        }
        currentGlobalLanguage.value = newLang

        // 重置练习状态
        currentQuestionIndex.value = 0
        selectedOptionId.value = null
        showAnswer.value = false
        answers.value = []
        startTime.value = Date.now()
        isCompleted.value = false

        // 重新获取题目
        fetchQuestions()
      }
    }, { immediate: true })

    onUnmounted(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })

    return {
      loading,
      questions,
      currentQuestion,
      currentQuestionIndex,
      selectedOptionId,
      showAnswer,
      answers,
      score,
      correctAnswers,
      practiceTime,
      isCompleted,
      isPassed,
      categoryName,
      practiceMode,
      isBookmarkPractice,
      currentLanguageDisplay,
      getCategoryDisplayName,
      getOptionPrefix,
      selectOption,
      submitAnswer,
      nextQuestion,
      previousQuestion,
      bookmarkQuestion,
      completePractice,
      reviewAnswers,
      restartPractice,
      goBack,
      formatTime,
      // 图标组件
      ArrowLeft,
      Star,
      Check,
      Document,
      SuccessFilled,
      CloseBold,
      categoryId
    }
  }
}
</script>

<style lang="scss" scoped>
.practice-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.practice-header {
  background: white;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.practice-info {
  .practice-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .practice-subtitle {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 120px;

  span {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.score-info {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.loading-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.completion-container {
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
}

.completion-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.completion-header {
  margin-bottom: 32px;
}

.completion-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 40px;

  &.success {
    background: var(--el-color-success-light-8);
    color: var(--el-color-success);
  }

  &.fail {
    background: var(--el-color-danger-light-8);
    color: var(--el-color-danger);
  }
}

.completion-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.completion-subtitle {
  color: var(--el-text-color-regular);
}

.completion-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.stat-item {
  text-align: center;

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.completion-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.question-container {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.question-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.question-content {
  margin-bottom: 32px;
}

.question-number {
  font-size: 14px;
  color: var(--el-color-primary);
  font-weight: 600;
  margin-bottom: 12px;
}

.question-text {
  font-size: 18px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  margin-bottom: 20px;
}

.question-image {
  text-align: center;

  img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }
}

.options-container {
  margin-bottom: 32px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid var(--el-border-color-lighter);
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(.disabled) {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.correct {
    border-color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }

  &.incorrect {
    border-color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  &.disabled {
    cursor: not-allowed;
  }
}

.option-prefix {
  width: 32px;
  height: 32px;
  background: var(--el-fill-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  font-size: 16px;
  line-height: 1.5;
}

.option-mark {
  color: var(--el-color-success);
  font-size: 20px;
}

.explanation-container {
  padding: 20px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin-bottom: 32px;
}

.explanation-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.explanation-text,
.explanation-detail {
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.question-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;

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

@media (max-width: 768px) {
  .practice-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-right {
    flex-direction: column;
    gap: 12px;
  }

  .question-container {
    padding: 16px;
  }

  .question-card {
    padding: 20px;
  }

  .completion-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .completion-actions {
    flex-direction: column;
  }

  .question-actions {
    flex-direction: column;
    gap: 16px;
  }

  .action-left,
  .action-right {
    justify-content: center;
  }
}
</style>
