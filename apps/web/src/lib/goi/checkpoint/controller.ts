/**
 * 检查点控制器
 *
 * 负责：
 * - 检查 TODO Item 是否需要确认
 * - 创建和管理待处理检查点
 * - 处理用户响应
 * - 发布检查点相关事件
 */

import { nanoid } from 'nanoid'
import type {
  TodoItem,
  PendingCheckpoint,
  CheckpointResponse,
  CheckpointCheckResult,
  SmartCheckContext,
} from '@platform/shared'
import { CheckpointRuleEngine, getCheckpointRuleEngine } from './rules'
import { CheckpointQueue, getCheckpointQueue } from './queue'
import { eventBus } from '../../events'

// ============================================
// 检查点控制器配置
// ============================================

export type CheckpointControllerConfig = {
  /** 默认超时时间（毫秒） */
  defaultTimeout: number
  /** 智能判断上下文提供器 */
  contextProvider?: (sessionId: string) => Promise<SmartCheckContext>
  /** 预览数据生成器 */
  previewGenerator?: (todoItem: TodoItem) => Promise<unknown>
}

const DEFAULT_CONFIG: CheckpointControllerConfig = {
  defaultTimeout: 5 * 60 * 1000, // 5 分钟
}

// ============================================
// 检查点控制器类
// ============================================

export class CheckpointController {
  private config: CheckpointControllerConfig
  private ruleEngine: CheckpointRuleEngine
  private queue: CheckpointQueue

  constructor(config: Partial<CheckpointControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.ruleEngine = getCheckpointRuleEngine()
    this.queue = getCheckpointQueue()
  }

  /**
   * 检查 TODO Item 是否需要确认
   */
  async check(todoItem: TodoItem, sessionId: string): Promise<CheckpointCheckResult> {
    // 1. 基础规则检查
    let result = this.ruleEngine.shouldRequireCheckpoint(todoItem)

    // 2. 如果需要智能判断，获取上下文进行评估
    if (
      result.required &&
      result.matchedRule?.action === 'smart' &&
      this.config.contextProvider
    ) {
      try {
        const context = await this.config.contextProvider(sessionId)
        result = this.ruleEngine.evaluateSmart(todoItem, context)
      } catch (error) {
        console.error('Failed to get smart check context:', error)
        // 智能判断失败时保持需要确认
      }
    }

    // 3. 生成预览数据
    if (result.required && this.config.previewGenerator) {
      try {
        result.preview = await this.config.previewGenerator(todoItem)
      } catch (error) {
        console.error('Failed to generate preview:', error)
      }
    }

    // 4. 生成选项
    if (result.required) {
      result.suggestedOptions = this.ruleEngine.generateOptions(todoItem)
    }

    return result
  }

  /**
   * 创建待处理检查点
   */
  async createPendingCheckpoint(
    todoItem: TodoItem,
    sessionId: string,
    checkResult: CheckpointCheckResult
  ): Promise<PendingCheckpoint> {
    const checkpoint: PendingCheckpoint = {
      id: nanoid(),
      sessionId,
      todoItemId: todoItem.id,
      todoItem,
      reason: checkResult.reason || '需要用户确认',
      matchedRuleId: checkResult.matchedRule?.id,
      preview: checkResult.preview,
      options: checkResult.suggestedOptions || this.ruleEngine.generateOptions(todoItem),
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.defaultTimeout),
    }

    // 添加到队列
    await this.queue.add(checkpoint)

    // 发布事件
    await eventBus.publish({
      sessionId,
      type: 'CHECKPOINT_REACHED',
      source: 'ai',
      payload: {
        checkpointId: checkpoint.id,
        checkpointType: todoItem.checkpoint?.type || 'confirmation',
        title: todoItem.title,
        description: checkpoint.reason,
        todoItemId: todoItem.id,
        options: checkpoint.options.map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description,
        })),
        requiresApproval: true,
      },
    })

    return checkpoint
  }

  /**
   * 处理用户响应
   */
  async respond(
    checkpointId: string,
    response: Omit<CheckpointResponse, 'timestamp'>
  ): Promise<void> {
    const checkpoint = await this.queue.get(checkpointId)
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`)
    }

    if (checkpoint.status !== 'pending') {
      throw new Error(`Checkpoint is not pending: ${checkpoint.status}`)
    }

    // 更新检查点状态
    const fullResponse: CheckpointResponse = {
      ...response,
      timestamp: new Date(),
    }

    await this.queue.update(checkpointId, {
      status: 'responded',
      response: fullResponse,
      respondedAt: new Date(),
    })

    // 根据响应类型发布不同事件
    switch (response.action) {
      case 'approve':
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'CHECKPOINT_APPROVED',
          source: 'user',
          payload: {
            checkpointId,
            checkpointType: checkpoint.todoItem.checkpoint?.type || 'confirmation',
            comment: response.reason,
          },
        })
        break

      case 'modify':
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'CHECKPOINT_MODIFIED',
          source: 'user',
          payload: {
            checkpointId,
            checkpointType: checkpoint.todoItem.checkpoint?.type || 'confirmation',
            modifications: response.modifications || {},
            comment: response.reason,
          },
        })
        break

      case 'reject':
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'CHECKPOINT_REJECTED',
          source: 'user',
          payload: {
            checkpointId,
            checkpointType: checkpoint.todoItem.checkpoint?.type || 'confirmation',
            reason: response.reason || '用户拒绝',
          },
        })
        break

      case 'takeover':
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'CONTROL_TRANSFERRED',
          source: 'user',
          payload: {
            from: 'ai',
            to: 'user',
            reason: response.reason || '用户接管控制权',
            context: `检查点: ${checkpoint.todoItem.title}`,
          },
        })
        break
    }
  }

  /**
   * 取消检查点
   */
  async cancel(checkpointId: string, reason?: string): Promise<void> {
    const checkpoint = await this.queue.get(checkpointId)
    if (!checkpoint) {
      return
    }

    await this.queue.update(checkpointId, {
      status: 'cancelled',
    })

    await eventBus.publish({
      sessionId: checkpoint.sessionId,
      type: 'CHECKPOINT_REJECTED',
      source: 'system',
      payload: {
        checkpointId,
        checkpointType: checkpoint.todoItem.checkpoint?.type || 'confirmation',
        reason: reason || '检查点已取消',
      },
    })
  }

  /**
   * 处理超时检查点
   */
  async handleTimeout(checkpointId: string): Promise<void> {
    const checkpoint = await this.queue.get(checkpointId)
    if (!checkpoint || checkpoint.status !== 'pending') {
      return
    }

    await this.queue.update(checkpointId, {
      status: 'expired',
    })

    // 根据 todoItem 的超时配置决定行为
    const timeoutAction = checkpoint.todoItem.checkpoint?.timeoutAction || 'skip'

    switch (timeoutAction) {
      case 'auto_approve':
        // 自动批准
        await this.respond(checkpointId, {
          action: 'approve',
          reason: '超时自动批准',
        })
        break

      case 'skip':
        // 跳过该步骤
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'TODO_ITEM_SKIPPED',
          source: 'system',
          payload: {
            todoListId: checkpoint.sessionId,
            todoItemId: checkpoint.todoItemId,
            title: checkpoint.todoItem.title,
            order: 0,
            reason: '检查点超时',
          },
        })
        break

      case 'fail':
        // 标记失败
        await eventBus.publish({
          sessionId: checkpoint.sessionId,
          type: 'TODO_ITEM_FAILED',
          source: 'system',
          payload: {
            todoListId: checkpoint.sessionId,
            todoItemId: checkpoint.todoItemId,
            title: checkpoint.todoItem.title,
            order: 0,
            error: '检查点超时未响应',
            canRetry: true,
          },
        })
        break
    }
  }

  /**
   * 获取会话的待处理检查点
   */
  async getPendingCheckpoints(sessionId: string): Promise<PendingCheckpoint[]> {
    return this.queue.getPending(sessionId)
  }

  /**
   * 等待检查点响应
   */
  async waitForResponse(
    checkpointId: string,
    timeout?: number
  ): Promise<CheckpointResponse | null> {
    const actualTimeout = timeout || this.config.defaultTimeout
    const startTime = Date.now()

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        const checkpoint = await this.queue.get(checkpointId)

        if (!checkpoint) {
          clearInterval(checkInterval)
          resolve(null)
          return
        }

        if (checkpoint.status === 'responded' && checkpoint.response) {
          clearInterval(checkInterval)
          resolve(checkpoint.response)
          return
        }

        if (checkpoint.status === 'expired' || checkpoint.status === 'cancelled') {
          clearInterval(checkInterval)
          resolve(null)
          return
        }

        // 检查超时
        if (Date.now() - startTime > actualTimeout) {
          clearInterval(checkInterval)
          await this.handleTimeout(checkpointId)
          resolve(null)
        }
      }, 500) // 每 500ms 检查一次
    })
  }

  /**
   * 切换规则模式
   */
  switchMode(mode: 'step' | 'smart' | 'auto'): void {
    this.ruleEngine.switchModeRules(mode)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CheckpointControllerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================
// 导出单例
// ============================================

let controllerInstance: CheckpointController | null = null

export function getCheckpointController(): CheckpointController {
  if (!controllerInstance) {
    controllerInstance = new CheckpointController()
  }
  return controllerInstance
}

export function resetCheckpointController(): void {
  controllerInstance = null
}
