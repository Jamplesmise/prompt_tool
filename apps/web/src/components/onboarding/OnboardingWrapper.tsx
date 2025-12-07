'use client'

import { useOnboardingStore } from '@/stores/onboardingStore'
import { OnboardingModal } from './OnboardingModal'
import { StepModelConfig } from './StepModelConfig'
import { StepPromptCreate } from './StepPromptCreate'
import { StepQuickTest } from './StepQuickTest'

/**
 * 引导流程包装组件
 *
 * 根据当前步骤渲染对应的步骤内容
 */
export function OnboardingWrapper() {
  const { currentStep, showOnboarding } = useOnboardingStore()

  if (!showOnboarding) {
    return null
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepModelConfig />
      case 1:
        return <StepPromptCreate />
      case 2:
        return <StepQuickTest />
      default:
        return null
    }
  }

  return <OnboardingModal>{renderStepContent()}</OnboardingModal>
}
