import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, unauthorized, internalError } from '@/lib/api'
import { getQueueStats, getTaskQueue } from '@/lib/queue'

// GET /api/v1/queue/status - 获取队列状态
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 获取队列统计
    const stats = await getQueueStats()

    // 获取队列实例
    const taskQueue = getTaskQueue()

    // 获取队列是否暂停
    const isPaused = await taskQueue.isPaused()

    // 获取等待中的任务列表（最多 10 个）
    const waitingJobs = await taskQueue.getWaiting(0, 9)
    const waiting = waitingJobs.map((job) => ({
      jobId: job.id,
      taskId: job.data.taskId,
      priority: job.opts.priority ?? 0,
      addedAt: job.timestamp,
    }))

    // 获取正在执行的任务列表
    const activeJobs = await taskQueue.getActive()
    const active = activeJobs.map((job) => ({
      jobId: job.id,
      taskId: job.data.taskId,
      progress: job.progress,
      startedAt: job.processedOn,
    }))

    return NextResponse.json(success({
      stats,
      isPaused,
      waiting,
      active,
    }))
  } catch (err) {
    console.error('Get queue status error:', err)
    const errorMessage = err instanceof Error ? err.message : '获取队列状态失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
