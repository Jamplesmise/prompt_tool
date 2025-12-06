// Next.js Instrumentation - 服务器启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 仅在 Node.js 运行时启动 Worker（不在 Edge 运行时）
  // 注意：队列使用延迟初始化，只有在调用 getTaskWorker() 时才会连接 Redis
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 动态导入以避免客户端打包问题
    const { getTaskWorker } = await import('./lib/queue')

    // 启动 Worker
    const worker = getTaskWorker()

    console.log('Task worker started in Next.js server')

    // 处理进程退出
    const cleanup = async () => {
      console.log('Shutting down task worker...')
      await worker.close()
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
  }
}
