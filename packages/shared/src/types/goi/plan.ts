/**
 * GOI (Guided Orchestration Intelligence) 任务计划类型定义
 *
 * 支持多步任务规划，包括：
 * - 任务计划：将用户目标拆解为可执行步骤
 * - 依赖关系：步骤之间的执行依赖
 * - 检查点：需要用户确认的关键节点
 * - 资源需求：计划执行需要的资源
 */

import type { GoiOperation } from './operations'
import type { ResourceType } from './events'

// ============================================
// 步骤状态与检查点类型
// ============================================

/**
 * 步骤状态
 */
export type StepStatus =
  | 'pending'      // 待执行
  | 'ready'        // 可执行（依赖已满足）
  | 'executing'    // 执行中
  | 'checkpoint'   // 等待确认
  | 'completed'    // 已完成
  | 'skipped'      // 已跳过
  | 'failed'       // 失败
  | 'blocked'      // 被阻塞（依赖失败）

/**
 * 计划检查点类型（区别于 todoItem 中的 CheckpointType）
 */
export type PlanCheckpointType =
  | 'resource_selection'  // 选择关键资源（prompt, dataset, model）
  | 'irreversible_action' // 不可逆操作（删除、提交）
  | 'cost_incurring'      // 涉及费用（调用 LLM）
  | 'first_time'          // 首次执行此类操作
  | 'user_defined'        // 用户自定义检查点

// ============================================
// 计划步骤
// ============================================

/**
 * 计划步骤
 */
export type PlanStep = {
  /** 步骤 ID */
  id: string
  /** 执行顺序 */
  order: number
  /** 具体操作 */
  operation: GoiOperation
  /** 用户可读描述 */
  userLabel: string
  /** 技术描述（用于调试） */
  technicalLabel?: string
  /** 操作提示 */
  hint?: string

  // 依赖关系
  /** 依赖的步骤 ID 列表 */
  dependencies: string[]
  /** 被哪个失败的步骤阻塞 */
  blockedBy?: string

  // 检查点
  /** 是否为检查点 */
  isCheckpoint: boolean
  /** 检查点类型 */
  checkpointType?: PlanCheckpointType
  /** 检查点原因说明 */
  checkpointReason?: string

  // 状态
  /** 当前状态 */
  status: StepStatus
  /** 开始执行时间 */
  startedAt?: Date
  /** 完成时间 */
  completedAt?: Date
  /** 错误信息 */
  error?: string
  /** 执行结果数据 */
  resultData?: Record<string, unknown>

  // 元数据
  /** 预估耗时（秒） */
  estimatedSeconds: number
  /** 是否可跳过 */
  isOptional: boolean
  /** 跳过条件描述 */
  skipCondition?: string
  /** 所属分组 ID */
  group?: string
}

// ============================================
// 资源需求
// ============================================

/**
 * 资源需求
 */
export type ResourceRequirement = {
  /** 资源类型 */
  type: ResourceType
  /** 用户指定的名称（可能模糊） */
  name?: string
  /** 解析后的资源 */
  resolved?: {
    /** 资源 ID */
    id: string
    /** 资源名称 */
    name: string
    /** 匹配置信度 (0-1) */
    confidence: number
  }
  /** 是否必需 */
  isRequired: boolean
  /** 默认值 */
  defaultValue?: string
}

// ============================================
// 计划分组
// ============================================

/**
 * 计划分组（用于 UI 展示）
 */
export type PlanGroup = {
  /** 分组 ID */
  id: string
  /** 分组名称 */
  name: string
  /** 分组图标 */
  emoji: string
  /** 包含的步骤 ID */
  stepIds: string[]
  /** 是否折叠 */
  collapsed: boolean
}

// ============================================
// 任务计划
// ============================================

/**
 * 任务计划
 */
export type TaskPlan = {
  /** 计划 ID */
  id: string

  // 目标
  /** 用户原始输入 */
  goal: string
  /** AI 理解的摘要 */
  summary: string

  // 步骤
  /** 步骤列表 */
  steps: PlanStep[]
  /** 步骤分组 */
  groups: PlanGroup[]

  // 资源
  /** 需要的资源 */
  requiredResources: ResourceRequirement[]

  // 检查点
  /** 检查点步骤 ID 列表 */
  checkpointStepIds: string[]

  // 预估
  /** 预计总耗时（秒） */
  estimatedTotalSeconds: number

  // 元数据
  /** 使用的模板 ID（如果有） */
  templateId?: string
  /** 规划方式 */
  planSource: 'template' | 'llm' | 'hybrid'

  // 时间戳
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

// ============================================
// 步骤执行结果
// ============================================

/**
 * 步骤执行结果
 */
export type StepResult = {
  /** 是否成功 */
  success: boolean
  /** 结果数据 */
  data?: Record<string, unknown>
  /** 错误信息 */
  error?: string
  /** 执行耗时（毫秒） */
  duration: number
}

// ============================================
// 计划执行统计
// ============================================

/**
 * 计划执行统计
 */
export type PlanExecutionStats = {
  /** 总步骤数 */
  totalSteps: number
  /** 已完成步骤数 */
  completedSteps: number
  /** 跳过的步骤数 */
  skippedSteps: number
  /** 失败的步骤数 */
  failedSteps: number
  /** 被阻塞的步骤数 */
  blockedSteps: number
  /** 待执行步骤数 */
  pendingSteps: number
  /** 完成百分比 */
  progressPercent: number
  /** 实际总耗时（毫秒） */
  totalDuration: number
}

// ============================================
// 辅助函数
// ============================================

/**
 * 计算计划执行统计
 */
export function calculatePlanStats(plan: TaskPlan): PlanExecutionStats {
  const steps = plan.steps
  const completed = steps.filter(s => s.status === 'completed').length
  const skipped = steps.filter(s => s.status === 'skipped').length
  const failed = steps.filter(s => s.status === 'failed').length
  const blocked = steps.filter(s => s.status === 'blocked').length
  const pending = steps.filter(s => s.status === 'pending' || s.status === 'ready').length

  const totalDuration = steps
    .filter(s => s.startedAt && s.completedAt)
    .reduce((sum, s) => {
      const start = new Date(s.startedAt!).getTime()
      const end = new Date(s.completedAt!).getTime()
      return sum + (end - start)
    }, 0)

  return {
    totalSteps: steps.length,
    completedSteps: completed,
    skippedSteps: skipped,
    failedSteps: failed,
    blockedSteps: blocked,
    pendingSteps: pending,
    progressPercent: steps.length > 0 ? Math.round(((completed + skipped) / steps.length) * 100) : 0,
    totalDuration,
  }
}

/**
 * 获取下一个可执行的步骤
 */
export function getNextExecutableStep(plan: TaskPlan): PlanStep | null {
  const completedIds = new Set(
    plan.steps.filter(s => s.status === 'completed' || s.status === 'skipped').map(s => s.id)
  )

  for (const step of plan.steps) {
    if (step.status !== 'pending' && step.status !== 'ready') continue

    const allDepsCompleted = step.dependencies.every(dep => completedIds.has(dep))
    if (allDepsCompleted) {
      return step
    }
  }

  return null
}

/**
 * 检查计划是否完成
 */
export function isPlanCompleted(plan: TaskPlan): boolean {
  return plan.steps.every(
    s => s.status === 'completed' || s.status === 'skipped' || s.status === 'failed' || s.status === 'blocked'
  )
}

/**
 * 检查计划是否成功完成
 */
export function isPlanSuccessful(plan: TaskPlan): boolean {
  const requiredSteps = plan.steps.filter(s => !s.isOptional)
  return requiredSteps.every(s => s.status === 'completed')
}
