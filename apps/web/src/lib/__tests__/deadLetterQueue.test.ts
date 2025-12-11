/**
 * 死信队列测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Redis 和 BullMQ
vi.mock('../redis', () => ({
  redis: {},
  BULLMQ_PREFIX: 'test-prefix',
}))

vi.mock('bullmq', () => {
  const jobs: Map<string, { id: string; data: unknown; timestamp: number }> = new Map()

  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockImplementation(async (name: string, data: unknown, options?: { jobId?: string }) => {
        const id = options?.jobId ?? `job-${Date.now()}`
        const job = { id, data, timestamp: Date.now() }
        jobs.set(id, job)
        return job
      }),
      getJob: vi.fn().mockImplementation(async (id: string) => {
        const job = jobs.get(id)
        if (!job) return null
        return {
          ...job,
          remove: vi.fn().mockImplementation(async () => {
            jobs.delete(id)
          }),
        }
      }),
      getJobs: vi.fn().mockImplementation(async () => {
        return Array.from(jobs.values())
      }),
      obliterate: vi.fn().mockImplementation(async () => {
        jobs.clear()
      }),
    })),
    QueueEvents: vi.fn().mockImplementation(() => ({})),
  }
})

describe('Dead Letter Queue', () => {
  beforeEach(async () => {
    vi.resetModules()
  })

  it('应能将失败任务移至死信队列', async () => {
    const { moveToDeadLetterQueue, getDeadLetterJobs } = await import('../queue/taskQueue')

    const jobData = { taskId: 'task-123', priority: 1 }
    await moveToDeadLetterQueue(jobData, 'original-job-1', 'Test failure', 3)

    const dlqJobs = await getDeadLetterJobs()
    expect(dlqJobs.length).toBeGreaterThan(0)
  })

  it('死信任务数据应包含失败信息', async () => {
    const { moveToDeadLetterQueue, getDeadLetterJobs } = await import('../queue/taskQueue')

    const jobData = { taskId: 'task-456' }
    await moveToDeadLetterQueue(jobData, 'original-job-2', 'Connection timeout', 5)

    const dlqJobs = await getDeadLetterJobs()
    const job = dlqJobs.find(j => j.data.taskId === 'task-456')

    expect(job).toBeDefined()
    expect(job?.data.failureReason).toBe('Connection timeout')
    expect(job?.data.attemptsMade).toBe(5)
    expect(job?.data.originalJobId).toBe('original-job-2')
  })

  it('应能从死信队列重试任务', async () => {
    const { moveToDeadLetterQueue, retryFromDeadLetterQueue, getDeadLetterJobs } = await import('../queue/taskQueue')

    const jobData = { taskId: 'task-retry-test' }
    const dlqJobId = await moveToDeadLetterQueue(jobData, 'orig-job', 'error', 1)

    const beforeRetry = await getDeadLetterJobs()
    const beforeCount = beforeRetry.length

    const newJobId = await retryFromDeadLetterQueue(dlqJobId)

    expect(newJobId).toBeDefined()
  })

  it('重试不存在的任务应返回 null', async () => {
    const { retryFromDeadLetterQueue } = await import('../queue/taskQueue')

    const result = await retryFromDeadLetterQueue('non-existent-job')
    expect(result).toBeNull()
  })
})
