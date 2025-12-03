// 进度发布器 - 用于任务执行进度推送（MVP 使用内存 EventEmitter）

import { EventEmitter } from 'events'
import type { TaskProgress, TaskStats, TaskStatus } from '@platform/shared'

// 全局事件发射器（单实例）
const globalForEmitter = globalThis as unknown as {
  progressEmitter: EventEmitter | undefined
}

const emitter =
  globalForEmitter.progressEmitter ?? new EventEmitter()

if (process.env.NODE_ENV !== 'production') {
  globalForEmitter.progressEmitter = emitter
}

// 设置最大监听器数量（防止内存泄漏警告）
emitter.setMaxListeners(100)

export type ProgressEventType = 'progress' | 'completed' | 'failed' | 'stopped'

export type ProgressEvent =
  | { type: 'progress'; data: TaskProgress }
  | { type: 'completed'; data: { status: TaskStatus; stats: TaskStats } }
  | { type: 'failed'; data: { status: TaskStatus; error: string } }
  | { type: 'stopped'; data: { status: TaskStatus } }

/**
 * 发布任务进度更新
 */
export function publishProgress(taskId: string, progress: TaskProgress): void {
  const event: ProgressEvent = { type: 'progress', data: progress }
  emitter.emit(`task:${taskId}`, event)
}

/**
 * 发布任务完成事件
 */
export function publishCompleted(taskId: string, stats: TaskStats): void {
  const event: ProgressEvent = {
    type: 'completed',
    data: { status: 'COMPLETED' as TaskStatus, stats },
  }
  emitter.emit(`task:${taskId}`, event)
}

/**
 * 发布任务失败事件
 */
export function publishFailed(taskId: string, error: string): void {
  const event: ProgressEvent = {
    type: 'failed',
    data: { status: 'FAILED' as TaskStatus, error },
  }
  emitter.emit(`task:${taskId}`, event)
}

/**
 * 发布任务停止事件
 */
export function publishStopped(taskId: string): void {
  const event: ProgressEvent = {
    type: 'stopped',
    data: { status: 'STOPPED' as TaskStatus },
  }
  emitter.emit(`task:${taskId}`, event)
}

/**
 * 订阅任务进度
 * @returns 取消订阅函数
 */
export function subscribeProgress(
  taskId: string,
  callback: (event: ProgressEvent) => void
): () => void {
  const handler = (event: ProgressEvent) => callback(event)
  emitter.on(`task:${taskId}`, handler)
  return () => emitter.off(`task:${taskId}`, handler)
}

/**
 * 获取当前订阅某任务的监听器数量
 */
export function getListenerCount(taskId: string): number {
  return emitter.listenerCount(`task:${taskId}`)
}
