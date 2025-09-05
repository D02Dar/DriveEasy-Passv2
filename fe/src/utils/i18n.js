import { useI18n } from 'vue-i18n'

/**
 * 翻译分类名称
 * 处理从API返回的分类名称，将其转换为多语言显示
 */
export function useCategoryTranslation() {
  const { t } = useI18n()
  
  /**
   * 翻译分类名称
   * @param {string} categoryName - 从API返回的分类名称
   * @returns {string} - 翻译后的分类名称
   */
  const translateCategoryName = (categoryName) => {
    if (!categoryName) return ''

    // 如果是翻译键，直接翻译
    if (categoryName.includes('.')) {
      try {
        return t(categoryName)
      } catch (error) {
        // 翻译键不存在，返回原始名称
        return categoryName
      }
    }

    // 处理特殊分类名称（向后兼容）
    switch (categoryName) {
      case '全部题目':
        return t('categories.allQuestions')
      case 'All Questions':
        return t('categories.allQuestions')
      case 'คำถามทั้งหมด':
        return t('categories.allQuestions')
      case '通用练习':
        return t('categories.generalPractice')
      case 'General Practice':
        return t('categories.generalPractice')
      case 'การฝึกซ้อมทั่วไป':
        return t('categories.generalPractice')
      default:
        // 对于其他分类名称，直接返回原名称
        return categoryName
    }
  }
  
  /**
   * 检查是否应该隐藏分类标签
   * @param {string} categoryName - 分类名称
   * @returns {boolean} - 是否应该隐藏
   */
  const shouldHideCategory = (categoryName) => {
    const hiddenCategories = ['全部题目', 'All Questions', 'คำถามทั้งหมด']
    return hiddenCategories.includes(categoryName)
  }
  
  return {
    translateCategoryName,
    shouldHideCategory
  }
}

/**
 * 翻译统计标签
 * 处理从API返回的统计标签，将其转换为多语言显示
 */
export function useStatsTranslation() {
  const { t } = useI18n()
  
  /**
   * 翻译统计标签
   * @param {string} statLabel - 从API返回的统计标签
   * @returns {string} - 翻译后的标签
   */
  const translateStatLabel = (statLabel) => {
    if (!statLabel) return ''
    
    // 处理常见的统计标签
    const translations = {
      // 中文
      '练习次数': t('stats.practiceCount'),
      '题目总数': t('stats.totalQuestions'),
      '平均分数': t('stats.averageScore'),
      '收藏题目': t('stats.bookmarkedQuestions'),
      '事故记录': t('stats.accidentRecords'),
      '总用户数': t('stats.totalUsers'),
      
      // 英文
      'Practice Count': t('stats.practiceCount'),
      'Total Questions': t('stats.totalQuestions'),
      'Average Score': t('stats.averageScore'),
      'Bookmarked Questions': t('stats.bookmarkedQuestions'),
      'Accident Records': t('stats.accidentRecords'),
      'Total Users': t('stats.totalUsers'),
      
      // 泰文
      'จำนวนครั้งที่ฝึกซ้อม': t('stats.practiceCount'),
      'จำนวนคำถามทั้งหมด': t('stats.totalQuestions'),
      'คะแนนเฉลี่ย': t('stats.averageScore'),
      'คำถามที่บุ๊กมาร์ก': t('stats.bookmarkedQuestions'),
      'บันทึกอุบัติเหตุ': t('stats.accidentRecords'),
      'ผู้ใช้ทั้งหมด': t('stats.totalUsers')
    }
    
    return translations[statLabel] || statLabel
  }
  
  return {
    translateStatLabel
  }
}

/**
 * 通用的API数据翻译工具
 */
export function useApiDataTranslation() {
  const categoryTranslation = useCategoryTranslation()
  const statsTranslation = useStatsTranslation()
  
  return {
    ...categoryTranslation,
    ...statsTranslation
  }
}
