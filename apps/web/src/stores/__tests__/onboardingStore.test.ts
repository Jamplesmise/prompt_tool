import { describe, it, expect, beforeEach } from 'vitest'
import { useOnboardingStore, ONBOARDING_STEPS } from '../onboardingStore'

describe('onboardingStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useOnboardingStore.setState({
      isFirstVisit: true,
      currentStep: 0,
      completedSteps: [],
      isSkipped: false,
      showOnboarding: false,
      resources: {
        modelConfigId: null,
        promptId: null,
        taskId: null,
      },
    })
  })

  describe('ONBOARDING_STEPS', () => {
    it('应该包含 3 个步骤', () => {
      expect(ONBOARDING_STEPS).toHaveLength(3)
    })

    it('应该有正确的步骤键', () => {
      expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual(['model', 'prompt', 'test'])
    })

    it('每个步骤应该有标题和预计时间', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.title).toBeDefined()
        expect(step.duration).toBeDefined()
      })
    })
  })

  describe('初始状态', () => {
    it('应该默认 isFirstVisit 为 true', () => {
      const { isFirstVisit } = useOnboardingStore.getState()
      expect(isFirstVisit).toBe(true)
    })

    it('应该默认 currentStep 为 0', () => {
      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(0)
    })

    it('应该默认 completedSteps 为空数组', () => {
      const { completedSteps } = useOnboardingStore.getState()
      expect(completedSteps).toEqual([])
    })

    it('应该默认 showOnboarding 为 false', () => {
      const { showOnboarding } = useOnboardingStore.getState()
      expect(showOnboarding).toBe(false)
    })
  })

  describe('startOnboarding', () => {
    it('应该打开引导弹窗', () => {
      const { startOnboarding } = useOnboardingStore.getState()
      startOnboarding()

      const { showOnboarding } = useOnboardingStore.getState()
      expect(showOnboarding).toBe(true)
    })

    it('应该重置 currentStep 为 0', () => {
      useOnboardingStore.setState({ currentStep: 2 })

      const { startOnboarding } = useOnboardingStore.getState()
      startOnboarding()

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(0)
    })
  })

  describe('closeOnboarding', () => {
    it('应该关闭引导弹窗', () => {
      useOnboardingStore.setState({ showOnboarding: true })

      const { closeOnboarding } = useOnboardingStore.getState()
      closeOnboarding()

      const { showOnboarding } = useOnboardingStore.getState()
      expect(showOnboarding).toBe(false)
    })
  })

  describe('nextStep', () => {
    it('应该前进到下一步', () => {
      const { nextStep } = useOnboardingStore.getState()
      nextStep()

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(1)
    })

    it('不应该超过最大步骤数', () => {
      useOnboardingStore.setState({ currentStep: 2 })

      const { nextStep } = useOnboardingStore.getState()
      nextStep()

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(2) // 保持在最后一步
    })
  })

  describe('prevStep', () => {
    it('应该返回上一步', () => {
      useOnboardingStore.setState({ currentStep: 2 })

      const { prevStep } = useOnboardingStore.getState()
      prevStep()

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(1)
    })

    it('不应该低于 0', () => {
      useOnboardingStore.setState({ currentStep: 0 })

      const { prevStep } = useOnboardingStore.getState()
      prevStep()

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(0)
    })
  })

  describe('goToStep', () => {
    it('应该跳转到指定步骤', () => {
      const { goToStep } = useOnboardingStore.getState()
      goToStep(2)

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(2)
    })

    it('应该限制在有效范围内（不低于0）', () => {
      const { goToStep } = useOnboardingStore.getState()
      goToStep(-1)

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(0)
    })

    it('应该限制在有效范围内（不超过最大步骤）', () => {
      const { goToStep } = useOnboardingStore.getState()
      goToStep(10)

      const { currentStep } = useOnboardingStore.getState()
      expect(currentStep).toBe(2) // 最大步骤索引
    })
  })

  describe('completeStep', () => {
    it('应该标记步骤为已完成', () => {
      const { completeStep } = useOnboardingStore.getState()
      completeStep(1)

      const { completedSteps } = useOnboardingStore.getState()
      expect(completedSteps).toContain(1)
    })

    it('不应该重复添加已完成的步骤', () => {
      const { completeStep } = useOnboardingStore.getState()
      completeStep(1)
      completeStep(1)

      const { completedSteps } = useOnboardingStore.getState()
      expect(completedSteps.filter((s) => s === 1)).toHaveLength(1)
    })

    it('应该按顺序排列已完成的步骤', () => {
      const { completeStep } = useOnboardingStore.getState()
      completeStep(2)
      completeStep(0)
      completeStep(1)

      const { completedSteps } = useOnboardingStore.getState()
      expect(completedSteps).toEqual([0, 1, 2])
    })
  })

  describe('skipOnboarding', () => {
    it('应该标记为已跳过并关闭弹窗', () => {
      useOnboardingStore.setState({ showOnboarding: true })

      const { skipOnboarding } = useOnboardingStore.getState()
      skipOnboarding()

      const { isSkipped, showOnboarding, isFirstVisit } = useOnboardingStore.getState()
      expect(isSkipped).toBe(true)
      expect(showOnboarding).toBe(false)
      expect(isFirstVisit).toBe(false)
    })
  })

  describe('finishOnboarding', () => {
    it('应该完成引导并关闭弹窗', () => {
      useOnboardingStore.setState({ showOnboarding: true, currentStep: 2 })

      const { finishOnboarding } = useOnboardingStore.getState()
      finishOnboarding()

      const { isFirstVisit, showOnboarding, completedSteps } = useOnboardingStore.getState()
      expect(isFirstVisit).toBe(false)
      expect(showOnboarding).toBe(false)
      expect(completedSteps).toEqual([0, 1, 2])
    })
  })

  describe('resetOnboarding', () => {
    it('应该重置到初始状态并打开弹窗', () => {
      useOnboardingStore.setState({
        isFirstVisit: false,
        currentStep: 2,
        completedSteps: [0, 1],
        isSkipped: true,
        showOnboarding: false,
        resources: {
          modelConfigId: 'model-1',
          promptId: 'prompt-1',
          taskId: 'task-1',
        },
      })

      const { resetOnboarding } = useOnboardingStore.getState()
      resetOnboarding()

      const state = useOnboardingStore.getState()
      expect(state.isFirstVisit).toBe(false) // 不是真正的首次访问
      expect(state.currentStep).toBe(0)
      expect(state.completedSteps).toEqual([])
      expect(state.isSkipped).toBe(false)
      expect(state.showOnboarding).toBe(true)
    })
  })

  describe('setResource', () => {
    it('应该设置 modelConfigId', () => {
      const { setResource } = useOnboardingStore.getState()
      setResource('modelConfigId', 'model-123')

      const { resources } = useOnboardingStore.getState()
      expect(resources.modelConfigId).toBe('model-123')
    })

    it('应该设置 promptId', () => {
      const { setResource } = useOnboardingStore.getState()
      setResource('promptId', 'prompt-456')

      const { resources } = useOnboardingStore.getState()
      expect(resources.promptId).toBe('prompt-456')
    })

    it('应该设置 taskId', () => {
      const { setResource } = useOnboardingStore.getState()
      setResource('taskId', 'task-789')

      const { resources } = useOnboardingStore.getState()
      expect(resources.taskId).toBe('task-789')
    })
  })

  describe('shouldShowOnboarding', () => {
    it('首次访问且未跳过时应该返回 true', () => {
      useOnboardingStore.setState({ isFirstVisit: true, isSkipped: false })

      const { shouldShowOnboarding } = useOnboardingStore.getState()
      expect(shouldShowOnboarding()).toBe(true)
    })

    it('非首次访问时应该返回 false', () => {
      useOnboardingStore.setState({ isFirstVisit: false, isSkipped: false })

      const { shouldShowOnboarding } = useOnboardingStore.getState()
      expect(shouldShowOnboarding()).toBe(false)
    })

    it('已跳过时应该返回 false', () => {
      useOnboardingStore.setState({ isFirstVisit: true, isSkipped: true })

      const { shouldShowOnboarding } = useOnboardingStore.getState()
      expect(shouldShowOnboarding()).toBe(false)
    })
  })
})
