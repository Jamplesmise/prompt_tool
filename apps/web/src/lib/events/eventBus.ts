/**
 * GOI Event Bus - 基于 Redis Pub/Sub 的事件总线
 *
 * 功能：
 * - 发布事件到 Redis Channel
 * - 订阅特定会话的事件
 * - 支持事件过滤（按类型、分类）
 * - 自动重连和错误处理
 */

import { nanoid } from 'nanoid'
import { redis, getSubscriberConnection, PUBSUB_PREFIX } from '../redis'
import type { GoiEvent, GoiEventType, CreateGoiEventInput } from '@platform/shared'
import { getEventCategory as getCategory } from '@platform/shared'
import type { EventHandler, SubscriptionEntry, EventBusConfig, EventBusStatus } from './types'

/**
 * GOI 事件 Channel 前缀
 */
const GOI_CHANNEL_PREFIX = `${PUBSUB_PREFIX}goi:events:`

/**
 * 全局事件 Channel（用于广播）
 */
const GOI_GLOBAL_CHANNEL = `${PUBSUB_PREFIX}goi:events:global`

/**
 * 默认配置
 */
const DEFAULT_CONFIG: EventBusConfig = {
  channelPrefix: GOI_CHANNEL_PREFIX,
  enablePersistence: true,
  batchInterval: 100,
  batchSize: 50,
  reconnectInterval: 5000,
  maxRetries: 10,
}

/**
 * 订阅管理器
 */
class SubscriptionManager {
  private subscriptions: Map<string, SubscriptionEntry[]> = new Map()
  private handlerIdMap: Map<string, string> = new Map()

  /**
   * 添加订阅
   */
  add(sessionId: string, handler: EventHandler, types?: GoiEventType[]): string {
    const subscriptionId = nanoid()
    const entry: SubscriptionEntry = {
      id: subscriptionId,
      sessionId,
      types,
      handler,
      createdAt: new Date(),
    }

    const existing = this.subscriptions.get(sessionId) || []
    existing.push(entry)
    this.subscriptions.set(sessionId, existing)
    this.handlerIdMap.set(subscriptionId, sessionId)

    return subscriptionId
  }

  /**
   * 移除订阅
   */
  remove(subscriptionId: string): boolean {
    const sessionId = this.handlerIdMap.get(subscriptionId)
    if (!sessionId) return false

    const entries = this.subscriptions.get(sessionId)
    if (!entries) return false

    const index = entries.findIndex((e) => e.id === subscriptionId)
    if (index === -1) return false

    entries.splice(index, 1)
    this.handlerIdMap.delete(subscriptionId)

    if (entries.length === 0) {
      this.subscriptions.delete(sessionId)
    }

    return true
  }

  /**
   * 移除会话的所有订阅
   */
  removeBySession(sessionId: string): number {
    const entries = this.subscriptions.get(sessionId)
    if (!entries) return 0

    const count = entries.length
    entries.forEach((e) => this.handlerIdMap.delete(e.id))
    this.subscriptions.delete(sessionId)

    return count
  }

  /**
   * 获取会话的订阅
   */
  getBySession(sessionId: string): SubscriptionEntry[] {
    return this.subscriptions.get(sessionId) || []
  }

  /**
   * 获取所有会话 ID
   */
  getAllSessionIds(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * 获取订阅数量
   */
  getCount(): number {
    let count = 0
    this.subscriptions.forEach((entries) => {
      count += entries.length
    })
    return count
  }

  /**
   * 清空所有订阅
   */
  clear(): void {
    this.subscriptions.clear()
    this.handlerIdMap.clear()
  }
}

/**
 * GOI Event Bus 实现
 */
class GoiEventBus {
  private config: EventBusConfig
  private subscriptionManager: SubscriptionManager
  private isInitialized = false
  private isSubscribing = false
  private subscribedChannels: Set<string> = new Set()
  private pendingEvents: GoiEvent[] = []
  private batchTimer: NodeJS.Timeout | null = null
  private onPersist?: (events: GoiEvent[]) => Promise<void>

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.subscriptionManager = new SubscriptionManager()
  }

  /**
   * 初始化 Event Bus
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 确保 Redis 连接
      await redis.ping()

      // 设置全局频道订阅
      await this.setupGlobalSubscription()

      this.isInitialized = true
      console.log('[GoiEventBus] Initialized successfully')
    } catch (error) {
      console.error('[GoiEventBus] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * 设置全局订阅
   */
  private async setupGlobalSubscription(): Promise<void> {
    if (this.isSubscribing) return
    this.isSubscribing = true

    const subscriber = getSubscriberConnection()

    subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message)
    })

    subscriber.on('error', (error) => {
      console.error('[GoiEventBus] Subscriber error:', error)
    })

    // 订阅全局频道
    await subscriber.subscribe(GOI_GLOBAL_CHANNEL)
    this.subscribedChannels.add(GOI_GLOBAL_CHANNEL)
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const event = this.deserializeEvent(message)
      if (!event) return

      // 分发给对应会话的订阅者
      const entries = this.subscriptionManager.getBySession(event.sessionId)

      entries.forEach((entry) => {
        // 检查事件类型过滤
        if (entry.types && entry.types.length > 0 && !entry.types.includes(event.type)) {
          return
        }

        // 异步执行 handler，避免阻塞
        Promise.resolve(entry.handler(event)).catch((error) => {
          console.error('[GoiEventBus] Handler error:', error)
        })
      })
    } catch (error) {
      console.error('[GoiEventBus] Failed to handle message:', error)
    }
  }

  /**
   * 发布事件
   */
  async publish<T extends GoiEventType>(input: CreateGoiEventInput<T>): Promise<GoiEvent<T>> {
    const event: GoiEvent<T> = {
      id: nanoid(),
      sessionId: input.sessionId,
      type: input.type,
      category: getCategory(input.type),
      source: input.source,
      payload: input.payload,
      timestamp: new Date(),
      metadata: input.metadata,
    } as GoiEvent<T>

    try {
      // 序列化并发布到 Redis
      const serialized = this.serializeEvent(event)

      // 发布到会话特定频道
      const sessionChannel = `${GOI_CHANNEL_PREFIX}${input.sessionId}`
      await redis.publish(sessionChannel, serialized)

      // 同时发布到全局频道
      await redis.publish(GOI_GLOBAL_CHANNEL, serialized)

      // 如果启用持久化，添加到待持久化队列
      if (this.config.enablePersistence && this.onPersist) {
        this.addToPendingBatch(event)
      }

      return event
    } catch (error) {
      console.error('[GoiEventBus] Failed to publish event:', error)
      throw error
    }
  }

  /**
   * 订阅会话事件
   */
  async subscribe(
    sessionId: string,
    handler: EventHandler,
    types?: GoiEventType[]
  ): Promise<string> {
    // 添加到订阅管理器
    const subscriptionId = this.subscriptionManager.add(sessionId, handler, types)

    // 确保订阅了该会话的频道
    const sessionChannel = `${GOI_CHANNEL_PREFIX}${sessionId}`
    if (!this.subscribedChannels.has(sessionChannel)) {
      const subscriber = getSubscriberConnection()
      await subscriber.subscribe(sessionChannel)
      this.subscribedChannels.add(sessionChannel)
    }

    return subscriptionId
  }

  /**
   * 取消订阅
   */
  async unsubscribe(subscriptionId: string): Promise<boolean> {
    return this.subscriptionManager.remove(subscriptionId)
  }

  /**
   * 取消会话的所有订阅
   */
  async unsubscribeSession(sessionId: string): Promise<number> {
    const count = this.subscriptionManager.removeBySession(sessionId)

    // 检查是否还有其他订阅者，如果没有则取消频道订阅
    const sessionChannel = `${GOI_CHANNEL_PREFIX}${sessionId}`
    const remainingEntries = this.subscriptionManager.getBySession(sessionId)

    if (remainingEntries.length === 0 && this.subscribedChannels.has(sessionChannel)) {
      const subscriber = getSubscriberConnection()
      await subscriber.unsubscribe(sessionChannel)
      this.subscribedChannels.delete(sessionChannel)
    }

    return count
  }

  /**
   * 设置持久化回调
   */
  setPersistCallback(callback: (events: GoiEvent[]) => Promise<void>): void {
    this.onPersist = callback
  }

  /**
   * 添加到待持久化批次
   */
  private addToPendingBatch(event: GoiEvent): void {
    this.pendingEvents.push(event)

    // 如果达到批量大小，立即持久化
    if (this.pendingEvents.length >= this.config.batchSize) {
      this.flushPendingEvents()
      return
    }

    // 启动定时器（如果未启动）
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushPendingEvents()
      }, this.config.batchInterval)
    }
  }

  /**
   * 刷新待持久化事件
   */
  private async flushPendingEvents(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.pendingEvents.length === 0 || !this.onPersist) return

    const events = [...this.pendingEvents]
    this.pendingEvents = []

    try {
      await this.onPersist(events)
    } catch (error) {
      console.error('[GoiEventBus] Failed to persist events:', error)
      // 失败的事件放回队列
      this.pendingEvents.unshift(...events)
    }
  }

  /**
   * 序列化事件
   */
  private serializeEvent(event: GoiEvent): string {
    return JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
    })
  }

  /**
   * 反序列化事件
   */
  private deserializeEvent(data: string): GoiEvent | null {
    try {
      const parsed = JSON.parse(data)
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      }
    } catch {
      return null
    }
  }

  /**
   * 获取状态
   */
  getStatus(): EventBusStatus {
    return {
      isConnected: this.isInitialized,
      subscriberCount: this.subscriptionManager.getCount(),
      pendingEvents: this.pendingEvents.length,
      lastEventTime: this.pendingEvents.length > 0
        ? this.pendingEvents[this.pendingEvents.length - 1].timestamp
        : undefined,
    }
  }

  /**
   * 关闭 Event Bus
   */
  async shutdown(): Promise<void> {
    // 刷新待持久化事件
    await this.flushPendingEvents()

    // 清空订阅
    this.subscriptionManager.clear()

    // 取消所有频道订阅
    const subscriber = getSubscriberConnection()
    for (const channel of this.subscribedChannels) {
      await subscriber.unsubscribe(channel)
    }
    this.subscribedChannels.clear()

    this.isInitialized = false
    this.isSubscribing = false
  }
}

// 导出单例实例
export const eventBus = new GoiEventBus()

// 导出类型和工具函数
export { GoiEventBus }
export type { EventHandler, EventBusConfig, EventBusStatus }
