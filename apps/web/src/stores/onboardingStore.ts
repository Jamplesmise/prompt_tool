import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 引导步骤定义
 */
export const ONBOARDING_STEPS = [
  { key: 'model', title: '配置模型', duration: '约 2 分钟' },
  { key: 'prompt', title: '创建提示词', duration: '约 30 秒' },
  { key: 'test', title: '快速测试', duration: '约 30 秒' },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']

/**
 * 引导过程中创建的资源 ID
 */
type OnboardingResources = {
  modelConfigId: string | null
  promptId: string | null
  taskId: string | null
}

/**
 * 引导状态
 */
type OnboardingState = {
  /** 是否为首次访问 */
  isFirstVisit: boolean
  /** 当前步骤索引 (0-2) */
  currentStep: number
  /** 已完成的步骤索引列表 */
  completedSteps: number[]
  /** 是否已跳过引导 */
  isSkipped: boolean
  /** 是否显示引导弹窗 */
  showOnboarding: boolean
  /** 引导过程中创建的资源 */
  resources: OnboardingResources
}

/**
 * 引导操作
 */
type OnboardingActions = {
  /** 开始引导 */
  startOnboarding: () => void
  /** 跳过引导 */
  skipOnboarding: () => void
  /** 关闭引导弹窗 */
  closeOnboarding: () => void
  /** 前进到下一步 */
  nextStep: () => void
  /** 返回上一步 */
  prevStep: () => void
  /** 跳转到指定步骤 */
  goToStep: (step: number) => void
  /** 标记步骤完成 */
  completeStep: (step: number) => void
  /** 设置资源 ID */
  setResource: <K extends keyof OnboardingResources>(
    key: K,
    value: OnboardingResources[K]
  ) => void
  /** 完成整个引导流程 */
  finishOnboarding: () => void
  /** 重置引导（用于"重新开始引导"） */
  resetOnboarding: () => void
  /** 检查是否应该显示引导 */
  shouldShowOnboarding: () => boolean
}

type OnboardingStore = OnboardingState & OnboardingActions

const initialState: OnboardingState = {
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
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      startOnboarding: () =>
        set({
          showOnboarding: true,
          currentStep: 0,
          isSkipped: false,
        }),

      skipOnboarding: () =>
        set({
          showOnboarding: false,
          isSkipped: true,
          isFirstVisit: false,
        }),

      closeOnboarding: () =>
        set({
          showOnboarding: false,
        }),

      nextStep: () =>
        set((state) => {
          const nextStep = Math.min(state.currentStep + 1, ONBOARDING_STEPS.length - 1)
          return { currentStep: nextStep }
        }),

      prevStep: () =>
        set((state) => {
          const prevStep = Math.max(state.currentStep - 1, 0)
          return { currentStep: prevStep }
        }),

      goToStep: (step) =>
        set({
          currentStep: Math.max(0, Math.min(step, ONBOARDING_STEPS.length - 1)),
        }),

      completeStep: (step) =>
        set((state) => {
          if (state.completedSteps.includes(step)) {
            return state
          }
          return {
            completedSteps: [...state.completedSteps, step].sort((a, b) => a - b),
          }
        }),

      setResource: (key, value) =>
        set((state) => ({
          resources: {
            ...state.resources,
            [key]: value,
          },
        })),

      finishOnboarding: () =>
        set({
          showOnboarding: false,
          isFirstVisit: false,
          isSkipped: false,
          completedSteps: [0, 1, 2],
        }),

      resetOnboarding: () =>
        set({
          ...initialState,
          isFirstVisit: false, // 不是真正的首次访问
          showOnboarding: true,
        }),

      shouldShowOnboarding: () => {
        const state = get()
        return state.isFirstVisit && !state.isSkipped
      },
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({
        isFirstVisit: state.isFirstVisit,
        completedSteps: state.completedSteps,
        isSkipped: state.isSkipped,
        resources: state.resources,
      }),
    }
  )
)
