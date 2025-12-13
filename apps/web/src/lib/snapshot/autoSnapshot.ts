/**
 * GOI 自动快照触发
 *
 * 监听事件，在关键时机自动创建快照：
 * - TODO 项开始执行时
 * - 检查点通过后
 * - 上下文压缩后
 */

import { eventBus } from '../events'
import { snapshotManager } from './snapshotManager'
import type { GoiEvent, GoiEventType } from '@platform/shared'

/**
 * 自动快照配置
 */
export type AutoSnapshotConfig = {
  /** 是否启用自动快照 */
  enabled: boolean
  /** 触发快照的事件类型 */
  triggerEvents: GoiEventType[]
  /** 每个会话最大快照数 */
  maxSnapshotsPerSession: number
  /** 节流时间（毫秒），避免短时间内创建过多快照 */
  throttleMs: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AutoSnapshotConfig = {
  enabled: true,
  triggerEvents: [
    'TODO_ITEM_STARTED',
    'CHECKPOINT_APPROVED',
    'CONTEXT_COMPACTED',
    'SESSION_STARTED',
  ],
  maxSnapshotsPerSession: 50,
  throttleMs: 5000, // 5 秒内不重复创建
}

/**
 * 会话最后快照时间记录
 */
const lastSnapshotTime: Map<string, number> = new Map()

/**
 * 订阅 ID
 */
let subscriptionId: string | null = null

/**
 * 当前配置
 */
let currentConfig: AutoSnapshotConfig = { ...DEFAULT_CONFIG }

/**
 * 初始化自动快照触发
 */
export async function initializeAutoSnapshot(
  config: Partial<AutoSnapshotConfig> = {}
): Promise<void> {
  currentConfig = { ...DEFAULT_CONFIG, ...config }

  if (!currentConfig.enabled) {
    console.log('[AutoSnapshot] Disabled')
    return
  }

  // 订阅全局事件
  subscriptionId = await eventBus.subscribe(
    '*', // 订阅所有会话
    handleEvent,
    currentConfig.triggerEvents
  )

  console.log('[AutoSnapshot] Initialized with triggers:', currentConfig.triggerEvents)
}

/**
 * 停止自动快照触发
 */
export async function stopAutoSnapshot(): Promise<void> {
  if (subscriptionId) {
    await eventBus.unsubscribe(subscriptionId)
    subscriptionId = null
  }
  lastSnapshotTime.clear()
  console.log('[AutoSnapshot] Stopped')
}

/**
 * 处理事件
 */
async function handleEvent(event: GoiEvent): Promise<void> {
  // 检查是否应该触发快照
  if (!shouldTriggerSnapshot(event)) {
    return
  }

  // 节流检查
  const lastTime = lastSnapshotTime.get(event.sessionId) || 0
  const now = Date.now()
  if (now - lastTime < currentConfig.throttleMs) {
    console.log(`[AutoSnapshot] Throttled for session ${event.sessionId}`)
    return
  }

  try {
    // 根据事件类型确定触发原因和相关 TODO 项
    const { trigger, todoItemId } = getTriggerInfo(event)

    // 创建快照
    await snapshotManager.createSnapshot(event.sessionId, trigger, todoItemId)

    // 更新最后快照时间
    lastSnapshotTime.set(event.sessionId, now)

    console.log(`[AutoSnapshot] Created snapshot for session ${event.sessionId}, trigger: ${trigger}`)
  } catch (error) {
    console.error('[AutoSnapshot] Failed to create snapshot:', error)
  }
}

/**
 * 检查是否应该触发快照
 */
function shouldTriggerSnapshot(event: GoiEvent): boolean {
  return currentConfig.triggerEvents.includes(event.type)
}

/**
 * 根据事件获取触发信息
 */
function getTriggerInfo(event: GoiEvent): {
  trigger: 'todo_start' | 'checkpoint' | 'compact' | 'session_start'
  todoItemId?: string
} {
  switch (event.type) {
    case 'TODO_ITEM_STARTED':
      return {
        trigger: 'todo_start',
        todoItemId: (event.payload as { todoItemId?: string }).todoItemId,
      }

    case 'CHECKPOINT_APPROVED':
      return {
        trigger: 'checkpoint',
      }

    case 'CONTEXT_COMPACTED':
      return {
        trigger: 'compact',
      }

    case 'SESSION_STARTED':
      return {
        trigger: 'session_start',
      }

    default:
      return {
        trigger: 'checkpoint',
      }
  }
}

/**
 * 更新配置
 */
export function updateAutoSnapshotConfig(
  config: Partial<AutoSnapshotConfig>
): void {
  currentConfig = { ...currentConfig, ...config }
}

/**
 * 获取当前配置
 */
export function getAutoSnapshotConfig(): AutoSnapshotConfig {
  return { ...currentConfig }
}

/**
 * 手动触发快照（用于特殊场景）
 */
export async function triggerManualSnapshot(
  sessionId: string,
  todoItemId?: string
): Promise<void> {
  await snapshotManager.createSnapshot(sessionId, 'manual', todoItemId)
  lastSnapshotTime.set(sessionId, Date.now())
}

/**
 * 清除会话的节流记录
 */
export function clearThrottle(sessionId: string): void {
  lastSnapshotTime.delete(sessionId)
}
