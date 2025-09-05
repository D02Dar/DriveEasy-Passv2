<template>
  <div class="admin-questions">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <el-icon><Document /></el-icon>
            {{ $t('adminQuestions.title') }}
          </h1>
          <p class="page-subtitle">{{ $t('adminQuestions.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="refreshQuestions" :loading="loading">
            <el-icon><Refresh /></el-icon>
            {{ $t('common.refresh') }}
          </el-button>
          <el-button @click="batchImport">
            <el-icon><Upload /></el-icon>
            {{ $t('adminQuestions.batchImport') }}
          </el-button>
          <el-button type="primary" @click="createQuestion">
            <el-icon><Plus /></el-icon>
            {{ $t('adminQuestions.addQuestion') }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ pagination.total || 0 }}</div>
          <div class="stat-label">{{ $t('adminQuestions.totalQuestions') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon single">
          <el-icon><Select /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ singleChoiceCount }}</div>
          <div class="stat-label">{{ $t('adminQuestions.singleChoice') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon judge">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ trueFalseCount }}</div>
          <div class="stat-label">{{ $t('adminQuestions.trueFalse') }}</div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <div class="filter-card">
        <div class="filter-content">
          <el-input
            v-model="searchKeyword"
            :placeholder="$t('adminQuestions.searchPlaceholder')"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
            style="width: 300px"
          />
          <el-select
            v-model="selectedCategory"
            :placeholder="$t('adminQuestions.selectCategory')"
            clearable
            @change="handleCategoryChange"
            style="width: 200px"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
          <el-select
            v-model="selectedType"
            :placeholder="$t('adminQuestions.selectType')"
            clearable
            @change="handleTypeChange"
            style="width: 150px"
          >
            <el-option :label="$t('adminQuestions.singleChoice')" value="single_choice" />
            <el-option :label="$t('adminQuestions.trueFalse')" value="true_false" />
          </el-select>
          <el-button @click="clearFilters">{{ $t('adminQuestions.clearFilters') }}</el-button>
        </div>
      </div>
    </div>

    <!-- 题目列表 -->
    <div class="questions-container">
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <div v-else-if="questions.length === 0" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <h3>{{ searchKeyword || selectedCategory || selectedType ? $t('adminQuestions.noQuestionsFound') : $t('adminQuestions.noQuestions') }}</h3>
        <p>{{ searchKeyword || selectedCategory || selectedType ? $t('adminQuestions.tryOtherConditions') : $t('adminQuestions.addFirstQuestion') }}</p>
        <el-button type="primary" @click="createQuestion">
          {{ $t('adminQuestions.addQuestion') }}
        </el-button>
      </div>

      <div v-else class="questions-list">
        <div class="list-header">
          <h3>{{ $t('adminQuestions.questionList') }}</h3>
          <span class="list-count">
            {{ $t('adminQuestions.totalCount', { total: pagination.total, page: pagination.page }) }}
          </span>
        </div>

        <div class="questions-table">
          <el-table
            :data="questions"
            style="width: 100%"
            :default-sort="{ prop: 'createdAt', order: 'descending' }"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="id" label="ID" width="80" sortable />

            <el-table-column :label="$t('adminQuestions.questionContent')" min-width="300">
              <template #default="{ row }">
                <div class="question-content">
                  <div class="question-text">{{ row.questionText }}</div>
                  <div v-if="row.imageUrl" class="question-image">
                    <el-image
                      :src="row.imageUrl"
                      :alt="row.questionText"
                      style="width: 60px; height: 40px"
                      fit="cover"
                      :preview-src-list="[row.imageUrl]"
                    />
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column :label="$t('adminQuestions.questionType')" width="100">
              <template #default="{ row }">
                <el-tag :type="getQuestionTypeColor(row.questionType)" size="small">
                  {{ getQuestionTypeText(row.questionType) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column :label="$t('adminQuestions.category')" width="120">
              <template #default="{ row }">
                <span class="category-tag">{{ row.categoryName || $t('adminQuestions.uncategorized') }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="$t('adminQuestions.optionsCount')" width="80">
              <template #default="{ row }">
                <span class="options-count">{{ row.optionsCount || 0 }}</span>
              </template>
            </el-table-column>

            <el-table-column :label="$t('adminQuestions.creator')" width="100">
              <template #default="{ row }">
                <span>{{ row.createdByUsername || $t('adminQuestions.unknown') }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="createdAt" :label="$t('adminQuestions.createdAt')" width="160" sortable>
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>

            <el-table-column :label="$t('adminQuestions.actions')" width="200" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button
                    size="small"
                    @click="viewQuestion(row)"
                  >
                    <el-icon><View /></el-icon>
                    {{ $t('common.view') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    @click="editQuestion(row)"
                  >
                    <el-icon><Edit /></el-icon>
                    {{ $t('common.edit') }}
                  </el-button>
                  <el-button
                    size="small"
                    type="danger"
                    @click="deleteQuestion(row)"
                  >
                    <el-icon><Delete /></el-icon>
                    {{ $t('common.delete') }}
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

    <!-- 题目详情对话框 -->
    <el-dialog
      v-model="questionDetailVisible"
      :title="t('adminQuestions.questionDetailTitle', { id: selectedQuestion?.id })"
      width="800px"
      :before-close="handleCloseQuestionDetail"
    >
      <div v-if="selectedQuestion" class="question-detail-content">
        <div class="detail-section">
          <h4>{{ $t('adminQuestions.basicInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ t('adminQuestions.questionId') }}:</label>
              <span>{{ selectedQuestion.id }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminQuestions.questionTypeLabel') }}:</label>
              <el-tag :type="getQuestionTypeColor(selectedQuestion.questionType)" size="small">
                {{ getQuestionTypeText(selectedQuestion.questionType) }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>{{ t('adminQuestions.categoryLabel') }}:</label>
              <span>{{ selectedQuestion.categoryName || t('adminQuestions.uncategorized') }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminQuestions.creatorLabel') }}:</label>
              <span>{{ selectedQuestion.createdByUsername || t('adminQuestions.unknown') }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>{{ $t('adminQuestions.questionContent') }}</h4>
          <div class="question-text-detail">{{ selectedQuestion.questionText }}</div>
          <div v-if="selectedQuestion.imageUrl" class="question-image-detail">
            <el-image
              :src="selectedQuestion.imageUrl"
              :alt="selectedQuestion.questionText"
              style="max-width: 100%; max-height: 300px"
              fit="contain"
              :preview-src-list="[selectedQuestion.imageUrl]"
            />
          </div>
        </div>

        <div class="detail-section" v-if="questionOptions.length > 0">
          <h4>{{ $t('adminQuestions.optionsList') }}</h4>
          <div class="options-list">
            <div
              v-for="(option, index) in questionOptions"
              :key="option.id"
              class="option-item"
              :class="{ 'correct-option': option.isCorrect }"
            >
              <div class="option-prefix">{{ getOptionPrefix(index) }}</div>
              <div class="option-text">{{ option.optionText }}</div>
              <div v-if="option.isCorrect" class="correct-mark">
                <el-icon><Check /></el-icon>
                {{ $t('adminQuestions.correctAnswer') }}
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section" v-if="selectedQuestion.explanation">
          <h4>{{ $t('adminQuestions.answerExplanation') }}</h4>
          <div class="explanation-text">{{ selectedQuestion.explanation }}</div>
        </div>

        <div class="detail-section">
          <h4>{{ $t('adminQuestions.timeInfo') }}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>{{ t('adminQuestions.createdTimeLabel') }}:</label>
              <span>{{ formatDate(selectedQuestion.createdAt) }}</span>
            </div>
            <div class="detail-item">
              <label>{{ t('adminQuestions.updatedTimeLabel') }}:</label>
              <span>{{ formatDate(selectedQuestion.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="questionDetailVisible = false">{{ $t('common.close') }}</el-button>
        <el-button type="primary" @click="editQuestion(selectedQuestion)">
          {{ $t('adminQuestions.editQuestion') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建/{{ $t('adminQuestions.editQuestion') }}对话框 -->
    <el-dialog
      v-model="questionFormVisible"
      :title="isEditing ? t('adminQuestions.editQuestion') : t('adminQuestions.createQuestion')"
      width="900px"
      :before-close="handleCloseQuestionForm"
    >
      <el-form
        ref="questionForm"
        :model="questionFormData"
        :rules="questionRules"
        label-width="100px"
      >
        <el-form-item :label="t('adminQuestions.questionContent')" prop="questionText">
          <el-input
            v-model="questionFormData.questionText"
            type="textarea"
            :rows="3"
            :placeholder="t('common.pleaseEnter')"
          />
        </el-form-item>

        <el-form-item :label="t('adminQuestions.questionType')" prop="questionType">
          <el-radio-group v-model="questionFormData.questionType" @change="handleQuestionTypeChange">
            <el-radio value="single_choice">{{ t('adminQuestions.singleChoice') }}</el-radio>
            <el-radio value="true_false">{{ t('adminQuestions.trueFalse') }}</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="t('adminQuestions.category')" prop="categoryId">
          <el-select
            v-model="questionFormData.categoryId"
            :placeholder="t('adminQuestions.selectCategory')"
            style="width: 100%"
          >
            <el-option
              v-for="category in categories"
              :key="category.id"
              :label="category.name"
              :value="category.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item :label="t('adminQuestions.image')" prop="imageUrl">
          <el-input
            v-model="questionFormData.imageUrl"
            :placeholder="t('common.pleaseEnter')"
          />
        </el-form-item>

        <el-form-item :label="t('adminQuestions.optionSetting')" prop="options">
          <div class="options-editor">
            <div
              v-for="(option, index) in questionFormData.options"
              :key="index"
              class="option-editor-item"
            >
              <div class="option-prefix">{{ getOptionPrefix(index) }}</div>
              <el-input
                v-model="option.optionText"
                :placeholder="t('common.pleaseEnter')"
                style="flex: 1"
              />
              <el-radio-group
                v-if="questionFormData.questionType === 'single_choice'"
                v-model="correctOptionIndex"
                @change="updateCorrectOption"
              >
                <el-radio :value="index">{{ t('adminQuestions.correct') }}</el-radio>
              </el-radio-group>
              <el-checkbox
                v-else
                v-model="option.isCorrect"
                @change="updateTrueFalseOptions"
              >
                {{ t('adminQuestions.correct') }}
              </el-checkbox>
              <el-button
                v-if="questionFormData.options.length > 2"
                size="small"
                type="danger"
                @click="removeOption(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button
              v-if="questionFormData.options.length < 4"
              type="primary"
              @click="addOption"
              style="margin-top: 10px"
            >
              <el-icon><Plus /></el-icon>
              {{ t('adminQuestions.addOption') }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="t('adminQuestions.answerExplanation')" prop="explanation">
          <el-input
            v-model="questionFormData.explanation"
            type="textarea"
            :rows="3"
            :placeholder="t('common.pleaseEnter')"
          />
        </el-form-item>

      </el-form>

      <template #footer>
        <el-button @click="questionFormVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="submitQuestion" :loading="saving">
          {{ isEditing ? t('adminQuestions.updateQuestion') : t('adminQuestions.createQuestion') }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="batchImportVisible"
      :title="t('adminQuestions.batchImportTitle')"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="batch-import-content">
        <el-alert
          :title="t('adminQuestions.importInstructions')"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>{{ t('adminQuestions.importInstructionsText1') }}</p>
            <p>{{ t('adminQuestions.importInstructionsText2') }}</p>
            <div class="download-example">
              <el-button
                type="primary"
                link
                @click="downloadExampleFile"
                style="padding: 0; margin-top: 8px;"
              >
                <el-icon><Download /></el-icon>
                {{ t('adminQuestions.downloadExample') }}
              </el-button>
            </div>
          </template>
        </el-alert>

        <div class="upload-section">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            accept=".json"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :on-exceed="handleFileExceed"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              {{ t('adminQuestions.selectJsonFile') }}
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                {{ t('adminQuestions.uploadTip') }}
              </div>
            </template>
          </el-upload>
        </div>

        <div v-if="importPreview.length > 0" class="preview-section">
          <h4>{{ t('adminQuestions.previewTitle') }}</h4>
          <div class="preview-list">
            <div v-for="(question, index) in importPreview.slice(0, 5)" :key="index" class="preview-item">
              <div class="question-info">
                <span class="question-type">{{ getQuestionTypeText(question.questionType) }}</span>
                <span class="question-text">{{ question.questionText }}</span>
              </div>
              <div class="options-count">{{ t('adminQuestions.optionsCountText', { count: question.options.length }) }}</div>
            </div>
          </div>
          <p v-if="importPreview.length > 5" class="more-info">
            {{ t('adminQuestions.moreQuestions', { count: importPreview.length - 5 }) }}
          </p>
        </div>

        <div v-if="importResult" class="result-section">
          <el-alert
            :title="t('adminQuestions.importResult', { success: importResult.success, failed: importResult.failed })"
            :type="importResult.failed > 0 ? 'warning' : 'success'"
            :closable="false"
            show-icon
          >
            <template #default>
              <div v-if="importResult.errors.length > 0" class="error-list">
                <p>{{ t('adminQuestions.errorDetails') }}</p>
                <ul>
                  <li v-for="(error, index) in importResult.errors" :key="index">{{ error }}</li>
                </ul>
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeBatchImport">{{ t('common.cancel') }}</el-button>
          <el-button
            type="primary"
            @click="confirmImport"
            :loading="importing"
            :disabled="importPreview.length === 0"
          >
            {{ importing ? t('adminQuestions.importing') : t('adminQuestions.confirmImport') }}
          </el-button>
        </span>
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
  Document,
  Refresh,
  Upload,
  Download,
  Plus,
  Search,
  Select,
  Check,
  View,
  Edit,
  Delete
} from '@element-plus/icons-vue'

export default {
  name: 'AdminQuestions',
  components: {
    Document,
    Refresh,
    Upload,
    Plus,
    Search,
    Select,
    Check,
    View,
    Edit,
    Delete
  },
  setup() {
    const { t } = useI18n()

    // 基础状态
    const loading = ref(false)
    const saving = ref(false)
    const questions = ref([])
    const categories = ref([])
    const searchKeyword = ref('')
    const selectedCategory = ref('')
    const selectedType = ref('')

    // 对话框状态
    const questionDetailVisible = ref(false)
    const questionFormVisible = ref(false)
    const batchImportVisible = ref(false)
    const isEditing = ref(false)
    const selectedQuestion = ref(null)
    const questionOptions = ref([])
    const correctOptionIndex = ref(0)

    // 表单引用
    const questionForm = ref(null)
    const uploadRef = ref(null)

    // 批量导入状态
    const importing = ref(false)
    const importPreview = ref([])
    const importResult = ref(null)

    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })

    const sortConfig = reactive({
      prop: 'createdAt',
      order: 'descending'
    })

    const questionFormData = reactive({
      questionText: '',
      questionType: 'single_choice',
      categoryId: null,
      imageUrl: '',
      explanation: '',
      options: [
        { optionText: '', isCorrect: false, optionOrder: 1 },
        { optionText: '', isCorrect: false, optionOrder: 2 }
      ]
    })

    const questionRules = {
      questionText: [
        { required: true, message: t('common.pleaseEnter'), trigger: 'blur' }
      ],
      questionType: [
        { required: true, message: t('adminQuestions.questionTypeRequired'), trigger: 'change' }
      ],
      categoryId: [
        { required: true, message: t('adminQuestions.categoryRequired'), trigger: 'change' }
      ]
    }

    // 计算统计数据
    const singleChoiceCount = computed(() => {
      return questions.value.filter(q => q.questionType === 'single_choice').length
    })

    const trueFalseCount = computed(() => {
      return questions.value.filter(q => q.questionType === 'true_false').length
    })

    // 获取题目列表
    const fetchQuestions = async () => {
      try {
        loading.value = true
        const params = {
          page: pagination.page,
          limit: pagination.limit
        }

        if (searchKeyword.value) {
          params.search = searchKeyword.value
        }

        if (selectedCategory.value) {
          params.categoryId = selectedCategory.value
        }

        if (selectedType.value) {
          params.questionType = selectedType.value
        }

        if (sortConfig.prop) {
          params.sortBy = sortConfig.prop
          params.sortOrder = sortConfig.order === 'ascending' ? 'asc' : 'desc'
        }

        const response = await api.admin.questions.getAll(params)
        questions.value = response.data.questions
        pagination.total = response.data.pagination.total
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        loading.value = false
      }
    }

    // 获取分类列表
    const fetchCategories = async () => {
      try {
        const response = await api.categories.getAll()
        categories.value = response.data
      } catch (error) {
        console.error('Error:', error)
      }
    }

    // 获取题目详情
    const fetchQuestionDetail = async (questionId) => {
      try {
        const response = await api.admin.questions.getById(questionId)
        selectedQuestion.value = response.data
        questionOptions.value = response.data.options || []
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

    // 获取题型颜色
    const getQuestionTypeColor = (type) => {
      const colorMap = {
        'single_choice': 'primary',
        'true_false': 'success',
        'multiple_choice': 'warning'
      }
      return colorMap[type] || 'info'
    }

    // 获取题型文本
    const getQuestionTypeText = (type) => {
      const textMap = {
        'single_choice': t('adminQuestions.singleChoice'),
        'true_false': t('adminQuestions.trueFalse'),
        'multiple_choice': t('adminQuestions.multipleChoice')
      }
      return textMap[type] || t('adminQuestions.unknown')
    }

    // 获取选项前缀
    const getOptionPrefix = (index) => {
      return String.fromCharCode(65 + index) // A, B, C, D
    }

    // 搜索处理
    const handleSearch = () => {
      pagination.page = 1
      fetchQuestions()
    }

    // 分类筛选
    const handleCategoryChange = () => {
      pagination.page = 1
      fetchQuestions()
    }

    // 题型筛选
    const handleTypeChange = () => {
      pagination.page = 1
      fetchQuestions()
    }

    // 清除筛选
    const clearFilters = () => {
      searchKeyword.value = ''
      selectedCategory.value = ''
      selectedType.value = ''
      pagination.page = 1
      fetchQuestions()
    }

    // 排序处理
    const handleSortChange = ({ prop, order }) => {
      sortConfig.prop = prop
      sortConfig.order = order
      fetchQuestions()
    }

    // 分页处理
    const handleSizeChange = (newSize) => {
      pagination.limit = newSize
      pagination.page = 1
      fetchQuestions()
    }

    const handleCurrentChange = (newPage) => {
      pagination.page = newPage
      fetchQuestions()
    }

    // 查看题目详情
    const viewQuestion = async (question) => {
      selectedQuestion.value = question
      questionDetailVisible.value = true
      await fetchQuestionDetail(question.id)
    }

    // {{ $t('adminQuestions.createQuestion') }}
    const createQuestion = () => {
      isEditing.value = false
      selectedQuestion.value = null

      // 重置表单
      Object.assign(questionFormData, {
        questionText: '',
        questionType: 'single_choice',
        categoryId: null,
        imageUrl: '',
        explanation: '',

        options: [
          { optionText: '', isCorrect: false, optionOrder: 1 },
          { optionText: '', isCorrect: false, optionOrder: 2 }
        ]
      })

      correctOptionIndex.value = 0
      questionFormVisible.value = true
    }

    // {{ $t('adminQuestions.editQuestion') }}
    const editQuestion = async (question) => {
      isEditing.value = true
      selectedQuestion.value = question

      // 获取完整题目数据
      await fetchQuestionDetail(question.id)

      // 填充表单数据
      Object.assign(questionFormData, {
        questionText: selectedQuestion.value.questionText,
        questionType: selectedQuestion.value.questionType,
        categoryId: selectedQuestion.value.categoryId,
        imageUrl: selectedQuestion.value.imageUrl || '',
        explanation: selectedQuestion.value.explanation || '',

        options: questionOptions.value.map(opt => ({
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          optionOrder: opt.optionOrder
        }))
      })

      // 设置正确选项索引
      correctOptionIndex.value = questionFormData.options.findIndex(opt => opt.isCorrect)

      questionFormVisible.value = true
      questionDetailVisible.value = false
    }

    // 删除题目
    const deleteQuestion = async (question) => {
      try {
        await ElMessageBox.confirm(
          t('adminQuestions.confirmDeleteQuestion', { text: question.questionText.substring(0, 30) }),
          t('adminQuestions.confirmDeleteTitle'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )

        await api.admin.questions.delete(question.id)
        ElMessage.success(t('messages.success'))

        // 从列表中移除
        const index = questions.value.findIndex(q => q.id === question.id)
        if (index > -1) {
          questions.value.splice(index, 1)
          pagination.total--
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('Error:', error)
          ElMessage.error(t('messages.error'))
        }
      }
    }

    // 题目类型变化处理
    const handleQuestionTypeChange = (type) => {
      if (type === 'true_false') {
        // 判断题只需要2个选项
        questionFormData.options = [
          { optionText: t('adminQuestions.trueFalseCorrectOption'), isCorrect: false, optionOrder: 1 },
          { optionText: t('adminQuestions.trueFalseIncorrectOption'), isCorrect: false, optionOrder: 2 }
        ]
      } else {
        // 单选题至少2个选项
        if (questionFormData.options.length < 2) {
          questionFormData.options = [
            { optionText: '', isCorrect: false, optionOrder: 1 },
            { optionText: '', isCorrect: false, optionOrder: 2 }
          ]
        }
      }
      correctOptionIndex.value = 0
      updateCorrectOption()
    }

    // 添加选项
    const addOption = () => {
      if (questionFormData.options.length < 4) {
        questionFormData.options.push({
          optionText: '',
          isCorrect: false,
          optionOrder: questionFormData.options.length + 1
        })
      }
    }

    // 删除选项
    const removeOption = (index) => {
      if (questionFormData.options.length > 2) {
        questionFormData.options.splice(index, 1)
        // 重新设置选项顺序
        questionFormData.options.forEach((option, idx) => {
          option.optionOrder = idx + 1
        })
        // 调整正确选项索引
        if (correctOptionIndex.value >= index) {
          correctOptionIndex.value = Math.max(0, correctOptionIndex.value - 1)
        }
        updateCorrectOption()
      }
    }

    // 更新正确选项
    const updateCorrectOption = () => {
      questionFormData.options.forEach((option, index) => {
        option.isCorrect = index === correctOptionIndex.value
      })
    }

    // 更新判断题选项
    const updateTrueFalseOptions = () => {
      // 判断题只能有一个正确答案
      const correctCount = questionFormData.options.filter(opt => opt.isCorrect).length
      if (correctCount > 1) {
        ElMessage.warning(t('adminQuestions.trueFalseOnlyOneCorrect'))
        // 重置除当前选项外的其他选项
        questionFormData.options.forEach((option, index) => {
          if (index !== correctOptionIndex.value) {
            option.isCorrect = false
          }
        })
      }
    }

    // 提交题目
    const submitQuestion = async () => {
      if (!questionForm.value) return

      try {
        const valid = await questionForm.value.validate()
        if (!valid) return

        // 验证选项
        const validOptions = questionFormData.options.filter(opt => opt.optionText.trim())
        if (validOptions.length < 2) {
          ElMessage.warning(t('messages.warning'))
          return
        }

        const correctOptions = validOptions.filter(opt => opt.isCorrect)
        if (correctOptions.length === 0) {
          ElMessage.warning(t('adminQuestions.pleaseSetCorrectAnswer'))
          return
        }

        if (questionFormData.questionType === 'single_choice' && correctOptions.length > 1) {
          ElMessage.warning(t('adminQuestions.singleChoiceOnlyOneCorrect'))
          return
        }

        saving.value = true

        const data = {
          questionText: questionFormData.questionText,
          questionType: questionFormData.questionType,
          categoryId: questionFormData.categoryId,
          imageUrl: questionFormData.imageUrl || null,
          explanation: questionFormData.explanation || null,

          options: validOptions
        }

        if (isEditing.value && selectedQuestion.value) {
          await api.admin.questions.update(selectedQuestion.value.id, data)
          ElMessage.success(t('messages.success'))
        } else {
          await api.admin.questions.create(data)
          ElMessage.success(t('messages.success'))
        }

        questionFormVisible.value = false
        fetchQuestions()
      } catch (error) {
        console.error('Error:', error)
        ElMessage.error(t('messages.error'))
      } finally {
        saving.value = false
      }
    }

    // 刷新题目列表
    const refreshQuestions = () => {
      fetchQuestions()
    }

    // 批量导入
    const batchImport = () => {
      batchImportVisible.value = true
      importPreview.value = []
      importResult.value = null
    }

    // 处理文件选择
    const handleFileChange = (file) => {
      // 重置之前的结果
      importPreview.value = []
      importResult.value = null

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result)
          if (jsonData.questions && Array.isArray(jsonData.questions)) {
            importPreview.value = jsonData.questions
            ElMessage.success(t('adminQuestions.parseSuccess', { count: jsonData.questions.length }))
          } else {
            ElMessage.error(t('adminQuestions.jsonFormatError'))
            importPreview.value = []
          }
        } catch (error) {
          ElMessage.error(t('adminQuestions.jsonParseError', { error: error.message }))
          importPreview.value = []
        }
      }
      reader.readAsText(file.raw)
    }

    // 处理文件超出限制
    const handleFileExceed = (files) => {
      // 清除现有文件，添加新文件
      uploadRef.value.clearFiles()
      // 重置预览数据
      importPreview.value = []
      importResult.value = null
      // 手动触发文件选择
      const file = files[0]
      uploadRef.value.handleStart(file)
      handleFileChange({ raw: file })
    }

    // 移除文件
    const handleFileRemove = () => {
      importPreview.value = []
      importResult.value = null
    }

    // 确认导入
    const confirmImport = async () => {
      if (importPreview.value.length === 0) {
        ElMessage.warning(t('adminQuestions.selectFileFirst'))
        return
      }

      try {
        importing.value = true
        const response = await api.admin.questions.batchImport({
          questions: importPreview.value
        })

        importResult.value = response.data
        ElMessage.success(response.message)

        // 如果有成功导入的题目，刷新列表
        if (response.data.success > 0) {
          fetchQuestions()
        }
      } catch (error) {
        console.error('批量导入失败:', error)
        ElMessage.error(t('adminQuestions.batchImportFailed', { error: error.response?.data?.message || error.message }))
      } finally {
        importing.value = false
      }
    }

    // 下载示例文件
    const downloadExampleFile = () => {
      const exampleData = {
        questions: [
          {
            questionText: "在城市道路上行驶时，遇到前方有行人横穿马路，应该怎么办？",
            questionType: "single_choice",
            categoryId: 5,
            explanation: "遇到行人横穿马路时，应该减速慢行或停车让行，确保行人安全通过。这是保障行人安全的基本要求。",
            language: "zh",
            imageUrl: null,
            difficultyLevel: 1,
            options: [
              {
                optionText: "立即停车让行",
                isCorrect: true,
                optionOrder: 1
              },
              {
                optionText: "鸣笛警示后继续行驶",
                isCorrect: false,
                optionOrder: 2
              },
              {
                optionText: "加速通过",
                isCorrect: false,
                optionOrder: 3
              },
              {
                optionText: "减速慢行",
                isCorrect: false,
                optionOrder: 4
              }
            ]
          },
          {
            questionText: "驾驶机动车必须携带驾驶证。",
            questionType: "true_false",
            categoryId: 5,
            explanation: "根据《道路交通安全法》规定，驾驶机动车时必须随身携带驾驶证。",
            language: "zh",
            imageUrl: null,
            difficultyLevel: 1,
            options: [
              {
                optionText: "正确",
                isCorrect: true,
                optionOrder: 1
              },
              {
                optionText: "错误",
                isCorrect: false,
                optionOrder: 2
              }
            ]
          }
        ]
      }

      const blob = new Blob([JSON.stringify(exampleData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'questions-example.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElMessage.success(t('adminQuestions.downloadExampleSuccess'))
    }

    // 关闭批量导入对话框
    const closeBatchImport = () => {
      batchImportVisible.value = false
      importPreview.value = []
      importResult.value = null
      if (uploadRef.value) {
        uploadRef.value.clearFiles()
      }
    }

    // 关闭对话框
    const handleCloseQuestionDetail = () => {
      questionDetailVisible.value = false
      selectedQuestion.value = null
      questionOptions.value = []
    }

    const handleCloseQuestionForm = () => {
      questionFormVisible.value = false
    }

    onMounted(() => {
      fetchQuestions()
      fetchCategories()
    })

    return {
      // 国际化
      t,

      // 基础状态
      loading,
      saving,
      questions,
      categories,
      searchKeyword,
      selectedCategory,
      selectedType,
      pagination,

      // 计算属性
      singleChoiceCount,
      trueFalseCount,

      // 对话框状态
      questionDetailVisible,
      questionFormVisible,
      batchImportVisible,
      isEditing,
      selectedQuestion,
      questionOptions,
      correctOptionIndex,

      // 表单相关
      questionForm,
      questionFormData,
      questionRules,
      uploadRef,

      // 批量导入状态
      importing,
      importPreview,
      importResult,

      // 工具函数
      formatDate,
      getQuestionTypeColor,
      getQuestionTypeText,
      getOptionPrefix,

      // 数据获取
      fetchCategories,

      // 搜索和筛选
      handleSearch,
      handleCategoryChange,
      handleTypeChange,
      clearFilters,
      handleSortChange,
      handleSizeChange,
      handleCurrentChange,

      // 题目操作
      viewQuestion,
      createQuestion,
      editQuestion,
      deleteQuestion,
      refreshQuestions,

      // 表单操作
      handleQuestionTypeChange,
      addOption,
      removeOption,
      updateCorrectOption,
      updateTrueFalseOptions,
      submitQuestion,

      // 批量导入操作
      batchImport,
      handleFileChange,
      handleFileRemove,
      handleFileExceed,
      downloadExampleFile,
      confirmImport,
      closeBatchImport,

      // 对话框操作
      handleCloseQuestionDetail,
      handleCloseQuestionForm,

      // 图标组件
      Search,
      Document,
      Refresh,
      Upload,
      Download,
      Plus,
      Select,
      Check,
      View,
      Edit,
      Delete
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-questions {
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
  &.single { background: var(--el-color-success); }
  &.judge { background: var(--el-color-warning); }
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

.questions-container {
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
    margin-bottom: 20px;
  }
}

.questions-list {
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

.questions-table {
  padding: 0 24px;
}

.question-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.question-text {
  flex: 1;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.question-image {
  flex-shrink: 0;
}

.category-tag {
  font-size: 12px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.options-count {
  font-weight: 600;
  color: var(--el-color-primary);
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

.question-detail-content {
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

  .question-text-detail {
    line-height: 1.6;
    color: var(--el-text-color-primary);
    background: var(--el-fill-color-lighter);
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .question-image-detail {
    text-align: center;
  }

  .explanation-text {
    line-height: 1.6;
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-lighter);
    padding: 16px;
    border-radius: 6px;
  }
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;

  &.correct-option {
    border-color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }
}

.option-prefix {
  width: 24px;
  height: 24px;
  background: var(--el-fill-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  line-height: 1.5;
}

.correct-mark {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-color-success);
  font-size: 14px;
  font-weight: 600;
}

.options-editor {
  width: 100%;
}

.option-editor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .admin-questions {
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

  .action-buttons {
    flex-direction: column;
  }

  .option-editor-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
}

// 批量导入对话框样式
.batch-import-content {
  .upload-section {
    margin: 20px 0;
  }

  .preview-section {
    margin: 20px 0;

    h4 {
      margin-bottom: 12px;
      color: #303133;
    }

    .preview-list {
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      max-height: 300px;
      overflow-y: auto;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #f0f2f5;

      &:last-child {
        border-bottom: none;
      }

      .question-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 12px;

        .question-type {
          background: #f0f9ff;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
        }

        .question-text {
          color: #303133;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .options-count {
        color: #909399;
        font-size: 12px;
        white-space: nowrap;
      }
    }

    .more-info {
      margin-top: 8px;
      color: #909399;
      font-size: 12px;
      text-align: center;
    }
  }

  .result-section {
    margin: 20px 0;

    .error-list {
      margin-top: 12px;

      p {
        margin-bottom: 8px;
        font-weight: 500;
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          margin-bottom: 4px;
          color: #f56c6c;
          font-size: 13px;
        }
      }
    }
  }
}
</style>
