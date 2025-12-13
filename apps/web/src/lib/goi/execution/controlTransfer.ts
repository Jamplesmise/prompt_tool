/**
 * GOI 控制权转移模块
 *
 * 功能：
 * - AI 和用户之间的控制权转移
 * - 记录用户手动操作
 * - 支持协作模式
 */

import { create } from 'zustand'

// ============================================
// 类型定义
// ============================================

/**
 * 控制模式
 */
export type ControlMode =
  | 'ai'           // AI 完全控制
  | 'human'        // 用户完全控制
  | 'collaborative' // 协作模式

/**
 * 控制权持有者
 */
export type ControlHolder = 'ai' | 'user'

/**
 * 手动操作类型
 */
export type ManualActionType =
  | 'navigate'  // 导航
  | 'click'     // 点击
  | 'input'     // 输入
  | 'select'    // 选择
  | 'submit'    // 提交
  | 'scroll'    // 滚动
  | 'other'     // 其他

/**
 * 用户手动操作记录
 */
export type ManualAction = {
  /** 操作 ID */
  id: string
  /** 操作时间 */
  timestamp: Date
  /** 操作类型 */
  type: ManualActionType
  /** 操作目标（选择器或描述） */
  target: string
  /** 操作数据 */
  data?: unknown
  /** 操作描述 */
  description?: string
}

/**
 * 控制权状态
 */
export type ControlState = {
  /** 控制模式 */
  mode: ControlMode
  /** 当前控制者 */
  holder: ControlHolder
  /** 控制权转移时间 */
  transferredAt?: Date
  /** 用户手动操作记录 */
  manualActions: ManualAction[]
}

/**
 * 控制权 Actions
 */
export type ControlActions = {
  /** 转移控制权给用户 */
  transferToUser: () => void
  /** 转移控制权给 AI */
  transferToAI: () => void
  /** 记录手动操作 */
  recordManualAction: (action: Omit<ManualAction, 'id' | 'timestamp'>) => void
  /** 清除手动操作记录 */
  clearManualActions: () => void
  /** 设置控制模式 */
  setMode: (mode: ControlMode) => void
  /** 重置状态 */
  reset: () => void
}

// ============================================
// 初始状态
// ============================================

const initialState: ControlState = {
  mode: 'ai',
  holder: 'ai',
  transferredAt: undefined,
  manualActions: [],
}

// ============================================
// Zustand Store
// ============================================

export const useControlStore = create<ControlState & ControlActions>((set, get) => ({
  ...initialState,

  transferToUser: () => {
    set({
      holder: 'user',
      transferredAt: new Date(),
    })
  },

  transferToAI: () => {
    set({
      holder: 'ai',
      transferredAt: new Date(),
    })
  },

  recordManualAction: (action) => {
    const newAction: ManualAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    }
    set((state) => ({
      manualActions: [...state.manualActions, newAction],
    }))
  },

  clearManualActions: () => {
    set({ manualActions: [] })
  },

  setMode: (mode) => {
    set({ mode })
  },

  reset: () => {
    set(initialState)
  },
}))

// ============================================
// 工具函数
// ============================================

/**
 * 接管控制权（用户操作）
 */
export function takeoverControl(): void {
  const store = useControlStore.getState()
  store.transferToUser()
  store.clearManualActions()
}

/**
 * 交还控制权（给 AI）
 *
 * @returns 用户在接管期间的操作记录
 */
export function handbackControl(): ManualAction[] {
  const store = useControlStore.getState()
  const actions = [...store.manualActions]
  store.transferToAI()
  store.clearManualActions()
  return actions
}

/**
 * 检查用户是否在控制
 */
export function isUserInControl(): boolean {
  return useControlStore.getState().holder === 'user'
}

/**
 * 检查 AI 是否在控制
 */
export function isAIInControl(): boolean {
  return useControlStore.getState().holder === 'ai'
}

/**
 * 记录用户点击操作
 */
export function recordClick(target: string, description?: string): void {
  if (!isUserInControl()) return
  useControlStore.getState().recordManualAction({
    type: 'click',
    target,
    description,
  })
}

/**
 * 记录用户输入操作
 */
export function recordInput(target: string, value: unknown, description?: string): void {
  if (!isUserInControl()) return
  useControlStore.getState().recordManualAction({
    type: 'input',
    target,
    data: value,
    description,
  })
}

/**
 * 记录用户选择操作
 */
export function recordSelect(target: string, value: unknown, description?: string): void {
  if (!isUserInControl()) return
  useControlStore.getState().recordManualAction({
    type: 'select',
    target,
    data: value,
    description,
  })
}

/**
 * 记录用户导航操作
 */
export function recordNavigate(target: string, description?: string): void {
  if (!isUserInControl()) return
  useControlStore.getState().recordManualAction({
    type: 'navigate',
    target,
    description,
  })
}

// ============================================
// Hooks
// ============================================

/**
 * 使用控制状态
 */
export function useControlState() {
  return useControlStore((state) => ({
    mode: state.mode,
    holder: state.holder,
    transferredAt: state.transferredAt,
    manualActionsCount: state.manualActions.length,
  }))
}

/**
 * 使用控制操作
 */
export function useControlActions() {
  return useControlStore((state) => ({
    transferToUser: state.transferToUser,
    transferToAI: state.transferToAI,
    recordManualAction: state.recordManualAction,
    clearManualActions: state.clearManualActions,
    setMode: state.setMode,
    reset: state.reset,
  }))
}

/**
 * 使用手动操作记录
 */
export function useManualActions() {
  return useControlStore((state) => state.manualActions)
}
