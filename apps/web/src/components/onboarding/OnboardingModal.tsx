'use client'

import { Modal, Button, Space } from 'antd'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useOnboardingStore, ONBOARDING_STEPS } from '@/stores/onboardingStore'
import { OnboardingProgress } from './OnboardingProgress'

type OnboardingModalProps = {
  children: ReactNode
}

export function OnboardingModal({ children }: OnboardingModalProps) {
  const {
    showOnboarding,
    currentStep,
    completedSteps,
    closeOnboarding,
    skipOnboarding,
    nextStep,
    prevStep,
    finishOnboarding,
  } = useOnboardingStore()

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isCurrentStepCompleted = completedSteps.includes(currentStep)

  const handleNext = () => {
    if (isLastStep) {
      finishOnboarding()
    } else {
      nextStep()
    }
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 24,
    minHeight: 400,
  }

  const leftPanelStyle: CSSProperties = {
    width: 200,
    flexShrink: 0,
    borderRight: '1px solid #f0f0f0',
    paddingRight: 24,
  }

  const rightPanelStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  }

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
  }

  return (
    <Modal
      title={
        <Space>
          <span role="img" aria-label="rocket">
            🚀
          </span>
          <span>欢迎使用 AI 模型测试平台</span>
        </Space>
      }
      open={showOnboarding}
      onCancel={closeOnboarding}
      width={720}
      footer={null}
      destroyOnClose
      maskClosable={false}
      centered
    >
      <div style={containerStyle}>
        <div style={leftPanelStyle}>
          <OnboardingProgress />
        </div>
        <div style={rightPanelStyle}>
          <div style={contentStyle}>{children}</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #f0f0f0',
            }}
          >
            <Button type="text" icon={<X size={16} />} onClick={skipOnboarding}>
              跳过引导
            </Button>
            <Space>
              {!isFirstStep && (
                <Button icon={<ArrowLeft size={16} />} onClick={prevStep}>
                  上一步
                </Button>
              )}
              <Button
                type="primary"
                icon={isLastStep ? undefined : <ArrowRight size={16} />}
                iconPosition="end"
                onClick={handleNext}
                disabled={!isCurrentStepCompleted && !isLastStep}
              >
                {isLastStep ? '完成' : '下一步'}
              </Button>
            </Space>
          </div>
        </div>
      </div>
    </Modal>
  )
}
