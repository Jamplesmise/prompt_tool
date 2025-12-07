/**
 * 事件类型定义
 */
export type EventType =
  | 'prompt:saved'
  | 'prompt:published'
  | 'dataset:uploaded'
  | 'model:configured'
  | 'model:tested'
  | 'task:created'
  | 'task:completed'
  | 'task:failed'

/**
 * 事件数据类型
 */
export type EventData = {
  'prompt:saved': { promptId: string; promptName: string }
  'prompt:published': { promptId: string; version: number }
  'dataset:uploaded': { datasetId: string; datasetName: string; rowCount: number }
  'model:configured': { providerId: string; providerName: string }
  'model:tested': { modelId: string; success: boolean }
  'task:created': { taskId: string; taskName: string }
  'task:completed': { taskId: string; taskName: string; passRate: number }
  'task:failed': { taskId: string; taskName: string; error: string }
}

type EventHandler<T extends EventType> = (data: EventData[T]) => void

/**
 * 简单的事件总线实现
 */
class EventBus {
  private handlers: Map<EventType, Set<EventHandler<EventType>>> = new Map()

  /**
   * 订阅事件
   */
  on<T extends EventType>(event: T, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    const handlers = this.handlers.get(event)!
    handlers.add(handler as EventHandler<EventType>)

    // 返回取消订阅函数
    return () => {
      handlers.delete(handler as EventHandler<EventType>)
    }
  }

  /**
   * 发布事件
   */
  emit<T extends EventType>(event: T, data: EventData[T]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data as EventData[EventType])
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 移除特定事件的所有处理器
   */
  off(event: EventType): void {
    this.handlers.delete(event)
  }

  /**
   * 清除所有事件处理器
   */
  clear(): void {
    this.handlers.clear()
  }
}

// 导出单例
export const eventBus = new EventBus()

/**
 * React Hook: 订阅事件
 */
import { useEffect } from 'react'

export function useEventBus<T extends EventType>(
  event: T,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps])
}
