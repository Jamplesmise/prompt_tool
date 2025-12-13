/**
 * GOI 可视化执行器
 *
 * 将可视化组件集成到执行循环中，提供带有视觉反馈的任务执行
 */

import type {
  TaskPlan,
  PlanStep,
  GoiOperation,
  GoiExecutionResult,
} from '@platform/shared'
import { speedController } from './speedControl'
import { useExecutionStore } from './progressSync'
import {
  GoiExecutor,
  type GoiExecutorContext,
  type ExecuteOptions,
} from '../executor'
import { BUBBLE_ICONS, type BubbleIconType } from '@/components/goi/ActionBubble'

// ============================================
// 类型定义
// ============================================

/**
 * 可视化执行器配置
 */
export type VisualExecutorConfig = {
  /** 执行上下文 */
  context: GoiExecutorContext
  /** 是否启用可视化 */
  enableVisualization?: boolean
  /** 是否启用声音反馈 */
  enableSound?: boolean
  /** 错误时是否停止 */
  stopOnError?: boolean
}

/**
 * 执行事件回调
 */
export type ExecutionCallbacks = {
  /** 执行开始 */
  onStart?: (plan: TaskPlan) => void
  /** 步骤开始 */
  onStepStart?: (step: PlanStep) => void
  /** 步骤完成 */
  onStepComplete?: (step: PlanStep, result: GoiExecutionResult) => void
  /** 步骤失败 */
  onStepFail?: (step: PlanStep, error: string) => void
  /** 检查点触发 */
  onCheckpoint?: (step: PlanStep) => Promise<boolean>
  /** 执行完成 */
  onComplete?: (plan: TaskPlan) => void
  /** 执行失败 */
  onFail?: (error: string) => void
  /** 执行中止 */
  onAbort?: () => void
}

// ============================================
// 可视化执行器类
// ============================================

/**
 * 可视化执行器
 *
 * 执行 TaskPlan，同时更新 UI 显示执行进度和状态
 */
export class VisualExecutor {
  private plan: TaskPlan
  private config: VisualExecutorConfig
  private callbacks: ExecutionCallbacks
  private executor: GoiExecutor
  private abortController: AbortController | null = null
  private isAborted = false

  constructor(
    plan: TaskPlan,
    config: VisualExecutorConfig,
    callbacks: ExecutionCallbacks = {}
  ) {
    this.plan = plan
    this.config = {
      enableVisualization: true,
      enableSound: false,
      stopOnError: true,
      ...config,
    }
    this.callbacks = callbacks
    this.executor = new GoiExecutor(config.context)
  }

  /**
   * 开始执行计划
   */
  async execute(): Promise<void> {
    const store = useExecutionStore.getState()

    // 初始化
    store.setPlan(this.plan)
    this.abortController = new AbortController()
    this.isAborted = false

    // 触发开始回调
    this.callbacks.onStart?.(this.plan)

    try {
      // 按顺序执行步骤
      for (const step of this.plan.steps) {
        // 检查是否被中止
        if (this.isAborted || this.abortController.signal.aborted) {
          store.setStatus('aborted')
          this.callbacks.onAbort?.()
          return
        }

        // 跳过已完成或已跳过的步骤
        if (step.status === 'completed' || step.status === 'skipped') {
          continue
        }

        // 跳过被阻塞的步骤
        if (step.status === 'blocked') {
          continue
        }

        // 检查依赖是否满足
        if (!this.areDependenciesMet(step)) {
          store.skipStep(step.id, '依赖未满足')
          continue
        }

        // 处理检查点
        if (step.isCheckpoint) {
          store.setStatus('checkpoint')
          const shouldContinue = await this.handleCheckpoint(step)
          if (!shouldContinue) {
            store.skipStep(step.id, '用户跳过')
            continue
          }
        }

        // 执行步骤
        await this.executeStep(step)

        // 等待（根据速度设置）
        await speedController.wait()
      }

      // 完成
      store.setStatus('completed')
      this.callbacks.onComplete?.(this.plan)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      store.setError(errorMessage)
      this.callbacks.onFail?.(errorMessage)
      throw error
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: PlanStep): Promise<void> {
    const store = useExecutionStore.getState()

    // 1. 开始步骤（显示高亮和消息）
    const target = this.getTargetSelector(step.operation)
    const icon = this.getOperationIcon(step.operation)
    store.startStep(step.id, target, step.userLabel, icon)

    // 触发回调
    this.callbacks.onStepStart?.(step)

    // 2. 等待高亮显示一段时间
    if (this.config.enableVisualization) {
      await speedController.waitHighlight()
    }

    // 3. 显示点击效果
    if (this.config.enableVisualization) {
      store.showClick()
      await new Promise((r) => setTimeout(r, 300))
      store.hideClick()
    }

    // 4. 执行操作
    try {
      const result = await this.executor.execute(step.operation, {
        timeout: 30000,
      })

      if (result.success) {
        store.completeStep(step.id, result.result as Record<string, unknown>)
        this.callbacks.onStepComplete?.(step, result)
      } else {
        throw new Error(result.error || 'Execution failed')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      store.failStep(step.id, errorMessage)
      this.callbacks.onStepFail?.(step, errorMessage)

      if (this.config.stopOnError) {
        throw error
      }
    }
  }

  /**
   * 处理检查点
   */
  private async handleCheckpoint(step: PlanStep): Promise<boolean> {
    if (this.callbacks.onCheckpoint) {
      return this.callbacks.onCheckpoint(step)
    }

    // 默认行为：单步模式下等待确认，否则直接继续
    if (speedController.getSpeed() === 'step') {
      await speedController.wait()
    }

    return true
  }

  /**
   * 检查步骤依赖是否满足
   */
  private areDependenciesMet(step: PlanStep): boolean {
    if (step.dependencies.length === 0) return true

    const completedIds = new Set(
      this.plan.steps
        .filter((s) => s.status === 'completed' || s.status === 'skipped')
        .map((s) => s.id)
    )

    return step.dependencies.every((depId) => completedIds.has(depId))
  }

  /**
   * 获取目标元素选择器
   */
  private getTargetSelector(operation: GoiOperation): string {
    switch (operation.type) {
      case 'access':
        if (operation.action === 'select') {
          return `[data-goi-selector="${operation.target.resourceType}"]`
        }
        if (operation.action === 'create') {
          return `[data-goi-create="${operation.target.resourceType}"]`
        }
        if (operation.action === 'navigate') {
          return `[data-goi-nav="${operation.target.resourceType}"]`
        }
        if (operation.target.resourceId) {
          return `[data-goi-resource="${operation.target.resourceType}-${operation.target.resourceId}"]`
        }
        return `[data-goi-resource="${operation.target.resourceType}"]`

      case 'state':
        if (operation.target.resourceId) {
          return `[data-goi-resource="${operation.target.resourceType}-${operation.target.resourceId}"]`
        }
        return `[data-goi-resource="${operation.target.resourceType}"]`

      case 'observation':
        if (operation.queries.length > 0) {
          const firstQuery = operation.queries[0]
          return `[data-goi-resource="${firstQuery.resourceType}"]`
        }
        return 'body'

      default:
        return 'body'
    }
  }

  /**
   * 获取操作图标
   */
  private getOperationIcon(operation: GoiOperation): string {
    switch (operation.type) {
      case 'access':
        switch (operation.action) {
          case 'navigate':
            return BUBBLE_ICONS.navigate
          case 'select':
            return BUBBLE_ICONS.select
          case 'create':
            return BUBBLE_ICONS.create
          case 'edit':
            return BUBBLE_ICONS.edit
          case 'view':
            return BUBBLE_ICONS.info
          default:
            return BUBBLE_ICONS.robot
        }

      case 'state':
        switch (operation.action) {
          case 'create':
            return BUBBLE_ICONS.create
          case 'update':
            return BUBBLE_ICONS.edit
          case 'delete':
            return BUBBLE_ICONS.delete
          default:
            return BUBBLE_ICONS.robot
        }

      case 'observation':
        return BUBBLE_ICONS.info

      default:
        return BUBBLE_ICONS.robot
    }
  }

  /**
   * 暂停执行
   */
  pause(): void {
    speedController.pause()
    useExecutionStore.getState().setStatus('paused')
  }

  /**
   * 恢复执行
   */
  resume(): void {
    speedController.resume()
    useExecutionStore.getState().setStatus('executing')
  }

  /**
   * 中止执行
   */
  abort(): void {
    this.isAborted = true
    this.abortController?.abort()
    speedController.reset()
  }

  /**
   * 确认单步继续
   */
  confirmStep(): void {
    speedController.confirmStep()
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建可视化执行器并执行
 */
export async function executeWithVisualization(
  plan: TaskPlan,
  context: GoiExecutorContext,
  callbacks?: ExecutionCallbacks
): Promise<void> {
  const executor = new VisualExecutor(plan, { context }, callbacks)
  return executor.execute()
}
