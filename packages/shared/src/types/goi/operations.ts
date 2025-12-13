/**
 * GOI (Guided Orchestration Intelligence) 操作类型定义
 *
 * GOI 采用声明式接口，LLM 只声明"想要什么"，系统负责"如何实现"
 *
 * 三种核心声明：
 * - Access: 访问声明 - 导航到目标资源
 * - State: 状态声明 - 将资源变更到期望状态
 * - Observation: 观察声明 - 查询并返回信息
 */

import type { ResourceType } from './events'

// ============================================
// 操作类型枚举
// ============================================

/**
 * GOI 操作类型枚举
 */
export type GoiOperationType = 'access' | 'state' | 'observation'

// ============================================
// Access 操作（访问声明）
// ============================================

/**
 * Access 动作类型
 * - view: 查看详情页
 * - edit: 编辑页面或打开编辑弹窗
 * - create: 打开创建弹窗/页面
 * - select: 打开选择器并预选
 * - navigate: 导航到列表页
 * - test: 打开测试弹窗（仅 model、notify_channel 支持）
 */
export type AccessAction = 'view' | 'edit' | 'create' | 'select' | 'navigate' | 'test'

/**
 * Access 操作目标
 */
export type AccessTarget = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID（navigate 时可选） */
  resourceId?: string
}

/**
 * Access 操作上下文
 */
export type AccessContext = {
  /** 目标页面路径 */
  page?: string
  /** 目标弹窗 ID */
  dialog?: string
  /** 目标 Tab */
  tab?: string
  /** 额外查询参数 */
  query?: Record<string, string>
}

/**
 * Access 操作 - 声明要访问哪个资源
 *
 * 系统自动处理：
 * 1. 当前在哪个页面？
 * 2. 需要跳转吗？
 * 3. 需要打开弹窗吗？
 * 4. 执行导航操作
 *
 * @example
 * // 查看提示词详情
 * { type: 'access', target: { resourceType: 'prompt', resourceId: 'xxx' }, action: 'view' }
 *
 * // 导航到数据集列表
 * { type: 'access', target: { resourceType: 'dataset' }, action: 'navigate' }
 */
export type AccessOperation = {
  type: 'access'
  /** 目标资源 */
  target: AccessTarget
  /** 访问动作 */
  action: AccessAction
  /** 上下文信息 */
  context?: AccessContext
}

// ============================================
// State 操作（状态声明）
// ============================================

/**
 * State 动作类型
 * - create: 创建资源
 * - update: 更新资源
 * - delete: 删除资源
 */
export type StateAction = 'create' | 'update' | 'delete'

/**
 * State 操作目标
 */
export type StateTarget = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID（创建时为空） */
  resourceId?: string
}

/**
 * State 操作 - 声明资源的期望状态
 *
 * 系统自动处理：
 * 1. 获取当前状态
 * 2. 计算差异
 * 3. 应用变更
 * 4. 验证结果
 *
 * @example
 * // 创建提示词
 * {
 *   type: 'state',
 *   target: { resourceType: 'prompt' },
 *   action: 'create',
 *   expectedState: { name: '情感分析', content: '...' }
 * }
 *
 * // 更新提示词
 * {
 *   type: 'state',
 *   target: { resourceType: 'prompt', resourceId: 'xxx' },
 *   action: 'update',
 *   expectedState: { name: '情感分析 v2' }
 * }
 */
export type StateOperation = {
  type: 'state'
  /** 目标资源 */
  target: StateTarget
  /** 状态动作 */
  action: StateAction
  /** 期望的资源状态 */
  expectedState: Record<string, unknown>
  /** 乐观锁版本（防止并发冲突） */
  version?: number
}

// ============================================
// Observation 操作（观察声明）
// ============================================

/**
 * 单个查询定义
 */
export type ObservationQuery = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源 ID（查询单个资源时） */
  resourceId?: string
  /** 要查询的字段列表 */
  fields: string[]
  /** 过滤条件 */
  filters?: Record<string, unknown>
  /** 排序 */
  orderBy?: {
    field: string
    direction: 'asc' | 'desc'
  }
  /** 分页 */
  pagination?: {
    page: number
    pageSize: number
  }
}

/**
 * Observation 操作 - 声明要获取哪些信息
 *
 * 系统自动处理：
 * 1. 解析查询
 * 2. 收集信息
 * 3. 返回结构化数据
 *
 * @example
 * // 查询任务状态和进度
 * {
 *   type: 'observation',
 *   queries: [
 *     { resourceType: 'task', resourceId: 'xxx', fields: ['status', 'progress'] },
 *     { resourceType: 'dataset', resourceId: 'yyy', fields: ['rowCount', 'columns'] }
 *   ]
 * }
 */
export type ObservationOperation = {
  type: 'observation'
  /** 查询列表（支持批量查询） */
  queries: ObservationQuery[]
  /** 是否使用缓存 */
  useCache?: boolean
  /** 缓存 TTL（毫秒） */
  cacheTTL?: number
}

// ============================================
// 统一操作类型
// ============================================

/**
 * GOI 操作联合类型
 */
export type GoiOperation = AccessOperation | StateOperation | ObservationOperation

// ============================================
// 执行结果类型
// ============================================

/**
 * 执行状态
 */
export type ExecutionStatus = 'success' | 'failed' | 'partial' | 'skipped'

/**
 * Access 操作执行结果
 */
export type AccessExecutionResult = {
  /** 实际导航到的 URL */
  navigatedTo?: string
  /** 打开的弹窗 ID */
  openedDialog?: string
  /** 资源是否存在 */
  resourceFound: boolean
}

/**
 * State 操作执行结果
 */
export type StateExecutionResult = {
  /** 操作前的状态（用于回滚） */
  previousState?: Record<string, unknown>
  /** 操作后的状态 */
  currentState?: Record<string, unknown>
  /** 资源 ID（创建时返回） */
  resourceId?: string
  /** 变更的字段 */
  changedFields?: string[]
}

/**
 * Observation 操作执行结果
 */
export type ObservationExecutionResult = {
  /** 查询结果列表（与 queries 一一对应） */
  results: Array<Record<string, unknown> | null>
  /** 是否命中缓存 */
  fromCache?: boolean
}

/**
 * 操作执行结果映射
 */
export type OperationResultMap = {
  access: AccessExecutionResult
  state: StateExecutionResult
  observation: ObservationExecutionResult
}

/**
 * GOI 执行结果
 */
export type GoiExecutionResult<T extends GoiOperationType = GoiOperationType> = {
  /** 是否成功 */
  success: boolean
  /** 执行状态 */
  status: ExecutionStatus
  /** 操作结果 */
  result?: T extends keyof OperationResultMap ? OperationResultMap[T] : unknown
  /** 错误信息 */
  error?: string
  /** 错误码 */
  errorCode?: string
  /** 执行耗时（毫秒） */
  duration: number
  /** 产生的事件 */
  events: Array<{
    type: string
    payload: unknown
  }>
  /** 快照 ID（用于回滚） */
  snapshotId?: string
}

// ============================================
// 操作验证类型
// ============================================

/**
 * 操作验证结果
 */
export type OperationValidationResult = {
  /** 是否有效 */
  valid: boolean
  /** 验证错误 */
  errors: Array<{
    field: string
    message: string
    code: string
  }>
  /** 警告（不阻止执行但需要注意） */
  warnings: Array<{
    field: string
    message: string
  }>
}

// ============================================
// 类型守卫函数
// ============================================

/**
 * 判断是否为 Access 操作
 */
export function isAccessOperation(op: GoiOperation): op is AccessOperation {
  return op.type === 'access'
}

/**
 * 判断是否为 State 操作
 */
export function isStateOperation(op: GoiOperation): op is StateOperation {
  return op.type === 'state'
}

/**
 * 判断是否为 Observation 操作
 */
export function isObservationOperation(op: GoiOperation): op is ObservationOperation {
  return op.type === 'observation'
}

// ============================================
// 操作构建辅助函数
// ============================================

/**
 * 创建 Access 操作
 */
export function createAccessOperation(
  resourceType: ResourceType,
  action: AccessAction,
  resourceId?: string,
  context?: AccessContext
): AccessOperation {
  return {
    type: 'access',
    target: { resourceType, resourceId },
    action,
    context,
  }
}

/**
 * 创建 State 操作
 */
export function createStateOperation(
  resourceType: ResourceType,
  action: StateAction,
  expectedState: Record<string, unknown>,
  resourceId?: string
): StateOperation {
  return {
    type: 'state',
    target: { resourceType, resourceId },
    action,
    expectedState,
  }
}

/**
 * 创建 Observation 操作
 */
export function createObservationOperation(
  queries: ObservationQuery[],
  options?: { useCache?: boolean; cacheTTL?: number }
): ObservationOperation {
  return {
    type: 'observation',
    queries,
    ...options,
  }
}
