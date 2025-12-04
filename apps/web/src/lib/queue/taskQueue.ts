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

// 延迟初始化（避免构建时连接）
let _taskQueue: Queue<TaskJobData, TaskJobResult> | undefined
let _taskQueueEvents: QueueEvents | undefined

// 创建任务队列（延迟初始化）
export const taskQueue = new Proxy({} as Queue<TaskJobData, TaskJobResult>, {
  get(target, prop) {
    if (!_taskQueue) {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        throw new Error('Queue not available during build')
      }
      _taskQueue = new Queue<TaskJobData, TaskJobResult>(TASK_QUEUE_NAME, {
        connection: redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
          attempts: 1,
        },
      })
    }
    return (_taskQueue as any)[prop]
  },
})

// 队列事件监听（延迟初始化）
export const taskQueueEvents = new Proxy({} as QueueEvents, {
  get(target, prop) {
    if (!_taskQueueEvents) {
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        throw new Error('QueueEvents not available during build')
      }
      _taskQueueEvents = new QueueEvents(TASK_QUEUE_NAME, {
        connection: redis,
      })
    }
    return (_taskQueueEvents as any)[prop]
  },
})

/**
 * 将任务加入队列
 */
export async function addTaskToQueue(
  taskIdOrData: string | TaskJobData,
  options?: Partial<TaskJobData>
): Promise<void> {
  // 支持两种调用方式：
  // 1. addTaskToQueue({ taskId, priority, resumeFrom })
  // 2. addTaskToQueue(taskId, { resumeFrom })
  const data: TaskJobData =
    typeof taskIdOrData === 'string'
      ? { taskId: taskIdOrData, ...options }
      : taskIdOrData

  await taskQueue.add('execute-task', data, {
    priority: data.priority,
    jobId: data.taskId, // 使用 taskId 作为 jobId，避免重复
  })
}

/**
 * 从队列中移除任务
 */
export async function removeTaskFromQueue(taskId: string): Promise<void> {
  const job = await taskQueue.getJob(taskId)
  if (job) {
    await job.remove()
  }
}

/**
 * 获取队列中的任务状态
 */
export async function getQueueJobStatus(taskId: string) {
  const job = await taskQueue.getJob(taskId)
  if (!job) {
    return {
      exists: false,
      id: null,
      state: null,
      progress: null,
      attemptsMade: 0,
      processedOn: null,
      finishedOn: null,
      position: null,
    }
  }

  const state = await job.getState()
  // 获取队列位置（如果在等待中）
  let position: number | null = null
  if (state === 'waiting' || state === 'delayed') {
    try {
      const counts = await taskQueue.getJobCounts('waiting', 'delayed')
      const waiting = await taskQueue.getWaiting(0, counts.waiting + counts.delayed)
      position = waiting.findIndex((j) => j.id === job.id)
      if (position < 0) position = null
    } catch (e) {
      // 获取位置失败，忽略
      position = null
    }
  }

  return {
    exists: true,
    id: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    position,
  }
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    taskQueue.getWaitingCount(),
    taskQueue.getActiveCount(),
    taskQueue.getCompletedCount(),
    taskQueue.getFailedCount(),
    taskQueue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}

/**
 * 暂停队列
 */
export async function pauseQueue(): Promise<void> {
  await taskQueue.pause()
}

/**
 * 恢复队列
 */
export async function resumeQueue(): Promise<void> {
  await taskQueue.resume()
}

/**
 * 清空队列
 */
export async function clearQueue(): Promise<void> {
  await taskQueue.drain()
  await taskQueue.clean(0, 1000, 'completed')
  await taskQueue.clean(0, 1000, 'failed')
}

// 兼容性别名（保持向后兼容）
export const enqueueTask = addTaskToQueue
export const getQueuedTaskStatus = getQueueJobStatus
export const removeFromQueue = removeTaskFromQueue
