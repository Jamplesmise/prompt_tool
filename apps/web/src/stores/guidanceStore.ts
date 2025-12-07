import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 提示管理状态
 */
type GuidanceState = {
  /** 已关闭的提示 ID（当前会话） */
  dismissedTips: string[]
  /** 永久关闭的提示 ID（不再提示） */
  permanentlyDismissedTips: string[]
  /** 活跃的提示 ID 列表 */
  activeTips: string[]
}

/**
 * 提示管理操作
 */
type GuidanceActions = {
  /** 显示提示 */
  showTip: (tipId: string) => void
  /** 关闭提示（当前会话） */
  dismissTip: (tipId: string) => void
  /** 永久关闭提示（不再提示） */
  dismissTipPermanently: (tipId: string) => void
  /** 检查是否应该显示提示 */
  shouldShowTip: (tipId: string) => boolean
  /** 重置所有提示状态 */
  resetTips: () => void
  /** 清除会话内的关闭状态（刷新后重置） */
  clearSessionDismissed: () => void
}

type GuidanceStore = GuidanceState & GuidanceActions

const initialState: GuidanceState = {
  dismissedTips: [],
  permanentlyDismissedTips: [],
  activeTips: [],
}

export const useGuidanceStore = create<GuidanceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      showTip: (tipId) =>
        set((state) => {
          if (state.activeTips.includes(tipId)) {
            return state
          }
          return {
            activeTips: [...state.activeTips, tipId],
          }
        }),

      dismissTip: (tipId) =>
        set((state) => ({
          dismissedTips: state.dismissedTips.includes(tipId)
            ? state.dismissedTips
            : [...state.dismissedTips, tipId],
          activeTips: state.activeTips.filter((id) => id !== tipId),
        })),

      dismissTipPermanently: (tipId) =>
        set((state) => ({
          permanentlyDismissedTips: state.permanentlyDismissedTips.includes(tipId)
            ? state.permanentlyDismissedTips
            : [...state.permanentlyDismissedTips, tipId],
          dismissedTips: state.dismissedTips.filter((id) => id !== tipId),
          activeTips: state.activeTips.filter((id) => id !== tipId),
        })),

      shouldShowTip: (tipId) => {
        const state = get()
        // 永久关闭的不显示
        if (state.permanentlyDismissedTips.includes(tipId)) {
          return false
        }
        // 当前会话关闭的不显示
        if (state.dismissedTips.includes(tipId)) {
          return false
        }
        return true
      },

      resetTips: () =>
        set({
          dismissedTips: [],
          permanentlyDismissedTips: [],
          activeTips: [],
        }),

      clearSessionDismissed: () =>
        set({
          dismissedTips: [],
          activeTips: [],
        }),
    }),
    {
      name: 'guidance-storage',
      // 只持久化永久关闭的提示
      partialize: (state) => ({
        permanentlyDismissedTips: state.permanentlyDismissedTips,
      }),
    }
  )
)

/**
 * 预定义的提示 ID
 */
export const TIP_IDS = {
  // 提示词相关
  PROMPT_SAVED: 'prompt-saved-test-suggestion',
  PROMPT_VERSION_PUBLISHED: 'prompt-version-published',

  // 数据集相关
  DATASET_UPLOADED: 'dataset-uploaded-task-suggestion',
  DATASET_EMPTY: 'dataset-empty-warning',

  // 模型相关
  MODEL_CONFIGURED: 'model-configured-usage-suggestion',
  MODEL_TEST_FAILED: 'model-test-failed',

  // 任务相关
  TASK_COMPLETED: 'task-completed-analysis',
  TASK_FAILED: 'task-failed-suggestion',
} as const

export type TipId = (typeof TIP_IDS)[keyof typeof TIP_IDS]
