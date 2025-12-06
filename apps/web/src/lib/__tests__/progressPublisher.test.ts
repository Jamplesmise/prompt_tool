import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Redis 模块
const mockPublish = vi.fn().mockResolvedValue(1)
const mockSubscribe = vi.fn().mockResolvedValue(undefined)
const mockUnsubscribe = vi.fn().mockResolvedValue(undefined)
const mockOn = vi.fn()
const mockOff = vi.fn()

vi.mock('../redis', () => ({
  redis: {
    publish: (...args: unknown[]) => mockPublish(...args),
  },
  getSubscriberConnection: () => ({
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    on: (...args: unknown[]) => mockOn(...args),
    off: (...args: unknown[]) => mockOff(...args),
  }),
  PUBSUB_PREFIX: 'test-prefix:',
}))

import {
  publishProgress,
  publishCompleted,
  publishFailed,
  publishStopped,
  subscribeProgress,
  getListenerCount,
} from '../progressPublisher'

describe('progressPublisher.ts (Redis Pub/Sub)', () => {
  const taskId = 'test-task-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('publish functions', () => {
    it('publishProgress 应该发布进度事件到 Redis', async () => {
      const progress = { total: 100, completed: 50, failed: 0 }
      publishProgress(taskId, progress)

      // 等待异步操作完成
      await vi.waitFor(() => {
        expect(mockPublish).toHaveBeenCalledTimes(1)
      })

      expect(mockPublish).toHaveBeenCalledWith(
        `test-prefix:task:${taskId}`,
        JSON.stringify({ type: 'progress', data: progress })
      )
    })

    it('publishCompleted 应该发布完成事件到 Redis', async () => {
      const stats = { passRate: 0.9, avgLatencyMs: 150 }
      publishCompleted(taskId, stats)

      await vi.waitFor(() => {
        expect(mockPublish).toHaveBeenCalledTimes(1)
      })

      expect(mockPublish).toHaveBeenCalledWith(
        `test-prefix:task:${taskId}`,
        JSON.stringify({
          type: 'completed',
          data: { status: 'COMPLETED', stats },
        })
      )
    })

    it('publishFailed 应该发布失败事件到 Redis', async () => {
      publishFailed(taskId, '执行失败：网络错误')

      await vi.waitFor(() => {
        expect(mockPublish).toHaveBeenCalledTimes(1)
      })

      expect(mockPublish).toHaveBeenCalledWith(
        `test-prefix:task:${taskId}`,
        JSON.stringify({
          type: 'failed',
          data: { status: 'FAILED', error: '执行失败：网络错误' },
        })
      )
    })

    it('publishStopped 应该发布停止事件到 Redis', async () => {
      publishStopped(taskId)

      await vi.waitFor(() => {
        expect(mockPublish).toHaveBeenCalledTimes(1)
      })

      expect(mockPublish).toHaveBeenCalledWith(
        `test-prefix:task:${taskId}`,
        JSON.stringify({
          type: 'stopped',
          data: { status: 'STOPPED' },
        })
      )
    })
  })

  describe('subscribeProgress', () => {
    it('应该订阅 Redis 频道', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      expect(mockSubscribe).toHaveBeenCalledWith(`test-prefix:task:${taskId}`)
      expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function))

      unsubscribe()
    })

    it('取消订阅应该调用 unsubscribe 和 off', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      unsubscribe()

      expect(mockOff).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockUnsubscribe).toHaveBeenCalledWith(`test-prefix:task:${taskId}`)
    })

    it('收到消息时应该调用回调', () => {
      const callback = vi.fn()
      subscribeProgress(taskId, callback)

      // 获取注册的消息处理函数
      const messageHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      expect(messageHandler).toBeDefined()

      // 模拟收到消息
      const event = { type: 'progress', data: { total: 100, completed: 50, failed: 0 } }
      messageHandler(`test-prefix:task:${taskId}`, JSON.stringify(event))

      expect(callback).toHaveBeenCalledWith(event)
    })

    it('收到其他频道的消息时不应调用回调', () => {
      const callback = vi.fn()
      subscribeProgress(taskId, callback)

      const messageHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1]

      // 模拟收到其他频道的消息
      const event = { type: 'progress', data: { total: 10, completed: 5, failed: 0 } }
      messageHandler('test-prefix:task:other-task', JSON.stringify(event))

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('getListenerCount', () => {
    it('应该返回 -1（Redis Pub/Sub 无法获取订阅者数量）', () => {
      expect(getListenerCount(taskId)).toBe(-1)
    })
  })
})
