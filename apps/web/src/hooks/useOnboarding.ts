import { useEffect } from 'react'
import { useOnboardingStore } from '@/stores/onboardingStore'

/**
 * 引导流程 Hook
 *
 * 用于在页面中控制引导弹窗的显示和管理引导状态
 */
export function useOnboarding() {
  const {
    isFirstVisit,
    showOnboarding,
    currentStep,
    completedSteps,
    isSkipped,
    resources,
    startOnboarding,
    skipOnboarding,
    closeOnboarding,
    resetOnboarding,
    shouldShowOnboarding,
  } = useOnboardingStore()

  // 首次访问时自动显示引导
  useEffect(() => {
    if (shouldShowOnboarding()) {
      startOnboarding()
    }
  }, [shouldShowOnboarding, startOnboarding])

  return {
    /** 是否为首次访问 */
    isFirstVisit,
    /** 是否显示引导弹窗 */
    showOnboarding,
    /** 当前步骤索引 */
    currentStep,
    /** 已完成的步骤列表 */
    completedSteps,
    /** 是否已跳过引导 */
    isSkipped,
    /** 引导过程中创建的资源 */
    resources,
    /** 开始引导 */
    startOnboarding,
    /** 跳过引导 */
    skipOnboarding,
    /** 关闭引导弹窗 */
    closeOnboarding,
    /** 重置引导（用于"重新开始引导"） */
    resetOnboarding,
    /** 是否可以重新开始引导（已跳过或已完成） */
    canRestartOnboarding: isSkipped || completedSteps.length === 3,
  }
}
