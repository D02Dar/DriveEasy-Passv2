<template>
  <div class="not-found">
    <div class="container">
      <div class="error-content">
        <div class="error-icon">
          <el-icon size="120"><Warning /></el-icon>
        </div>
        <h1 class="error-title">404</h1>
        <h2 class="error-subtitle">{{ $t("error.pageNotFound") }}</h2>
        <p class="error-description">
          {{ $t("error.pageNotFoundDesc") }}
        </p>
        <div class="error-actions">
          <el-button type="primary" size="large" @click="goHome">
            {{ $t("common.backToHome") }}
          </el-button>
          <el-button size="large" @click="goBack">
            {{ $t("common.goBack") }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { Warning } from '@element-plus/icons-vue'

export default {
  name: 'NotFound',
  components: {
    Warning
  },
  methods: {
    goHome() {
      this.$router.push('/')
    },
    
    goBack() {
      this.$router.go(-1)
    }
  }
}
</script>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #374151;
}

.container {
  max-width: 600px;
  padding: 0 20px;
}

.error-content {
  text-align: center;
}

.error-icon {
  margin-bottom: 30px;
  opacity: 0.8;
}

.error-title {
  font-size: 120px;
  font-weight: 700;
  margin: 0 0 20px 0;
  line-height: 1;
}

.error-subtitle {
  font-size: 36px;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.error-description {
  font-size: 18px;
  margin-bottom: 40px;
  opacity: 0.9;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .error-title {
    font-size: 80px;
  }
  
  .error-subtitle {
    font-size: 28px;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
