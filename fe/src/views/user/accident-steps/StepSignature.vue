<template>
  <div class="step-signature">
    <div class="step-header">
      <h2>{{ $t('accident.steps.signature') }}</h2>
      <p class="step-description">{{ $t('accident.steps.signatureDesc') }}</p>
    </div>

    <div class="signature-content">
      <!-- 签名区域 -->
      <div class="signature-section">
        <el-card class="signature-card" shadow="never">
          <template #header>
            <div class="signature-header">
              <span>{{ $t('accident.partyASignature') }}</span>
              <el-button
                type="text"
                size="small"
                @click="clearSignature('partyA')"
                :disabled="!localFormData.signatures.partyA"
              >
                {{ $t('common.clear') }}
              </el-button>
            </div>
          </template>

          <div class="signature-area">
            <canvas
              ref="signatureCanvasA"
              class="signature-canvas"
              @mousedown="startDrawing($event, 'partyA')"
              @mousemove="draw($event, 'partyA')"
              @mouseup="stopDrawing('partyA')"
              @touchstart="startDrawing($event, 'partyA')"
              @touchmove="draw($event, 'partyA')"
              @touchend="stopDrawing('partyA')"
            />
            <div v-if="!localFormData.signatures.partyA" class="signature-placeholder">
              {{ $t('accident.clickToSign') }}
            </div>
          </div>
        </el-card>

        <el-card class="signature-card" shadow="never">
          <template #header>
            <div class="signature-header">
              <span>{{ $t('accident.partyBSignature') }}</span>
              <el-button
                type="text"
                size="small"
                @click="clearSignature('partyB')"
                :disabled="!localFormData.signatures.partyB"
              >
                {{ $t('common.clear') }}
              </el-button>
            </div>
          </template>

          <div class="signature-area">
            <canvas
              ref="signatureCanvasB"
              class="signature-canvas"
              @mousedown="startDrawing($event, 'partyB')"
              @mousemove="draw($event, 'partyB')"
              @mouseup="stopDrawing('partyB')"
              @touchstart="startDrawing($event, 'partyB')"
              @touchmove="draw($event, 'partyB')"
              @touchend="stopDrawing('partyB')"
            />
            <div v-if="!localFormData.signatures.partyB" class="signature-placeholder">
              {{ $t('accident.clickToSign') }}
            </div>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'

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

// 引用
const signatureCanvasA = ref(null)
const signatureCanvasB = ref(null)

// 状态
const isDrawing = ref({
  partyA: false,
  partyB: false
})

// 本地表单数据
const localFormData = reactive({
  signatures: {
    partyA: '',
    partyB: ''
  }
})

// 方法

const initCanvas = (canvas) => {
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.offsetWidth * 2
  canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2
}

const getEventPos = (event, canvas) => {
  const rect = canvas.getBoundingClientRect()
  const clientX = event.clientX || (event.touches && event.touches[0].clientX)
  const clientY = event.clientY || (event.touches && event.touches[0].clientY)
  
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

const startDrawing = (event, party) => {
  event.preventDefault()
  isDrawing.value[party] = true
  
  const canvas = party === 'partyA' ? signatureCanvasA.value : signatureCanvasB.value
  const ctx = canvas.getContext('2d')
  const pos = getEventPos(event, canvas)
  
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
}

const draw = (event, party) => {
  if (!isDrawing.value[party]) return
  
  event.preventDefault()
  const canvas = party === 'partyA' ? signatureCanvasA.value : signatureCanvasB.value
  const ctx = canvas.getContext('2d')
  const pos = getEventPos(event, canvas)
  
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
}

const stopDrawing = (party) => {
  if (!isDrawing.value[party]) return
  
  isDrawing.value[party] = false
  const canvas = party === 'partyA' ? signatureCanvasA.value : signatureCanvasB.value
  
  // 保存签名数据
  localFormData.signatures[party] = canvas.toDataURL()
  updateFormData()
}

const clearSignature = (party) => {
  const canvas = party === 'partyA' ? signatureCanvasA.value : signatureCanvasB.value
  const ctx = canvas.getContext('2d')
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  localFormData.signatures[party] = ''
  updateFormData()
}

const updateFormData = () => {
  emit('update:form-data', {
    signatures: { ...localFormData.signatures }
  })
}

// 恢复签名到canvas
const restoreSignatureToCanvas = (party, signatureData) => {
  if (!signatureData) return

  const canvas = party === 'partyA' ? signatureCanvasA.value : signatureCanvasB.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const img = new Image()

  img.onload = () => {
    // 清除canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // 绘制签名图像
    ctx.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2)
  }

  img.src = signatureData
}

// 初始化
onMounted(async () => {
  await nextTick()
  initCanvas(signatureCanvasA.value)
  initCanvas(signatureCanvasB.value)

  // 如果有现有签名数据，加载它们
  if (props.formData.signatures) {
    Object.assign(localFormData.signatures, props.formData.signatures)

    // 恢复签名到canvas
    if (props.formData.signatures.partyA) {
      restoreSignatureToCanvas('partyA', props.formData.signatures.partyA)
    }
    if (props.formData.signatures.partyB) {
      restoreSignatureToCanvas('partyB', props.formData.signatures.partyB)
    }
  }
})
</script>

<style scoped>
.step-signature {
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

.signature-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.signature-card {
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



.signature-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.signature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.signature-area {
  position: relative;
  height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
}

.signature-canvas {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.signature-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #c0c4cc;
  font-size: 14px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .signature-section {
    gap: 16px;
  }

  .signature-area {
    height: 150px;
  }

  .step-header h2 {
    font-size: 20px;
  }

  .signature-header {
    font-size: 14px;
  }
}
</style>
