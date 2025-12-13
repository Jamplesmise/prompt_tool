/**
 * GOI 人机协作系统类型定义
 *
 * 协作系统支持三种运行模式：
 * - 纯人工模式：AI 不参与，只记录操作
 * - AI 辅助模式：AI 提供建议，关键操作需确认
 * - AI 自动模式：AI 自动执行，仅在预设检查点暂停
 */

import type { EventSource } from './events'
import type { TodoItem, TodoList } from './todoItem'

// ============================================
// 运行模式
// ============================================

/**
 * 运行模式
 */
export type CollaborationMode =
  | 'manual'    // 纯人工模式
  | 'assisted'  // AI 辅助模式（推荐）
  | 'auto'      // AI 自动模式

/**
 * 控制权持有者
 */
export type Controller = 'user' | 'ai'

/**
 * 模式配置
 */
export type ModeConfig = {
  /** 模式 */
  mode: CollaborationMode
  /** 模式描述 */
  description: string
  /** 检查点策略描述 */
  checkpointPolicy: string
  /** 适用场景 */
  useCases: string[]
}

/**
 * 预置模式配置
 */
export const MODE_CONFIGS: Record<CollaborationMode, ModeConfig> = {
  manual: {
    mode: 'manual',
    description: '纯人工模式',
    checkpointPolicy: 'AI 不参与执行，只观察和学习',
    useCases: ['完全手动操作', '不需要 AI 协助时'],
  },
  assisted: {
    mode: 'assisted',
    description: 'AI 辅助模式（推荐）',
    checkpointPolicy: '根据规则判断是否需要确认',
    useCases: ['日常操作', '需要 AI 建议但保持控制'],
  },
  auto: {
    mode: 'auto',
    description: 'AI 自动模式',
    checkpointPolicy: '除删除外都自动执行',
    useCases: ['批量操作', '重复性任务', '信任 AI 决策'],
  },
}

// ============================================
// 协作状态
// ============================================

/**
 * AI 对当前状态的理解
 */
export type AIUnderstanding = {
  /** 理解摘要 */
  summary: string
  /** 当前用户目标 */
  currentGoal?: string
  /** 已选择的资源 */
  selectedResources: Array<{
    id: string
    type: string
    name: string
  }>
  /** 当前页面 */
  currentPage?: string
  /** 当前操作阶段 */
  currentPhase?: string
  /** 置信度 (0-100) */
  confidence: number
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 协作会话状态
 */
export type CollaborationStatus = {
  /** 会话 ID */
  sessionId: string
  /** 运行模式 */
  mode: CollaborationMode
  /** 当前控制权持有者 */
  controller: Controller
  /** AI 的理解状态 */
  aiUnderstanding: AIUnderstanding
  /** TODO 列表进度 */
  todoProgress: {
    /** 已完成数 */
    completed: number
    /** 总数 */
    total: number
    /** 失败数 */
    failed: number
  }
  /** 是否有待处理检查点 */
  hasPendingCheckpoint: boolean
  /** 上下文使用量 (0-100) */
  contextUsage: number
  /** 是否暂停 */
  isPaused: boolean
  /** 暂停原因 */
  pauseReason?: string
  /** 最后活动时间 */
  lastActivityAt: Date
}

// ============================================
// 控制权转移
// ============================================

/**
 * 控制权转移原因
 */
export type TransferReason =
  | 'user_request'       // 用户主动请求
  | 'checkpoint_reject'  // 检查点被拒绝
  | 'checkpoint_takeover' // 用户选择接管
  | 'ai_complete'        // AI 完成任务
  | 'ai_blocked'         // AI 遇到阻塞
  | 'ai_error'           // AI 执行出错
  | 'timeout'            // 超时
  | 'mode_change'        // 模式切换

/**
 * 控制权转移请求
 */
export type ControlTransferRequest = {
  /** 会话 ID */
  sessionId: string
  /** 转移目标 */
  to: Controller
  /** 转移原因 */
  reason: TransferReason
  /** 附加信息 */
  message?: string
  /** 相关检查点 ID */
  checkpointId?: string
}

/**
 * 控制权转移结果
 */
export type ControlTransferResult = {
  /** 是否成功 */
  success: boolean
  /** 原控制者 */
  from: Controller
  /** 新控制者 */
  to: Controller
  /** 转移时间 */
  transferredAt: Date
  /** 失败原因 */
  error?: string
}

// ============================================
// 同步事件
// ============================================

/**
 * 同步事件类型
 */
export type SyncEventType =
  | 'user_operation'      // 用户操作
  | 'ai_operation'        // AI 操作
  | 'state_change'        // 状态变更
  | 'checkpoint_created'  // 检查点创建
  | 'checkpoint_resolved' // 检查点解决
  | 'todo_updated'        // TODO 更新
  | 'understanding_updated' // 理解更新

/**
 * 同步事件
 */
export type SyncEvent = {
  /** 事件类型 */
  type: SyncEventType
  /** 事件来源 */
  source: EventSource
  /** 事件数据 */
  data: unknown
  /** 时间戳 */
  timestamp: Date
}

// ============================================
// Copilot 面板状态
// ============================================

/**
 * Copilot 面板状态
 */
export type CopilotPanelState = {
  /** 是否打开 */
  isOpen: boolean
  /** 面板宽度 */
  width: number
  /** 是否固定 */
  isPinned: boolean
  /** 活动标签页 */
  activeTab: 'todo' | 'understanding' | 'history'
}

/**
 * Copilot 状态
 */
export type CopilotState = {
  /** 会话 ID */
  sessionId: string | null
  /** 运行模式 */
  mode: CollaborationMode
  /** 控制权 */
  controller: Controller
  /** AI 理解 */
  understanding: AIUnderstanding
  /** TODO 列表 */
  todoList: TodoList | null
  /** 当前 TODO 项 */
  currentTodoItem: TodoItem | null
  /** 待处理检查点 */
  pendingCheckpoint: PendingCheckpointState | null
  /** 上下文使用量 */
  contextUsage: number
  /** 是否连接 */
  isConnected: boolean
  /** 是否加载中 */
  isLoading: boolean
  /** 错误信息 */
  error: string | null
  /** 面板状态 */
  panelState: CopilotPanelState
}

/**
 * 待处理检查点状态（UI 用）
 */
export type PendingCheckpointState = {
  /** 检查点 ID */
  id: string
  /** 关联的 TODO Item */
  todoItem: TodoItem
  /** 原因 */
  reason: string
  /** 预览数据 */
  preview?: unknown
  /** 选项 */
  options: Array<{
    id: string
    label: string
    description?: string
  }>
  /** 创建时间 */
  createdAt: Date
  /** 剩余时间（秒） */
  remainingTime?: number
}

// ============================================
// API 请求/响应类型
// ============================================

/**
 * 获取协作状态请求
 */
export type GetCollaborationStatusRequest = {
  sessionId: string
}

/**
 * 切换模式请求
 */
export type SwitchModeRequest = {
  sessionId: string
  mode: CollaborationMode
}

/**
 * 发送命令请求
 */
export type SendCommandRequest = {
  sessionId: string
  command: string
  context?: Record<string, unknown>
}

/**
 * 发送命令响应
 */
export type SendCommandResponse = {
  /** 是否接受 */
  accepted: boolean
  /** 响应消息 */
  message: string
  /** 生成的 TODO List ID */
  todoListId?: string
  /** 错误信息 */
  error?: string
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建初始 AI 理解状态
 */
export function createInitialUnderstanding(): AIUnderstanding {
  return {
    summary: '等待用户操作...',
    selectedResources: [],
    confidence: 0,
    updatedAt: new Date(),
  }
}

/**
 * 创建初始协作状态
 */
export function createInitialCollaborationStatus(sessionId: string): CollaborationStatus {
  return {
    sessionId,
    mode: 'assisted',
    controller: 'user',
    aiUnderstanding: createInitialUnderstanding(),
    todoProgress: {
      completed: 0,
      total: 0,
      failed: 0,
    },
    hasPendingCheckpoint: false,
    contextUsage: 0,
    isPaused: false,
    lastActivityAt: new Date(),
  }
}

/**
 * 创建初始 Copilot 状态
 */
export function createInitialCopilotState(): CopilotState {
  return {
    sessionId: null,
    mode: 'assisted',
    controller: 'user',
    understanding: createInitialUnderstanding(),
    todoList: null,
    currentTodoItem: null,
    pendingCheckpoint: null,
    contextUsage: 0,
    isConnected: false,
    isLoading: false,
    error: null,
    panelState: {
      isOpen: false,
      width: 360,
      isPinned: false,
      activeTab: 'todo',
    },
  }
}

/**
 * 判断是否可以切换到指定模式
 */
export function canSwitchMode(
  currentMode: CollaborationMode,
  targetMode: CollaborationMode,
  controller: Controller
): boolean {
  // 如果是同一模式，无需切换
  if (currentMode === targetMode) return false

  // 从自动模式切换时，需要先确保 AI 不在执行中
  if (currentMode === 'auto' && controller === 'ai') {
    return false
  }

  return true
}

/**
 * 判断是否应该自动切换控制权
 */
export function shouldAutoTransferControl(
  mode: CollaborationMode,
  event: SyncEventType,
  currentController: Controller
): Controller | null {
  // 手动模式下，始终由用户控制
  if (mode === 'manual') {
    return currentController === 'user' ? null : 'user'
  }

  // 自动模式下，用户操作时暂时切换
  if (mode === 'auto') {
    if (event === 'user_operation' && currentController === 'ai') {
      // 可以考虑短暂让用户操作，然后自动恢复
      return null
    }
  }

  return null
}
