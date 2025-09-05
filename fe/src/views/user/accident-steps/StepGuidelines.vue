<template>
  <div class="step-guidelines">
    <div class="step-header">
      <h2>{{ $t('accident.steps.guidelines') }}</h2>
      <p class="step-description">{{ $t('accident.steps.guidelinesDesc') }}</p>
    </div>

    <div class="guidelines-content">
      <!-- 事故快处须知 -->
      <el-card class="guidelines-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>{{ $t('accident.quickProcessingGuidelines') }}</span>
          </div>
        </template>
        
        <div class="guidelines-text">
          <div class="guideline-section">
            <h4>{{ $t('accident.processingConditions') }}</h4>
            <p>{{ $t('accident.processingConditionsText') }}</p>
            <ul>
              <li>{{ $t('accident.condition1') }}</li>
              <li>{{ $t('accident.condition2') }}</li>
              <li>{{ $t('accident.condition3') }}</li>
              <li>{{ $t('accident.condition4') }}</li>
            </ul>
          </div>

          <div class="guideline-section">
            <h4>{{ $t('accident.processingSteps') }}</h4>
            <ol>
              <li>{{ $t('accident.step1') }}</li>
              <li>{{ $t('accident.step2') }}</li>
              <li>{{ $t('accident.step3') }}</li>
              <li>{{ $t('accident.step4') }}</li>
              <li>{{ $t('accident.step5') }}</li>
            </ol>
          </div>

          <div class="guideline-section">
            <h4>{{ $t('accident.importantNotes') }}</h4>
            <div class="note-item">
              <el-icon class="note-icon"><Warning /></el-icon>
              <span>{{ $t('accident.note1') }}</span>
            </div>
            <div class="note-item">
              <el-icon class="note-icon"><Warning /></el-icon>
              <span>{{ $t('accident.note2') }}</span>
            </div>
            <div class="note-item">
              <el-icon class="note-icon"><Warning /></el-icon>
              <span>{{ $t('accident.note3') }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 处理流程图 -->
      <el-card class="flowchart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Connection /></el-icon>
            <span>{{ $t('accident.processingFlowchart') }}</span>
          </div>
        </template>
        
        <div class="flowchart-content">
          <div class="flow-steps">
            <div 
              v-for="(step, index) in flowSteps" 
              :key="index"
              class="flow-step"
              :class="{ 'completed': step.completed }"
            >
              <div class="step-number">{{ index + 1 }}</div>
              <div class="step-content">
                <div class="step-title">{{ step.title }}</div>
                <div class="step-desc">{{ step.description }}</div>
              </div>
              <div v-if="index < flowSteps.length - 1" class="step-arrow">
                <el-icon><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Document,
  Connection,
  Warning,
  ArrowRight
} from '@element-plus/icons-vue'

const props = defineProps({
  formData: {
    type: Object,
    required: true
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:form-data', 'next', 'prev'])

const { t } = useI18n()

// 处理流程步骤
const flowSteps = ref([
  {
    title: t('accident.flowSteps.ensureSafety.title'),
    description: t('accident.flowSteps.ensureSafety.description'),
    completed: false
  },
  {
    title: t('accident.flowSteps.checkInjuries.title'),
    description: t('accident.flowSteps.checkInjuries.description'),
    completed: false
  },
  {
    title: t('accident.flowSteps.takePhotos.title'),
    description: t('accident.flowSteps.takePhotos.description'),
    completed: false
  },
  {
    title: t('accident.flowSteps.evacuateScene.title'),
    description: t('accident.flowSteps.evacuateScene.description'),
    completed: false
  },
  {
    title: t('accident.flowSteps.negotiate.title'),
    description: t('accident.flowSteps.negotiate.description'),
    completed: false
  },
  {
    title: t('accident.flowSteps.insuranceClaim.title'),
    description: t('accident.flowSteps.insuranceClaim.description'),
    completed: false
  }
])
</script>

<style scoped>
.step-guidelines {
  max-width: 100%;
}

.step-header {
  margin-bottom: 24px;
  text-align: center;
}

.step-header h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px 0;
}

.step-description {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.guidelines-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.guidelines-card,
.flowchart-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.guidelines-text {
  line-height: 1.6;
}

.guideline-section {
  margin-bottom: 24px;
}

.guideline-section h4 {
  color: #409eff;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.guideline-section ul,
.guideline-section ol {
  padding-left: 20px;
  margin: 12px 0;
}

.guideline-section li {
  margin-bottom: 8px;
  color: #606266;
}

.note-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fff7e6;
  border-left: 4px solid #e6a23c;
  border-radius: 4px;
}

.note-icon {
  color: #e6a23c;
  margin-top: 2px;
}

.flow-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 0;
}

.flow-step {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  position: relative;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.flow-step.completed .step-number {
  background: #67c23a;
  color: white;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.step-desc {
  font-size: 12px;
  color: #909399;
}

.step-arrow {
  margin-left: 12px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .flow-steps {
    flex-direction: column;
  }

  .flow-step {
    min-width: auto;
  }

  .step-arrow {
    display: none;
  }
}
</style>
