<template>
  <div class="user-selector">
    <el-select
      v-model="selectedUserId"
      :placeholder="placeholder"
      filterable
      remote
      reserve-keyword
      :remote-method="handleSearch"
      :loading="loading"
      clearable
      style="width: 100%"
      :no-data-text="noDataText"
      @change="handleChange"
      @clear="handleClear"
    >
      <template #empty>
        <div class="user-search-empty">
          <el-icon><User /></el-icon>
          <p>{{ noDataText }}</p>
        </div>
      </template>
      
      <el-option
        v-for="user in users"
        :key="user.id"
        :label="`${user.username} (${user.email || $t('user.noEmail')}) - ID: ${user.id}`"
        :value="user.id"
      >
        <div class="user-option">
          <div class="user-avatar">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.username" />
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="user-info">
            <div class="user-name">{{ user.username }}</div>
            <div class="user-email">{{ user.email || $t('user.noEmail') }}</div>
            <div class="user-meta">
              <span class="user-id">ID: {{ user.id }}</span>
              <span class="user-role" :class="user.role">{{ $t(`user.${user.role}`) }}</span>
            </div>
          </div>
        </div>
      </el-option>
    </el-select>
    
    <div v-if="showTip" class="user-search-tip">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ $t('adminNotifications.userSearchTip') }}</span>
    </div>
    
    <!-- 快速选择最近用户 -->
    <div v-if="showRecentUsers && recentUsers.length > 0" class="recent-users">
      <div class="recent-users-header">
        <el-icon><Clock /></el-icon>
        <span>{{ $t('adminNotifications.recentUsers') }}</span>
      </div>
      <div class="recent-users-list">
        <el-tag
          v-for="user in recentUsers"
          :key="user.id"
          class="recent-user-tag"
          :type="selectedUserId === user.id ? 'primary' : undefined"
          @click="selectRecentUser(user)"
        >
          {{ user.username }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, InfoFilled, Clock } from '@element-plus/icons-vue'
import api from '@/api'

export default {
  name: 'UserSelector',
  components: {
    User,
    InfoFilled,
    Clock
  },
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    showTip: {
      type: Boolean,
      default: true
    },
    showRecentUsers: {
      type: Boolean,
      default: true
    }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const { t } = useI18n()
    
    const selectedUserId = ref(props.modelValue)
    const users = ref([])
    const loading = ref(false)
    const searchQuery = ref('')
    const recentUsers = ref([])

    // 计算属性
    const noDataText = computed(() => {
      if (loading.value) {
        return t('adminNotifications.searchingUsers')
      }
      if (!searchQuery.value) {
        return t('adminNotifications.userSearchTip')
      }
      if (searchQuery.value.length < 2) {
        return t('adminNotifications.userSearchTip')
      }
      return t('adminNotifications.noUsersFound')
    })

    // 监听 modelValue 变化
    watch(() => props.modelValue, (newValue) => {
      selectedUserId.value = newValue
    })

    // 监听选中值变化
    watch(selectedUserId, (newValue) => {
      emit('update:modelValue', newValue)
    })

    // 搜索用户
    const handleSearch = async (query) => {
      searchQuery.value = query || ''
      
      if (!query || query.length < 2) {
        users.value = []
        return
      }

      try {
        loading.value = true
        const response = await api.admin.users.getAll({
          search: query,
          limit: 20
        })
        users.value = response?.data?.users || []
      } catch (error) {
        users.value = []
        ElMessage.error(t('adminNotifications.userNotFound'))
      } finally {
        loading.value = false
      }
    }

    // 处理选择变化
    const handleChange = (value) => {
      const selectedUser = users.value.find(user => user.id === value)
      if (selectedUser) {
        // 添加到最近使用的用户列表
        addToRecentUsers(selectedUser)
      }
      emit('change', value, selectedUser)
    }

    // 处理清除
    const handleClear = () => {
      emit('change', '', null)
    }

    // 选择最近用户
    const selectRecentUser = (user) => {
      selectedUserId.value = user.id
      handleChange(user.id)
    }

    // 添加到最近用户列表
    const addToRecentUsers = (user) => {
      const existingIndex = recentUsers.value.findIndex(u => u.id === user.id)
      if (existingIndex > -1) {
        recentUsers.value.splice(existingIndex, 1)
      }
      recentUsers.value.unshift(user)
      recentUsers.value = recentUsers.value.slice(0, 5) // 只保留最近5个
      
      // 保存到本地存储
      localStorage.setItem('admin-recent-users', JSON.stringify(recentUsers.value))
    }

    // 加载最近用户
    const loadRecentUsers = () => {
      try {
        const stored = localStorage.getItem('admin-recent-users')
        if (stored) {
          recentUsers.value = JSON.parse(stored)
        }
      } catch (error) {
        // 加载最近用户失败，静默处理
      }
    }

    onMounted(() => {
      loadRecentUsers()
    })

    return {
      selectedUserId,
      users,
      loading,
      searchQuery,
      recentUsers,
      noDataText,
      handleSearch,
      handleChange,
      handleClear,
      selectRecentUser,
      t
    }
  }
}
</script>

<style lang="scss" scoped>
.user-selector {
  width: 100%;
}

:deep(.user-option) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  width: 100%;

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: #f5f7fa;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .el-icon {
      font-size: 16px;
      color: #909399;
    }
  }

  .user-info {
    flex: 1;
    min-width: 0;

    .user-name {
      font-weight: 500;
      color: #303133;
      font-size: 14px;
      line-height: 1.4;
    }

    .user-email {
      color: #909399;
      font-size: 12px;
      line-height: 1.4;
      margin-top: 2px;
    }

    .user-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;

      .user-id {
        color: #909399;
        font-size: 11px;
        background: #f5f7fa;
        padding: 2px 6px;
        border-radius: 4px;
      }

      .user-role {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        
        &.admin {
          background: #fdf2f2;
          color: #f56c6c;
        }
        
        &.user {
          background: #f0f9ff;
          color: #409eff;
        }
      }
    }
  }
}

:deep(.user-search-empty) {
  text-align: center;
  padding: 20px;
  color: #909399;

  .el-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
}

.user-search-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 12px;
  color: #409eff;

  .el-icon {
    font-size: 14px;
  }
}

.recent-users {
  margin-top: 12px;
  padding: 12px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #e4e7ed;

  .recent-users-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    font-size: 12px;
    color: #606266;
    font-weight: 500;

    .el-icon {
      font-size: 14px;
    }
  }

  .recent-users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .recent-user-tag {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
    }
  }
}
</style>
