// BullMQ Worker 启动脚本
// 使用方式: pnpm worker 或 tsx scripts/worker.ts

import { createTaskWorker, closeTaskWorker } from '../src/lib/queue'

console.log('Starting task worker...')

const worker = createTaskWorker()

console.log('Task worker started. Press Ctrl+C to stop.')

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\nShutting down worker...')
  await closeTaskWorker()
  console.log('Worker stopped.')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down...')
  await closeTaskWorker()
  console.log('Worker stopped.')
  process.exit(0)
})

// 保持进程运行
process.stdin.resume()
