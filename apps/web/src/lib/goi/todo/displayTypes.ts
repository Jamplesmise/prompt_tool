/**
 * GOI TODO 展示层类型定义
 *
 * 将技术化的 TODO 数据转换为用户友好的展示结构
 */

import type { TodoItemStatus, GoiOperation } from '@platform/shared'

// ============================================
// 展示阶段
// ============================================

/**
 * TODO 分组阶段
 */
export type TodoPhase = 'prepare' | 'select' | 'config' | 'execute' | 'verify'

/**
 * 阶段配置
 */
export const PHASE_CONFIG: Record<
  TodoPhase,
  {
    name: string
    emoji: string
    order: number
  }
> = {
  prepare: { name: '准备工作', emoji: '📝', order: 1 },
  select: { name: '选择资源', emoji: '🔍', order: 2 },
  config: { name: '配置数据', emoji: '⚙️', order: 3 },
  execute: { name: '执行操作', emoji: '▶️', order: 4 },
  verify: { name: '验证结果', emoji: '✅', order: 5 },
}

// ============================================
// 展示用 TODO 项
// ============================================

/**
 * 展示用 TODO 项
 */
export type DisplayTodoItem = {
  /** 唯一标识 */
  id: string
  /** 用户可读标签 */
  userLabel: string
  /** 值标签（如 "→ sentiment-analysis-v2"） */
  valueLabel?: string
  /** 提示说明（如 "💡 这是你指定的情感分析prompt"） */
  hint?: string
  /** 当前状态 */
  status: TodoItemStatus
  /** 状态图标 */
  statusIcon: string
  /** 是否关键步骤 */
  isKeyStep: boolean
  /** 是否需要确认 */
  requiresConfirm: boolean
  /** 预计耗时（秒） */
  estimatedSeconds: number
  /** 操作类别（用于结果展示） */
  category?: 'access' | 'state' | 'observation'
  /** 执行结果（用于展示摘要） */
  result?: unknown
  /** 错误信息 */
  error?: string
  /** 原始数据（调试用） */
  _raw?: {
    operation: GoiOperation
    technicalLabel: string
  }
}

/**
 * 状态图标映射
 */
export const STATUS_ICONS: Record<TodoItemStatus, string> = {
  pending: '☐',
  in_progress: '◉',
  waiting: '⏳',
  completed: '✓',
  failed: '✗',
  skipped: '⏭',
  replanned: '↻',
}

// ============================================
// TODO 分组
// ============================================

/**
 * TODO 分组
 */
export type TodoGroup = {
  /** 分组 ID */
  id: string
  /** 分组名称（如"准备工作"） */
  name: string
  /** 分组图标 */
  emoji: string
  /** 分组阶段 */
  phase: TodoPhase
  /** 分组内的 TODO 项 */
  items: DisplayTodoItem[]
  /** 是否折叠 */
  collapsed: boolean
}

// ============================================
// 整体展示数据
// ============================================

/**
 * TODO 展示数据
 */
export type TodoDisplayData = {
  /** 标题（如"创建测试任务"） */
  title: string
  /** 总步骤数 */
  totalSteps: number
  /** 已完成步骤数 */
  completedSteps: number
  /** 进度百分比（0-100） */
  progress: number
  /** 预计总耗时（秒） */
  estimatedTotalSeconds: number
  /** 预计剩余时间（秒） */
  estimatedRemainingSeconds: number
  /** 分组列表 */
  groups: TodoGroup[]
}

// ============================================
// 转换输入类型
// ============================================

/**
 * 标签转换结果
 */
export type LabelConversionResult = {
  /** 用户可读标签 */
  userLabel: string
  /** 值标签 */
  valueLabel?: string
  /** 提示说明 */
  hint?: string
  /** 技术标签（调试用） */
  technicalLabel: string
}

/**
 * 分组定义
 */
export type GroupDefinition = {
  /** 分组 ID */
  id: string
  /** 分组名称 */
  name: string
  /** 分组图标 */
  emoji: string
  /** 分组阶段 */
  phase: TodoPhase
  /** 匹配函数 */
  matchOperations: (op: GoiOperation) => boolean
}
