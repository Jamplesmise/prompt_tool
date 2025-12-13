/**
 * GOI 事件系统导出
 */

export { eventBus, GoiEventBus } from './eventBus'
export { eventStore, GoiEventStore } from './eventStore'
export type { EventHandler, EventBusConfig, EventBusStatus, SubscriptionEntry } from './types'
export type { EventQueryOptions, EventStats } from './eventStore'

// 事件发布辅助函数
export {
  isGoiEnabled,
  getCurrentSessionId,
  publishResourceAccessed,
  publishResourceCreated,
  publishResourceUpdated,
  publishResourceDeleted,
  publishTaskExecuted,
  publishResourceEvent,
  getGoiSessionFromRequest,
  isInGoiSession,
} from './publisher'

// 初始化函数：连接 Event Bus 和 Event Store
import { eventBus } from './eventBus'
import { eventStore } from './eventStore'

/**
 * 初始化 GOI 事件系统
 * 连接 Event Bus 和 Event Store，启用事件持久化
 */
export async function initializeGoiEventSystem(): Promise<void> {
  // 设置持久化回调
  eventBus.setPersistCallback(async (events) => {
    await eventStore.saveBatch(events)
  })

  // 初始化 Event Bus
  await eventBus.initialize()

  console.log('[GOI] Event system initialized')
}
