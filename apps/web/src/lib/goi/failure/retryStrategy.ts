/**
 * 重试策略
 *
 * 提供各种重试策略的实现和执行
 */

import type {
  RetryStrategy,
  FailureInfo,
  FailureType,
} from '@platform/shared'
import { DEFAULT_RETRY_STRATEGIES } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 重试执行器回调
 */
export type RetryCallback<T> = () => Promise<T>

/**
 * 重试事件监听器
 */
export type RetryEventListener = (event: RetryEvent) => void

/**
 * 重试事件
 */
export type RetryEvent = {
  type: 'retry_started' | 'retry_succeeded' | 'retry_failed' | 'retry_exhausted'
  attempt: number
  maxAttempts: number
  delay?: number
  error?: Error
  result?: unknown
}

/**
 * 重试选项
 */
export type RetryOptions = {
  /** 重试策略 */
  strategy?: RetryStrategy
  /** 失败类型（用于获取默认策略） */
  failureType?: FailureType
  /** 事件监听器 */
  onEvent?: RetryEventListener
  /** 中止信号 */
  abortSignal?: AbortSignal
}

// ============================================
// 重试执行器类
// ============================================

/**
 * 重试执行器
 */
export class RetryExecutor {
  /**
   * 执行带重试的操作
   */
  async execute<T>(
    callback: RetryCallback<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const strategy = this.resolveStrategy(options)
    let lastError: Error | undefined
    let attempt = 0

    while (attempt <= strategy.maxRetries) {
      // 检查中止信号
      if (options.abortSignal?.aborted) {
        throw new Error('Retry aborted')
      }

      try {
        // 发布重试开始事件
        if (attempt > 0) {
          this.emitEvent(options.onEvent, {
            type: 'retry_started',
            attempt,
            maxAttempts: strategy.maxRetries,
          })
        }

        // 执行操作
        const result = await callback()

        // 发布成功事件
        if (attempt > 0) {
          this.emitEvent(options.onEvent, {
            type: 'retry_succeeded',
            attempt,
            maxAttempts: strategy.maxRetries,
            result,
          })
        }

        return result
      } catch (error) {
        lastError = error as Error

        // 发布失败事件
        this.emitEvent(options.onEvent, {
          type: 'retry_failed',
          attempt,
          maxAttempts: strategy.maxRetries,
          error: lastError,
        })

        // 如果还有重试机会，等待后重试
        if (attempt < strategy.maxRetries) {
          const delay = this.calculateDelay(strategy, attempt)
          await this.sleep(delay, options.abortSignal)
          attempt++
        } else {
          break
        }
      }
    }

    // 发布重试耗尽事件
    this.emitEvent(options.onEvent, {
      type: 'retry_exhausted',
      attempt,
      maxAttempts: strategy.maxRetries,
      error: lastError,
    })

    throw lastError
  }

  /**
   * 执行带超时的重试
   */
  async executeWithTimeout<T>(
    callback: RetryCallback<T>,
    timeoutMs: number,
    options: RetryOptions = {}
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await this.execute(callback, {
        ...options,
        abortSignal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 计算重试延迟
   */
  calculateDelay(strategy: RetryStrategy, attempt: number): number {
    let delay: number

    switch (strategy.type) {
      case 'immediate':
        delay = strategy.initialDelay
        break

      case 'linear':
        delay = strategy.initialDelay * (attempt + 1)
        break

      case 'exponential':
        const multiplier = strategy.multiplier || 2
        delay = strategy.initialDelay * Math.pow(multiplier, attempt)
        break

      default:
        delay = strategy.initialDelay
    }

    // 应用最大延迟限制
    delay = Math.min(delay, strategy.maxDelay)

    // 添加抖动
    if (strategy.jitter) {
      const jitterRange = delay * 0.2
      const jitter = Math.random() * jitterRange - jitterRange / 2
      delay = Math.max(0, delay + jitter)
    }

    return Math.round(delay)
  }

  /**
   * 获取默认策略
   */
  getDefaultStrategy(failureType: FailureType): RetryStrategy {
    return DEFAULT_RETRY_STRATEGIES[failureType]
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 解析策略
   */
  private resolveStrategy(options: RetryOptions): RetryStrategy {
    if (options.strategy) {
      return options.strategy
    }

    if (options.failureType) {
      return this.getDefaultStrategy(options.failureType)
    }

    // 默认策略
    return {
      type: 'exponential',
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      multiplier: 2,
      jitter: true,
    }
  }

  /**
   * 发布事件
   */
  private emitEvent(listener: RetryEventListener | undefined, event: RetryEvent): void {
    if (listener) {
      try {
        listener(event)
      } catch (error) {
        console.error('Retry event listener error:', error)
      }
    }
  }

  /**
   * 等待指定时间
   */
  private async sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, ms)

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId)
          reject(new Error('Sleep aborted'))
        })
      }
    })
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 创建自定义重试策略
 */
export function createRetryStrategy(
  options: Partial<RetryStrategy> & { type: RetryStrategy['type'] }
): RetryStrategy {
  const defaults: Omit<RetryStrategy, 'type'> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
  }

  return {
    ...defaults,
    ...options,
  }
}

/**
 * 创建指数退避策略
 */
export function createExponentialBackoff(options?: {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  multiplier?: number
  jitter?: boolean
}): RetryStrategy {
  return {
    type: 'exponential',
    maxRetries: options?.maxRetries ?? 3,
    initialDelay: options?.initialDelay ?? 1000,
    maxDelay: options?.maxDelay ?? 30000,
    multiplier: options?.multiplier ?? 2,
    jitter: options?.jitter ?? true,
  }
}

/**
 * 创建线性退避策略
 */
export function createLinearBackoff(options?: {
  maxRetries?: number
  delay?: number
  maxDelay?: number
}): RetryStrategy {
  return {
    type: 'linear',
    maxRetries: options?.maxRetries ?? 3,
    initialDelay: options?.delay ?? 1000,
    maxDelay: options?.maxDelay ?? 10000,
  }
}

/**
 * 创建立即重试策略
 */
export function createImmediateRetry(maxRetries: number = 3): RetryStrategy {
  return {
    type: 'immediate',
    maxRetries,
    initialDelay: 0,
    maxDelay: 0,
  }
}

// ============================================
// 单例导出
// ============================================

/** 全局重试执行器实例 */
export const retryExecutor = new RetryExecutor()

/**
 * 便捷方法：执行带重试的操作
 */
export async function withRetry<T>(
  callback: RetryCallback<T>,
  options?: RetryOptions
): Promise<T> {
  return retryExecutor.execute(callback, options)
}
