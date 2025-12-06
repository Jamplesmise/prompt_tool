// BullMQ 任务队列定义

import { Queue, QueueEvents } from 'bullmq'
import { redis } from '../redis'

// 任务 Job 数据类型
export type TaskJobData = {
  taskId: string
  priority?: number
  resumeFrom?: string  // 断点续跑起始点
}

// 任务 Job 结果类型
export type TaskJobResult = {
  taskId: string
  status: 'completed' | 'failed' | 'stopped'
  error?: string
}

// 队列名称
export const TASK_QUEUE_NAME = 'task-execution'

// 使用全局变量缓存队列实例（避免热重载时重复创建）
const globalForQueue = globalThis as unknown as {
  taskQueue: Queue<TaskJobData, TaskJobResult> | undefined
  taskQueueEvents: QueueEvents | undefined
}

/**
 * 获取任务队列（延迟初始化）
 * 采用 FastGPT 的模式：调用时才创建连接，避免构建时连接 Redis
 */
export function getTaskQueue(): Queue<TaskJobData, TaskJobResult> {
  if (!globalForQueue.taskQueue) {
    globalForQueue.taskQueue = new Queue<TaskJobData, TaskJobResult>(TASK_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,  // 保留最近 100 个完成的任务
        removeOnFail: 100,      // 保留最近 100 个失败的任务
        attempts: 1,            // 默认不重试（任务内部有重试机制）
      },
    })
  }
  return globalForQueue.taskQueue
}

/**
 * 获取队列事件监听器（延迟初始化）
 */
export function getTaskQueueEvents(): QueueEvents {
  if (!globalForQueue.taskQueueEvents) {
    globalForQueue.taskQueueEvents = new QueueEvents(TASK_QUEUE_NAME, {
      connection: redis,
    })
  }
  return globalForQueue.taskQueueEvents
}

/**
 * 将任务加入队列
 */
export async function enqueueTask(
  taskId: string,
  options?: {
    priority?: number
    resumeFrom?: string
  }
): Promise<string> {
  const queue = getTaskQueue()
  const job = await queue.add(
    'execute',
    {
      taskId,
      priority: options?.priority,
      resumeFrom: options?.resumeFrom,
    },
    {
      priority: options?.priority ?? 0,
      jobId: taskId,  // 使用 taskId 作为 jobId，防止重复入队
    }
  )

  return job.id ?? taskId
}

/**
 * 获取队列中的任务状态
 */
export async function getQueuedTaskStatus(taskId: string): Promise<{
  exists: boolean
  state?: string
  progress?: number
  position?: number
}> {
  const queue = getTaskQueue()
  const job = await queue.getJob(taskId)

  if (!job) {
    return { exists: false }
  }

  const state = await job.getState()
  const progress = job.progress as number | undefined

  // 获取在队列中的位置
  let position: number | undefined
  if (state === 'waiting' || state === 'prioritized') {
    const waitingJobs = await queue.getWaiting()
    const index = waitingJobs.findIndex((j) => j.id === taskId)
    position = index >= 0 ? index + 1 : undefined
  }

  return {
    exists: true,
    state,
    progress,
    position,
  }
}

/**
 * 从队列移除任务
 */
export async function removeFromQueue(taskId: string): Promise<boolean> {
  const queue = getTaskQueue()
  const job = await queue.getJob(taskId)
  if (!job) {
    return false
  }

  const state = await job.getState()
  if (state === 'active') {
    // 正在执行的任务不能直接移除，需要通过 stop 机制
    return false
  }

  await job.remove()
  return true
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats(): Promise<{
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}> {
  const queue = getTaskQueue()
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

/**
 * 暂停队列
 */
export async function pauseQueue(): Promise<void> {
  const queue = getTaskQueue()
  await queue.pause()
}

/**
 * 恢复队列
 */
export async function resumeQueue(): Promise<void> {
  const queue = getTaskQueue()
  await queue.resume()
}

/**
 * 清空队列
 */
export async function clearQueue(): Promise<void> {
  const queue = getTaskQueue()
  await queue.obliterate({ force: true })
}
