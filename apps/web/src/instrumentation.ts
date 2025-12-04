// Next.js Instrumentation - 服务器启动时执行
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // 跳过构建时的 Worker 初始化
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Skipping worker initialization during build')
    return
  }

  // 如果使用 Docker all-in-one 镜像，Worker 由 start.sh 单独启动
  // 设置 DISABLE_INSTRUMENTATION_WORKER=true 来禁用此处的 Worker
  if (process.env.DISABLE_INSTRUMENTATION_WORKER === 'true') {
    console.log('Instrumentation worker disabled (using separate worker process)')
    return
  }

  // 仅在 Node.js 运行时启动 Worker（不在 Edge 运行时）
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
