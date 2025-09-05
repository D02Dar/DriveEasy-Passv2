<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h2>{{ t('auth.registerTitle') }}</h2>
          <p>{{ t('auth.startJourney') }}</p>
        </div>

        <el-form
            ref="registerForm"
            :model="form"
            :rules="rules"
            class="register-form"
            @submit.prevent="handleSubmit"
        >
          <el-form-item prop="username">
            <el-input
                v-model="form.username"
                :placeholder="t('auth.enterUsername')"
                size="large"
                :prefix-icon="User"
                clearable
            />
          </el-form-item>

          <el-form-item prop="email">
            <el-input
                v-model="form.email"
                type="email"
                :placeholder="t('auth.enterEmail')"
                size="large"
                :prefix-icon="Message"
                clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
                v-model="form.password"
                type="password"
                :placeholder="t('auth.enterPassword')"
                size="large"
                :prefix-icon="Lock"
                show-password
                clearable
            />
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
                v-model="form.confirmPassword"
                type="password"
                :placeholder="t('auth.confirmPassword')"
                size="large"
                :prefix-icon="Lock"
                show-password
                clearable
                @keyup.enter="handleSubmit"
            />
          </el-form-item>

          <el-form-item>
            <div class="form-options">
              <el-checkbox v-model="form.agreeTerms">
                {{ t('auth.agreeTo') }}
                <el-link type="primary" @click="showTerms">
                  {{ t('auth.termsOfService') }}
                </el-link>
                {{ t('auth.and') }}
                <el-link type="primary" @click="showPrivacy">
                  {{ t('auth.privacyPolicy') }}
                </el-link>
              </el-checkbox>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
                type="primary"
                size="large"
                class="register-button"
                :loading="loading"
                @click="handleSubmit"
            >
              {{ loading ? t('auth.registering') : t('auth.registerNow') }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="register-footer">
          <p>
            {{ t('auth.hasAccount') }}
            <router-link to="/login" class="login-link">
              {{ t('auth.login') }}
            </router-link>
          </p>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import { reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { User, Lock, Message } from '@element-plus/icons-vue'

export default {
  name: 'Register',
  components: {
    User,
    Lock,
    Message
  },
  setup() {
    const store = useStore()
    const router = useRouter()
    const { t } = useI18n()
    const registerForm = ref(null)
    const loading = ref(false)

    const form = reactive({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false
    })

    // 自定义验证规则
    const validateConfirmPassword = (rule, value, callback) => {
      if (value === '') {
        callback(new Error(t('validation.confirmPasswordRequired')))
      } else if (value !== form.password) {
        callback(new Error(t('validation.passwordMismatch')))
      } else {
        callback()
      }
    }

    const rules = {
      username: [
        { required: true, message: t('validation.pleaseEnter'), trigger: 'blur' },
        { min: 3, max: 50, message: t('validation.minLength', { min: 3 }) + ' - ' + t('validation.maxLength', { max: 50 }), trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: t('validation.usernameFormat'), trigger: 'blur' }
      ],
      email: [
        { required: true, message: t('validation.pleaseEnter'), trigger: 'blur' },
        { type: 'email', message: t('validation.invalidEmail'), trigger: 'blur' }
      ],
      password: [
        { required: true, message: t('validation.pleaseEnter'), trigger: 'blur' },
        { min: 6, message: t('validation.passwordMinLength'), trigger: 'blur' }
      ],
      confirmPassword: [
        { required: true, validator: validateConfirmPassword, trigger: 'blur' }
      ]
    }

    const handleSubmit = async () => {
      if (!registerForm.value) return

      try {
        const valid = await registerForm.value.validate()
        if (!valid) return

        if (!form.agreeTerms) {
          ElMessage.warning(t('auth.pleaseAgreeTerms'))
          return
        }

        loading.value = true

        const result = await store.dispatch('auth/register', {
          username: form.username,
          email: form.email,
          password: form.password
        })

        if (result.success) {
          ElMessage.success(t('auth.registerSuccess'))
          router.push('/dashboard')
        } else {
          ElMessage.error(t(`auth.${result.errorCode}`) || t('auth.registerFailed'))
        }
      } catch (error) {
        console.error('Registration failed:', error)
        ElMessage.error(t('auth.registerFailed'))
      } finally {
        loading.value = false
      }
    }

    const showTerms = () => {
      ElMessage.info(t('auth.termsOfService'))
    }

    const showPrivacy = () => {
      ElMessage.info(t('auth.privacyPolicy'))
    }

    return {
      t,
      registerForm,
      form,
      rules,
      loading,
      handleSubmit,
      showTerms,
      showPrivacy,
      User,
      Lock,
      Message
    }
  }
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-container {
  max-width: 450px;
  width: 100%;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.register-card {
  padding: 40px 30px;
}

.register-header {
  text-align: center;
  margin-bottom: 40px;

  h2 {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    margin-bottom: 10px;
  }

  p {
    color: var(--el-text-color-regular);
    font-size: 16px;
  }
}

.register-form {
  .el-form-item {
    margin-bottom: 24px;
  }

  .el-input {
    --el-input-height: 48px;
  }
}

.form-options {
  width: 100%;

  .el-checkbox {
    line-height: 1.6;
  }
}

.register-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.register-footer {
  text-align: center;
  margin-top: 30px;

  p {
    color: var(--el-text-color-regular);
  }

  .login-link {
    color: var(--el-color-primary);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}

.register-illustration {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: white;

  img {
    width: 200px;
    height: auto;
    margin-bottom: 30px;
    opacity: 0.9;
  }

  h3 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 15px;
  }

  p {
    font-size: 16px;
    opacity: 0.9;
    line-height: 1.6;
    margin-bottom: 30px;
  }
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: flex-start;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;

  .feature-icon {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    padding: 4px;
    font-size: 12px;
  }
}

.terms-content,
.privacy-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;

  h4 {
    color: var(--el-text-color-primary);
    margin: 20px 0 10px 0;
    font-size: 16px;
    font-weight: 600;

    &:first-child {
      margin-top: 0;
    }
  }

  p {
    color: var(--el-text-color-regular);
    line-height: 1.6;
    margin-bottom: 15px;
  }
}

@media (max-width: 480px) {
  .register-card {
    padding: 30px 20px;
  }
}
</style>