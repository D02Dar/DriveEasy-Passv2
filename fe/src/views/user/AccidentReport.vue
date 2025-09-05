<template>
  <div class="accident-report-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Warning /></el-icon>
            {{ $t('accident.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('accident.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createNewReport">
            <el-icon><Plus /></el-icon>
            {{ $t('accident.newReport') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalReports }}</div>
          <div class="stat-label">{{ $t('accident.totalReports') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon draft">
          <el-icon><Edit /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ draftReports }}</div>
          <div class="stat-label">{{ $t('accident.draft') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon submitted">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ submittedReports }}</div>
          <div class="stat-label">{{ $t('accident.submitted') }}</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <div class="filter-card">
        <div class="filter-content">
          <el-select
            v-model="selectedStatus"
            :placeholder="$t('accident.selectStatus')"
            clearable
            @change="handleStatusChange"
            style="width: 150px"
          >
            <el-option :label="$t('accident.draft')" value="draft" />
            <el-option :label="$t('accident.submitted')" value="submitted" />
            <el-option :label="$t('accident.archived')" value="archived" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            :range-separator="$t('accident.dateTo')"
            :start-placeholder="$t('accident.startDate')"
            :end-placeholder="$t('accident.endDate')"
            @change="handleDateChange"
            style="width: 240px"
          />
          <el-button @click="clearFilters">{{ $t('accident.clearFilters') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- 空状态 -->
    <div v-else-if="reports.length === 0" class="empty-state">
      <el-icon class="empty-icon"><Warning /></el-icon>
      <h3>{{ selectedStatus || dateRange ? $t('accident.noReportsFound') : $t('accident.noReports') }}</h3>
      <p>{{ selectedStatus || dateRange ? $t('accident.tryOtherFilters') : $t('accident.noReportsDesc') }}</p>
      <el-button type="primary" @click="createNewReport">
        {{ $t('accident.createReport') }}
      </el-button>
    </div>

    <!-- 报告列表 -->
    <div v-else class="reports-container">
      <div class="reports-grid">
        <div
          v-for="report in reports"
          :key="report.id"
          class="report-card"
          @click="viewReport(report)"
        >
          <div class="report-header">
            <div class="report-status">
              <el-tag
                :type="getStatusType(report.status)"
                size="small"
              >
                {{ getStatusText(report.status) }}
              </el-tag>
            </div>
            <div class="report-date">
              {{ formatDate(report.accidentTime) }}
            </div>
          </div>

          <div class="report-content">
            <div class="report-location">
              <el-icon><Location /></el-icon>
              <span>{{ report.accidentLocation || $t('accident.noLocation') }}</span>
            </div>
            <div class="report-description">
              {{ report.description || $t('accident.noDescription') }}
            </div>
          </div>

          <div class="report-footer">
            <div class="report-info">
              <span class="photo-count" v-if="report.photoCount > 0">
                <el-icon><Picture /></el-icon>
                {{ $t('accident.photoCount', { count: report.photoCount }) }}
              </span>
              <span class="created-time">
                {{ $t('accident.createdAt') }} {{ formatDate(report.createdAt) }}
              </span>
            </div>
            <div class="report-actions">
              <el-button
                size="small"
                @click.stop="editReport(report)"
              >
                <el-icon><Edit /></el-icon>
                {{ $t('common.edit') }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                @click.stop="deleteReport(report)"
              >
                <el-icon><Delete /></el-icon>
                {{ $t('common.delete') }}
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 48]"
          :total="totalReports"
          :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          :small="isMobile"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          class="responsive-pagination"
        />
      </div>
    </div>



    <!-- 报告详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="$t('accident.reportDetailTitle', { location: selectedReport?.accidentLocation || $t('accident.unknownLocation') })"
      :width="isMobile ? '100%' : '800px'"
      :fullscreen="isMobile"
      :before-close="handleCloseDetailDialog"
      class="accident-detail-dialog"
      :class="{ 'mobile-dialog': isMobile }"
    >
      <div v-if="selectedReport" class="report-detail-content">
        <div class="detail-section">
          <h4>{{ $t('accident.basicInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ $t('accident.accidentTime') }}:</label>
              <span>{{ formatDate(selectedReport.accidentTime) }}</span>
            </div>
            <div class="detail-item">
              <label>{{ $t('accident.accidentLocation') }}:</label>
              <span>{{ selectedReport.accidentLocation || $t('accident.notSpecified') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ $t('accident.reportStatus') }}:</label>
              <el-tag :type="getStatusType(selectedReport.status)" size="small">
                {{ getStatusText(selectedReport.status) }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>{{ $t('accident.createdAt') }}:</label>
              <span>{{ formatDate(selectedReport.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="selectedReport.description">
          <h4>{{ $t('accident.accidentDescription') }}</h4>
          <p class="description-text">{{ selectedReport.description }}</p>
        </div>

        <div class="detail-section" v-if="selectedReport.otherPartyInfo">
          <h4>{{ $t('accident.otherPartyInfo') }}</h4>
          <p class="description-text">{{ selectedReport.otherPartyInfo }}</p>
        </div>

        <div class="detail-section" v-if="reportPhotos.length > 0">
          <h4>{{ $t('accident.scenePhotos') }}</h4>
          <div class="photos-gallery">
            <div
              v-for="photo in reportPhotos"
              :key="photo.id"
              class="photo-item"
              @click="previewPhoto(photo)"
            >
              <img :src="getFullImageUrl(photo.imageUrl)" :alt="photo.caption" />
              <div class="photo-overlay">
                <el-icon><ZoomIn /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer" :class="{ 'mobile-footer': isMobile }">
          <el-button @click="detailDialogVisible = false">{{ $t('common.close') }}</el-button>
          <el-button @click="editReport(selectedReport)">{{ $t('accident.editReport') }}</el-button>
          <el-button
            type="primary"
            @click="generateReport"
            :loading="generatingReport"
          >
            <el-icon><Document /></el-icon>
            {{ $t('accident.pdf.generateReport') }}
          </el-button>
          <el-button
            v-if="selectedReport?.pdfUrl"
            type="warning"
            @click="regenerateReport"
            :loading="regeneratingReport"
          >
            <el-icon><Refresh /></el-icon>
            {{ $t('accident.pdf.regenerateReport') }}
          </el-button>
          <el-button v-if="selectedReport?.pdfUrl" type="primary" @click="downloadPDF()">
            <el-icon><Download /></el-icon>
            {{ $t('accident.downloadPDF') }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片预览 -->
    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewUrls"
      :initial-index="previewIndex"
      @close="previewVisible = false"
    />


  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import geocodingService from '@/utils/geocoding'

import {
  Warning,
  Plus,
  Document,
  Edit,
  Check,
  Location,
  Picture,
  Delete,
  ZoomIn,
  Download,
  Upload,
  Refresh
} from '@element-plus/icons-vue'

export default {
  name: 'AccidentReport',
  components: {
    Warning,
    Plus,
    Document,
    Edit,
    Check,
    Location,
    Picture,
    Delete,
    ZoomIn,
    Download,
    Upload,
    Refresh
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t } = useI18n()

    const loading = ref(false)
    const saving = ref(false)
    const reports = ref([])
    const selectedStatus = ref('')
    const dateRange = ref([])
    const currentPage = ref(1)
    const pageSize = ref(12)
    const totalReports = ref(0)

    const detailDialogVisible = ref(false)
    const selectedReport = ref(null)
    const reportPhotos = ref([])

    const previewVisible = ref(false)
    const previewUrls = ref([])
    const previewIndex = ref(0)

    const generatingReport = ref(false)
    const regeneratingReport = ref(false)

    // 移动端检测
    const windowWidth = ref(window.innerWidth)
    const isMobile = computed(() => {
      return windowWidth.value <= 768
    })

    // 监听窗口大小变化
    const handleResize = () => {
      windowWidth.value = window.innerWidth
    }

    onMounted(() => {
      window.addEventListener('resize', handleResize)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })



    // 计算统计数据
    const draftReports = computed(() => {
      return reports.value.filter(r => r.status === 'draft').length
    })

    const submittedReports = computed(() => {
      return reports.value.filter(r => r.status === 'submitted').length
    })



    // 获取事故报告列表
    const fetchReports = async () => {
      try {
        loading.value = true
        const params = {
          page: currentPage.value,
          limit: pageSize.value
        }

        if (selectedStatus.value) {
          params.status = selectedStatus.value
        }

        if (dateRange.value && dateRange.value.length === 2) {
          params.startDate = dateRange.value[0].toISOString()
          params.endDate = dateRange.value[1].toISOString()
        }

        const response = await api.accidents.getAll(params)
        reports.value = response.data.reports
        totalReports.value = response.data.pagination.total
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('accident.fetchReportsFailed'))
      } finally {
        loading.value = false
      }
    }

    // 获取报告详情
    const fetchReportDetail = async (reportId) => {
      try {
        const response = await api.accidents.getById(reportId)
        selectedReport.value = response.data
        reportPhotos.value = response.data.photos || []
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('accident.fetchReportDetailFailed'))
      }
    }

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // 获取状态类型
    const getStatusType = (status) => {
      const typeMap = {
        'draft': 'info',
        'submitted': 'success',
        'archived': 'warning'
      }
      return typeMap[status] || 'info'
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const textMap = {
        'draft': t('accident.draft'),
        'submitted': t('accident.submitted'),
        'archived': t('accident.archived')
      }
      return textMap[status] || t('accident.unknown')
    }

    // 筛选处理
    const handleStatusChange = () => {
      currentPage.value = 1
      fetchReports()
    }

    const handleDateChange = () => {
      currentPage.value = 1
      fetchReports()
    }

    const clearFilters = () => {
      selectedStatus.value = ''
      dateRange.value = []
      currentPage.value = 1
      fetchReports()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pageSize.value = newSize
      currentPage.value = 1
      fetchReports()
    }

    const handleCurrentChange = (newPage) => {
      currentPage.value = newPage
      fetchReports()
    }

    // 创建新报告
    const createNewReport = () => {
      // 跳转到新的向导页面
      router.push('/accident-report/wizard')
    }

    // 编辑报告
    const editReport = async (report) => {
      // 跳转到向导页面进行编辑
      router.push(`/accident-report/wizard?id=${report.id}`)
    }

    // 查看报告
    const viewReport = async (report) => {
      await fetchReportDetail(report.id)
      detailDialogVisible.value = true
    }

    // 删除报告
    const deleteReport = async (report) => {
      try {
        await ElMessageBox.confirm(
          t('accident.confirmDeleteReport', { location: report.accidentLocation || t('accident.unknownLocationText') }),
          t('accident.confirmDeleteTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        await api.accidents.delete(report.id)
        ElMessage.success(t('messages.success'))

        // 从列表中移除
        const index = reports.value.findIndex(r => r.id === report.id)
        if (index > -1) {
          reports.value.splice(index, 1)
          totalReports.value--
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('messages.error'))
        }
      }
    }

    // 构建完整的图片URL
    const getFullImageUrl = (imageUrl) => {
      if (!imageUrl) return ''

      // 如果已经是完整URL，检查是否需要转换端口
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          const url = new URL(imageUrl)
          // 如果URL指向后端端口，但我们在前端环境，需要通过前端代理访问
          if (url.port === '2607' && window.location.port === '2606') {
            // 使用前端的域名和端口，通过代理访问
            return `${window.location.protocol}//${window.location.host}${url.pathname}`
          }
          return imageUrl
        } catch (error) {
          console.error('Invalid image URL:', imageUrl)
          return imageUrl
        }
      }

      // 如果是相对路径，直接使用（会通过前端代理）
      return imageUrl
    }

    // 预览照片
    const previewPhoto = (photo) => {
      previewUrls.value = reportPhotos.value.map(p => getFullImageUrl(p.imageUrl))
      previewIndex.value = reportPhotos.value.findIndex(p => p.id === photo.id)
      previewVisible.value = true
    }

    // 智能报告生成 - 内容未变时直接下载，变化时重新生成
    const generateReport = async () => {
      if (!selectedReport.value?.id) {
        ElMessage.error(t('accident.pdf.reportNotFound'))
        return
      }

      try {
        generatingReport.value = true

        // 显示处理进度
        ElMessage.info(t('accident.pdf.generating'))

        const response = await api.accidents.generatePdf(selectedReport.value.id)

        if (response.success) {
          // 更新报告的PDF URL
          selectedReport.value.pdfUrl = response.data.pdfUrl

          // 根据是否为新生成的PDF显示不同消息
          const isNewPdf = response.data.isNew
          const title = isNewPdf
            ? t('accident.pdf.newReportGenerated')
            : t('accident.pdf.usingExistingReport')

          const message = isNewPdf
            ? t('accident.pdf.contentChanged')
            : t('accident.pdf.contentUnchanged')

          // 显示成功消息并提供下载选项
          ElMessageBox.confirm(
            `${message}\n\n${t('accident.pdf.downloadNow')}`,
            title,
            {
              confirmButtonText: t('accident.pdf.download'),
              cancelButtonText: t('common.cancel'),
              type: isNewPdf ? 'success' : 'info'
            }
          ).then(() => {
            // 下载PDF
            downloadPDF(response.data.pdfUrl, response.data.filename)
          }).catch(() => {
            // 用户取消，不做任何操作
          })

        }
      } catch (error) {

        // 详细的错误处理
        let errorMessage = t('accident.pdf.processingFailed')
        if (error.response) {
          const status = error.response.status
          switch (status) {
            case 404:
              errorMessage = t('accident.pdf.reportNotFound')
              break
            case 500:
              errorMessage = t('accident.pdf.serverError')
              break
            default:
              errorMessage = t('accident.pdf.generationFailed')
          }
        } else if (error.code === 'NETWORK_ERROR') {
          errorMessage = t('accident.pdf.networkError')
        }

        ElMessage.error(errorMessage)
      } finally {
        generatingReport.value = false
      }
    }

    // 强制重新生成报告
    const regenerateReport = async () => {
      if (!selectedReport.value?.id) {
        ElMessage.error(t('accident.pdf.reportNotFound'))
        return
      }

      try {
        // 确认对话框
        await ElMessageBox.confirm(
          t('accident.pdf.confirmRegenerate'),
          t('accident.pdf.regenerateReport'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        regeneratingReport.value = true
        ElMessage.info(t('accident.pdf.regenerating'))

        const response = await api.accidents.regeneratePdf(selectedReport.value.id)

        if (response.success) {
          // 更新报告的PDF URL
          selectedReport.value.pdfUrl = response.data.pdfUrl

          ElMessage.success(t('accident.pdf.regenerateSuccess'))

          // 提供下载选项
          ElMessageBox.confirm(
            t('accident.pdf.downloadNow'),
            t('accident.pdf.regenerateComplete'),
            {
              confirmButtonText: t('accident.pdf.download'),
              cancelButtonText: t('common.cancel'),
              type: 'success'
            }
          ).then(() => {
            downloadPDF(response.data.pdfUrl, response.data.filename)
          }).catch(() => {
            // 用户取消，不做任何操作
          })
        }
      } catch (error) {
        if (error === 'cancel') {
          // 用户取消确认
          return
        }

        console.error('Error:', error)
        let errorMessage = t('accident.pdf.regenerateFailed')

        if (error.response) {
          const status = error.response.status
          switch (status) {
            case 404:
              errorMessage = t('accident.pdf.reportNotFound')
              break
            case 500:
              errorMessage = t('accident.pdf.serverError')
              break
          }
        }

        ElMessage.error(errorMessage)
      } finally {
        regeneratingReport.value = false
      }
    }

    // 下载PDF（增强版，支持认证）
    const downloadPDF = async (pdfUrl = null, filename = null) => {
      const url = pdfUrl || selectedReport.value?.pdfUrl

      if (!url) {
        ElMessage.info(t('accident.pdf.fileNotFound'))
        return
      }

      // 对于用户专属PDF，需要认证，在新标签页打开下载
      if (url.includes('/user_')) {
        const token = store.getters['auth/token']
        if (!token) {
          ElMessage.error(t('accident.pdf.loginRequired'))
          return
        }

        // 提示用户将在新标签页打开PDF下载
        ElMessage.info(t('accident.pdf.openingDownload'))

        // 为下载添加查询参数，确保浏览器下载PDF
        const downloadUrl = url.includes('?') ? `${url}&download=true` : `${url}?download=true`

        // 在新标签页中打开PDF下载
        const newTab = window.open(downloadUrl, '_blank')
        if (!newTab) {
          ElMessage.warning(t('accident.pdf.allowPopups'))
        }
        return
      }

      // 对于非认证PDF，尝试传统下载方式
      try {
        // 创建一个临时的下载链接
        const link = document.createElement('a')
        link.href = url

        // 设置下载文件名
        if (filename) {
          link.download = filename
        } else {
          // 从URL中提取文件名或使用默认名称
          const urlParts = url.split('/')
          const urlFilename = urlParts[urlParts.length - 1]
          link.download = urlFilename || `accident-report-${selectedReport.value?.id || 'unknown'}.pdf`
        }

        // 添加到DOM，触发下载，然后移除
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        ElMessage.success(t('accident.pdf.downloadStarted'))
      } catch (error) {
        console.error('PDF download failed:', error)
        ElMessage.error(t('accident.pdf.rightClickSave'))

        // 如果下载失败，回退到在新窗口打开
        window.open(url, '_blank')
      }
    }



    const handleCloseDetailDialog = () => {
      detailDialogVisible.value = false
      selectedReport.value = null
      reportPhotos.value = []
    }

    onMounted(() => {
      fetchReports()
    })

    return {
      loading,
      saving,
      reports,
      selectedStatus,
      dateRange,
      currentPage,
      pageSize,
      totalReports,
      draftReports,
      submittedReports,
      detailDialogVisible,
      selectedReport,
      reportPhotos,
      previewVisible,
      previewUrls,
      previewIndex,
      generatingReport,
      isMobile,
      router,
      formatDate,
      getStatusType,
      getStatusText,
      handleStatusChange,
      handleDateChange,
      clearFilters,
      handleSizeChange,
      handleCurrentChange,
      createNewReport,
      editReport,
      viewReport,
      deleteReport,
      getFullImageUrl,
      previewPhoto,
      generateReport,
      regenerateReport,
      downloadPDF,
      handleCloseDetailDialog,
      // 状态
      regeneratingReport,
      // 图标
      Warning,
      Plus,
      Document,
      Edit,
      Check,
      Location,
      Picture,
      Delete,
      ZoomIn,
      Download,
      Upload
    }
  }
}
</script>

<style lang="scss" scoped>
.accident-report-page {
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
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;

  &.total { background: var(--el-color-warning); }
  &.draft { background: var(--el-color-info); }
  &.submitted { background: var(--el-color-success); }
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

.reports-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.report-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.report-date {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.report-content {
  margin-bottom: 16px;
}

.report-location {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.report-description {
  color: var(--el-text-color-regular);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.report-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.report-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-primary);
}

.created-time {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.report-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.photo-upload-section {
  .upload-tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}

.report-detail-content {
  .detail-section {
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 8px;

    label {
      font-weight: 500;
      color: var(--el-text-color-regular);
      min-width: 80px;
    }

    span {
      color: var(--el-text-color-primary);
    }
  }

  .description-text {
    line-height: 1.6;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-lighter);
    padding: 16px;
    border-radius: 6px;
  }
}

.photos-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;

  &:hover {
    transform: scale(1.05);

    .photo-overlay {
      opacity: 1;
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  opacity: 0;
  transition: opacity 0.3s;
}

/* 移动端对话框优化 */
.mobile-dialog {
  :deep(.el-dialog) {
    margin: 0 !important;
    max-height: 100vh;
    border-radius: 0;

    .el-dialog__header {
      padding: 16px 20px;
      border-bottom: 1px solid #ebeef5;

      .el-dialog__title {
        font-size: 16px;
        font-weight: 600;
      }

      .el-dialog__headerbtn {
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;

        .el-dialog__close {
          font-size: 18px;
        }
      }
    }

    .el-dialog__body {
      padding: 20px;
      max-height: calc(100vh - 140px);
      overflow-y: auto;
    }

    .el-dialog__footer {
      padding: 16px 20px;
      border-top: 1px solid #ebeef5;
      background: #fafafa;
    }
  }
}

/* 对话框footer优化 */
.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.mobile-footer {
  flex-direction: column;
  gap: 8px;

  .el-button {
    width: 100%;
    margin: 0;
    order: 2;

    &.el-button--primary {
      order: 1;
    }

    &.el-button--success {
      order: 1;
    }
  }
}

/* 按钮照片计数样式 */
.photo-count {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 4px;
}

/* 移动端表单优化 */
.mobile-form {
  .el-form-item {
    margin-bottom: 20px;

    .el-form-item__label {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .el-input,
    .el-textarea,
    .el-date-editor,
    .el-select {
      width: 100%;
    }

    .el-textarea .el-textarea__inner {
      min-height: 80px;
    }
  }
}

/* 移动端上传区域优化 */
.mobile-upload {
  .mobile-uploader {
    :deep(.el-upload-list--picture-card) {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .el-upload-list__item {
        width: 70px;
        height: 70px;
        margin: 0;
        border-radius: 6px;
      }
    }

    :deep(.el-upload--picture-card) {
      width: 70px;
      height: 70px;
      border-radius: 6px;

      .upload-icon {
        font-size: 20px;
        margin-bottom: 4px;
      }

      .upload-text {
        font-size: 10px;
      }
    }
  }
}

/* 移动端照片分类优化 */
@media (max-width: 768px) {
  .photo-upload-section {
    .category-section {
      padding: 12px;

      .category-header {
        font-size: 14px;
        margin-bottom: 8px;
      }

      .category-upload {
        .category-uploader {
          :deep(.el-upload--picture-card) {
            width: 60px;
            height: 60px;

            .el-icon {
              font-size: 16px;
            }
          }

          :deep(.el-upload-list--picture-card) {
            .el-upload-list__item {
              width: 60px;
              height: 60px;
              margin: 0 6px 6px 0;
            }
          }
        }
      }

      .category-captions {
        .caption-item {
          .el-input {
            :deep(.el-input__inner) {
              font-size: 12px;
            }
          }
        }
      }
    }

    .upload-tip {
      font-size: 11px;
      padding: 8px;
    }
  }
}

@media (max-width: 768px) {
  .accident-report-page {
    /* 移除重复的padding，由AppLayout的page-content处理 */
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .photos-gallery {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }

  .report-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

/* 照片分类上传样式 */
.photo-upload-section {
  .photo-guide {
    margin-bottom: 20px;

    .guide-alert {
      border-radius: 8px;

      :deep(.el-alert__title) {
        font-weight: 600;
        color: var(--el-color-warning-dark-2);
      }

      :deep(.el-alert__description) {
        margin-top: 8px;
        line-height: 1.5;
      }
    }
  }

  .photo-categories {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
  }

  .category-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e4e7ed;

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-weight: 600;
      color: #303133;

      .el-icon {
        color: #409eff;
      }

      span {
        flex: 1;
      }

      .el-tag {
        font-size: 11px;
      }
    }

    .category-tip {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(64, 158, 255, 0.1);
      border-radius: 4px;
      border-left: 3px solid var(--el-color-primary);

      .el-text {
        line-height: 1.4;
      }
    }

    .category-upload {
      margin-bottom: 12px;

      .category-uploader {
        :deep(.el-upload--picture-card) {
          width: 80px;
          height: 80px;
          border: 2px dashed #d9d9d9;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;

          &:hover {
            border-color: #409eff;
            background-color: #f0f9ff;
          }

          .el-icon {
            font-size: 20px;
            color: #8c939d;
          }
        }

        :deep(.el-upload-list--picture-card) {
          .el-upload-list__item {
            width: 80px;
            height: 80px;
            margin: 0 8px 8px 0;
            border-radius: 6px;
          }
        }
      }
    }

    .category-captions {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .caption-item {
        .caption-input-group {
          .el-input {
            :deep(.el-input__wrapper) {
              border-radius: 4px;
            }
          }

          .quick-tags {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;

            .quick-tag {
              cursor: pointer;
              transition: all 0.2s ease;
              font-size: 11px;

              &:hover {
                background-color: var(--el-color-primary);
                color: white;
                transform: translateY(-1px);
              }
            }
          }
        }
      }
    }
  }

  .upload-actions {
    margin-bottom: 16px;

    .el-button {
      border-radius: 8px;
      font-weight: 600;
    }
  }

  .photo-summary {
    margin-bottom: 16px;

    .el-alert {
      border-radius: 6px;
    }
  }

  .upload-tip {
    font-size: 12px;
    color: #606266;
    line-height: 1.6;
    background: #f0f9ff;
    padding: 12px;
    border-radius: 6px;
    border-left: 3px solid #409eff;

    strong {
      color: #303133;
      font-weight: 600;
    }
  }
}

/* 位置输入组合 */
.location-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;

  .location-input {
    flex: 1;
    min-width: 0; /* 确保输入框可以收缩 */
  }

  .location-button {
    flex-shrink: 0;
    white-space: nowrap;
    min-width: 80px; /* 设置最小宽度 */
    padding: 0 12px; /* 减少内边距使按钮更紧凑 */

    .button-text {
      margin-left: 4px;
    }
  }
}

/* 中等屏幕优化 */
@media (max-width: 1024px) {
  .location-input-group {
    .location-button {
      min-width: 60px;
      padding: 0 8px;

      .button-text {
        display: none; /* 隐藏文字，只显示图标 */
      }
    }
  }
}

/* 移动端位置输入优化 */
@media (max-width: 768px) {
  .location-input-group {
    gap: 8px; /* 保持水平布局，但减少间距 */

    .location-input {
      flex: 1;
    }

    .location-button {
      min-width: 48px;
      padding: 0 8px;

      .button-text {
        display: none; /* 隐藏文字，只显示图标 */
      }
    }
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
