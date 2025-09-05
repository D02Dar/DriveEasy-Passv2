<template>
  <div class="step-responsibility">
    <div class="step-header">
      <h2>{{ $t('accident.steps.responsibility') }}</h2>
      <p class="step-description">{{ $t('accident.steps.responsibilityDesc') }}</p>
    </div>

    <div class="responsibility-content">
      <!-- 事故基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Calendar /></el-icon>
            <span>{{ $t('accident.basicInfo') }}</span>
          </div>
        </template>
        
        <el-form
          ref="basicForm"
          :model="localFormData"
          :rules="basicRules"
          :label-width="isMobile ? '100px' : '120px'"
          class="basic-form"
        >
          <el-form-item :label="$t('accident.accidentTime')" prop="accidentTime">
            <el-date-picker
              v-model="localFormData.accidentTime"
              type="datetime"
              :placeholder="$t('accident.selectAccidentTime')"
              style="width: 100%"
              @change="updateFormData"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 当事人A信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>{{ $t('accident.partyAInfo') }}</span>
          </div>
        </template>
        
        <el-form
          ref="partyAForm"
          :model="localFormData.partyA"
          :rules="partyRules"
          :label-width="isMobile ? '100px' : '120px'"
          class="party-form"
        >
          <el-row :gutter="isMobile ? 10 : 20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.driverName')" prop="name">
                <el-input
                  v-model="localFormData.partyA.name"
                  :placeholder="$t('accident.enterDriverName')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.phoneNumber')" prop="phone">
                <el-input
                  v-model="localFormData.partyA.phone"
                  :placeholder="$t('accident.enterPhoneNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="isMobile ? 10 : 20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.vehicleNumber')" prop="vehicleNumber">
                <el-input
                  v-model="localFormData.partyA.vehicleNumber"
                  :placeholder="$t('accident.enterVehicleNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.licenseNumber')" prop="licenseNumber">
                <el-input
                  v-model="localFormData.partyA.licenseNumber"
                  :placeholder="$t('accident.enterLicenseNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="$t('accident.insuranceCompany')" prop="insuranceCompany">
            <el-input
              v-model="localFormData.partyA.insuranceCompany"
              :placeholder="$t('accident.enterInsuranceCompany')"
              @input="updateFormData"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 当事人B信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><User /></el-icon>
            <span>{{ $t('accident.partyBInfo') }}</span>
          </div>
        </template>
        
        <el-form
          ref="partyBForm"
          :model="localFormData.partyB"
          :rules="partyRules"
          :label-width="isMobile ? '100px' : '120px'"
          class="party-form"
        >
          <el-row :gutter="isMobile ? 10 : 20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.driverName')" prop="name">
                <el-input
                  v-model="localFormData.partyB.name"
                  :placeholder="$t('accident.enterDriverName')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.phoneNumber')" prop="phone">
                <el-input
                  v-model="localFormData.partyB.phone"
                  :placeholder="$t('accident.enterPhoneNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="isMobile ? 10 : 20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.vehicleNumber')" prop="vehicleNumber">
                <el-input
                  v-model="localFormData.partyB.vehicleNumber"
                  :placeholder="$t('accident.enterVehicleNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item :label="$t('accident.licenseNumber')" prop="licenseNumber">
                <el-input
                  v-model="localFormData.partyB.licenseNumber"
                  :placeholder="$t('accident.enterLicenseNumber')"
                  @input="updateFormData"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="$t('accident.insuranceCompany')" prop="insuranceCompany">
            <el-input
              v-model="localFormData.partyB.insuranceCompany"
              :placeholder="$t('accident.enterInsuranceCompany')"
              @input="updateFormData"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 责任认定 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Operation /></el-icon>
            <span>{{ $t('accident.responsibilityDetermination') }}</span>
          </div>
        </template>

        <el-form
          ref="responsibilityForm"
          :model="localFormData"
          :label-width="isMobile ? '100px' : '120px'"
          class="responsibility-form"
        >
          <el-form-item :label="$t('accident.responsibility')" prop="responsibility">
            <el-select
              v-model="localFormData.responsibility"
              :placeholder="$t('accident.selectResponsibility')"
              style="width: 100%"
              @change="updateFormData"
            >
              <el-option value="partyA_full" :label="$t('accident.partyAFullResponsibility')" />
              <el-option value="partyB_full" :label="$t('accident.partyBFullResponsibility')" />
              <el-option value="equal" :label="$t('accident.equalResponsibility')" />
              <el-option value="partyA_main" :label="$t('accident.partyAMainResponsibility')" />
              <el-option value="partyB_main" :label="$t('accident.partyBMainResponsibility')" />
              <el-option value="no_responsibility" :label="$t('accident.noResponsibility')" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useResponsive } from '@/composables/useResponsive'
import { Calendar, User, Operation } from '@element-plus/icons-vue'

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
const { isMobile } = useResponsive()

// 本地表单数据
const localFormData = reactive({
  accidentTime: null,
  partyA: {
    name: '',
    phone: '',
    licenseNumber: '',
    vehicleNumber: '',
    insuranceCompany: ''
  },
  partyB: {
    name: '',
    phone: '',
    licenseNumber: '',
    vehicleNumber: '',
    insuranceCompany: ''
  },
  responsibility: ''
})

// 保险公司选项
const insuranceCompanies = ref([
  { label: t('accident.insuranceCompanies.picc'), value: 'picc' },
  { label: t('accident.insuranceCompanies.pingan'), value: 'pingan' },
  { label: t('accident.insuranceCompanies.cpic'), value: 'cpic' },
  { label: t('accident.insuranceCompanies.chinalife'), value: 'chinalife' },
  { label: t('accident.insuranceCompanies.pacific'), value: 'pacific' },
  { label: t('accident.insuranceCompanies.newchina'), value: 'newchina' },
  { label: t('accident.insuranceCompanies.sunshine'), value: 'sunshine' },
  { label: t('accident.insuranceCompanies.other'), value: 'other' }
])

// 表单验证规则
const basicRules = {
  accidentTime: [
    { required: true, message: t('accident.pleaseSelectAccidentTime'), trigger: 'change' }
  ]
}

const partyRules = {
  name: [
    { required: true, message: t('accident.pleaseEnterDriverName'), trigger: 'blur' }
  ],
  phone: [
    { required: true, message: t('accident.pleaseEnterPhoneNumber'), trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: t('accident.invalidPhoneNumber'), trigger: 'blur' }
  ],
  vehicleNumber: [
    { required: true, message: t('accident.pleaseEnterVehicleNumber'), trigger: 'blur' }
  ]
}

// 监听props变化
watch(() => props.formData, (newData) => {
  Object.assign(localFormData, newData)
}, { immediate: true, deep: true })

// 更新表单数据
const updateFormData = () => {
  emit('update:form-data', { ...localFormData })
}

// 验证表单
const validateForm = async () => {
  // 这里可以添加表单验证逻辑
  return true
}

// 暴露验证方法给父组件
defineExpose({
  validateForm
})
</script>

<style scoped>
.step-responsibility {
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

.responsibility-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-card {
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

.basic-form,
.party-form,
.responsibility-form {
  padding: 0;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .responsibility-content {
    gap: 16px;
  }

  .step-header h2 {
    font-size: 20px;
  }

  .card-header {
    font-size: 14px;
  }

  :deep(.el-col) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-form-item__label) {
    font-size: 14px;
  }

  :deep(.el-input__inner) {
    font-size: 14px;
  }

  :deep(.el-select .el-input__inner) {
    font-size: 14px;
  }
}
</style>
