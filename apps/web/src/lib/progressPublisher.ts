// 进度发布器 - 使用 Redis Pub/Sub 实现跨进程事件推送

import type { TaskProgress, TaskStats, TaskStatus } from '@platform/shared'
import { redis, getSubscriberConnection, PUBSUB_PREFIX } from './redis'

export type ProgressEventType = 'progress' | 'completed' | 'failed' | 'stopped'

export type ProgressEvent =
  | { type: 'progress'; data: TaskProgress }
  | { type: 'completed'; data: { status: TaskStatus; stats: TaskStats } }
  | { type: 'failed'; data: { status: TaskStatus; error: string } }
  | { type: 'stopped'; data: { status: TaskStatus } }

/**
 * 获取任务频道名称（带前缀）
 */
function getChannelName(taskId: string): string {
  return `${PUBSUB_PREFIX}task:${taskId}`
}

/**
 * 发布事件到 Redis
 */
async function publishEvent(taskId: string, event: ProgressEvent): Promise<void> {
  try {
    const channel = getChannelName(taskId)
    await redis.publish(channel, JSON.stringify(event))
  } catch (error) {
    console.error('[ProgressPublisher] Failed to publish event:', error)
  }
}

/**
 * 发布任务进度更新
 */
export function publishProgress(taskId: string, progress: TaskProgress): void {
  const event: ProgressEvent = { type: 'progress', data: progress }
  void publishEvent(taskId, event)
}

/**
 * 发布任务完成事件
 */
export function publishCompleted(taskId: string, stats: TaskStats): void {
  const event: ProgressEvent = {
    type: 'completed',
    data: { status: 'COMPLETED' as TaskStatus, stats },
  }
  void publishEvent(taskId, event)
}

/**
 * 发布任务失败事件
 */
export function publishFailed(taskId: string, error: string): void {
  const event: ProgressEvent = {
    type: 'failed',
    data: { status: 'FAILED' as TaskStatus, error },
  }
  void publishEvent(taskId, event)
}

/**
 * 发布任务停止事件
 */
export function publishStopped(taskId: string): void {
  const event: ProgressEvent = {
    type: 'stopped',
    data: { status: 'STOPPED' as TaskStatus },
  }
  void publishEvent(taskId, event)
}

/**
 * 订阅任务进度（使用 Redis Pub/Sub）
 * @returns 取消订阅函数
 */
export function subscribeProgress(
  taskId: string,
  callback: (event: ProgressEvent) => void
): () => void {
  const channel = getChannelName(taskId)
  const subscriber = getSubscriberConnection()

  const messageHandler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as ProgressEvent
        callback(event)
      } catch (error) {
        console.error('[ProgressPublisher] Failed to parse event:', error)
      }
    }
  }

  // 订阅频道
  subscriber.subscribe(channel).catch((error) => {
    console.error('[ProgressPublisher] Failed to subscribe:', error)
  })

  subscriber.on('message', messageHandler)

  // 返回取消订阅函数
  return () => {
    subscriber.off('message', messageHandler)
    subscriber.unsubscribe(channel).catch((error) => {
      console.error('[ProgressPublisher] Failed to unsubscribe:', error)
    })
  }
}

/**
 * 获取当前订阅某任务的监听器数量
 * 注意：Redis Pub/Sub 无法直接获取订阅者数量，返回 -1 表示未知
 */
export function getListenerCount(_taskId: string): number {
  return -1
}
