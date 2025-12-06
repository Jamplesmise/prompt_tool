// 定时任务调度 Worker

import { Worker, Job } from 'bullmq'
import { redis, BULLMQ_PREFIX } from '../redis'
import { prisma } from '../prisma'
import { enqueueTask } from '../queue'
import { scheduleTask, SCHEDULER_QUEUE_NAME } from './schedulerQueue'
import type { SchedulerJobData, SchedulerJobResult } from './schedulerQueue'

let schedulerWorker: Worker<SchedulerJobData, SchedulerJobResult> | null = null

/**
 * 创建调度 Worker
 */
export function createSchedulerWorker(): Worker<SchedulerJobData, SchedulerJobResult> {
  if (schedulerWorker) {
    return schedulerWorker
  }

  schedulerWorker = new Worker<SchedulerJobData, SchedulerJobResult>(
    SCHEDULER_QUEUE_NAME,
    async (job: Job<SchedulerJobData>) => {
      const { scheduledTaskId } = job.data

      console.log(`[Scheduler] Processing scheduled task: ${scheduledTaskId}`)

      try {
        // 获取定时任务配置
        const scheduledTask = await prisma.scheduledTask.findUnique({
          where: { id: scheduledTaskId },
          include: {
            taskTemplate: {
              include: {
                prompts: true,
                models: true,
                evaluators: true,
              },
            },
          },
        })

        if (!scheduledTask) {
          throw new Error(`Scheduled task not found: ${scheduledTaskId}`)
        }

        if (!scheduledTask.isActive) {
          console.log(`[Scheduler] Scheduled task ${scheduledTaskId} is disabled, skipping`)
          return {
            scheduledTaskId,
            executionId: '',
            taskId: '',
            status: 'failed' as const,
            error: 'Scheduled task is disabled',
          }
        }

        // 基于任务模板创建新任务
        const newTask = await prisma.task.create({
          data: {
            name: `${scheduledTask.taskTemplate.name} - ${new Date().toLocaleString('zh-CN')}`,
            description: `由定时任务 "${scheduledTask.name}" 自动创建`,
            type: scheduledTask.taskTemplate.type,
            status: 'PENDING',
            config: scheduledTask.taskTemplate.config as object,
            datasetId: scheduledTask.taskTemplate.datasetId,
            createdById: scheduledTask.createdById,
            prompts: {
              create: scheduledTask.taskTemplate.prompts.map((p) => ({
                promptId: p.promptId,
                promptVersionId: p.promptVersionId,
              })),
            },
            models: {
              create: scheduledTask.taskTemplate.models.map((m) => ({
                modelId: m.modelId,
              })),
            },
            evaluators: {
              create: scheduledTask.taskTemplate.evaluators.map((e) => ({
                evaluatorId: e.evaluatorId,
              })),
            },
          },
        })

        // 创建执行记录
        const execution = await prisma.scheduledExecution.create({
          data: {
            scheduledTaskId,
            taskId: newTask.id,
            status: 'PENDING',
          },
        })

        // 更新定时任务的最后执行时间
        await prisma.scheduledTask.update({
          where: { id: scheduledTaskId },
          data: { lastRunAt: new Date() },
        })

        // 将新任务加入执行队列
        await enqueueTask(newTask.id)

        console.log(`[Scheduler] Created task ${newTask.id} from scheduled task ${scheduledTaskId}`)

        // 调度下次执行
        await scheduleTask(scheduledTaskId)

        // 更新执行记录状态（任务已成功入队）
        await prisma.scheduledExecution.update({
          where: { id: execution.id },
          data: { status: 'SUCCESS' },
        })

        return {
          scheduledTaskId,
          executionId: execution.id,
          taskId: newTask.id,
          status: 'success' as const,
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to process scheduled task ${scheduledTaskId}:`, error)

        // 创建失败的执行记录
        await prisma.scheduledExecution.create({
          data: {
            scheduledTaskId,
            taskId: scheduledTaskId, // 使用 scheduledTaskId 作为占位
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }).catch(() => {
          // 忽略创建执行记录失败
        })

        // 即使失败也要调度下次执行
        await scheduleTask(scheduledTaskId).catch(() => {
          // 忽略调度失败
        })

        throw error
      }
    },
    {
      connection: redis,
      prefix: BULLMQ_PREFIX,  // 与队列保持一致
      concurrency: 5,
    }
  )

  // 错误处理
  schedulerWorker.on('failed', (job, error) => {
    console.error(`[Scheduler] Job ${job?.id} failed:`, error.message)
  })

  schedulerWorker.on('completed', (job, result) => {
    console.log(`[Scheduler] Job ${job.id} completed:`, result.status)
  })

  console.log('[Scheduler] Worker started')

  return schedulerWorker
}

/**
 * 获取调度 Worker 实例
 */
export function getSchedulerWorker(): Worker<SchedulerJobData, SchedulerJobResult> | null {
  return schedulerWorker
}

/**
 * 关闭调度 Worker
 */
export async function closeSchedulerWorker(): Promise<void> {
  if (schedulerWorker) {
    await schedulerWorker.close()
    schedulerWorker = null
    console.log('[Scheduler] Worker stopped')
  }
}
