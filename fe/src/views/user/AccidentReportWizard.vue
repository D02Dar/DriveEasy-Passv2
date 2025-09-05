<template>
  <div class="accident-report-wizard">
    <!-- 头部导航 -->
    <div class="wizard-header">
      <div class="header-content">
        <el-button 
          type="text" 
          @click="handleBack"
          class="back-button"
        >
          <el-icon><ArrowLeft /></el-icon>
          {{ $t('common.back') }}
        </el-button>
        <h1 class="wizard-title">{{ $t('accident.accidentReport') }}</h1>
      </div>
    </div>

    <!-- 步骤指示器 -->
    <div class="steps-container">
      <el-steps 
        :active="currentStep" 
        :space="isMobile ? 80 : 200"
        :direction="isMobile ? 'vertical' : 'horizontal'"
        finish-status="success"
        class="wizard-steps"
      >
        <el-step 
          v-for="(step, index) in steps" 
          :key="index"
          :title="step.title"
          :description="isMobile ? '' : step.description"
        />
      </el-steps>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <transition name="slide-fade" mode="out-in">
        <component
          :is="currentStepComponent"
          :form-data="formData"
          :is-editing="isEditing"
          @update:form-data="updateFormData"
          @next="nextStep"
          @prev="prevStep"
          @save-draft="saveDraft"
          @submit="submitReport"
          @auto-save="autoSaveDraft"
        />
      </transition>
    </div>

    <!-- 底部操作栏 -->
    <div class="wizard-footer">
      <div class="footer-content">
        <el-button 
          v-if="currentStep > 0"
          @click="prevStep"
          :disabled="loading"
        >
          {{ $t('common.previous') }}
        </el-button>
        
        <div class="footer-actions">
          <el-button 
            @click="saveDraft"
            :loading="saving"
            :disabled="loading"
          >
            {{ $t('accident.saveDraft') }}
          </el-button>
          
          <el-button
            v-if="currentStep < 4"
            type="primary"
            @click="nextStep"
            :disabled="!canProceedToNext"
            :loading="loading"
          >
            {{ $t('common.next') }}
          </el-button>

          <el-button
            v-else-if="currentStep === 4"
            type="primary"
            @click="submitReport"
            :loading="submitting"
            :disabled="!canSubmit"
          >
            {{ $t('accident.submitReport') }}
          </el-button>

          <el-button
            v-else-if="currentStep === 5"
            type="primary"
            @click="$router.push('/accident-report')"
          >
            {{ $t('common.backToList') }}
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useResponsive } from '@/composables/useResponsive'
import api from '@/api'

// 导入步骤组件 - 暂时使用静态导入
import StepResponsibility from './accident-steps/StepResponsibility.vue'
import StepSignature from './accident-steps/StepSignature.vue'
import StepLocation from './accident-steps/StepLocation.vue'
import StepGuidelines from './accident-steps/StepGuidelines.vue'
import StepPhotos from './accident-steps/StepPhotos.vue'
import StepCompletion from './accident-steps/StepCompletion.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { isMobile } = useResponsive()

// 状态管理
const currentStep = ref(0)
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const isEditing = ref(false)
const reportId = ref(null)

// 步骤配置 - 使用computed确保语言切换时自动更新
const steps = computed(() => [
  {
    title: t('accident.steps.responsibility'),
    description: t('accident.steps.responsibilityDesc'),
    component: StepResponsibility,
    required: true
  },
  {
    title: t('accident.steps.signature'),
    description: t('accident.steps.signatureDesc'),
    component: StepSignature,
    required: true
  },
  {
    title: t('accident.steps.location'),
    description: t('accident.steps.locationDesc'),
    component: StepLocation,
    required: true
  },
  {
    title: t('accident.steps.guidelines'),
    description: t('accident.steps.guidelinesDesc'),
    component: StepGuidelines,
    required: false
  },
  {
    title: t('accident.steps.photos'),
    description: t('accident.steps.photosDesc'),
    component: StepPhotos,
    required: true
  },
  {
    title: t('accident.steps.completion'),
    description: t('accident.steps.completionDesc'),
    component: StepCompletion,
    required: false
  }
])

// 表单数据
const formData = ref({
  // 基本信息
  accidentTime: null,
  
  // 当事人信息
  partyA: {
    name: '',
    phone: '',
    idCard: '',
    licenseNumber: '',
    vehicleNumber: '',
    insuranceCompany: ''
  },
  partyB: {
    name: '',
    phone: '',
    idCard: '',
    licenseNumber: '',
    vehicleNumber: '',
    insuranceCompany: ''
  },
  
  // 责任认定
  responsibility: '',
  
  // 签名数据
  signatures: {
    partyA: '',
    partyB: ''
  },
  
  // 地理位置
  location: {
    latitude: null,
    longitude: null,
    address: ''
  },
  
  // 照片分类
  photos: {
    frontView: [],
    rearView: [],
    damageDetail: [],
    scenePanorama: [],
    driverLicense: [],
    vehicleLicense: []
  },
  
  // 状态
  status: 'draft'
})

// 计算属性
const currentStepComponent = computed(() => {
  const stepConfig = steps.value[currentStep.value]
  return stepConfig ? stepConfig.component : StepResponsibility
})

const canProceedToNext = computed(() => {
  // 根据当前步骤验证是否可以进入下一步
  const stepConfig = steps.value[currentStep.value]
  if (!stepConfig || !stepConfig.required) return true

  // 根据当前步骤验证必填字段
  switch (currentStep.value) {
    case 0: // 责任认定步骤
      return formData.value.accidentTime &&
             formData.value.partyA.name &&
             formData.value.partyA.phone &&
             formData.value.partyA.vehicleNumber &&
             formData.value.partyB.name &&
             formData.value.partyB.phone &&
             formData.value.partyB.vehicleNumber &&
             formData.value.responsibility
    case 1: // 签名步骤
      return formData.value.signatures.partyA &&
             formData.value.signatures.partyB
    case 2: // 位置步骤 - 位置信息变为可选
      return true // 位置信息不再是必需的
    case 4: // 照片步骤
      return formData.value.photos.frontView.length > 0 ||
             formData.value.photos.rearView.length > 0 ||
             formData.value.photos.damageDetail.length > 0 ||
             formData.value.photos.scenePanorama.length > 0
    default:
      return true
  }
})

const canSubmit = computed(() => {
  // 验证是否可以提交报告 - 位置信息不再是必需的
  return formData.value.accidentTime &&
         formData.value.partyA.name &&
         formData.value.partyB.name &&
         formData.value.signatures.partyA &&
         formData.value.signatures.partyB
})

// 方法
const handleBack = () => {
  router.push('/accident-report')
}

const updateFormData = (data) => {
  Object.assign(formData.value, data)
}

const nextStep = () => {
  if (currentStep.value < steps.value.length - 1) {
    currentStep.value++
    updateUrlStep()
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    updateUrlStep()
  }
}

// 更新URL中的step参数
const updateUrlStep = () => {
  const query = { ...route.query }
  if (currentStep.value > 0) {
    query.step = currentStep.value.toString()
  } else {
    delete query.step
  }

  // 使用replace避免在浏览器历史中创建新条目
  router.replace({
    path: route.path,
    query
  })
}

const saveDraft = async () => {
  try {
    saving.value = true

    // 确保照片数据格式正确
    const cleanedPhotos = {}
    if (formData.value.photos && typeof formData.value.photos === 'object') {
      if (Array.isArray(formData.value.photos)) {
        // 如果photos是数组，转换为对象格式
        formData.value.photos.forEach(photo => {
          const type = photo.photoType || 'frontView'
          if (!cleanedPhotos[type]) {
            cleanedPhotos[type] = []
          }
          cleanedPhotos[type].push({
            url: photo.imageUrl,
            caption: photo.caption
          })
        })
      } else {
        // 如果photos是对象，确保格式正确
        Object.keys(formData.value.photos).forEach(key => {
          if (Array.isArray(formData.value.photos[key])) {
            cleanedPhotos[key] = formData.value.photos[key].map(photo => ({
              url: photo.imageUrl || photo.url,
              caption: photo.caption
            }))
          }
        })
      }
    }

    const data = {
      ...formData.value,
      photos: cleanedPhotos,
      status: 'draft'
    }



    if (isEditing.value && reportId.value) {
      await api.accidents.update(reportId.value, data)
      ElMessage.success(t('accident.draftSaved'))
    } else {
      const response = await api.accidents.create(data)
      reportId.value = response.data.reportId
      isEditing.value = true
      ElMessage.success(t('accident.draftCreated'))
    }
  } catch (error) {
    console.error(t('accident.saveDraftFailed') + ':', error)

    ElMessage.error(t('accident.saveDraftFailed'))
  } finally {
    saving.value = false
  }
}

// 自动保存草稿（静默保存，不显示成功消息）
const autoSaveDraft = async () => {
  try {
    // 确保照片数据格式正确
    const cleanedPhotos = {}
    if (formData.value.photos && typeof formData.value.photos === 'object') {
      if (Array.isArray(formData.value.photos)) {
        // 如果photos是数组，转换为对象格式
        formData.value.photos.forEach(photo => {
          const type = photo.photoType || 'frontView'
          if (!cleanedPhotos[type]) {
            cleanedPhotos[type] = []
          }
          cleanedPhotos[type].push({
            url: photo.imageUrl,
            caption: photo.caption
          })
        })
      } else {
        // 如果photos是对象，确保格式正确
        Object.keys(formData.value.photos).forEach(key => {
          if (Array.isArray(formData.value.photos[key])) {
            cleanedPhotos[key] = formData.value.photos[key].map(photo => ({
              url: photo.imageUrl || photo.url,
              caption: photo.caption
            }))
          }
        })
      }
    }

    const data = {
      ...formData.value,
      photos: cleanedPhotos,
      status: 'draft'
    }

    if (isEditing.value && reportId.value) {
      await api.accidents.update(reportId.value, data)
    } else {
      const response = await api.accidents.create(data)
      reportId.value = response.data.reportId
      isEditing.value = true
    }
  } catch (error) {
    console.error('Auto save draft failed:', error)
    // 自动保存失败不显示错误消息，避免打扰用户
  }
}

const submitReport = async () => {
  try {
    submitting.value = true

    // 确保照片数据格式正确
    const cleanedPhotos = {}
    if (formData.value.photos && typeof formData.value.photos === 'object') {
      if (Array.isArray(formData.value.photos)) {
        // 如果photos是数组，转换为对象格式
        formData.value.photos.forEach(photo => {
          const type = photo.photoType || 'frontView'
          if (!cleanedPhotos[type]) {
            cleanedPhotos[type] = []
          }
          cleanedPhotos[type].push({
            url: photo.imageUrl,
            caption: photo.caption
          })
        })
      } else {
        // 如果photos是对象，确保格式正确
        Object.keys(formData.value.photos).forEach(key => {
          if (Array.isArray(formData.value.photos[key])) {
            cleanedPhotos[key] = formData.value.photos[key].map(photo => ({
              url: photo.imageUrl || photo.url,
              caption: photo.caption
            }))
          }
        })
      }
    }

    const data = {
      ...formData.value,
      photos: cleanedPhotos,
      status: 'submitted'
    }

    if (isEditing.value && reportId.value) {
      await api.accidents.update(reportId.value, data)
    } else {
      const response = await api.accidents.create(data)
      reportId.value = response.data.reportId
    }

    ElMessage.success(t('accident.reportSubmitted'))
    // 跳转到完成步骤
    currentStep.value = 5
    updateUrlStep()
  } catch (error) {
    console.error(t('accident.submitFailed') + ':', error)

    ElMessage.error(t('accident.submitFailed'))
  } finally {
    submitting.value = false
  }
}

// 监听路由变化，同步步骤状态
watch(() => route.query.step, (newStep) => {
  if (newStep) {
    const stepFromUrl = parseInt(newStep)
    if (!isNaN(stepFromUrl) && stepFromUrl >= 0 && stepFromUrl < steps.value.length) {
      currentStep.value = stepFromUrl
    }
  } else {
    currentStep.value = 0
  }
})

// 初始化
onMounted(async () => {
  // 从URL参数读取当前步骤
  if (route.query.step) {
    const stepFromUrl = parseInt(route.query.step)
    if (!isNaN(stepFromUrl) && stepFromUrl >= 0 && stepFromUrl < steps.value.length) {
      currentStep.value = stepFromUrl
    }
  }

  // 如果是编辑模式，加载现有数据
  if (route.query.id) {
    try {
      loading.value = true
      isEditing.value = true
      reportId.value = parseInt(route.query.id)

      const response = await api.accidents.getById(reportId.value)
      const loadedData = response.data

      // 映射后端数据到前端格式
      const mappedData = {
        accidentTime: loadedData.accidentTime,
        responsibility: loadedData.responsibility,
        status: loadedData.status,

        // 当事人A信息映射
        partyA: {
          name: loadedData.partyAName || '',
          phone: loadedData.partyAPhone || '',
          idCard: loadedData.partyAIdCard || '',
          licenseNumber: loadedData.partyALicenseNumber || '',
          vehicleNumber: loadedData.partyAVehicleNumber || '',
          insuranceCompany: loadedData.partyAInsuranceCompany || ''
        },

        // 当事人B信息映射
        partyB: {
          name: loadedData.partyBName || '',
          phone: loadedData.partyBPhone || '',
          idCard: loadedData.partyBIdCard || '',
          licenseNumber: loadedData.partyBLicenseNumber || '',
          vehicleNumber: loadedData.partyBVehicleNumber || '',
          insuranceCompany: loadedData.partyBInsuranceCompany || ''
        },

        // 签名数据映射
        signatures: {
          partyA: loadedData.partyASignature || '',
          partyB: loadedData.partyBSignature || ''
        },

        // 位置信息映射
        location: {
          latitude: loadedData.latitude,
          longitude: loadedData.longitude,
          address: loadedData.detailedAddress || ''
        }
      }

      // 确保照片数据格式正确
      if (loadedData.photos) {
        if (Array.isArray(loadedData.photos)) {
          // 如果后端返回的是数组，转换为对象格式
          const photosObj = {
            frontView: [],
            rearView: [],
            damageDetail: [],
            scenePanorama: [],
            driverLicense: [],
            vehicleLicense: []
          }

          loadedData.photos.forEach(photo => {
            const type = photo.photoType || 'frontView'
            if (photosObj[type]) {
              photosObj[type].push(photo)
            }
          })

          mappedData.photos = photosObj
        } else if (typeof loadedData.photos === 'object') {
          mappedData.photos = loadedData.photos
        } else {
          // 如果不是对象也不是数组，重置为默认格式
          mappedData.photos = {
            frontView: [],
            rearView: [],
            damageDetail: [],
            scenePanorama: [],
            driverLicense: [],
            vehicleLicense: []
          }
        }
      } else {
        mappedData.photos = {
          frontView: [],
          rearView: [],
          damageDetail: [],
          scenePanorama: [],
          driverLicense: [],
          vehicleLicense: []
        }
      }


      Object.assign(formData.value, mappedData)
    } catch (error) {
      console.error('加载报告失败:', error)
      ElMessage.error(t('accident.loadReportFailed'))
      router.push('/accident-report')
    } finally {
      loading.value = false
    }
  }
})
</script>

<style scoped>
.accident-report-wizard {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.wizard-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  color: #409eff;
  font-size: 14px;
}

.wizard-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.steps-container {
  background: white;
  padding: 24px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.wizard-steps {
  max-width: 1200px;
  margin: 0 auto;
}

.step-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
}

.wizard-footer {
  background: white;
  border-top: 1px solid #e4e7ed;
  padding: 16px 0;
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

@media (max-width: 768px) {
  .header-content,
  .footer-content {
    padding: 0 16px;
  }
  
  .step-content {
    padding: 16px;
  }
  
  .wizard-title {
    font-size: 18px;
  }
  
  .footer-content {
    flex-direction: column;
    gap: 12px;
  }
  
  .footer-actions {
    width: 100%;
    justify-content: center;
  }
}
</style>
