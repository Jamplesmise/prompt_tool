/**
 * GOI 执行进度同步模块
 *
 * 使用 Zustand 管理执行状态，实现 UI 实时同步更新
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { TaskPlan, PlanStep, StepStatus } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 执行状态枚举
 */
export type ExecutionStatus =
  | 'idle'       // 空闲
  | 'planning'   // 规划中
  | 'ready'      // 准备就绪
  | 'executing'  // 执行中
  | 'paused'     // 已暂停
  | 'checkpoint' // 等待检查点确认
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'aborted'    // 已中止

/**
 * 进度信息
 */
export type ProgressInfo = {
  /** 已完成步骤数 */
  completed: number
  /** 总步骤数 */
  total: number
  /** 完成百分比 */
  percentage: number
  /** 预估剩余时间（秒） */
  estimatedRemaining?: number
}

/**
 * 执行状态
 */
export type ExecutionState = {
  // ---- 计划相关 ----
  /** 当前计划 */
  plan: TaskPlan | null
  /** 当前步骤 ID */
  currentStepId: string | null
  /** 当前步骤索引 */
  currentStepIndex: number

  // ---- 可视化相关 ----
  /** 高亮目标选择器 */
  highlightTarget: string | null
  /** 操作消息 */
  actionMessage: string | null
  /** 操作图标 */
  actionIcon: string
  /** 是否显示点击效果 */
  showClickEffect: boolean

  // ---- 进度相关 ----
  /** 进度信息 */
  progress: ProgressInfo

  // ---- 状态相关 ----
  /** 执行状态 */
  status: ExecutionStatus
  /** 错误信息 */
  error: string | null
  /** 开始时间 */
  startedAt: Date | null
  /** 完成时间 */
  completedAt: Date | null
}

/**
 * 执行状态 Actions
 */
export type ExecutionActions = {
  // ---- 计划管理 ----
  /** 设置计划 */
  setPlan: (plan: TaskPlan) => void
  /** 清除计划 */
  clearPlan: () => void

  // ---- 步骤执行 ----
  /** 开始步骤 */
  startStep: (stepId: string, target: string, message: string, icon?: string) => void
  /** 完成步骤 */
  completeStep: (stepId: string, resultData?: Record<string, unknown>) => void
  /** 步骤失败 */
  failStep: (stepId: string, error: string) => void
  /** 跳过步骤 */
  skipStep: (stepId: string, reason?: string) => void

  // ---- 可视化控制 ----
  /** 显示点击效果 */
  showClick: () => void
  /** 隐藏点击效果 */
  hideClick: () => void
  /** 更新高亮目标 */
  setHighlightTarget: (target: string | null) => void
  /** 更新操作消息 */
  setActionMessage: (message: string | null, icon?: string) => void

  // ---- 状态控制 ----
  /** 设置执行状态 */
  setStatus: (status: ExecutionStatus) => void
  /** 设置错误 */
  setError: (error: string | null) => void

  // ---- 其他 ----
  /** 重置状态 */
  reset: () => void
}

// ============================================
// 初始状态
// ============================================

const initialState: ExecutionState = {
  plan: null,
  currentStepId: null,
  currentStepIndex: -1,
  highlightTarget: null,
  actionMessage: null,
  actionIcon: '🤖',
  showClickEffect: false,
  progress: { completed: 0, total: 0, percentage: 0 },
  status: 'idle',
  error: null,
  startedAt: null,
  completedAt: null,
}

// ============================================
// Zustand Store
// ============================================

export const useExecutionStore = create<ExecutionState & ExecutionActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ---- 计划管理 ----
    setPlan: (plan) => {
      set({
        plan,
        progress: {
          completed: 0,
          total: plan.steps.length,
          percentage: 0,
          estimatedRemaining: plan.estimatedTotalSeconds,
        },
        status: 'ready',
        error: null,
        startedAt: null,
        completedAt: null,
      })
    },

    clearPlan: () => {
      set({
        plan: null,
        currentStepId: null,
        currentStepIndex: -1,
        progress: { completed: 0, total: 0, percentage: 0 },
      })
    },

    // ---- 步骤执行 ----
    startStep: (stepId, target, message, icon = '🤖') => {
      const state = get()
      const plan = state.plan
      if (!plan) return

      const stepIndex = plan.steps.findIndex((s) => s.id === stepId)

      // 更新步骤状态
      const updatedSteps = plan.steps.map((s) =>
        s.id === stepId
          ? { ...s, status: 'executing' as StepStatus, startedAt: new Date() }
          : s
      )

      set({
        plan: { ...plan, steps: updatedSteps },
        currentStepId: stepId,
        currentStepIndex: stepIndex,
        highlightTarget: target,
        actionMessage: message,
        actionIcon: icon,
        showClickEffect: false,
        status: 'executing',
        startedAt: state.startedAt || new Date(),
      })
    },

    completeStep: (stepId, resultData) => {
      const state = get()
      const plan = state.plan
      if (!plan) return

      // 更新步骤状态
      const updatedSteps = plan.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              status: 'completed' as StepStatus,
              completedAt: new Date(),
              resultData,
            }
          : s
      )

      const completed = updatedSteps.filter(
        (s) => s.status === 'completed'
      ).length
      const skipped = updatedSteps.filter(
        (s) => s.status === 'skipped'
      ).length
      const total = plan.steps.length
      const done = completed + skipped

      // 计算预估剩余时间
      const remainingSteps = updatedSteps.filter(
        (s) => s.status === 'pending' || s.status === 'ready'
      )
      const estimatedRemaining = remainingSteps.reduce(
        (sum, s) => sum + s.estimatedSeconds,
        0
      )

      // 检查是否全部完成
      const allDone = done === total
      const newStatus = allDone ? 'completed' : state.status

      set({
        plan: { ...plan, steps: updatedSteps },
        currentStepId: allDone ? null : state.currentStepId,
        highlightTarget: allDone ? null : state.highlightTarget,
        actionMessage: allDone ? null : state.actionMessage,
        progress: {
          completed,
          total,
          percentage: Math.round((done / total) * 100),
          estimatedRemaining,
        },
        status: newStatus,
        completedAt: allDone ? new Date() : null,
      })
    },

    failStep: (stepId, error) => {
      const state = get()
      const plan = state.plan
      if (!plan) return

      // 更新步骤状态
      const updatedSteps = plan.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              status: 'failed' as StepStatus,
              completedAt: new Date(),
              error,
            }
          : s
      )

      // 标记依赖此步骤的后续步骤为 blocked
      const failedStep = plan.steps.find((s) => s.id === stepId)
      if (failedStep) {
        plan.steps.forEach((s) => {
          if (s.dependencies.includes(stepId)) {
            const idx = updatedSteps.findIndex((us) => us.id === s.id)
            if (idx !== -1) {
              updatedSteps[idx] = {
                ...updatedSteps[idx],
                status: 'blocked' as StepStatus,
                blockedBy: stepId,
              }
            }
          }
        })
      }

      set({
        plan: { ...plan, steps: updatedSteps },
        status: 'failed',
        error,
        highlightTarget: null,
        actionMessage: null,
      })
    },

    skipStep: (stepId, reason) => {
      const state = get()
      const plan = state.plan
      if (!plan) return

      const updatedSteps = plan.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              status: 'skipped' as StepStatus,
              completedAt: new Date(),
              skipCondition: reason,
            }
          : s
      )

      const completed = updatedSteps.filter(
        (s) => s.status === 'completed'
      ).length
      const skipped = updatedSteps.filter(
        (s) => s.status === 'skipped'
      ).length
      const total = plan.steps.length
      const done = completed + skipped

      set({
        plan: { ...plan, steps: updatedSteps },
        progress: {
          completed,
          total,
          percentage: Math.round((done / total) * 100),
        },
      })
    },

    // ---- 可视化控制 ----
    showClick: () => set({ showClickEffect: true }),
    hideClick: () => set({ showClickEffect: false }),

    setHighlightTarget: (target) => set({ highlightTarget: target }),

    setActionMessage: (message, icon) =>
      set({
        actionMessage: message,
        ...(icon && { actionIcon: icon }),
      }),

    // ---- 状态控制 ----
    setStatus: (status) => set({ status }),

    setError: (error) =>
      set({
        error,
        status: error ? 'failed' : get().status,
      }),

    // ---- 其他 ----
    reset: () => set(initialState),
  }))
)

// ============================================
// 选择器 Hooks
// ============================================

/**
 * 获取当前步骤
 */
export function useCurrentStep(): PlanStep | null {
  return useExecutionStore((state) => {
    if (!state.plan || !state.currentStepId) return null
    return state.plan.steps.find((s) => s.id === state.currentStepId) || null
  })
}

/**
 * 获取进度信息
 */
export function useProgress() {
  return useExecutionStore((state) => state.progress)
}

/**
 * 获取执行状态
 */
export function useExecutionStatus() {
  return useExecutionStore((state) => state.status)
}

/**
 * 检查是否正在执行
 */
export function useIsExecuting() {
  return useExecutionStore(
    (state) => state.status === 'executing' || state.status === 'checkpoint'
  )
}

/**
 * 获取可视化状态
 */
export function useVisualization() {
  return useExecutionStore((state) => ({
    highlightTarget: state.highlightTarget,
    actionMessage: state.actionMessage,
    actionIcon: state.actionIcon,
    showClickEffect: state.showClickEffect,
  }))
}
