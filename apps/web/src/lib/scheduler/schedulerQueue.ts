// 定时任务调度队列

import { Queue } from 'bullmq'
import { redis } from '../redis'
import { prisma } from '../prisma'
import { getNextRunTime, getDelayUntilNextRun } from './cronParser'

// 调度任务 Job 数据类型
export type SchedulerJobData = {
  scheduledTaskId: string
}

// 调度任务 Job 结果类型
export type SchedulerJobResult = {
  scheduledTaskId: string
  executionId: string
  taskId: string
  status: 'success' | 'failed'
  error?: string
}

// 队列名称
export const SCHEDULER_QUEUE_NAME = 'scheduler'

// 创建调度队列
export const schedulerQueue = new Queue<SchedulerJobData, SchedulerJobResult>(
  SCHEDULER_QUEUE_NAME,
  {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  }
)

/**
 * 调度定时任务（添加到延迟队列）
 */
export async function scheduleTask(scheduledTaskId: string): Promise<void> {
  const scheduledTask = await prisma.scheduledTask.findUnique({
    where: { id: scheduledTaskId },
  })

  if (!scheduledTask || !scheduledTask.isActive) {
    return
  }

  // 计算下次执行时间
  const nextRun = getNextRunTime(scheduledTask.cronExpression, {
    timezone: scheduledTask.timezone,
  })

  if (!nextRun) {
    console.error(`Invalid cron expression for scheduled task ${scheduledTaskId}`)
    return
  }

  const delay = getDelayUntilNextRun(scheduledTask.cronExpression, {
    timezone: scheduledTask.timezone,
  })

  if (delay === null || delay < 0) {
    return
  }

  // 添加到延迟队列
  const jobId = `scheduled-${scheduledTaskId}-${nextRun.getTime()}`

  // 先移除同一个定时任务的旧 Job（如果有）
  await removeScheduledJob(scheduledTaskId)

  await schedulerQueue.add(
    'scheduled-run',
    { scheduledTaskId },
    {
      delay,
      jobId,
    }
  )

  // 更新下次执行时间
  await prisma.scheduledTask.update({
    where: { id: scheduledTaskId },
    data: { nextRunAt: nextRun },
  })
}

/**
 * 移除定时任务的调度 Job
 */
export async function removeScheduledJob(scheduledTaskId: string): Promise<void> {
  const jobs = await schedulerQueue.getDelayed()

  for (const job of jobs) {
    if (job.data.scheduledTaskId === scheduledTaskId) {
      await job.remove()
    }
  }
}

/**
 * 立即执行定时任务（不影响正常调度）
 */
export async function runScheduledTaskNow(scheduledTaskId: string): Promise<string> {
  const jobId = `scheduled-manual-${scheduledTaskId}-${Date.now()}`

  const job = await schedulerQueue.add(
    'scheduled-run',
    { scheduledTaskId },
    {
      jobId,
      priority: 1, // 高优先级
    }
  )

  return job.id ?? jobId
}

/**
 * 启用定时任务
 */
export async function enableScheduledTask(scheduledTaskId: string): Promise<void> {
  await prisma.scheduledTask.update({
    where: { id: scheduledTaskId },
    data: { isActive: true },
  })

  await scheduleTask(scheduledTaskId)
}

/**
 * 禁用定时任务
 */
export async function disableScheduledTask(scheduledTaskId: string): Promise<void> {
  await prisma.scheduledTask.update({
    where: { id: scheduledTaskId },
    data: { isActive: false, nextRunAt: null },
  })

  await removeScheduledJob(scheduledTaskId)
}

/**
 * 初始化所有活跃的定时任务
 * 在服务启动时调用
 */
export async function initializeAllScheduledTasks(): Promise<void> {
  const activeTasks = await prisma.scheduledTask.findMany({
    where: { isActive: true },
  })

  console.log(`Initializing ${activeTasks.length} scheduled tasks...`)

  for (const task of activeTasks) {
    await scheduleTask(task.id)
  }

  console.log('Scheduled tasks initialized')
}

/**
 * 获取调度队列统计
 */
export async function getSchedulerQueueStats(): Promise<{
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    schedulerQueue.getWaitingCount(),
    schedulerQueue.getActiveCount(),
    schedulerQueue.getCompletedCount(),
    schedulerQueue.getFailedCount(),
    schedulerQueue.getDelayedCount(),
  ])

  return { waiting, active, completed, failed, delayed }
}
