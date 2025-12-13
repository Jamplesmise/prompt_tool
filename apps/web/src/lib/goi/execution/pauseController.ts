/**
 * GOI 暂停控制器
 *
 * 功能：
 * - 暂停信号处理
 * - 暂停状态管理
 * - 暂停检查点
 */

import { create } from 'zustand'

// ============================================
// 类型定义
// ============================================

/**
 * 暂停原因
 */
export type PauseReason = 'user_request' | 'checkpoint' | 'error'

/**
 * 暂停状态
 */
export type PauseState = {
  /** 是否已暂停 */
  isPaused: boolean
  /** 是否正在暂停（等待当前操作完成） */
  isPausing: boolean
  /** 暂停时间 */
  pausedAt?: Date
  /** 暂停时的步骤 ID */
  pausedAtStepId?: string
  /** 暂停原因 */
  pauseReason?: PauseReason
}

/**
 * 暂停控制器 Actions
 */
export type PauseActions = {
  /** 请求暂停（返回 Promise，在实际暂停后 resolve） */
  requestPause: (reason?: PauseReason) => Promise<void>
  /** 确认已暂停 */
  confirmPaused: (stepId: string) => void
  /** 恢复执行 */
  resume: () => void
  /** 重置状态 */
  reset: () => void
}

// ============================================
// 内部状态
// ============================================

let pauseResolve: (() => void) | null = null

// ============================================
// 初始状态
// ============================================

const initialState: PauseState = {
  isPaused: false,
  isPausing: false,
  pausedAt: undefined,
  pausedAtStepId: undefined,
  pauseReason: undefined,
}

// ============================================
// Zustand Store
// ============================================

export const usePauseStore = create<PauseState & PauseActions>((set, get) => ({
  ...initialState,

  requestPause: async (reason = 'user_request') => {
    const state = get()

    // 如果已经暂停或正在暂停，直接返回
    if (state.isPaused || state.isPausing) {
      return
    }

    set({ isPausing: true, pauseReason: reason })

    // 等待执行器确认暂停
    return new Promise<void>((resolve) => {
      pauseResolve = resolve
    })
  },

  confirmPaused: (stepId: string) => {
    set({
      isPaused: true,
      isPausing: false,
      pausedAt: new Date(),
      pausedAtStepId: stepId,
    })

    // 通知等待者暂停已完成
    if (pauseResolve) {
      pauseResolve()
      pauseResolve = null
    }
  },

  resume: () => {
    set({
      isPaused: false,
      isPausing: false,
      pausedAt: undefined,
      pausedAtStepId: undefined,
      pauseReason: undefined,
    })
  },

  reset: () => {
    set(initialState)

    // 清理等待的 Promise
    if (pauseResolve) {
      pauseResolve()
      pauseResolve = null
    }
  },
}))

// ============================================
// 工具函数
// ============================================

/**
 * 暂停检查点 - 在执行步骤间调用
 *
 * @returns 是否应该暂停
 */
export function checkPausePoint(): boolean {
  const state = usePauseStore.getState()
  return state.isPausing
}

/**
 * 确认已暂停
 */
export function confirmPaused(stepId: string): void {
  usePauseStore.getState().confirmPaused(stepId)
}

/**
 * 检查是否已暂停
 */
export function isPaused(): boolean {
  return usePauseStore.getState().isPaused
}

/**
 * 检查是否正在暂停
 */
export function isPausing(): boolean {
  return usePauseStore.getState().isPausing
}

// ============================================
// Hooks
// ============================================

/**
 * 使用暂停状态
 */
export function usePauseState() {
  return usePauseStore((state) => ({
    isPaused: state.isPaused,
    isPausing: state.isPausing,
    pausedAt: state.pausedAt,
    pausedAtStepId: state.pausedAtStepId,
    pauseReason: state.pauseReason,
  }))
}

/**
 * 使用暂停操作
 */
export function usePauseActions() {
  return usePauseStore((state) => ({
    requestPause: state.requestPause,
    confirmPaused: state.confirmPaused,
    resume: state.resume,
    reset: state.reset,
  }))
}
