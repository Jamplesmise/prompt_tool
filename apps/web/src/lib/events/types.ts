/**
 * Event Bus 内部类型定义
 */

import type { GoiEvent, GoiEventType, GoiEventSubscription } from '@platform/shared'

/**
 * 事件处理器类型
 */
export type EventHandler = (event: GoiEvent) => void | Promise<void>

/**
 * 订阅管理器中的订阅项
 */
export type SubscriptionEntry = {
  id: string
  sessionId: string
  types?: GoiEventType[]
  handler: EventHandler
  createdAt: Date
}

/**
 * Event Bus 配置
 */
export type EventBusConfig = {
  /** Redis Channel 前缀 */
  channelPrefix: string
  /** 是否启用持久化 */
  enablePersistence: boolean
  /** 批量写入间隔 (ms) */
  batchInterval: number
  /** 批量写入大小 */
  batchSize: number
  /** 重连间隔 (ms) */
  reconnectInterval: number
  /** 最大重试次数 */
  maxRetries: number
}

/**
 * Event Bus 状态
 */
export type EventBusStatus = {
  isConnected: boolean
  subscriberCount: number
  pendingEvents: number
  lastEventTime?: Date
}

/**
 * 序列化后的事件
 */
export type SerializedEvent = {
  id: string
  sessionId: string
  type: string
  category: string
  source: string
  payload: string
  timestamp: string
  metadata?: string
}
