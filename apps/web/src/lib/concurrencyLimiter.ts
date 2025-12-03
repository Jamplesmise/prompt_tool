// 并发控制器 - 限制同时执行的任务数量

export class ConcurrencyLimiter {
  private running = 0
  private queue: Array<() => void> = []

  constructor(private readonly limit: number) {
    if (limit < 1) {
      throw new Error('并发限制必须大于 0')
    }
  }

  /**
   * 获取当前运行中的任务数
   */
  get runningCount(): number {
    return this.running
  }

  /**
   * 获取队列中等待的任务数
   */
  get queueLength(): number {
    return this.queue.length
  }

  /**
   * 在并发限制下执行函数
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  /**
   * 获取执行槽位
   */
  private acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.running++
        resolve()
      })
    })
  }

  /**
   * 释放执行槽位
   */
  private release(): void {
    this.running--
    const next = this.queue.shift()
    if (next) {
      next()
    }
  }
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 带重试的执行函数（指数退避）
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    retryCount: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: unknown) => boolean
  }
): Promise<T> {
  const {
    retryCount,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = () => true,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // 检查是否应该重试
      if (attempt >= retryCount || !shouldRetry(error)) {
        throw error
      }

      // 指数退避
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * 带超时的执行函数
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`操作超时 (${timeoutMs}ms)`)), timeoutMs)
    ),
  ])
}

/**
 * 超时错误类
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}
