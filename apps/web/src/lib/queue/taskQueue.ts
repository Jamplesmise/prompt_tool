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
export async function addTaskToQueue(data: TaskJobData): Promise<void> {
  await taskQueue.add('execute-task', data, {
    priority: data.priority,
    jobId: data.taskId,  // 使用 taskId 作为 jobId，避免重复
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
  if (!job) return null

  const state = await job.getState()
  return {
    id: job.id,
    state,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
}
