<template>
  <div class="admin-users">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><User /></el-icon>
            {{ t('adminUsers.title') }}
          </h1>
          <p class="page-subtitle">{{ t('adminUsers.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshUsers" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ t('common.refresh') }}
          </el-button>
          <el-button @click="exportUsers">
            <el-icon><Download /></el-icon>
            {{ t('common.exportData') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ pagination.total || 0 }}</div>
          <div class="stat-label">{{ t('adminUsers.totalUsers') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active">
          <el-icon><UserFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeUsersCount }}</div>
          <div class="stat-label">{{ t('adminUsers.activeUsers') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon admin">
          <el-icon><Avatar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ adminUsersCount }}</div>
          <div class="stat-label">{{ t('adminUsers.adminUsers') }}</div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
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
            v-model="selectedRole"
            :placeholder="t('adminUsers.selectRole')"
            clearable
            @change="handleRoleChange"
            style="width: 150px"
          >
            <el-option :label="t('user.user')" value="user" />
            <el-option :label="t('user.admin')" value="admin" />
          </el-select>
          <el-select
            v-model="selectedStatus"
            :placeholder="t('adminUsers.selectStatus')"
            clearable
            @change="handleStatusChange"
            style="width: 150px"
          >
            <el-option :label="t('user.active')" value="active" />
            <el-option :label="t('user.disabled')" value="inactive" />
          </el-select>
          <el-button @click="clearFilters">{{ t('common.clearFilters') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="users-container">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <div v-else-if="users.length === 0" class="empty-state">
        <el-icon class="empty-icon"><User /></el-icon>
        <h3>{{ searchKeyword || selectedRole || selectedStatus ? t('adminUsers.noUsersFound') : t('adminUsers.noUsers') }}</h3>
        <p>{{ searchKeyword || selectedRole || selectedStatus ? t('adminUsers.tryOtherConditions') : t('adminUsers.noUsersDesc') }}</p>
      </div>

      <div v-else class="users-list">
        <div class="list-header">
          <h3>{{ t('adminUsers.userList') }}</h3>
          <span class="list-count">
            {{ t('adminUsers.totalCount', { total: pagination.total, page: pagination.page }) }}
          </span>
        </div>

        <div class="users-table">
          <el-table
            :data="users"
            style="width: 100%"
            :default-sort="{ prop: 'createdAt', order: 'descending' }"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="id" label="ID" width="80" sortable />

            <el-table-column :label="t('adminUsers.userInfo')" min-width="200">
              <template #default="{ row }">
                <div class="user-info">
                  <div class="user-avatar">
                    <img v-if="row.avatarUrl" :src="row.avatarUrl" :alt="row.username" />
                    <el-icon v-else><Avatar /></el-icon>
                  </div>
                  <div class="user-details">
                    <div class="user-name">{{ row.username }}</div>
                    <div class="user-email">{{ row.email || t('user.noEmail') }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column :label="t('adminUsers.role')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                  {{ row.role === 'admin' ? t('user.admin') : t('user.user') }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="t('adminUsers.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                  {{ row.isActive ? t('user.active') : t('user.disabled') }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="t('adminUsers.language')" width="100">
              <template #default="{ row }">
                <span class="language-tag">
                  {{ getLanguageName(row.languagePreference) }}
                </span>
              </template>
            </el-table-column>

            <el-table-column prop="lastLoginAt" :label="t('adminUsers.lastLogin')" width="160" sortable>
              <template #default="{ row }">
                <span v-if="row.lastLoginAt">{{ formatDate(row.lastLoginAt) }}</span>
                <span v-else class="text-placeholder">{{ t('user.neverLoggedIn') }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" :label="t('adminUsers.createdAt')" width="160" sortable>
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column :label="t('common.actions')" width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button
                    size="small"
                    @click="viewUserDetail(row)"
                  >
                    <el-icon><View /></el-icon>
                    {{ t('common.view') }}
                  </el-button>
                  <el-button
                    size="small"
                    :type="row.isActive ? 'danger' : 'success'"
                    @click="toggleUserStatus(row)"
                    :disabled="row.role === 'admin'"
                  >
                    {{ row.isActive ? t('adminUsers.disable') : t('adminUsers.enable') }}
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
            :layout="isMobile ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
            :small="isMobile"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            class="responsive-pagination"
          />
        </div>
      </div>
    </div>

    <!-- 用户详情对话框 -->
    <el-dialog
      v-model="userDetailVisible"
      :title="`${t('adminUsers.userDetail')} - ${selectedUser?.username}`"
      width="600px"
      :before-close="handleCloseUserDetail"
    >
      <div v-if="selectedUser" class="user-detail-content">
        <div class="detail-section">
          <h4>{{ t('adminUsers.basicInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ t('user.userId') }}</label>
              <span>{{ selectedUser.id }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('user.username') }}</label>
              <span>{{ selectedUser.username }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('user.email') }}</label>
              <span>{{ selectedUser.email || t('common.notSet') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminUsers.role') }}</label>
              <el-tag :type="selectedUser.role === 'admin' ? 'danger' : 'primary'" size="small">
                {{ selectedUser.role === 'admin' ? t('user.admin') : t('user.user') }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>{{ t('adminUsers.status') }}</label>
              <el-tag :type="selectedUser.isActive ? 'success' : 'danger'" size="small">
                {{ selectedUser.isActive ? t('user.active') : t('user.disabled') }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>{{ t('adminUsers.languagePreference') }}</label>
              <span>{{ getLanguageName(selectedUser.languagePreference) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="userStats">
          <h4>{{ t('adminUsers.practiceStats') }}</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ userStats.totalPractices || 0 }}</div>
              <div class="stat-label">{{ t('adminUsers.practiceCount') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatScore(userStats.averageScore) }}%</div>
              <div class="stat-label">{{ t('adminUsers.averageScore') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.totalQuestions || 0 }}</div>
              <div class="stat-label">{{ t('adminUsers.totalQuestions') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ userStats.bookmarkCount || 0 }}</div>
              <div class="stat-label">{{ t('adminUsers.bookmarkedQuestions') }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>{{ t('adminUsers.timeInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ t('adminUsers.createdAt') }}</label>
              <span>{{ formatDate(selectedUser.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminUsers.lastLogin') }}</label>
              <span>{{ selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : t('user.neverLoggedIn') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminUsers.updatedAt') }}</label>
              <span>{{ formatDate(selectedUser.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="userDetailVisible = false">{{ t('common.close') }}</el-button>
        <el-button
          v-if="selectedUser && selectedUser.role !== 'admin'"
          :type="selectedUser.isActive ? 'danger' : 'success'"
          @click="toggleUserStatus(selectedUser)"
        >
          {{ selectedUser.isActive ? t('adminUsers.disableUser') : t('adminUsers.enableUser') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import {
  User,
  Refresh,
  Download,
  Search,
  View,
  UserFilled,
  Avatar
} from '@element-plus/icons-vue'

export default {
  name: 'AdminUsers',
  components: {
    User,
    Refresh,
    Download,
    Search,
    View,
    UserFilled,
    Avatar
  },
  setup() {
    const { t } = useI18n()
    const loading = ref(false)
    const users = ref([])
    const searchKeyword = ref('')
    const selectedRole = ref('')
    const selectedStatus = ref('')
    const userDetailVisible = ref(false)
    const selectedUser = ref(null)
    const userStats = ref(null)

    // 移动端检测
    const isMobile = computed(() => {
      return window.innerWidth <= 768
    })

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    const sortConfig = reactive({
      prop: 'createdAt',
      order: 'descending'
    })

    // 计算统计数据
    const activeUsersCount = computed(() => {
      return users.value.filter(user => user.isActive).length
    })

    const adminUsersCount = computed(() => {
      return users.value.filter(user => user.role === 'admin').length
    })

    // 获取用户列表
    const fetchUsers = async () => {
      try {
        loading.value = true
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }

        if (searchKeyword.value) {
          params.search = searchKeyword.value
        }

        if (selectedRole.value) {
          params.role = selectedRole.value
        }

        if (selectedStatus.value) {
          params.status = selectedStatus.value === 'active'
        }

        if (sortConfig.prop) {
          params.sortBy = sortConfig.prop
          params.sortOrder = sortConfig.order === 'ascending' ? 'asc' : 'desc'
        }

        const response = await api.admin.users.getAll(params)
        users.value = response.data.users
        pagination.total = response.data.pagination.total
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        loading.value = false
      }
    }

    // 获取用户详情
    const fetchUserDetail = async (userId) => {
      try {
        const response = await api.admin.users.getById(userId)
        selectedUser.value = response.data
        userStats.value = response.data.practiceStats
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
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

    // 格式化分数
    const formatScore = (score) => {
      return score ? Math.round(score) : 0
    }

    // 获取语言名称
    const getLanguageName = (lang) => {
      const langMap = {
        'zh': t('languages.chinese'),
        'en': t('languages.english'),
        'th': t('languages.thai')
      }
      return langMap[lang] || t('languages.chinese')
    }

    // 搜索处理
    const handleSearch = () => {
      pagination.page = 1
      fetchUsers()
    }

    // 角色筛选
    const handleRoleChange = () => {
      pagination.page = 1
      fetchUsers()
    }

    // 状态筛选
    const handleStatusChange = () => {
      pagination.page = 1
      fetchUsers()
    }

    // 清除筛选
    const clearFilters = () => {
      searchKeyword.value = ''
      selectedRole.value = ''
      selectedStatus.value = ''
      pagination.page = 1
      fetchUsers()
    }

    // 排序处理
    const handleSortChange = ({ prop, order }) => {
      sortConfig.prop = prop
      sortConfig.order = order
      fetchUsers()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pagination.limit = newSize
      pagination.page = 1
      fetchUsers()
    }

    const handleCurrentChange = (newPage) => {
      pagination.page = newPage
      fetchUsers()
    }

    // 查看用户详情
    const viewUserDetail = async (user) => {
      selectedUser.value = user
      userDetailVisible.value = true
      await fetchUserDetail(user.id)
    }

    // 切换用户状态
    const toggleUserStatus = async (user) => {
      if (user.role === 'admin') {
        ElMessage.warning(t('messages.warning'))
        return
      }

      try {
        const action = user.isActive ? t('adminUsers.disable') : t('adminUsers.enable')
        await ElMessageBox.confirm(
          t('adminUsers.confirmToggleUser', { action, username: user.username }),
          t('adminUsers.confirmOperation'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        await api.admin.users.update(user.id, {
          isActive: !user.isActive
        })

        user.isActive = !user.isActive
        const successAction = user.isActive ? t('adminUsers.enable') : t('adminUsers.disable')
        ElMessage.success(t('adminUsers.userToggleSuccess', { action: successAction }))

        // 如果是在详情对话框中操作，更新详情数据
        if (selectedUser.value && selectedUser.value.id === user.id) {
          selectedUser.value.isActive = user.isActive
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('messages.error'))
        }
      }
    }

    // 刷新用户列表
    const refreshUsers = () => {
      fetchUsers()
    }

    // 导出用户数据
    const exportUsers = () => {
      ElMessage.info(t('messages.info'))
    }

    // 关闭用户详情对话框
    const handleCloseUserDetail = () => {
      userDetailVisible.value = false
      selectedUser.value = null
      userStats.value = null
    }

    onMounted(() => {
      fetchUsers()
    })

    return {
      t,
      loading,
      users,
      searchKeyword,
      selectedRole,
      selectedStatus,
      pagination,
      userDetailVisible,
      selectedUser,
      userStats,
      activeUsersCount,
      adminUsersCount,
      isMobile,
      formatDate,
      formatScore,
      getLanguageName,
      handleSearch,
      handleRoleChange,
      handleStatusChange,
      clearFilters,
      handleSortChange,
      handleSizeChange,
      handleCurrentChange,
      viewUserDetail,
      toggleUserStatus,
      refreshUsers,
      exportUsers,
      handleCloseUserDetail,
      // 图标
      User,
      Refresh,
      Download,
      Search,
      View,
      UserFilled,
      Avatar
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-users {
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
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;

  &.total { background: var(--el-color-primary); }
  &.active { background: var(--el-color-success); }
  &.admin { background: var(--el-color-warning); }
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

.users-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.loading-container {
  padding: 24px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;

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

.users-list {
  .list-header {
    padding: 24px 24px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .list-count {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }
}

.users-table {
  padding: 0 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .el-icon {
    font-size: 20px;
    color: var(--el-text-color-placeholder);
  }
}

.user-details {
  .user-name {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 2px;
  }

  .user-email {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}

.language-tag {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.text-placeholder {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  padding: 24px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}

.user-detail-content {
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .stat-item {
    text-align: center;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--el-text-color-primary);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}

@media (max-width: 768px) {
  .admin-users {
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

  .stats-section {
    grid-template-columns: 1fr;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    flex-direction: column;
  }

  .pagination-container {
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

/* 分页组件响应式优化 */
.pagination-container {
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