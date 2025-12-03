// Worker 进程入口
// 独立运行的任务执行 Worker

import { createTaskWorker, closeTaskWorker } from './lib/queue'

console.log('Starting task worker...')

// 创建 Worker
const worker = createTaskWorker()

console.log('Task worker started, waiting for jobs...')

// 优雅退出处理
const shutdown = async () => {
  console.log('Shutting down worker...')
  await closeTaskWorker()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// 保持进程运行
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
