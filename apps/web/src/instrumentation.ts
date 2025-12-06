// Next.js Instrumentation - 服务器启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 Node.js 运行时启动 Worker（不在 Edge 运行时）
  // 跳过构建阶段：检查是否在 next build 过程中
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== 'phase-production-build') {
    // 额外检查：确保 REDIS_URL 是有效的（不是占位符）
    const redisUrl = process.env.REDIS_URL || ''
    if (!redisUrl || redisUrl.includes('localhost') && !process.env.REDIS_URL) {
      console.log('[Instrumentation] Skipping worker initialization - Redis not configured')
      return
    }

    // 动态导入以避免客户端打包问题
    const { getTaskWorker } = await import('./lib/queue')

    // 启动 Worker
    const worker = getTaskWorker()

    console.log('[Instrumentation] Task worker started in Next.js server')

    // 处理进程退出
    const cleanup = async () => {
      console.log('[Instrumentation] Shutting down task worker...')
      await worker.close()
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }
}
