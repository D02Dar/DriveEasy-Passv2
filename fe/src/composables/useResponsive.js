import { ref, onMounted, onUnmounted } from 'vue'

export function useResponsive() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)
  const screenWidth = ref(0)
  const screenHeight = ref(0)

  const updateScreenSize = () => {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
    
    // 移动端：宽度小于768px
    isMobile.value = screenWidth.value < 768
    
    // 平板：宽度在768px到1024px之间
    isTablet.value = screenWidth.value >= 768 && screenWidth.value < 1024
    
    // 桌面端：宽度大于等于1024px
    isDesktop.value = screenWidth.value >= 1024
  }

  onMounted(() => {
    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateScreenSize)
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    screenHeight
  }
}
