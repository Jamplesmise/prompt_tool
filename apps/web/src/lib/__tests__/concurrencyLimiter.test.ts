import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ConcurrencyLimiter,
  sleep,
  executeWithRetry,
  executeWithTimeout,
  TimeoutError,
} from '../concurrencyLimiter'

describe('concurrencyLimiter.ts', () => {
  describe('ConcurrencyLimiter', () => {
    it('应该限制并发数', async () => {
      const limiter = new ConcurrencyLimiter(2)
      const results: number[] = []
      const startTime = Date.now()

      const tasks = [1, 2, 3, 4].map((n) =>
        limiter.execute(async () => {
          await sleep(50)
          results.push(n)
          return n
        })
      )

      await Promise.all(tasks)
      const elapsed = Date.now() - startTime

      // 4 个任务，并发 2，应该需要 2 轮，约 100ms
      expect(elapsed).toBeGreaterThanOrEqual(90)
      expect(elapsed).toBeLessThan(200)
      expect(results.length).toBe(4)
    })

    it('并发数为 1 时应该串行执行', async () => {
      const limiter = new ConcurrencyLimiter(1)
      const order: number[] = []

      const tasks = [1, 2, 3].map((n) =>
        limiter.execute(async () => {
          order.push(n)
          await sleep(10)
          return n
        })
      )

      await Promise.all(tasks)
      expect(order).toEqual([1, 2, 3])
    })

    it('应该返回正确的结果', async () => {
      const limiter = new ConcurrencyLimiter(5)

      const results = await Promise.all([
        limiter.execute(async () => 'a'),
        limiter.execute(async () => 'b'),
        limiter.execute(async () => 123),
      ])

      expect(results).toEqual(['a', 'b', 123])
    })

    it('应该正确处理错误', async () => {
      const limiter = new ConcurrencyLimiter(2)

      await expect(
        limiter.execute(async () => {
          throw new Error('test error')
        })
      ).rejects.toThrow('test error')
    })

    it('错误后应该释放槽位', async () => {
      const limiter = new ConcurrencyLimiter(1)

      // 第一个任务抛出错误
      await expect(
        limiter.execute(async () => {
          throw new Error('error')
        })
      ).rejects.toThrow()

      // 第二个任务应该能够执行
      const result = await limiter.execute(async () => 'success')
      expect(result).toBe('success')
    })

    it('应该报告正确的 runningCount 和 queueLength', async () => {
      const limiter = new ConcurrencyLimiter(2)

      expect(limiter.runningCount).toBe(0)
      expect(limiter.queueLength).toBe(0)

      const resolvers: Array<() => void> = []
      const tasks = [1, 2, 3, 4].map(() =>
        limiter.execute(
          () =>
            new Promise<void>((resolve) => {
              resolvers.push(resolve)
            })
        )
      )

      // 等待任务开始
      await sleep(10)

      expect(limiter.runningCount).toBe(2)
      expect(limiter.queueLength).toBe(2)

      // 完成前两个任务
      resolvers[0]()
      resolvers[1]()
      await sleep(10)

      expect(limiter.runningCount).toBe(2)
      expect(limiter.queueLength).toBe(0)

      // 完成剩余任务
      resolvers[2]()
      resolvers[3]()
      await Promise.all(tasks)

      expect(limiter.runningCount).toBe(0)
    })

    it('并发限制小于 1 应该抛出错误', () => {
      expect(() => new ConcurrencyLimiter(0)).toThrow('并发限制必须大于 0')
      expect(() => new ConcurrencyLimiter(-1)).toThrow('并发限制必须大于 0')
    })
  })

  describe('sleep', () => {
    it('应该延迟指定时间', async () => {
      const start = Date.now()
      await sleep(50)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(45)
      expect(elapsed).toBeLessThan(100)
    })
  })

  describe('executeWithRetry', () => {
    it('成功时不应重试', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await executeWithRetry(fn, { retryCount: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('应该在失败时重试指定次数', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success')

      const result = await executeWithRetry(fn, {
        retryCount: 3,
        baseDelayMs: 10,
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('超过重试次数后应该抛出最后的错误', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent error'))

      await expect(
        executeWithRetry(fn, { retryCount: 2, baseDelayMs: 10 })
      ).rejects.toThrow('persistent error')

      expect(fn).toHaveBeenCalledTimes(3) // 初始 + 2 次重试
    })

    it('应该使用指数退避', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success')

      const start = Date.now()
      await executeWithRetry(fn, {
        retryCount: 2,
        baseDelayMs: 50,
      })
      const elapsed = Date.now() - start

      // 第一次重试等 50ms，第二次等 100ms，总共约 150ms
      expect(elapsed).toBeGreaterThanOrEqual(140)
    })

    it('应该尊重 shouldRetry 回调', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('retryable'))
        .mockRejectedValueOnce(new Error('not retryable'))

      await expect(
        executeWithRetry(fn, {
          retryCount: 3,
          baseDelayMs: 10,
          shouldRetry: (error) =>
            error instanceof Error && error.message === 'retryable',
        })
      ).rejects.toThrow('not retryable')

      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('retryCount 为 0 时不应重试', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('error'))

      await expect(
        executeWithRetry(fn, { retryCount: 0 })
      ).rejects.toThrow('error')

      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('executeWithTimeout', () => {
    it('在超时前完成应该返回结果', async () => {
      const result = await executeWithTimeout(async () => {
        await sleep(10)
        return 'done'
      }, 100)

      expect(result).toBe('done')
    })

    it('超时应该抛出 TimeoutError', async () => {
      await expect(
        executeWithTimeout(async () => {
          await sleep(100)
          return 'done'
        }, 30)
      ).rejects.toThrow(TimeoutError)
    })

    it('TimeoutError 应该包含超时信息', async () => {
      try {
        await executeWithTimeout(async () => {
          await sleep(100)
        }, 30)
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError)
        expect((error as TimeoutError).message).toContain('30ms')
      }
    })
  })

  describe('TimeoutError', () => {
    it('应该是 Error 的实例', () => {
      const error = new TimeoutError('test')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(TimeoutError)
    })

    it('应该有正确的 name 属性', () => {
      const error = new TimeoutError('test')
      expect(error.name).toBe('TimeoutError')
    })
  })
})
