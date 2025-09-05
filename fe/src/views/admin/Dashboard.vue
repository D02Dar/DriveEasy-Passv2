<template>
  <div class="admin-dashboard">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><DataBoard /></el-icon>
            {{ $t('admin.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('admin.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ $t('admin.refreshData') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 统计卡片 -->
    <div v-else class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.users?.totalUsers || 0 }}</div>
          <div class="stat-label">{{ $t('admin.totalUsers') }}</div>
          <div class="stat-change">
            {{ $t('admin.todayNewUsers', { count: stats.users?.todayNewUsers || 0 }) }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon questions">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.questions?.totalQuestions || 0 }}</div>
          <div class="stat-label">{{ $t('admin.totalQuestions') }}</div>
          <div class="stat-change">
            {{ $t('admin.todayNewQuestions', { count: stats.questions?.todayNewQuestions || 0 }) }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon categories">
          <el-icon><Folder /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.categories?.totalCategories || 0 }}</div>
          <div class="stat-label">{{ $t('admin.questionCategories') }}</div>
          <div class="stat-change">{{ $t('admin.includeSubcategories') }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon practices">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.practices?.totalPractices || 0 }}</div>
          <div class="stat-label">{{ $t('admin.practiceRecords') }}</div>
          <div class="stat-change">
            {{ $t('admin.todayPractices', { count: stats.practices?.todayPractices || 0 }) }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon accidents">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.accidents?.totalReports || 0 }}</div>
          <div class="stat-label">{{ $t('admin.accidentReports') }}</div>
          <div class="stat-change">
            {{ $t('admin.todayNewReports', { count: stats.accidents?.todayReports || 0 }) }}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon score">
          <el-icon><Trophy /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ formatScore(stats.practices?.averageScore) }}%</div>
          <div class="stat-label">{{ $t('admin.averageScore') }}</div>
          <div class="stat-change">
            {{ $t('admin.passRate', { rate: calculatePassRate() }) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 图表和详细数据 -->
    <div class="content-grid">
      <!-- 用户注册趋势 -->
      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><TrendCharts /></el-icon>
            {{ $t('admin.userRegistrationTrend') }}
          </h3>
          <p class="card-description">{{ $t('admin.last7DaysRegistration') }}</p>
        </div>
        <div class="card-content">
          <div v-if="userTrendData.length === 0" class="empty-chart">
            <el-icon class="empty-icon"><TrendCharts /></el-icon>
            <p>{{ $t('admin.noData') }}</p>
          </div>
          <div v-else class="chart-container">
            <!-- 这里可以集成 ECharts 或其他图表库 -->
            <div class="simple-chart">
              <div
                v-for="(item, index) in userTrendData"
                :key="index"
                class="chart-bar"
                :style="{ height: `${(item.count / maxUserCount) * 100}%` }"
                :title="`${item.date}: ${item.count}人`"
              >
                <div class="bar-value">{{ item.count }}</div>
              </div>
            </div>
            <div class="chart-labels">
              <span
                v-for="(item, index) in userTrendData"
                :key="index"
                class="chart-label"
              >
                {{ formatChartDate(item.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 练习趋势 -->
      <div class="chart-card">
        <div class="card-header">
          <h3 class="card-title">
            <el-icon><DataLine /></el-icon>
            {{ $t('admin.practiceTrend') }}
          </h3>
          <p class="card-description">{{ $t('admin.last7DaysPractice') }}</p>
        </div>
        <div class="card-content">
          <div v-if="practiceTrendData.length === 0" class="empty-chart">
            <el-icon class="empty-icon"><DataLine /></el-icon>
            <p>{{ $t('admin.noData') }}</p>
          </div>
          <div v-else class="chart-container">
            <div class="simple-chart">
              <div
                v-for="(item, index) in practiceTrendData"
                :key="index"
                class="chart-bar practice"
                :style="{ height: `${(item.count / maxPracticeCount) * 100}%` }"
                :title="`${item.date}: ${item.count}次练习，平均分${formatScore(item.averageScore)}%`"
              >
                <div class="bar-value">{{ item.count }}</div>
              </div>
            </div>
            <div class="chart-labels">
              <span
                v-for="(item, index) in practiceTrendData"
                :key="index"
                class="chart-label"
              >
                {{ formatChartDate(item.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions-section">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><Operation /></el-icon>
            {{ $t('admin.quickActions') }}
          </h3>
          <p class="section-description">{{ $t('admin.commonManagementFunctions') }}</p>
        </div>
        <div class="section-content">
          <div class="actions-grid">
            <div class="action-item" @click="goToQuestions">
              <div class="action-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('admin.questionManagement') }}</div>
                <div class="action-desc">{{ $t('admin.addEditDeleteQuestions') }}</div>
              </div>
            </div>

            <div class="action-item" @click="goToUsers">
              <div class="action-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('admin.userManagement') }}</div>
                <div class="action-desc">{{ $t('admin.viewAndManageUsers') }}</div>
              </div>
            </div>



            <div class="action-item" @click="sendNotification">
              <div class="action-icon">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="action-text">
                <div class="action-title">{{ $t('admin.sendNotification') }}</div>
                <div class="action-desc">{{ $t('admin.sendMessageToUsers') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 发送通知对话框 -->
    <el-dialog
      v-model="notificationVisible"
      :title="$t('admin.sendNotification')"
      width="500px"
      :before-close="handleCloseNotification"
    >
      <el-form :model="notificationForm" label-width="80px">
        <el-form-item :label="$t('admin.notificationTitle')">
          <el-input v-model="notificationForm.title" :placeholder="$t('admin.enterNotificationTitle')" />
        </el-form-item>
        <el-form-item :label="$t('admin.notificationContent')">
          <el-input
            v-model="notificationForm.content"
            type="textarea"
            :rows="4"
            :placeholder="$t('admin.enterNotificationContent')"
          />
        </el-form-item>
        <el-form-item :label="$t('admin.sendTarget')">
          <el-radio-group v-model="notificationForm.targetType">
            <el-radio value="all">{{ $t('admin.allUsers') }}</el-radio>
            <el-radio value="user">{{ $t('admin.specificUser') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="notificationForm.targetType === 'user'" :label="$t('admin.userId')">
          <el-input v-model="notificationForm.targetUserId" :placeholder="$t('admin.enterUserId')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notificationVisible = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmSendNotification" :loading="sendingNotification">
          {{ $t('admin.send') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import api from '@/api'
import {
  DataBoard,
  Refresh,
  User,
  Document,
  Folder,
  TrendCharts,
  Warning,
  Trophy,
  DataLine,
  Operation,
  DataAnalysis,
  Bell
} from '@element-plus/icons-vue'

export default {
  name: 'AdminDashboard',
  components: {
    DataBoard,
    Refresh,
    User,
    Document,
    Folder,
    TrendCharts,
    Warning,
    Trophy,
    DataLine,
    Operation,
    DataAnalysis,
    Bell
  },
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    const loading = ref(false)
    const stats = ref({})
    const userTrendData = ref([])
    const practiceTrendData = ref([])
    const notificationVisible = ref(false)
    const sendingNotification = ref(false)

    const notificationForm = reactive({
      title: '',
      content: '',
      targetType: 'all',
      targetUserId: ''
    })

    const maxUserCount = computed(() => {
      return Math.max(...userTrendData.value.map(item => item.count), 1)
    })

    const maxPracticeCount = computed(() => {
      return Math.max(...practiceTrendData.value.map(item => item.count), 1)
    })

    // 获取统计数据
    const fetchStats = async () => {
      try {
        loading.value = true
        const response = await api.admin.getStats()
        stats.value = response.data
        userTrendData.value = response.data.trends?.users || []
        practiceTrendData.value = response.data.trends?.practices || []
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('admin.fetchStatsFailed'))
      } finally {
        loading.value = false
      }
    }

    // 格式化分数
    const formatScore = (score) => {
      return score ? Math.round(score) : 0
    }

    // 计算通过率
    const calculatePassRate = () => {
      const practices = stats.value.practices
      if (!practices || !practices.totalPractices) return 0
      return Math.round((practices.passedPractices / practices.totalPractices) * 100)
    }

    // 格式化图表日期
    const formatChartDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    // 刷新数据
    const refreshData = () => {
      fetchStats()
    }

    // 快速操作导航
    const goToQuestions = () => {
      router.push('/admin/questions')
    }

    const goToUsers = () => {
      router.push('/admin/users')
    }



    // 发送通知
    const sendNotification = () => {
      notificationVisible.value = true
    }

    const confirmSendNotification = async () => {
      if (!notificationForm.title || !notificationForm.content) {
        ElMessage.warning(t('messages.warning'))
        return
      }

      try {
        sendingNotification.value = true
        await api.notifications.create(notificationForm)
        ElMessage.success(t('admin.notificationSentSuccess'))
        notificationVisible.value = false
        
        // 重置表单
        Object.assign(notificationForm, {
          title: '',
          content: '',
          targetType: 'all',
          targetUserId: ''
        })
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('admin.notificationSentFailed'))
      } finally {
        sendingNotification.value = false
      }
    }

    const handleCloseNotification = () => {
      notificationVisible.value = false
    }

    onMounted(() => {
      fetchStats()
    })

    return {
      loading,
      stats,
      userTrendData,
      practiceTrendData,
      maxUserCount,
      maxPracticeCount,
      notificationVisible,
      sendingNotification,
      notificationForm,
      formatScore,
      calculatePassRate,
      formatChartDate,
      refreshData,
      goToQuestions,
      goToUsers,
      sendNotification,
      confirmSendNotification,
      handleCloseNotification
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-dashboard {
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
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .page-subtitle {
    font-size: 16px;
    color: var(--el-text-color-regular);
  }
}

.loading-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;

  &:hover {
    transform: translateY(-2px);
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;

  &.users { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
  &.questions { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
  &.categories { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
  &.practices { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
  &.accidents { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
  &.score { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
}

.stat-content {
  flex: 1;

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 16px;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .stat-change {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 24px 24px 0;

  .card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-description {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.card-content {
  padding: 24px;
}

.empty-chart {
  text-align: center;
  padding: 40px 20px;

  .empty-icon {
    font-size: 48px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 12px;
  }

  p {
    color: var(--el-text-color-regular);
  }
}

.chart-container {
  .simple-chart {
    display: flex;
    align-items: end;
    gap: 8px;
    height: 120px;
    margin-bottom: 12px;
  }

  .chart-bar {
    flex: 1;
    background: var(--el-color-primary);
    border-radius: 4px 4px 0 0;
    min-height: 20px;
    position: relative;
    display: flex;
    align-items: end;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: var(--el-color-primary-dark-2);
    }

    &.practice {
      background: var(--el-color-success);

      &:hover {
        background: var(--el-color-success-dark-2);
      }
    }

    .bar-value {
      color: white;
      font-size: 12px;
      font-weight: 600;
      padding: 4px;
    }
  }

  .chart-labels {
    display: flex;
    gap: 8px;

    .chart-label {
      flex: 1;
      text-align: center;
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

.quick-actions-section {
  .section-card {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  }

  .section-header {
    margin-bottom: 24px;

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-description {
      color: var(--el-text-color-regular);
    }
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    transform: translateY(-2px);
  }
}

.action-icon {
  width: 48px;
  height: 48px;
  background: var(--el-color-primary-light-8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  font-size: 24px;
}

.action-text {
  .action-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .action-desc {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

@media (max-width: 768px) {
  .admin-dashboard {
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

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
