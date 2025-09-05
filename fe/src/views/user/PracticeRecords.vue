<template>
  <div class="practice-records-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><List /></el-icon>
            {{ t('practice.practiceRecords') }}
          </h1>
          <p class="page-subtitle">{{ t('practice.viewPracticeHistory') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            {{ t('practice.backToPractice') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalRecords }}</div>
            <div class="stat-label">{{ t('practice.totalPractices') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ passedRecords }}</div>
            <div class="stat-label">{{ t('practice.passedPractices') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ averageScore }}%</div>
            <div class="stat-label">{{ t('practice.averageScore') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 练习记录列表 -->
    <div v-else class="records-container">
      <div v-if="records.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <p class="empty-text">{{ t('practice.noPracticeRecords') }}</p>
        <el-button type="primary" @click="startPractice">
          {{ t('practice.startFirstPractice') }}
        </el-button>
      </div>

      <div v-else class="records-list">
        <div
          v-for="record in records"
          :key="record.id"
          class="record-card"
          @click="viewRecordDetail(record)"
        >
          <div class="record-header">
            <div class="record-category">{{ record.categoryName }}</div>
            <div class="record-date">{{ formatDate(record.completedAt) }}</div>
          </div>

          <div class="record-content">
            <div class="record-score">
              <div class="score-circle" :class="getScoreClass(record.score)">
                <span class="score-value">{{ Math.round(record.score) }}</span>
                <span class="score-unit">%</span>
              </div>
            </div>

            <div class="record-details">
              <div class="detail-item">
                <span class="detail-label">{{ t('practice.totalQuestions') }}:</span>
                <span class="detail-value">{{ record.totalQuestions }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('practice.correctAnswers') }}:</span>
                <span class="detail-value">{{ record.correctAnswers }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ t('practice.duration') }}:</span>
                <span class="detail-value">{{ formatDuration(record.practiceDuration) }}</span>
              </div>
            </div>

            <div class="record-status">
              <el-tag
                :type="record.isPassed ? 'success' : 'danger'"
                size="small"
              >
                {{ record.isPassed ? t('practice.passed') : t('practice.failed') }}
              </el-tag>
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
          :total="totalRecords"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  List,
  ArrowLeft,
  Document,
  Check,
  TrendCharts
} from '@element-plus/icons-vue'
import api from '@/api'

export default {
  name: 'PracticeRecords',
  components: {
    List,
    ArrowLeft,
    Document,
    Check,
    TrendCharts
  },
  setup() {
    const router = useRouter()
    const { t } = useI18n()

    const loading = ref(false)
    const records = ref([])
    const currentPage = ref(1)
    const pageSize = ref(20)
    const totalRecords = ref(0)

    // 移动端检测
    const isMobile = computed(() => {
      return window.innerWidth <= 768
    })

    // 统计数据
    const passedRecords = computed(() => {
      return records.value.filter(record => record.isPassed).length
    })

    const averageScore = computed(() => {
      if (records.value.length === 0) return 0
      const total = records.value.reduce((sum, record) => sum + record.score, 0)
      return Math.round(total / records.value.length)
    })

    // 获取练习记录
    const fetchRecords = async () => {
      try {
        loading.value = true
        const response = await api.practice.getRecords({
          page: currentPage.value,
          limit: pageSize.value
        })
        records.value = response.data.records
        totalRecords.value = response.data.pagination.total
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('practice.fetchRecordsFailed'))
      } finally {
        loading.value = false
      }
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      fetchRecords()
    }

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      fetchRecords()
    }

    // 格式化日期
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString()
    }

    // 格式化时长
    const formatDuration = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // 获取分数样式类
    const getScoreClass = (score) => {
      if (score >= 90) return 'excellent'
      if (score >= 80) return 'good'
      if (score >= 60) return 'pass'
      return 'fail'
    }

    // 查看记录详情
    const viewRecordDetail = (record) => {
      router.push(`/practice/records/${record.id}`)
    }

    // 开始练习
    const startPractice = () => {
      router.push('/practice')
    }

    // 返回练习页面
    const goBack = () => {
      router.push('/practice')
    }

    onMounted(() => {
      fetchRecords()
    })

    return {
      t,
      loading,
      records,
      currentPage,
      pageSize,
      totalRecords,
      isMobile,
      passedRecords,
      averageScore,
      fetchRecords,
      handleSizeChange,
      handleCurrentChange,
      formatDate,
      formatDuration,
      getScoreClass,
      viewRecordDetail,
      startPractice,
      goBack
    }
  }
}
</script>

<style lang="scss" scoped>
.practice-records-page {
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.title-section {
  .page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin: 0 0 8px 0;

    .el-icon {
      color: var(--el-color-primary);
    }
  }

  .page-subtitle {
    color: var(--el-text-color-regular);
    margin: 0;
  }
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;

  .el-icon {
    font-size: 24px;
    color: var(--el-color-primary);
  }
}

.stat-content {
  .stat-value {
    font-size: 24px;
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

.records-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;

  .empty-icon {
    font-size: 64px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 16px;
    color: var(--el-text-color-regular);
    margin-bottom: 24px;
  }
}

.records-list {
  padding: 20px;
}

.record-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.record-category {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.record-date {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.record-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.record-score {
  .score-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 700;

    &.excellent {
      background: #f0f9ff;
      color: #1890ff;
    }

    &.good {
      background: #f6ffed;
      color: #52c41a;
    }

    &.pass {
      background: #fff7e6;
      color: #fa8c16;
    }

    &.fail {
      background: #fff2f0;
      color: #ff4d4f;
    }

    .score-value {
      font-size: 18px;
      line-height: 1;
    }

    .score-unit {
      font-size: 12px;
      line-height: 1;
    }
  }
}

.record-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;

  .detail-label {
    color: var(--el-text-color-regular);
  }

  .detail-value {
    color: var(--el-text-color-primary);
    font-weight: 500;
  }
}

/* 分页组件响应式优化 */
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 0 16px;

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

/* 移动端分页优化 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .record-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .record-details {
    width: 100%;
  }

  .pagination-container {
    margin-top: 16px;
    padding: 0 8px;

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
