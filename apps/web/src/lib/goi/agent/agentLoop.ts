/**
 * GOI Agent Loop
 *
 * 实现 Plan → Gather → Act → Verify 循环
 */

import type {
  TodoList,
  TodoItem,
  TodoListStatus,
  GoiOperation,
  GoiEventType,
  AgentStartedPayload,
  AgentPausedPayload,
  AgentResumedPayload,
  AgentCompletedPayload,
  AgentFailedPayload,
  AgentWaitingPayload,
  AgentStepCompletedPayload,
} from '@platform/shared'
import { Planner, type PlannerConfig, type PlanResult } from './planner'
import { Gatherer, type GathererConfig, type GatheredContext } from './gatherer'
import { Verifier, type VerifierConfig, type ExtendedVerifyResult } from './verifier'
import { GoiExecutor, type GoiExecutionResult } from '../executor'
import { todoStore } from '../todo/todoStore'
import { wrapTodoList } from '../todo/todoList'
import {
  transitionTodoItem,
  todoListStateMachine,
  type TransitionContext,
} from '../todo/stateMachine'
import { eventBus } from '../../events'

// ============================================
// 类型定义
// ============================================

/**
 * Agent Loop 状态
 */
export type AgentLoopStatus =
  | 'idle'        // 空闲
  | 'planning'    // 正在规划
  | 'running'     // 执行中
  | 'paused'      // 已暂停
  | 'waiting'     // 等待用户确认
  | 'completed'   // 已完成
  | 'failed'      // 失败

/**
 * Agent Loop 配置
 */
export type AgentLoopConfig = {
  /** 会话 ID */
  sessionId: string
  /** 用户 ID（用于创建资源时设置 createdById） */
  userId?: string
  /** 团队 ID（用于创建资源时设置 teamId） */
  teamId?: string
  /** 模型 ID（必填，用于计划生成和验证） */
  modelId: string
  /** Planner 配置 */
  plannerConfig?: Omit<PlannerConfig, 'modelId'>
  /** Gatherer 配置 */
  gathererConfig?: GathererConfig
  /** Verifier 配置 */
  verifierConfig?: Omit<VerifierConfig, 'modelId'>
  /** 是否自动运行（生成计划后立即开始执行） */
  autoRun?: boolean
  /** 运行模式：manual（手动）, assisted（辅助）, auto（自动） */
  mode?: 'manual' | 'assisted' | 'auto'
  /** 失败后最大重试次数 */
  maxRetries?: number
  /** 步骤间延迟（毫秒） */
  stepDelay?: number
}

/**
 * 单步执行结果
 */
export type StepResult = {
  /** 是否还有待执行项 */
  done: boolean
  /** 是否在等待用户确认 */
  waiting: boolean
  /** 当前执行的项 */
  currentItem?: TodoItem
  /** 执行结果 */
  executionResult?: GoiExecutionResult
  /** 验证结果 */
  verifyResult?: ExtendedVerifyResult
  /** 错误信息 */
  error?: string
  /** 是否需要重规划 */
  needsReplan?: boolean
}

/**
 * Agent Loop 状态快照
 */
export type AgentLoopSnapshot = {
  status: AgentLoopStatus
  todoListId?: string
  currentItemId?: string
  progress: number
  completedItems: number
  totalItems: number
  startedAt?: Date
  lastStepAt?: Date
}

// ============================================
// Agent Loop 类
// ============================================

/**
 * GOI Agent Loop - 主循环控制器
 */
export class AgentLoop {
  private config: AgentLoopConfig
  private status: AgentLoopStatus = 'idle'
  private todoList: TodoList | null = null

  // 组件
  private planner: Planner
  private gatherer: Gatherer
  private verifier: Verifier
  private executor: GoiExecutor

  // 执行状态
  private startedAt?: Date
  private lastStepAt?: Date
  private retryCount: Record<string, number> = {}
  private currentGoal?: string

  constructor(config: AgentLoopConfig) {
    this.config = {
      autoRun: false,
      maxRetries: 3,
      stepDelay: 500,
      ...config,
    }

    // 初始化组件
    this.planner = new Planner(config.sessionId, {
      modelId: config.modelId,
      ...config.plannerConfig,
    })
    this.gatherer = new Gatherer(config.sessionId, config.gathererConfig)
    this.verifier = new Verifier(config.sessionId, {
      modelId: config.modelId,
      ...config.verifierConfig,
    })
    this.executor = new GoiExecutor({
      sessionId: config.sessionId,
      userId: config.userId,
      teamId: config.teamId,
    })
  }

  // ============================================
  // 公共方法
  // ============================================

  /**
   * 启动 Agent Loop（从目标开始）
   * @param goal 用户目标
   * @param context 上下文信息（当前页面等）
   */
  async start(goal: string, context?: { currentPage?: string }): Promise<PlanResult> {
    console.log('[AgentLoop] start() called with config:', {
      sessionId: this.config.sessionId,
      autoRun: this.config.autoRun,
      mode: this.config.mode,
      modelId: this.config.modelId,
    })

    if (this.status !== 'idle') {
      throw new Error(`Cannot start: current status is ${this.status}`)
    }

    this.status = 'planning'
    this.startedAt = new Date()
    this.currentGoal = goal

    try {
      // 1. 生成计划（传递上下文信息）
      const planResult = await this.planner.generatePlan(goal, context)

      if (!planResult.success || !planResult.todoList) {
        this.status = 'failed'
        // 发布失败事件
        await this.publishAgentEvent('AGENT_FAILED', {
          sessionId: this.config.sessionId,
          error: planResult.warnings?.join(', ') || 'Failed to generate plan',
          canRetry: true,
        })
        return planResult
      }

      this.todoList = planResult.todoList

      // 2. 更新 TODO List 状态为 ready
      await this.updateTodoListStatus('ready')

      // 3. 发布 AGENT_STARTED 事件
      await this.publishAgentEvent('AGENT_STARTED', {
        sessionId: this.config.sessionId,
        goal,
        modelId: this.config.modelId,
        todoListId: this.todoList.id,
      })

      this.status = 'idle'

      // 4. 如果配置了自动运行，立即开始执行
      console.log('[AgentLoop] Plan complete, autoRun:', this.config.autoRun)
      if (this.config.autoRun) {
        console.log('[AgentLoop] autoRun is true, starting automatic execution')
        await this.run()
      } else {
        console.log('[AgentLoop] autoRun is false, waiting for manual execution')
      }

      return planResult
    } catch (error) {
      this.status = 'failed'
      // 发布失败事件
      await this.publishAgentEvent('AGENT_FAILED', {
        sessionId: this.config.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        canRetry: true,
      })
      throw error
    }
  }

  /**
   * 从现有 TODO List 恢复
   */
  async resume(todoListId: string): Promise<void> {
    const todoList = await todoStore.getById(todoListId)
    if (!todoList) {
      throw new Error(`TODO List not found: ${todoListId}`)
    }

    this.todoList = todoList
    this.status = 'idle'

    // 发布恢复事件
    await this.publishAgentEvent('AGENT_RESUMED', {
      sessionId: this.config.sessionId,
      fromCheckpoint: todoListId,
    })
  }

  /**
   * 开始运行
   */
  async run(): Promise<void> {
    if (!this.todoList) {
      throw new Error('No TODO List to run')
    }

    if (this.status === 'running') {
      return // 已经在运行
    }

    this.status = 'running'
    await this.updateTodoListStatus('running')

    // 循环执行
    while (this.status === 'running') {
      const stepResult = await this.step()

      if (stepResult.done) {
        // 所有项都已完成
        this.status = 'completed'
        await this.updateTodoListStatus('completed')

        // 发布完成事件
        const items = this.todoList.items
        await this.publishAgentEvent('AGENT_COMPLETED', {
          sessionId: this.config.sessionId,
          todoListId: this.todoList.id,
          summary: {
            total: items.length,
            completed: items.filter((i) => i.status === 'completed').length,
            failed: items.filter((i) => i.status === 'failed').length,
            skipped: items.filter((i) => i.status === 'skipped').length,
          },
          duration: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
        })
        break
      }

      if (stepResult.waiting) {
        // 等待用户确认
        this.status = 'waiting'

        // 发布等待事件
        await this.publishAgentEvent('AGENT_WAITING', {
          sessionId: this.config.sessionId,
          waitingFor: 'checkpoint',
          checkpointId: stepResult.currentItem?.id,
          message: stepResult.currentItem?.checkpoint?.message || '需要用户确认',
        })
        break
      }

      if (stepResult.needsReplan) {
        // 需要重规划
        await this.handleReplan(stepResult.error || 'Unknown reason')
        continue
      }

      // 步骤间延迟
      if (this.config.stepDelay && this.config.stepDelay > 0) {
        await this.delay(this.config.stepDelay)
      }
    }
  }

  /**
   * 执行单步
   */
  async step(): Promise<StepResult> {
    if (!this.todoList) {
      return { done: true, waiting: false, error: 'No TODO List' }
    }

    this.lastStepAt = new Date()

    // Debug: 打印当前 todoList 中所有 item 的状态
    console.log('[AgentLoop] step() called, current items:', this.todoList.items.map(i => ({
      id: i.id,
      title: i.title,
      status: i.status,
    })))

    const manager = wrapTodoList(this.todoList)
    console.log('[AgentLoop] Wrapped todoList, getting next item...')

    // 1. 获取下一个待执行项
    const item = manager.getNextItem()
    console.log('[AgentLoop] getNextItem() returned:', item ? { id: item.id, title: item.title, status: item.status } : null)
    if (!item) {
      // 检查是否全部完成
      if (manager.isAllCompleted()) {
        console.log('[AgentLoop] All items completed')
        return { done: true, waiting: false }
      }
      // 可能有项在等待中
      const waitingItems = manager.getWaitingItems()
      if (waitingItems.length > 0) {
        console.log('[AgentLoop] Waiting for checkpoint:', waitingItems[0].id)
        return { done: false, waiting: true, currentItem: waitingItems[0] }
      }
      // 检查是否有 pending 但不可执行的项（依赖未满足）
      const pendingItems = this.todoList.items.filter(i => i.status === 'pending')
      if (pendingItems.length > 0) {
        console.log('[AgentLoop] Pending items with unmet dependencies:', pendingItems.map(i => ({
          id: i.id,
          title: i.title,
          dependsOn: i.dependsOn,
        })))
        // 不要返回 done: true，而是报告阻塞状态
        return { done: false, waiting: true, error: `${pendingItems.length} items blocked by dependencies` }
      }
      // 可能所有项都失败了
      const failedItems = manager.getFailedItems()
      console.log('[AgentLoop] No executable items. Failed:', failedItems.length)
      return { done: true, waiting: false, error: 'No executable items' }
    }

    // 2. 更新状态为 in_progress
    console.log('[AgentLoop] Transitioning item to in_progress...')
    const transitionContext: TransitionContext = {
      sessionId: this.config.sessionId,
      todoListId: this.todoList.id,
    }
    await transitionTodoItem(item, 'in_progress', transitionContext)
    manager.updateItem(item.id, { status: 'in_progress' }) // 触发 stats 更新
    console.log('[AgentLoop] Item transitioned to in_progress')

    // 3. Gather - 收集上下文
    console.log('[AgentLoop] Gathering context...')
    const context = await this.gatherer.gatherContext(item, this.todoList)
    console.log('[AgentLoop] Context gathered, pendingResourceSelections:', context.pendingResourceSelections.length, 'failedResourceResolutions:', context.failedResourceResolutions.length)

    // 4. 检查点判断
    console.log('[AgentLoop] Checkpoint check:', {
      checkpointRequired: item.checkpoint?.required,
      checkpointType: item.checkpoint?.type,
      checkpointMessage: item.checkpoint?.message,
    })
    const shouldAutoApproveResult = this.shouldAutoApprove(item, context)
    console.log('[AgentLoop] shouldAutoApprove:', shouldAutoApproveResult)

    if (item.checkpoint?.required && !shouldAutoApproveResult) {
      console.log('[AgentLoop] Triggering checkpoint, transitioning to waiting...')
      await transitionTodoItem(item, 'waiting', {
        ...transitionContext,
        reason: item.checkpoint.message || '需要用户确认',
      })
      manager.updateItem(item.id, { status: 'waiting' }) // 触发 stats 更新
      await this.saveTodoList()
      console.log('[AgentLoop] Item transitioned to waiting, returning with waiting=true')
      return { done: false, waiting: true, currentItem: item }
    }

    // 4.1 资源选择检查点（有待确认的资源引用）
    if (context.pendingResourceSelections.length > 0) {
      // 动态为 item 添加 checkpoint
      const resourceSelection = context.pendingResourceSelections[0]
      const checkpointOptions = resourceSelection.candidates.map((c) => ({
        id: c.id,
        label: c.name,
        description: c.description || undefined,
      }))

      // 设置检查点信息
      item.checkpoint = {
        required: true,
        type: 'resource_selection',
        message: `找到多个匹配的资源："${resourceSelection.hint}"，请选择要使用的资源：`,
      }

      await transitionTodoItem(item, 'waiting', {
        ...transitionContext,
        reason: item.checkpoint.message,
      })
      manager.updateItem(item.id, {
        status: 'waiting',
        checkpoint: {
          ...item.checkpoint,
          options: checkpointOptions,
        },
      })
      await this.saveTodoList()
      return { done: false, waiting: true, currentItem: item }
    }

    // 4.2 资源解析失败检查点
    if (context.failedResourceResolutions.length > 0) {
      const failed = context.failedResourceResolutions[0]
      item.checkpoint = {
        required: true,
        type: 'resource_not_found',
        message: `无法找到资源："${failed.hint}"（${failed.error}）。请先创建该资源，或取消此操作。`,
      }

      await transitionTodoItem(item, 'waiting', {
        ...transitionContext,
        reason: item.checkpoint.message,
      })
      manager.updateItem(item.id, { status: 'waiting', checkpoint: item.checkpoint })
      await this.saveTodoList()
      return { done: false, waiting: true, currentItem: item }
    }

    // 5. Act - 执行操作
    console.log('[AgentLoop] No checkpoint required, proceeding to execution...')
    console.log('[AgentLoop] Executing operation:', item.goiOperation)
    let executionResult: GoiExecutionResult
    try {
      executionResult = await this.executor.execute(item.goiOperation as GoiOperation)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return this.handleStepFailure(item, errorMessage, transitionContext)
    }

    if (!executionResult.success) {
      return this.handleStepFailure(
        item,
        executionResult.error || 'Execution failed',
        transitionContext
      )
    }

    // 6. Verify - 验证结果
    console.log('[AgentLoop] Verifying result for item:', item.id)
    let verifyResult: ExtendedVerifyResult
    try {
      verifyResult = await this.verifier.verify(item, executionResult.result)
      console.log('[AgentLoop] Verify result:', verifyResult)
    } catch (verifyError) {
      console.error('[AgentLoop] Verify error:', verifyError)
      // 验证失败时默认通过，不阻塞执行
      verifyResult = {
        success: true,
        method: 'rule',
        reason: 'Verification skipped due to error',
        confidence: 0.5,
        needsHumanReview: false,
        suggestedAction: 'continue',
        latencyMs: 0,
      }
    }

    if (!verifyResult.success) {
      return this.handleStepFailure(
        item,
        verifyResult.reason,
        transitionContext,
        verifyResult.suggestedAction === 'replan'
      )
    }

    if (verifyResult.needsHumanReview) {
      // 需要人工确认
      await transitionTodoItem(item, 'waiting', {
        ...transitionContext,
        reason: '验证结果需要人工确认',
      })
      manager.updateItem(item.id, { result: executionResult.result, status: 'waiting' }) // 触发 stats 更新
      await this.saveTodoList()
      return {
        done: false,
        waiting: true,
        currentItem: item,
        executionResult,
        verifyResult,
      }
    }

    // 7. 标记完成
    await transitionTodoItem(item, 'completed', transitionContext)
    // 更新 item 并触发 stats 重新计算（transitionTodoItem 已修改 item.status）
    manager.updateItem(item.id, { result: executionResult.result, status: 'completed' })
    await this.saveTodoList()

    // Debug: 验证保存后的状态
    console.log('[AgentLoop] After save, items:', this.todoList!.items.map(i => ({
      id: i.id,
      title: i.title,
      status: i.status,
    })))

    // 8. 发布步骤完成事件
    const completedCount = this.todoList!.items.filter((i) => i.status === 'completed').length
    await this.publishAgentEvent('AGENT_STEP_COMPLETED', {
      sessionId: this.config.sessionId,
      todoItemId: item.id,
      todoItemTitle: item.title,
      result: {
        success: true,
        data: executionResult.result,
      },
      progress: {
        total: this.todoList!.items.length,
        completed: completedCount,
        current: this.todoList!.items.findIndex((i) => i.id === item.id) + 1,
      },
    })

    return {
      done: false,
      waiting: false,
      currentItem: item,
      executionResult,
      verifyResult,
    }
  }

  /**
   * 暂停执行
   */
  async pause(): Promise<void> {
    if (this.status !== 'running') {
      return
    }

    this.status = 'paused'
    await this.updateTodoListStatus('paused')

    // 发布暂停事件
    const items = this.todoList?.items || []
    const currentItem = items.find((i) => i.status === 'in_progress')
    await this.publishAgentEvent('AGENT_PAUSED', {
      sessionId: this.config.sessionId,
      reason: 'User requested pause',
      currentTodoItemId: currentItem?.id,
      progress: {
        total: items.length,
        completed: items.filter((i) => i.status === 'completed').length,
        failed: items.filter((i) => i.status === 'failed').length,
      },
    })
  }

  /**
   * 恢复执行
   */
  async unpause(): Promise<void> {
    if (this.status !== 'paused' && this.status !== 'waiting') {
      return
    }

    // 发布恢复事件
    await this.publishAgentEvent('AGENT_RESUMED', {
      sessionId: this.config.sessionId,
    })

    await this.run()
  }

  /**
   * 用户确认检查点
   * @param itemId - 待确认的项 ID
   * @param feedback - 用户反馈
   * @param selectedResourceId - 资源选择检查点时，用户选择的资源 ID
   */
  async approveCheckpoint(
    itemId: string,
    feedback?: string,
    selectedResourceId?: string
  ): Promise<StepResult> {
    if (!this.todoList) {
      throw new Error('No TODO List')
    }

    const manager = wrapTodoList(this.todoList)
    const item = manager.getItem(itemId)

    if (!item || item.status !== 'waiting') {
      throw new Error('Item not found or not waiting')
    }

    const transitionContext: TransitionContext = {
      sessionId: this.config.sessionId,
      todoListId: this.todoList.id,
      reason: 'User approved',
    }

    // 处理资源选择检查点
    if (item.checkpoint?.type === 'resource_selection' && selectedResourceId) {
      // 更新 goiOperation 中的资源引用
      if (item.goiOperation) {
        const operation = item.goiOperation as Record<string, unknown>

        // 递归查找并替换资源引用占位符
        const replaceResourceReference = (obj: unknown): unknown => {
          if (typeof obj === 'string' && obj.startsWith('$')) {
            // 这是一个资源引用，替换为选中的 ID
            return selectedResourceId
          }
          if (Array.isArray(obj)) {
            return obj.map(replaceResourceReference)
          }
          if (obj !== null && typeof obj === 'object') {
            const result: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(obj)) {
              result[key] = replaceResourceReference(value)
            }
            return result
          }
          return obj
        }

        // 替换 target.resourceId 或 expectedState 中的引用
        if ('target' in operation) {
          const target = operation.target as Record<string, unknown>
          if (target.resourceId && typeof target.resourceId === 'string' && target.resourceId.startsWith('$')) {
            target.resourceId = selectedResourceId
          }
        }
        if ('expectedState' in operation) {
          operation.expectedState = replaceResourceReference(operation.expectedState)
        }
        if ('queries' in operation) {
          operation.queries = replaceResourceReference(operation.queries)
        }
      }

      // 清除检查点，重新执行
      item.checkpoint = { required: false }

      // 将状态改回 pending，让 step() 重新执行
      await transitionTodoItem(item, 'pending', {
        ...transitionContext,
        reason: `Resource selected: ${selectedResourceId}`,
      })
      manager.updateItem(itemId, {
        status: 'pending',
        checkpoint: { required: false },
        userFeedback: feedback || `Selected resource: ${selectedResourceId}`,
      })
      await this.saveTodoList()

      // 如果之前是 waiting 状态，继续运行
      if (this.status === 'waiting') {
        this.status = 'running'
        return this.step()
      }

      return { done: false, waiting: false, currentItem: item }
    }

    // 标准检查点确认 - 标记完成
    await transitionTodoItem(item, 'completed', transitionContext)
    // 更新 item 并触发 stats 重新计算
    manager.updateItem(itemId, { userFeedback: feedback, status: 'completed' })
    await this.saveTodoList()

    // 如果之前是 waiting 状态，继续运行
    if (this.status === 'waiting') {
      this.status = 'running'
      return this.step()
    }

    return { done: false, waiting: false, currentItem: item }
  }

  /**
   * 用户拒绝检查点
   */
  async rejectCheckpoint(itemId: string, reason: string): Promise<StepResult> {
    if (!this.todoList) {
      throw new Error('No TODO List')
    }

    const manager = wrapTodoList(this.todoList)
    const item = manager.getItem(itemId)

    if (!item || item.status !== 'waiting') {
      throw new Error('Item not found or not waiting')
    }

    // 标记失败
    const transitionContext: TransitionContext = {
      sessionId: this.config.sessionId,
      todoListId: this.todoList.id,
      reason: `User rejected: ${reason}`,
    }
    await transitionTodoItem(item, 'failed', transitionContext)
    // 更新 item 并触发 stats 重新计算
    manager.updateItem(itemId, { error: reason, userFeedback: reason, status: 'failed' })
    await this.saveTodoList()

    return { done: false, waiting: false, currentItem: item, error: reason }
  }

  /**
   * 获取当前状态
   */
  getStatus(): AgentLoopSnapshot {
    return {
      status: this.status,
      todoListId: this.todoList?.id,
      currentItemId: this.getCurrentItemId(),
      progress: this.todoList?.progress || 0,
      completedItems: this.todoList?.completedItems || 0,
      totalItems: this.todoList?.totalItems || 0,
      startedAt: this.startedAt,
      lastStepAt: this.lastStepAt,
    }
  }

  /**
   * 获取 TODO List
   */
  getTodoList(): TodoList | null {
    return this.todoList
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 处理步骤失败
   */
  private async handleStepFailure(
    item: TodoItem,
    error: string,
    transitionContext: TransitionContext,
    needsReplan = false
  ): Promise<StepResult> {
    const manager = wrapTodoList(this.todoList!)

    // 检查是否可以重试
    const retryKey = item.id
    this.retryCount[retryKey] = (this.retryCount[retryKey] || 0) + 1

    if (this.retryCount[retryKey] < this.config.maxRetries! && !needsReplan) {
      // 可以重试，先标记失败再重试
      await transitionTodoItem(item, 'failed', { ...transitionContext, reason: error })
      manager.updateItem(item.id, { error, retryCount: this.retryCount[retryKey], status: 'failed' })
      // 重试（会把状态改回 pending）
      manager.retryFailedItem(item.id)
      await this.saveTodoList()
      return { done: false, waiting: false, currentItem: item, error }
    }

    // 无法重试，标记失败
    await transitionTodoItem(item, 'failed', { ...transitionContext, reason: error })
    // 更新 item 并触发 stats 重新计算
    manager.updateItem(item.id, { error, status: 'failed' })
    await this.saveTodoList()

    return {
      done: false,
      waiting: false,
      currentItem: item,
      error,
      needsReplan,
    }
  }

  /**
   * 处理重规划
   */
  private async handleReplan(reason: string): Promise<void> {
    if (!this.todoList) return

    const replanResult = await this.planner.replan(this.todoList.id, reason)
    if (replanResult.success && replanResult.todoList) {
      this.todoList = replanResult.todoList
    } else {
      // 重规划失败，暂停
      this.status = 'paused'
      await this.updateTodoListStatus('paused')
    }
  }

  /**
   * 判断是否自动通过检查点
   */
  private shouldAutoApprove(item: TodoItem, context: GatheredContext): boolean {
    // 如果有自动通过规则，尝试评估
    if (item.checkpoint?.autoApproveRule) {
      try {
        // 简单的表达式评估（实际可以更复杂）
        const rule = item.checkpoint.autoApproveRule
        if (rule === 'always') return true
        if (rule === 'never') return false
        // 其他规则暂不支持
      } catch {
        // 评估失败，不自动通过
      }
    }

    // 自动模式下，非删除操作自动批准
    if (this.config.mode === 'auto') {
      const operation = item.goiOperation as { action?: string } | undefined
      const action = operation?.action

      // 删除操作始终需要用户确认
      if (action === 'delete') {
        console.log('[AgentLoop] Auto mode: delete operation requires confirmation')
        return false
      }

      // 其他操作自动批准
      console.log('[AgentLoop] Auto mode: auto-approving non-delete operation')
      return true
    }

    return false
  }

  /**
   * 更新 TODO List 状态
   */
  private async updateTodoListStatus(status: TodoListStatus): Promise<void> {
    if (!this.todoList) return

    if (todoListStateMachine.canTransition(this.todoList.status, status)) {
      const manager = wrapTodoList(this.todoList)
      manager.updateListStatus(status)
      await this.saveTodoList()
    }
  }

  /**
   * 保存 TODO List
   */
  private async saveTodoList(): Promise<void> {
    if (this.todoList) {
      this.todoList = await todoStore.save(this.todoList)
    }
  }

  /**
   * 获取当前执行项 ID
   */
  private getCurrentItemId(): string | undefined {
    if (!this.todoList) return undefined
    const inProgressItem = this.todoList.items.find((item) => item.status === 'in_progress')
    return inProgressItem?.id
  }

  /**
   * 发布 Agent 事件（类型安全）
   */
  private async publishAgentEvent<T extends GoiEventType>(
    type: T,
    payload: T extends 'AGENT_STARTED'
      ? AgentStartedPayload
      : T extends 'AGENT_PAUSED'
        ? AgentPausedPayload
        : T extends 'AGENT_RESUMED'
          ? AgentResumedPayload
          : T extends 'AGENT_COMPLETED'
            ? AgentCompletedPayload
            : T extends 'AGENT_FAILED'
              ? AgentFailedPayload
              : T extends 'AGENT_WAITING'
                ? AgentWaitingPayload
                : T extends 'AGENT_STEP_COMPLETED'
                  ? AgentStepCompletedPayload
                  : Record<string, unknown>
  ): Promise<void> {
    try {
      await eventBus.publish({
        sessionId: this.config.sessionId,
        type,
        source: 'ai',
        payload: payload as any,
      })
    } catch (error) {
      console.error('[AgentLoop] Failed to publish event:', error)
    }
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建 Agent Loop 实例
 */
export function createAgentLoop(config: AgentLoopConfig): AgentLoop {
  return new AgentLoop(config)
}

/**
 * 快速启动 Agent Loop
 */
export async function startAgentLoop(
  sessionId: string,
  goal: string,
  modelId: string,
  config?: Omit<AgentLoopConfig, 'sessionId' | 'modelId'>
): Promise<{ agentLoop: AgentLoop; planResult: PlanResult }> {
  const agentLoop = createAgentLoop({ sessionId, modelId, ...config })
  const planResult = await agentLoop.start(goal)
  return { agentLoop, planResult }
}
