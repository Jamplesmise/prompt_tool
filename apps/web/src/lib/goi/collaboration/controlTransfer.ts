/**
 * 控制权切换管理器
 *
 * 负责：
 * - 管理人和 AI 之间的控制权
 * - 处理控制权转移
 * - 发布控制权转移事件
 * - 集成人工操作感知（Phase 5）
 */

import type {
  Controller,
  TransferReason,
  ControlTransferResult,
  CollaborationMode,
  TaskPlan,
} from '@platform/shared'
import { eventBus } from '../../events'
import type {
  TrackedAction,
  ReconciledPlan,
  Deviation,
  HandbackDialogData,
} from './types'
import { getActionTracker } from './actionTracker'
import { getStateSync } from './stateSync'
import { getDeviationDetector } from './deviationDetector'
import { getPlanReconciler } from '../agent/planReconciler'

// ============================================
// 控制权管理器配置
// ============================================

export type ControlTransferConfig = {
  /** 默认控制者 */
  defaultController: Controller
  /** 是否允许自动切换 */
  allowAutoSwitch: boolean
}

const DEFAULT_CONFIG: ControlTransferConfig = {
  defaultController: 'user',
  allowAutoSwitch: true,
}

// ============================================
// 控制权管理器类
// ============================================

export class ControlTransferManager {
  private config: ControlTransferConfig
  private sessionId: string | null = null
  private currentController: Controller
  private mode: CollaborationMode = 'assisted'
  private isTransferring: boolean = false

  // 回调函数
  private onTransfer?: (result: ControlTransferResult) => void
  private onAgentPause?: () => Promise<void>
  private onAgentResume?: () => Promise<void>
  private onHandbackDialog?: (data: HandbackDialogData) => void

  // 当前计划（用于协调）
  private currentPlan: TaskPlan | null = null

  // 追踪的用户操作
  private trackedActions: TrackedAction[] = []

  constructor(config: Partial<ControlTransferConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.currentController = this.config.defaultController
  }

  /**
   * 初始化
   */
  initialize(
    sessionId: string,
    mode: CollaborationMode = 'assisted'
  ): void {
    this.sessionId = sessionId
    this.mode = mode

    // 根据模式设置初始控制者
    if (mode === 'auto') {
      this.currentController = 'ai'
    } else {
      this.currentController = 'user'
    }
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: {
    onTransfer?: (result: ControlTransferResult) => void
    onAgentPause?: () => Promise<void>
    onAgentResume?: () => Promise<void>
    onHandbackDialog?: (data: HandbackDialogData) => void
  }): void {
    this.onTransfer = callbacks.onTransfer
    this.onAgentPause = callbacks.onAgentPause
    this.onAgentResume = callbacks.onAgentResume
    this.onHandbackDialog = callbacks.onHandbackDialog
  }

  /**
   * 设置当前计划
   */
  setCurrentPlan(plan: TaskPlan | null): void {
    this.currentPlan = plan
  }

  /**
   * 获取当前计划
   */
  getCurrentPlan(): TaskPlan | null {
    return this.currentPlan
  }

  /**
   * 设置运行模式
   */
  setMode(mode: CollaborationMode): void {
    this.mode = mode

    // 手动模式下强制切换到用户
    if (mode === 'manual' && this.currentController === 'ai') {
      this.transferTo('user', 'mode_change')
    }
  }

  /**
   * 获取当前控制者
   */
  getController(): Controller {
    return this.currentController
  }

  /**
   * 转移控制权
   */
  async transferTo(
    target: Controller,
    reason: TransferReason,
    message?: string
  ): Promise<ControlTransferResult> {
    // 检查是否正在转移
    if (this.isTransferring) {
      return {
        success: false,
        from: this.currentController,
        to: target,
        transferredAt: new Date(),
        error: '控制权转移正在进行中',
      }
    }

    // 检查是否需要转移
    if (this.currentController === target) {
      return {
        success: true,
        from: this.currentController,
        to: target,
        transferredAt: new Date(),
      }
    }

    // 检查手动模式限制
    if (this.mode === 'manual' && target === 'ai') {
      return {
        success: false,
        from: this.currentController,
        to: target,
        transferredAt: new Date(),
        error: '手动模式下不能切换到 AI 控制',
      }
    }

    this.isTransferring = true

    try {
      const from = this.currentController

      // 执行转移操作
      if (target === 'user') {
        // AI → 用户：暂停 Agent Loop 并启动操作追踪
        if (this.onAgentPause) {
          await this.onAgentPause()
        }

        // 启动操作追踪
        if (this.sessionId) {
          this.startActionTracking()
        }
      } else {
        // 用户 → AI：处理交还并恢复 Agent Loop
        if (from === 'user') {
          // 收集用户操作信息并显示交还对话框
          const handbackData = this.collectHandbackData()
          if (handbackData && this.onHandbackDialog) {
            this.onHandbackDialog(handbackData)
          }
        }

        if (this.onAgentResume) {
          await this.onAgentResume()
        }
      }

      // 更新当前控制者
      this.currentController = target

      // 发布事件
      if (this.sessionId) {
        await eventBus.publish({
          sessionId: this.sessionId,
          type: 'CONTROL_TRANSFERRED',
          source: from === 'user' ? 'user' : 'ai',
          payload: {
            from,
            to: target,
            reason: this.getReasonMessage(reason),
            context: message,
          },
        })
      }

      const result: ControlTransferResult = {
        success: true,
        from,
        to: target,
        transferredAt: new Date(),
      }

      // 触发回调
      if (this.onTransfer) {
        this.onTransfer(result)
      }

      return result
    } catch (error) {
      return {
        success: false,
        from: this.currentController,
        to: target,
        transferredAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      this.isTransferring = false
    }
  }

  /**
   * 用户请求接管
   */
  async userTakeover(reason?: string): Promise<ControlTransferResult> {
    return this.transferTo('user', 'user_request', reason)
  }

  /**
   * 用户交还控制权
   */
  async handoverToAI(reason?: string): Promise<ControlTransferResult> {
    if (this.mode === 'manual') {
      return {
        success: false,
        from: this.currentController,
        to: 'ai',
        transferredAt: new Date(),
        error: '手动模式下不能交还 AI 控制',
      }
    }

    return this.transferTo('ai', 'user_request', reason)
  }

  /**
   * AI 完成任务
   */
  async aiComplete(): Promise<ControlTransferResult> {
    return this.transferTo('user', 'ai_complete', 'AI 已完成所有任务')
  }

  /**
   * AI 遇到阻塞
   */
  async aiBlocked(reason: string): Promise<ControlTransferResult> {
    return this.transferTo('user', 'ai_blocked', reason)
  }

  /**
   * AI 执行出错
   */
  async aiError(error: string): Promise<ControlTransferResult> {
    return this.transferTo('user', 'ai_error', error)
  }

  /**
   * 检查点被拒绝
   */
  async checkpointRejected(): Promise<ControlTransferResult> {
    return this.transferTo('user', 'checkpoint_reject', '用户拒绝了检查点')
  }

  /**
   * 检查点接管
   */
  async checkpointTakeover(): Promise<ControlTransferResult> {
    return this.transferTo('user', 'checkpoint_takeover', '用户选择接管')
  }

  /**
   * 获取转移原因描述
   */
  private getReasonMessage(reason: TransferReason): string {
    const messages: Record<TransferReason, string> = {
      user_request: '用户主动请求',
      checkpoint_reject: '检查点被拒绝',
      checkpoint_takeover: '用户选择接管',
      ai_complete: 'AI 完成任务',
      ai_blocked: 'AI 遇到阻塞',
      ai_error: 'AI 执行出错',
      timeout: '操作超时',
      mode_change: '模式切换',
    }
    return messages[reason]
  }

  /**
   * 判断是否可以切换到目标控制者
   */
  canTransferTo(target: Controller): boolean {
    if (this.isTransferring) return false
    if (this.currentController === target) return false
    if (this.mode === 'manual' && target === 'ai') return false
    return true
  }

  /**
   * 重置
   */
  reset(): void {
    // 停止操作追踪
    this.stopActionTracking()

    this.sessionId = null
    this.currentController = this.config.defaultController
    this.mode = 'assisted'
    this.isTransferring = false
    this.currentPlan = null
    this.trackedActions = []
  }

  // ============================================
  // 操作追踪相关方法
  // ============================================

  /**
   * 启动操作追踪
   */
  private startActionTracking(): void {
    if (!this.sessionId) return

    const actionTracker = getActionTracker()
    const stateSync = getStateSync()

    // 启动追踪器
    actionTracker.startTracking(this.sessionId)
    stateSync.initialize(this.sessionId)

    // 清空之前的记录
    this.trackedActions = []
  }

  /**
   * 停止操作追踪
   */
  private stopActionTracking(): TrackedAction[] {
    const actionTracker = getActionTracker()
    const actions = actionTracker.stopTracking()
    this.trackedActions = actions
    return actions
  }

  /**
   * 收集交还数据
   */
  private collectHandbackData(): HandbackDialogData | null {
    // 停止追踪并获取操作
    const userActions = this.stopActionTracking()

    // 如果没有当前计划，返回简化数据
    if (!this.currentPlan) {
      return null
    }

    // 协调计划
    const planReconciler = getPlanReconciler()
    const reconciledPlan = planReconciler.reconcile(this.currentPlan, userActions)

    // 检测偏离
    const deviationDetector = getDeviationDetector()
    const deviation = deviationDetector.detect(reconciledPlan, userActions)

    return {
      plan: reconciledPlan,
      userActions,
      deviation,
    }
  }

  /**
   * 获取追踪的用户操作
   */
  getTrackedActions(): TrackedAction[] {
    return [...this.trackedActions]
  }

  /**
   * 手动触发交还对话框
   */
  showHandbackDialog(): HandbackDialogData | null {
    const handbackData = this.collectHandbackData()
    if (handbackData && this.onHandbackDialog) {
      this.onHandbackDialog(handbackData)
    }
    return handbackData
  }
}

// ============================================
// 导出单例
// ============================================

let transferManagerInstance: ControlTransferManager | null = null

export function getControlTransferManager(): ControlTransferManager {
  if (!transferManagerInstance) {
    transferManagerInstance = new ControlTransferManager()
  }
  return transferManagerInstance
}

export function resetControlTransferManager(): void {
  if (transferManagerInstance) {
    transferManagerInstance.reset()
  }
  transferManagerInstance = null
}
