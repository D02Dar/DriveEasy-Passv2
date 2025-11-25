<template>
  <div class="admin-notifications">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Bell /></el-icon>
            {{ t('adminNotifications.title') }}
          </h1>
          <p class="page-subtitle">{{ t('adminNotifications.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            {{ t('adminNotifications.createNotification') }}
          </el-button>
          <el-button @click="refreshNotifications" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ t('common.refresh') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.notifications?.totalNotifications || 0 }}</div>
            <div class="stat-label">{{ t('adminNotifications.totalNotifications') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><Message /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.notifications?.todayNotifications || 0 }}</div>
            <div class="stat-label">{{ t('adminNotifications.todayNotifications') }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.users?.totalUsers || 0 }}</div>
            <div class="stat-label">{{ t('adminNotifications.totalUsers') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <div class="filter-card">
        <div class="filter-content">
          <el-input
            v-model="searchKeyword"
            :placeholder="t('adminNotifications.searchPlaceholder')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
            style="width: 300px"
          />
          <el-select
            v-model="selectedTargetType"
            :placeholder="t('adminNotifications.selectTargetType')"
            clearable
            @change="handleTargetTypeChange"
            style="width: 150px"
          >
            <el-option :label="t('adminNotifications.allUsers')" value="all" />
            <el-option :label="t('adminNotifications.specificUser')" value="user" />
          </el-select>
          <el-button @click="clearFilters">{{ t('common.clearFilters') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 通知列表 -->
    <div class="notifications-container">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <div v-else-if="notifications.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Bell /></el-icon>
        <h3>{{ searchKeyword || selectedTargetType ? t('adminNotifications.noNotificationsFound') : t('adminNotifications.noNotifications') }}</h3>
        <p>{{ searchKeyword || selectedTargetType ? t('adminNotifications.tryOtherConditions') : t('adminNotifications.noNotificationsDesc') }}</p>
      </div>

      <div v-else class="notifications-content">
        <div class="notifications-header">
          <h2 class="section-title">{{ t('adminNotifications.notificationList') }}</h2>
          <p class="section-subtitle">{{ t('adminNotifications.totalCount', { total: pagination.total, page: pagination.page }) }}</p>
        </div>

        <div class="notifications-table">
          <el-table
            :data="notifications"
            style="width: 100%"
            :default-sort="{ prop: 'createdAt', order: 'descending' }"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="id" label="ID" width="80" sortable />

            <el-table-column :label="t('adminNotifications.notificationInfo')" min-width="300">
              <template #default="{ row }">
                <div class="notification-info">
                  <div class="notification-title">{{ row.title }}</div>
                  <div class="notification-content">{{ row.content }}</div>
                </div>
              </template>
            </el-table-column>

            <el-table-column :label="t('adminNotifications.targetType')" width="120">
              <template #default="{ row }">
                <el-tag :type="row.targetType === 'all' ? 'primary' : 'warning'" size="small">
                  {{ row.targetType === 'all' ? t('adminNotifications.allUsers') : t('adminNotifications.specificUser') }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="t('adminNotifications.publishAt')" width="180" sortable="custom" prop="publishAt">
              <template #default="{ row }">
                {{ formatDate(row.publishAt) }}
              </template>
            </el-table-column>

            <el-table-column :label="t('adminNotifications.createdAt')" width="180" sortable="custom" prop="createdAt">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column :label="t('common.actions')" width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button
                    size="small"
                    @click="viewNotificationDetail(row)"
                  >
                    <el-icon><View /></el-icon>
                    {{ t('common.view') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="editNotification(row)"
                  >
                    <el-icon><Edit /></el-icon>
                    {{ t('common.edit') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="deleteNotification(row)"
                  >
                    <el-icon><Delete /></el-icon>
                    {{ t('common.delete') }}
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 创建/编辑通知对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      :title="isEditing ? t('adminNotifications.editNotification') : t('adminNotifications.createNotification')"
      width="600px"
      :before-close="handleCloseCreateDialog"
    >
      <el-form :model="notificationForm" :rules="formRules" ref="notificationFormRef" label-width="120px">
        <el-form-item :label="t('adminNotifications.title')" prop="title">
          <el-input v-model="notificationForm.title" :placeholder="t('adminNotifications.enterTitle')" />
        </el-form-item>
        <el-form-item :label="t('adminNotifications.content')" prop="content">
          <el-input
            v-model="notificationForm.content"
            type="textarea"
            :rows="4"
            :placeholder="t('adminNotifications.enterContent')"
          />
        </el-form-item>
        <el-form-item :label="t('adminNotifications.targetType')" prop="targetType">
          <el-radio-group v-model="notificationForm.targetType">
            <el-radio value="all">{{ t('adminNotifications.allUsers') }}</el-radio>
            <el-radio value="user">{{ t('adminNotifications.specificUser') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="notificationForm.targetType === 'user'" :label="t('adminNotifications.targetUser')" prop="targetUserId">
          <UserSelector
            v-model="notificationForm.targetUserId"
            :placeholder="t('adminNotifications.selectTargetUser')"
            @change="handleUserChange"
          />
        </el-form-item>
        <el-form-item :label="t('adminNotifications.publishAt')" prop="publishAt">
          <el-date-picker
            v-model="notificationForm.publishAt"
            type="datetime"
            :placeholder="t('adminNotifications.selectPublishTime')"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmCreateNotification" :loading="creating">
          {{ isEditing ? t('common.save') : t('adminNotifications.create') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 通知详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="t('adminNotifications.notificationDetail')"
      width="600px"
    >
      <div v-if="selectedNotification" class="notification-detail">
        <div class="detail-section">
          <h4>{{ t('adminNotifications.basicInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ t('adminNotifications.title') }}:</label>
              <span>{{ selectedNotification.title }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminNotifications.content') }}:</label>
              <span>{{ selectedNotification.content }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminNotifications.targetType') }}:</label>
              <el-tag :type="selectedNotification.targetType === 'all' ? 'primary' : 'warning'" size="small">
                {{ selectedNotification.targetType === 'all' ? t('adminNotifications.allUsers') : t('adminNotifications.specificUser') }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>{{ t('adminNotifications.publishAt') }}:</label>
              <span>{{ formatDate(selectedNotification.publishAt) }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminNotifications.createdAt') }}:</label>
              <span>{{ formatDate(selectedNotification.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import api from '@/api'
import UserSelector from '@/components/admin/UserSelector.vue'
import {
  Bell,
  Plus,
  Refresh,
  Search,
  View,
  Edit,
  Delete,
  Message,
  User,
  InfoFilled
} from '@element-plus/icons-vue'

export default {
  name: 'AdminNotifications',
  components: {
    UserSelector,
    Bell,
    Plus,
    Refresh,
    Search,
    View,
    Edit,
    Delete,
    Message,
    User,
    InfoFilled
  },
  setup() {
    const { t } = useI18n()
    
    const loading = ref(false)
    const creating = ref(false)
    const deleting = ref(false)
    const notifications = ref([])
    const stats = ref({})
    const searchKeyword = ref('')
    const selectedTargetType = ref('')
    const createDialogVisible = ref(false)
    const detailDialogVisible = ref(false)
    const selectedNotification = ref(null)
    const notificationFormRef = ref(null)
    const isEditing = ref(false)
    const editingNotificationId = ref(null)

    // 用户选择器相关
    const selectedUser = ref(null)

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    })

    const sortConfig = reactive({
      prop: 'createdAt',
      order: 'descending'
    })

    const notificationForm = reactive({
      title: '',
      content: '',
      targetType: 'all',
      targetUserId: '',
      publishAt: ''
    })

    const formRules = {
      title: [
        { required: true, message: t('adminNotifications.titleRequired'), trigger: 'blur' }
      ],
      content: [
        { required: true, message: t('adminNotifications.contentRequired'), trigger: 'blur' }
      ],
      targetType: [
        { required: true, message: t('adminNotifications.targetTypeRequired'), trigger: 'change' }
      ],
      targetUserId: [
        { 
          validator: (rule, value, callback) => {
            if (notificationForm.targetType === 'user' && !value) {
              callback(new Error(t('adminNotifications.userIdRequired')))
            } else {
              callback()
            }
          }, 
          trigger: 'blur' 
        }
      ]
    }

    // 获取通知列表
    const fetchNotifications = async () => {
      try {
        loading.value = true
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }
        
        if (searchKeyword.value) {
          params.search = searchKeyword.value
        }
        
        if (selectedTargetType.value) {
          params.targetType = selectedTargetType.value
        }
        
        if (sortConfig.prop && sortConfig.order) {
          params.sortBy = sortConfig.prop
          params.sortOrder = sortConfig.order === 'ascending' ? 'asc' : 'desc'
        }
        
        const response = await api.notifications.getAllAdmin(params)
        notifications.value = response?.data?.notifications || []
        pagination.total = response?.data?.pagination?.total || 0
        pagination.totalPages = response?.data?.pagination?.totalPages || 0
      } catch (error) {
        ElMessage.error(t('adminNotifications.fetchError'))
      } finally {
        loading.value = false
      }
    }

    // 获取统计数据
    const fetchStats = async () => {
      try {
        const response = await api.admin.getStats()
        stats.value = response?.data || {}
      } catch (error) {
        // 获取统计数据失败，静默处理
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

    // 搜索处理
    const handleSearch = () => {
      pagination.page = 1
      fetchNotifications()
    }

    // 目标类型筛选
    const handleTargetTypeChange = () => {
      pagination.page = 1
      fetchNotifications()
    }

    // 清除筛选
    const clearFilters = () => {
      searchKeyword.value = ''
      selectedTargetType.value = ''
      pagination.page = 1
      fetchNotifications()
    }

    // 排序处理
    const handleSortChange = ({ prop, order }) => {
      sortConfig.prop = prop
      sortConfig.order = order
      fetchNotifications()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pagination.limit = newSize
      pagination.page = 1
      fetchNotifications()
    }

    const handleCurrentChange = (newPage) => {
      pagination.page = newPage
      fetchNotifications()
    }

    // 显示创建对话框
    const showCreateDialog = () => {
      createDialogVisible.value = true
    }

    // 关闭创建/编辑对话框
    const handleCloseCreateDialog = () => {
      createDialogVisible.value = false
      isEditing.value = false
      editingNotificationId.value = null
      // 重置表单
      Object.assign(notificationForm, {
        title: '',
        content: '',
        targetType: 'all',
        targetUserId: '',
        publishAt: ''
      })
      if (notificationFormRef.value) {
        notificationFormRef.value.resetFields()
      }
    }

    // 确认创建/编辑通知
    const confirmCreateNotification = async () => {
      if (!notificationFormRef.value) return

      try {
        const valid = await notificationFormRef.value.validate()
        if (!valid) return

        creating.value = true

        // 准备发送的数据，如果publishAt为空则不发送该字段
        const submitData = { ...notificationForm }
        if (!submitData.publishAt) {
          delete submitData.publishAt
        }

        if (isEditing.value) {
          await api.notifications.update(editingNotificationId.value, submitData)
          ElMessage.success(t('adminNotifications.updateSuccess'))
        } else {
          await api.notifications.create(submitData)
          ElMessage.success(t('adminNotifications.createSuccess'))
        }

        createDialogVisible.value = false
        handleCloseCreateDialog()
        fetchNotifications()
      } catch (error) {
        console.error('Error:', error)
        if (isEditing.value) {
          ElMessage.error(t('adminNotifications.updateFailed'))
        } else {
          ElMessage.error(t('adminNotifications.createFailed'))
        }
      } finally {
        creating.value = false
      }
    }

    // 查看通知详情
    const viewNotificationDetail = (notification) => {
      selectedNotification.value = notification
      detailDialogVisible.value = true
    }

    // 编辑通知
    const editNotification = async (notification) => {
      try {
        // 获取通知详情
        const response = await api.notifications.getAdminDetail(notification.id)
        const detail = response.data

        // 填充表单
        Object.assign(notificationForm, {
          title: detail.title,
          content: detail.content,
          targetType: detail.targetType,
          targetUserId: detail.targetUserId || '',
          publishAt: detail.publishAt ? detail.publishAt.replace('Z', '') : ''
        })

        isEditing.value = true
        editingNotificationId.value = notification.id
        createDialogVisible.value = true
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('adminNotifications.fetchDetailFailed'))
      }
    }

    // 删除通知
    const deleteNotification = async (notification) => {
      try {
        await ElMessageBox.confirm(
          t('adminNotifications.confirmDelete', { title: notification.title }),
          t('adminNotifications.confirmOperation'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        deleting.value = true
        await api.notifications.delete(notification.id)
        ElMessage.success(t('adminNotifications.deleteSuccess'))
        fetchNotifications()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('adminNotifications.deleteFailed'))
        }
      } finally {
        deleting.value = false
      }
    }

    // 处理用户选择变化
    const handleUserChange = (userId, user) => {
      selectedUser.value = user

    }

    // 刷新通知列表
    const refreshNotifications = () => {
      fetchNotifications()
      fetchStats()
    }

    onMounted(async () => {
      // 并行加载数据，减少加载时间
      try {
        await Promise.all([
          fetchNotifications(),
          fetchStats()
        ])
      } catch (error) {
        // 页面数据加载失败，静默处理
      }
    })

    return {
      t,
      loading,
      creating,
      deleting,
      notifications,
      stats,
      searchKeyword,
      selectedTargetType,
      createDialogVisible,
      detailDialogVisible,
      selectedNotification,
      notificationFormRef,
      pagination,
      notificationForm,
      formRules,
      isEditing,
      editingNotificationId,
      selectedUser,
      formatDate,
      handleSearch,
      handleTargetTypeChange,
      clearFilters,
      handleSortChange,
      handleSizeChange,
      handleCurrentChange,
      showCreateDialog,
      handleCloseCreateDialog,
      confirmCreateNotification,
      editNotification,
      deleteNotification,
      viewNotificationDetail,
      refreshNotifications,
      handleUserChange,
      // 图标
      Bell,
      Plus,
      Refresh,
      Search,
      View,
      Edit,
      Delete,
      Message,
      User,
      InfoFilled
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-notifications {
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
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    gap: 12px;

    .el-icon {
      color: #3b82f6;
    }
  }

  .page-subtitle {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
  }

  .stat-content {
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      line-height: 1;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
  }
}

.filter-section {
  margin-bottom: 24px;
}

.filter-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.filter-content {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.notifications-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.loading-container {
  padding: 40px;
}

.empty-state {
  text-align: center;
  padding: 80px 40px;

  .empty-icon {
    font-size: 64px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 18px;
    color: #374151;
    margin: 0 0 8px 0;
  }

  p {
    color: #6b7280;
    margin: 0;
  }
}

.notifications-content {
  .notifications-header {
    padding: 32px 32px 0 32px;
    border-bottom: 1px solid #f3f4f6;
    margin-bottom: 0;

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 4px 0;
    }

    .section-subtitle {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
    }
  }

  .notifications-table {
    padding: 0 32px;

    .notification-info {
      .notification-title {
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
        font-size: 14px;
      }

      .notification-content {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.4;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;

      .el-button {
        min-width: auto;
        padding: 4px 8px;

        .el-icon {
          margin-right: 2px;
        }
      }
    }
  }

  .pagination-container {
    padding: 24px 32px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: center;
  }
}

.notification-detail {
  .detail-section {
    margin-bottom: 24px;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #f3f4f6;
    }

    .detail-grid {
      display: grid;
      gap: 16px;

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
        }

        span {
          font-size: 14px;
          color: #1f2937;
          word-break: break-word;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .admin-notifications {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .filter-content {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .notifications-content {
    .notifications-header,
    .notifications-table,
    .pagination-container {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
}


</style>
