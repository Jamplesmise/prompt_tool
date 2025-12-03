// 确保 Worker 在服务端启动
// 这个模块在服务端 API 路由中被导入时会自动启动 Worker

import { getTaskWorker } from './taskWorker'

// 使用 globalThis 确保在 Next.js 热更新时保持状态
const globalForWorker = globalThis as unknown as {
  workerInitialized: boolean | undefined
}

export function ensureWorkerStarted() {
  if (typeof window !== 'undefined') {
    // 客户端不启动 Worker
    return
  }

  if (!globalForWorker.workerInitialized) {
    globalForWorker.workerInitialized = true
    const worker = getTaskWorker()
    console.log('[Worker] Task worker started (pid:', process.pid, ')')

    // 监听 Worker 事件
    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed`)
    })

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err.message)
    })

    worker.on('active', (job) => {
      console.log(`[Worker] Job ${job.id} started processing`)
    })

    worker.on('error', (err) => {
      console.error('[Worker] Error:', err.message)
    })
  }
}

// 自动初始化
ensureWorkerStarted()
