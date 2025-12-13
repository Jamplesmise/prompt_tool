/**
 * GOI TODO Item 状态机
 *
 * 管理 TODO Item 的状态流转，确保状态转换的合法性
 *
 * 状态转换图：
 *
 * pending → in_progress → waiting (需确认) → completed
 *                      ↘ completed (自动通过) ↗
 *                      → failed → pending (重试)
 *                               → skipped (跳过)
 *
 * 终态：completed, skipped, replanned
 */

import type { TodoItemStatus, TodoItem } from '@platform/shared'
import { eventBus } from '../../events'

// ============================================
// 状态转换定义
// ============================================

/**
 * 状态转换表
 * key: 当前状态
 * value: 允许转换到的状态列表
 */
const transitions: Record<TodoItemStatus, TodoItemStatus[]> = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['waiting', 'completed', 'failed'],
  waiting: ['completed', 'failed', 'replanned'],
  completed: [], // 终态
  failed: ['pending', 'skipped'], // 可重试或跳过
  skipped: [], // 终态
  replanned: [], // 终态
}

/**
 * 终态列表
 */
const terminalStates: TodoItemStatus[] = ['completed', 'skipped', 'replanned']

// ============================================
// 状态机类
// ============================================

/**
 * 状态转换上下文
 */
export type TransitionContext = {
  /** 会话 ID */
  sessionId: string
  /** TODO List ID */
  todoListId: string
  /** 触发原因 */
  reason?: string
  /** 额外数据 */
  data?: Record<string, unknown>
}

/**
 * 状态转换结果
 */
export type TransitionResult = {
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 转换前状态 */
  fromStatus: TodoItemStatus
  /** 转换后状态 */
  toStatus: TodoItemStatus
  /** 转换时间 */
  transitionedAt: Date
}

/**
 * 状态转换钩子
 */
export type TransitionHook = (
  item: TodoItem,
  from: TodoItemStatus,
  to: TodoItemStatus,
  context: TransitionContext
) => Promise<void> | void

/**
 * TODO Item 状态机
 */
export class TodoItemStateMachine {
  private hooks: {
    beforeTransition: TransitionHook[]
    afterTransition: TransitionHook[]
  } = {
    beforeTransition: [],
    afterTransition: [],
  }

  /**
   * 检查状态转换是否合法
   */
  canTransition(from: TodoItemStatus, to: TodoItemStatus): boolean {
    const allowedTransitions = transitions[from]
    return allowedTransitions.includes(to)
  }

  /**
   * 获取允许的转换状态
   */
  getAllowedTransitions(from: TodoItemStatus): TodoItemStatus[] {
    return transitions[from] || []
  }

  /**
   * 执行状态转换
   */
  async transition(
    item: TodoItem,
    to: TodoItemStatus,
    context: TransitionContext
  ): Promise<TransitionResult> {
    const from = item.status
    const now = new Date()

    // 1. 检查转换是否合法
    if (!this.canTransition(from, to)) {
      return {
        success: false,
        error: `Invalid transition: ${from} → ${to}`,
        fromStatus: from,
        toStatus: to,
        transitionedAt: now,
      }
    }

    // 2. 执行 beforeTransition 钩子
    try {
      for (const hook of this.hooks.beforeTransition) {
        await hook(item, from, to, context)
      }
    } catch (error) {
      return {
        success: false,
        error: `beforeTransition hook failed: ${error}`,
        fromStatus: from,
        toStatus: to,
        transitionedAt: now,
      }
    }

    // 3. 更新状态
    item.status = to
    item.updatedAt = now

    // 4. 处理状态变更的副作用
    this.handleTransitionSideEffects(item, from, to, now)

    // 5. 发布事件
    await this.publishTransitionEvent(item, from, to, context)

    // 6. 执行 afterTransition 钩子
    try {
      for (const hook of this.hooks.afterTransition) {
        await hook(item, from, to, context)
      }
    } catch (error) {
      console.warn('[StateMachine] afterTransition hook failed:', error)
      // afterTransition 钩子失败不影响转换结果
    }

    return {
      success: true,
      fromStatus: from,
      toStatus: to,
      transitionedAt: now,
    }
  }

  /**
   * 处理状态转换的副作用
   */
  private handleTransitionSideEffects(
    item: TodoItem,
    from: TodoItemStatus,
    to: TodoItemStatus,
    now: Date
  ): void {
    // 开始执行
    if (to === 'in_progress' && !item.startedAt) {
      item.startedAt = now
    }

    // 完成（成功/失败/跳过）
    if (terminalStates.includes(to) || to === 'failed') {
      if (!item.completedAt) {
        item.completedAt = now
      }
    }

    // 重试时重置
    if (from === 'failed' && to === 'pending') {
      item.error = undefined
      item.startedAt = undefined
      item.completedAt = undefined
    }
  }

  /**
   * 发布状态转换事件
   */
  private async publishTransitionEvent(
    item: TodoItem,
    from: TodoItemStatus,
    to: TodoItemStatus,
    context: TransitionContext
  ): Promise<void> {
    try {
      // 根据目标状态构建对应的事件
      switch (to) {
        case 'in_progress':
          await eventBus.publish({
            sessionId: context.sessionId,
            type: 'TODO_ITEM_STARTED',
            source: 'system',
            payload: {
              todoListId: context.todoListId,
              todoItemId: item.id,
              title: item.title,
              order: item.priority ?? 0,
            },
          })
          break

        case 'completed':
          await eventBus.publish({
            sessionId: context.sessionId,
            type: 'TODO_ITEM_COMPLETED',
            source: 'system',
            payload: {
              todoListId: context.todoListId,
              todoItemId: item.id,
              title: item.title,
              order: item.priority ?? 0,
              result: item.result as Record<string, unknown> | undefined,
            },
          })
          break

        case 'failed':
          await eventBus.publish({
            sessionId: context.sessionId,
            type: 'TODO_ITEM_FAILED',
            source: 'system',
            payload: {
              todoListId: context.todoListId,
              todoItemId: item.id,
              title: item.title,
              order: item.priority ?? 0,
              error: item.error ?? 'Unknown error',
              canRetry: this.canRetry(item),
            },
          })
          break

        case 'skipped':
          await eventBus.publish({
            sessionId: context.sessionId,
            type: 'TODO_ITEM_SKIPPED',
            source: 'system',
            payload: {
              todoListId: context.todoListId,
              todoItemId: item.id,
              title: item.title,
              order: item.priority ?? 0,
              reason: context.reason ?? 'Skipped by user',
            },
          })
          break

        case 'waiting':
          // CHECKPOINT_REACHED 需要更多的检查点信息
          if (item.checkpoint?.required) {
            await eventBus.publish({
              sessionId: context.sessionId,
              type: 'CHECKPOINT_REACHED',
              source: 'system',
              payload: {
                checkpointId: `${item.id}-checkpoint`,
                checkpointType: item.checkpoint.type ?? 'confirmation',
                title: item.title,
                description: item.description,
                todoItemId: item.id,
                options: item.checkpoint.options,
                requiresApproval: true,
              },
            })
          }
          break

        // replanned 和 pending 不需要发布事件
        default:
          break
      }
    } catch (error) {
      console.error('[StateMachine] Failed to publish event:', error)
    }
  }

  /**
   * 检查是否可以重试
   */
  canRetry(item: TodoItem): boolean {
    if (item.status !== 'failed') return false
    const maxRetries = item.maxRetries ?? 3
    const currentRetries = item.retryCount ?? 0
    return currentRetries < maxRetries
  }

  /**
   * 检查是否为终态
   */
  isTerminal(status: TodoItemStatus): boolean {
    return terminalStates.includes(status)
  }

  /**
   * 注册 beforeTransition 钩子
   */
  onBeforeTransition(hook: TransitionHook): void {
    this.hooks.beforeTransition.push(hook)
  }

  /**
   * 注册 afterTransition 钩子
   */
  onAfterTransition(hook: TransitionHook): void {
    this.hooks.afterTransition.push(hook)
  }

  /**
   * 移除钩子
   */
  removeHook(hook: TransitionHook): void {
    this.hooks.beforeTransition = this.hooks.beforeTransition.filter((h) => h !== hook)
    this.hooks.afterTransition = this.hooks.afterTransition.filter((h) => h !== hook)
  }

  /**
   * 清除所有钩子
   */
  clearHooks(): void {
    this.hooks.beforeTransition = []
    this.hooks.afterTransition = []
  }
}

// ============================================
// TODO List 状态机
// ============================================

/**
 * TODO List 状态转换表
 */
import type { TodoListStatus } from '@platform/shared'

const listTransitions: Record<TodoListStatus, TodoListStatus[]> = {
  planning: ['ready', 'cancelled'],
  ready: ['running', 'cancelled'],
  running: ['paused', 'completed', 'failed', 'cancelled'],
  paused: ['running', 'cancelled'],
  completed: [], // 终态
  failed: ['running'], // 可以重试
  cancelled: [], // 终态
}

/**
 * TODO List 状态机
 */
export class TodoListStateMachine {
  /**
   * 检查状态转换是否合法
   */
  canTransition(from: TodoListStatus, to: TodoListStatus): boolean {
    const allowedTransitions = listTransitions[from]
    return allowedTransitions.includes(to)
  }

  /**
   * 获取允许的转换状态
   */
  getAllowedTransitions(from: TodoListStatus): TodoListStatus[] {
    return listTransitions[from] || []
  }

  /**
   * 检查是否为终态
   */
  isTerminal(status: TodoListStatus): boolean {
    return ['completed', 'cancelled'].includes(status)
  }
}

// ============================================
// 单例实例
// ============================================

/**
 * TODO Item 状态机单例
 */
export const todoItemStateMachine = new TodoItemStateMachine()

/**
 * TODO List 状态机单例
 */
export const todoListStateMachine = new TodoListStateMachine()

// ============================================
// 便捷函数
// ============================================

/**
 * 转换 TODO Item 状态
 */
export async function transitionTodoItem(
  item: TodoItem,
  to: TodoItemStatus,
  context: TransitionContext
): Promise<TransitionResult> {
  return todoItemStateMachine.transition(item, to, context)
}

/**
 * 检查 TODO Item 状态转换是否合法
 */
export function canTransitionTodoItem(from: TodoItemStatus, to: TodoItemStatus): boolean {
  return todoItemStateMachine.canTransition(from, to)
}

/**
 * 检查 TODO List 状态转换是否合法
 */
export function canTransitionTodoList(from: TodoListStatus, to: TodoListStatus): boolean {
  return todoListStateMachine.canTransition(from, to)
}
