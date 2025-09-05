<template>
  <div class="profile-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><User /></el-icon>
            {{ $t('nav.personalProfile') }}
          </h1>
          <p class="page-subtitle">{{ $t('profile.manageInfo') }}</p>
        </div>
        <div class="header-actions">
          <el-button v-if="!isEditing" @click="startEdit">
            <el-icon><Edit /></el-icon>
            {{ $t('profile.editProfile') }}
          </el-button>
          <div v-else class="edit-actions">
            <el-button @click="cancelEdit">
              <el-icon><Close /></el-icon>
              {{ $t('common.cancel') }}
            </el-button>
            <el-button type="primary" @click="saveProfile" :loading="saving">
              <el-icon><Check /></el-icon>
              {{ $t('common.save') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 用户头像和基本信息 -->
    <div class="profile-overview">
      <div class="overview-card">
        <div class="avatar-section">
          <div class="avatar-container">
            <img v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" :alt="userInfo.username" />
            <div v-else class="avatar-placeholder">
              {{ userInfo.username?.charAt(0)?.toUpperCase() }}
            </div>
            <div v-if="isEditing" class="avatar-upload" @click="uploadAvatar">
              <el-icon><Camera /></el-icon>
            </div>
          </div>
          <div class="user-info">
            <h2 class="user-name">{{ userInfo.username }}</h2>
            <p class="user-email">{{ userInfo.email || t('user.noEmail') }}</p>
            <div class="user-badges">
              <el-tag :type="userInfo.role === 'admin' ? 'danger' : 'primary'" size="small">
                {{ userInfo.role === 'admin' ? t('user.admin') : t('user.user') }}
              </el-tag>
              <el-tag v-if="userInfo.isActive" type="success" size="small">
                {{ $t('user.active') }}
              </el-tag>
            </div>
          </div>
        </div>
        <div class="stats-section">
          <div class="stat-item">
            <div class="stat-value">{{ userStats.totalPractices || 0 }}</div>
            <div class="stat-label">{{ $t('stats.practiceCount') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ formatScore(userStats.averageScore) }}%</div>
            <div class="stat-label">{{ $t('stats.averageScore') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ userStats.bookmarkCount || 0 }}</div>
            <div class="stat-label">{{ $t('stats.bookmarkedQuestions') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 个人信息编辑 -->
    <div class="profile-sections">
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><User /></el-icon>
            {{ $t('profile.basicInfo') }}
          </h3>
          <p class="section-description">{{ $t('profile.basicInfoDescription') }}</p>
        </div>
        <div class="section-content">
          <el-form
              ref="profileForm"
              :model="profileFormData"
              :rules="profileRules"
              label-width="100px"
          >
            <el-form-item :label="$t('auth.username')" prop="username">
              <el-input
                  v-model="profileFormData.username"
                  :disabled="!isEditing"
                  :placeholder="t('common.pleaseEnter')"
              />
            </el-form-item>

            <el-form-item :label="$t('auth.email')" prop="email">
              <el-input
                  v-model="profileFormData.email"
                  :disabled="!isEditing"
                  type="email"
                  :placeholder="t('common.pleaseEnter')"
              />
            </el-form-item>

            <el-form-item :label="$t('profile.languagePreference')" prop="languagePreference">
              <el-select
                  v-model="profileFormData.languagePreference"
                  :disabled="!isEditing"
                  :placeholder="$t('common.pleaseSelect')"
                  style="width: 100%"
              >
                <el-option label="中文" value="zh" />
                <el-option label="English" value="en" />
                <el-option label="ไทย" value="th" />
              </el-select>
            </el-form-item>

            <el-form-item :label="$t('profile.avatar')" prop="avatarUrl">
              <el-input
                  v-model="profileFormData.avatarUrl"
                  :disabled="!isEditing"
                  :placeholder="t('common.pleaseEnter')"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 密码修改 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><Lock /></el-icon>
            {{ $t('profile.passwordSecurity') }}
          </h3>
          <p class="section-description">{{ $t('profile.passwordSecurityDescription') }}</p>
        </div>
        <div class="section-content">
          <el-button @click="showPasswordDialog = true">
            <el-icon><Key /></el-icon>
            {{ $t('profile.changePassword') }}
          </el-button>
        </div>
      </div>

      <!-- 账户信息 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><InfoFilled /></el-icon>
            {{ $t('profile.accountInfo') }}
          </h3>
          <p class="section-description">{{ $t('profile.accountInfoDescription') }}</p>
        </div>
        <div class="section-content">
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $t('profile.userId') }}</label>
              <span>{{ userInfo.id }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('profile.accountType') }}</label>
              <span>{{ userInfo.role === 'admin' ? $t('user.adminAccount') : $t('user.regularUser') }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('profile.registeredAt') }}</label>
              <span>{{ formatDate(userInfo.createdAt) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('profile.lastLogin') }}</label>
              <span>{{ formatDate(userInfo.lastLoginAt) || t('user.neverLoggedIn') }}</span>
            </div>
            <div class="info-item">
              <label>{{ $t('profile.accountStatus') }}</label>
              <el-tag :type="userInfo.isActive ? 'success' : 'danger'" size="small">
                {{ userInfo.isActive ? $t('common.normal') : $t('user.disabled') }}
              </el-tag>
            </div>
            <div class="info-item">
              <label>{{ $t('profile.updatedAt') }}</label>
              <span>{{ formatDate(userInfo.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据管理 -->
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">
            <el-icon><DataAnalysis /></el-icon>
            {{ $t('profile.dataManagement') }}
          </h3>
          <p class="section-description">{{ $t('profile.dataManagementDescription') }}</p>
        </div>
        <div class="section-content">
          <div class="data-actions">
            <el-button @click="exportData">
              <el-icon><Download /></el-icon>
              {{ $t('common.exportData') }}
            </el-button>
            <el-button type="danger" @click="showDeleteDialog = true">
              <el-icon><Delete /></el-icon>
              {{ $t('profile.deleteAccount') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <el-dialog
        v-model="showPasswordDialog"
        :title="$t('profile.changePassword')"
        width="500px"
        :before-close="handleClosePasswordDialog"
    >
      <el-form
          ref="passwordForm"
          :model="passwordFormData"
          :rules="passwordRules"
          label-width="100px"
      >
        <el-form-item :label="$t('profile.currentPassword')" prop="currentPassword">
          <el-input
              v-model="passwordFormData.currentPassword"
              type="password"
              :placeholder="$t('common.pleaseEnter')"
              show-password
          />
        </el-form-item>

        <el-form-item :label="$t('profile.newPassword')" prop="newPassword">
          <el-input
              v-model="passwordFormData.newPassword"
              type="password"
              :placeholder="$t('common.pleaseEnter')"
              show-password
          />
        </el-form-item>

        <el-form-item :label="$t('profile.confirmPassword')" prop="confirmPassword">
          <el-input
              v-model="passwordFormData.confirmPassword"
              type="password"
              :placeholder="$t('profile.enterConfirmPassword')"
              show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showPasswordDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="changePassword" :loading="changingPassword">
          {{ $t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除账户确认对话框 -->
    <el-dialog
        v-model="showDeleteDialog"
        :title="$t('profile.deleteAccount')"
        width="500px"
        :before-close="handleCloseDeleteDialog"
    >
      <div class="delete-warning">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="warning-content">
          <h4>{{ $t('profile.confirmDeleteAccount') }}</h4>
          <p>{{ $t('profile.deleteAccountWarning') }}</p>
          <ul>
            <li>{{ $t('profile.deleteProfileInfo') }}</li>
            <li>{{ $t('profile.deletePracticeRecords') }}</li>
            <li>{{ $t('profile.deleteBookmarkedQuestions') }}</li>
            <li>{{ $t('profile.deleteAccidentRecords') }}</li>
          </ul>
          <p><strong>{{ $t('profile.deleteIrreversible') }}</strong></p>
        </div>
      </div>

      <el-form :model="deleteFormData" label-width="100px">
        <el-form-item :label="$t('profile.confirmPassword')">
          <el-input
              v-model="deleteFormData.password"
              type="password"
              :placeholder="$t('common.pleaseEnter')"
              show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDeleteDialog = false">{{ $t('common.cancel') }}</el-button>
        <el-button type="danger" @click="deleteAccount" :loading="deleting">
          {{ $t('common.confirmDelete') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 头像上传 -->
    <input
        ref="avatarInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="handleAvatarUpload"
    />
  </div>
</template>

<script>
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import {
  User,
  Edit,
  Close,
  Check,
  Camera,
  Lock,
  Key,
  InfoFilled,
  DataAnalysis,
  Download,
  Delete,
  WarningFilled
} from '@element-plus/icons-vue'

export default {
  name: 'Profile',
  components: {
    User,
    Edit,
    Close,
    Check,
    Camera,
    Lock,
    Key,
    InfoFilled,
    DataAnalysis,
    Download,
    Delete,
    WarningFilled
  },
  setup() {
    const { t } = useI18n()
    const store = useStore()
    const router = useRouter()

    const isEditing = ref(false)
    const saving = ref(false)
    const changingPassword = ref(false)
    const deleting = ref(false)
    const showPasswordDialog = ref(false)
    const showDeleteDialog = ref(false)

    const profileForm = ref(null)
    const passwordForm = ref(null)
    const avatarInput = ref(null)

    const userInfo = ref({})
    const userStats = ref({})

    const profileFormData = reactive({
      username: '',
      email: '',
      languagePreference: 'zh',
      avatarUrl: ''
    })

    const passwordFormData = reactive({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })

    const deleteFormData = reactive({
      password: ''
    })

    const profileRules = {
      username: [
        { required: true, message: t('validation.pleaseEnter'), trigger: 'blur' },
        { min: 3, max: 50, message: t('validation.usernameLength'), trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat'), trigger: 'blur' }
      ],
      email: [
        { type: 'email', message: t('validation.email'), trigger: 'blur' }
      ],
      languagePreference: [
        { required: true, message: t('validation.pleaseSelect'), trigger: 'change' }
      ]
    }

    const passwordRules = {
      currentPassword: [
        { required: true, message: t('validation.currentPasswordRequired'), trigger: 'blur' }
      ],
      newPassword: [
        { required: true, message: t('validation.newPasswordRequired'), trigger: 'blur' },
        { min: 6, message: t('validation.passwordMinLength'), trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, message: t('validation.confirmPasswordRequired'), trigger: 'blur' },
        {
          validator: (_, value, callback) => {
            if (value !== passwordFormData.newPassword) {
              callback(new Error(t('validation.passwordMismatch')))
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ]
    }

    // 获取用户信息
    const fetchUserProfile = async () => {
      try {
        const response = await api.auth.getProfile()
        userInfo.value = response.data

        // 填充表单数据
        Object.assign(profileFormData, {
          username: response.data.username,
          email: response.data.email || '',
          languagePreference: response.data.languagePreference || 'zh',
          avatarUrl: response.data.avatarUrl || ''
        })

        // 获取用户统计数据
        if (response.data.practiceStats) {
          userStats.value = response.data.practiceStats
        }
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

    // 开始编辑
    const startEdit = () => {
      isEditing.value = true
    }

    // 取消编辑
    const cancelEdit = () => {
      isEditing.value = false
      // 重置表单数据
      Object.assign(profileFormData, {
        username: userInfo.value.username,
        email: userInfo.value.email || '',
        languagePreference: userInfo.value.languagePreference || 'zh',
        avatarUrl: userInfo.value.avatarUrl || ''
      })
    }

    // 保存资料
    const saveProfile = async () => {
      if (!profileForm.value) return

      try {
        const valid = await profileForm.value.validate()
        if (!valid) return

        saving.value = true

        const updateData = {
          email: profileFormData.email || null,
          languagePreference: profileFormData.languagePreference,
          avatarUrl: profileFormData.avatarUrl || null
        }

        await api.auth.updateProfile(updateData)

        // 更新本地用户信息
        Object.assign(userInfo.value, {
          email: profileFormData.email,
          languagePreference: profileFormData.languagePreference,
          avatarUrl: profileFormData.avatarUrl
        })

        // 更新 Vuex store
        store.commit('auth/updateUser', userInfo.value)

        ElMessage.success(t('messages.success'))
        isEditing.value = false
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        saving.value = false
      }
    }

    // 修改密码
    const changePassword = async () => {
      if (!passwordForm.value) return

      try {
        const valid = await passwordForm.value.validate()
        if (!valid) return

        changingPassword.value = true

        await api.auth.changePassword({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword
        })

        ElMessage.success(t('messages.success'))
        showPasswordDialog.value = false

        // 重置表单
        Object.assign(passwordFormData, {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        changingPassword.value = false
      }
    }

    // 上传头像
    const uploadAvatar = () => {
      avatarInput.value?.click()
    }

    const handleAvatarUpload = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        ElMessage.error(t('messages.error'))
        return
      }

      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.error(t('messages.error'))
        return
      }

      try {
        const formData = new FormData()
        formData.append('image', file)

        const response = await api.upload.image(formData)
        profileFormData.avatarUrl = response.data.url
        ElMessage.success(t('messages.success'))
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      }
    }

    // 导出数据
    const exportData = async () => {
      try {
        ElMessage.info(t('messages.info'))
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      }
    }

    // 删除账户
    const deleteAccount = async () => {
      if (!deleteFormData.password) {
        ElMessage.warning(t('messages.warning'))
        return
      }

      try {
        await ElMessageBox.confirm(
            t('profile.confirmDeleteAccount'),
            t('common.finalConfirm'),
            {
              confirmButtonText: t('common.confirmDelete'),
              cancelButtonText: t('common.cancel'),
              type: 'error'
            }
        )

        deleting.value = true

        await api.auth.deleteAccount({
          password: deleteFormData.password
        })

        ElMessage.success(t('messages.success'))

        // 清除本地数据并跳转到登录页
        store.dispatch('auth/logout')
        router.push('/login')
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('messages.error'))
        }
      } finally {
        deleting.value = false
      }
    }

    // 关闭对话框
    const handleClosePasswordDialog = () => {
      showPasswordDialog.value = false
      Object.assign(passwordFormData, {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }

    const handleCloseDeleteDialog = () => {
      showDeleteDialog.value = false
      deleteFormData.password = ''
    }

    onMounted(() => {
      fetchUserProfile()
    })

    return {
      t,
      isEditing,
      saving,
      changingPassword,
      deleting,
      showPasswordDialog,
      showDeleteDialog,
      profileForm,
      passwordForm,
      avatarInput,
      userInfo,
      userStats,
      profileFormData,
      passwordFormData,
      deleteFormData,
      profileRules,
      passwordRules,
      formatDate,
      formatScore,
      startEdit,
      cancelEdit,
      saveProfile,
      changePassword,
      uploadAvatar,
      handleAvatarUpload,
      exportData,
      deleteAccount,
      handleClosePasswordDialog,
      handleCloseDeleteDialog
    }
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
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

.header-actions {
  .edit-actions {
    display: flex;
    gap: 12px;
  }
}

.profile-overview {
  margin-bottom: 24px;
}

.overview-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-container {
  position: relative;
  width: 80px;
  height: 80px;
}

.avatar-container img,
.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  background: var(--el-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
}

.avatar-upload {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background: var(--el-color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  border: 2px solid white;
  transition: all 0.3s;

  &:hover {
    background: var(--el-color-primary-dark-2);
  }
}

.user-info {
  .user-name {
    font-size: 24px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .user-email {
    font-size: 16px;
    color: var(--el-text-color-regular);
    margin-bottom: 12px;
  }

  .user-badges {
    display: flex;
    gap: 8px;
  }
}

.stats-section {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-color-primary);
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

.profile-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-header {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .section-title {
    font-size: 18px;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
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

.data-actions {
  display: flex;
  gap: 12px;
}

.delete-warning {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  .warning-icon {
    font-size: 48px;
    color: var(--el-color-warning);
    flex-shrink: 0;
  }

  .warning-content {
    flex: 1;

    h4 {
      color: var(--el-text-color-primary);
      margin-bottom: 12px;
    }

    p {
      color: var(--el-text-color-regular);
      margin-bottom: 8px;
      line-height: 1.5;
    }

    ul {
      margin: 12px 0;
      padding-left: 20px;

      li {
        color: var(--el-text-color-regular);
        margin-bottom: 4px;
      }
    }

    strong {
      color: var(--el-color-danger);
    }
  }
}

@media (max-width: 768px) {

  .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .overview-card {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .avatar-section {
    flex-direction: column;
    gap: 16px;
  }

  .stats-section {
    justify-content: center;
    gap: 24px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .data-actions {
    flex-direction: column;
  }

  .delete-warning {
    flex-direction: column;
    text-align: center;
  }
}
</style>
```