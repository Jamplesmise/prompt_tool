'use client'

import { Steps } from 'antd'
import { CheckCircle, Circle, Settings, FileText, Play } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/stores/onboardingStore'

const stepIcons = {
  model: Settings,
  prompt: FileText,
  test: Play,
} as const

export function OnboardingProgress() {
  const { currentStep, completedSteps, goToStep } = useOnboardingStore()

  const items = ONBOARDING_STEPS.map((step, index) => {
    const isCompleted = completedSteps.includes(index)
    const isCurrent = currentStep === index
    const IconComponent = stepIcons[step.key]

    const getIcon = () => {
      if (isCompleted) {
        return <CheckCircle size={20} style={{ color: '#52c41a' }} />
      }
      if (isCurrent) {
        return <IconComponent size={20} style={{ color: '#EF4444' }} />
      }
      return <Circle size={20} style={{ color: '#d9d9d9' }} />
    }

    return {
      title: (
        <span
          style={{
            fontWeight: isCurrent ? 600 : 400,
            color: isCurrent ? '#EF4444' : isCompleted ? '#52c41a' : '#666',
            cursor: isCompleted ? 'pointer' : 'default',
          }}
          onClick={() => isCompleted && goToStep(index)}
        >
          {step.title}
        </span>
      ),
      description: (
        <span style={{ fontSize: 12, color: '#999' }}>{step.duration}</span>
      ),
      icon: getIcon(),
    }
  })

  const containerStyle: CSSProperties = {
    paddingTop: 8,
  }

  return (
    <div style={containerStyle}>
      <Steps
        direction="vertical"
        current={currentStep}
        items={items}
        size="small"
      />
    </div>
  )
}
