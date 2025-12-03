import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  publishProgress,
  publishCompleted,
  publishFailed,
  publishStopped,
  subscribeProgress,
  getListenerCount,
} from '../progressPublisher'
import type { ProgressEvent } from '../progressPublisher'

describe('progressPublisher.ts', () => {
  const taskId = 'test-task-id'

  describe('subscribeProgress', () => {
    it('应该订阅进度更新', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      publishProgress(taskId, { total: 100, completed: 50, failed: 0 })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({
        type: 'progress',
        data: { total: 100, completed: 50, failed: 0 },
      })

      unsubscribe()
    })

    it('取消订阅后不应再收到事件', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      publishProgress(taskId, { total: 100, completed: 1, failed: 0 })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      publishProgress(taskId, { total: 100, completed: 2, failed: 0 })
      expect(callback).toHaveBeenCalledTimes(1) // 不应增加
    })

    it('不同任务的订阅应该隔离', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsub1 = subscribeProgress('task-1', callback1)
      const unsub2 = subscribeProgress('task-2', callback2)

      publishProgress('task-1', { total: 10, completed: 5, failed: 0 })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).not.toHaveBeenCalled()

      unsub1()
      unsub2()
    })

    it('多个订阅者应该都收到事件', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsub1 = subscribeProgress(taskId, callback1)
      const unsub2 = subscribeProgress(taskId, callback2)

      publishProgress(taskId, { total: 10, completed: 5, failed: 0 })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)

      unsub1()
      unsub2()
    })
  })

  describe('publishProgress', () => {
    it('应该发布进度事件', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      const progress = { total: 100, completed: 25, failed: 5 }
      publishProgress(taskId, progress)

      expect(callback).toHaveBeenCalledWith({
        type: 'progress',
        data: progress,
      })

      unsubscribe()
    })
  })

  describe('publishCompleted', () => {
    it('应该发布完成事件', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      const stats = { passRate: 0.9, avgLatencyMs: 150 }
      publishCompleted(taskId, stats)

      expect(callback).toHaveBeenCalledWith({
        type: 'completed',
        data: { status: 'COMPLETED', stats },
      })

      unsubscribe()
    })
  })

  describe('publishFailed', () => {
    it('应该发布失败事件', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      publishFailed(taskId, '执行失败：网络错误')

      expect(callback).toHaveBeenCalledWith({
        type: 'failed',
        data: { status: 'FAILED', error: '执行失败：网络错误' },
      })

      unsubscribe()
    })
  })

  describe('publishStopped', () => {
    it('应该发布停止事件', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeProgress(taskId, callback)

      publishStopped(taskId)

      expect(callback).toHaveBeenCalledWith({
        type: 'stopped',
        data: { status: 'STOPPED' },
      })

      unsubscribe()
    })
  })

  describe('getListenerCount', () => {
    it('应该返回正确的监听器数量', () => {
      expect(getListenerCount(taskId)).toBe(0)

      const unsub1 = subscribeProgress(taskId, vi.fn())
      expect(getListenerCount(taskId)).toBe(1)

      const unsub2 = subscribeProgress(taskId, vi.fn())
      expect(getListenerCount(taskId)).toBe(2)

      unsub1()
      expect(getListenerCount(taskId)).toBe(1)

      unsub2()
      expect(getListenerCount(taskId)).toBe(0)
    })

    it('不同任务的监听器数量应该分开计算', () => {
      const unsub1 = subscribeProgress('task-a', vi.fn())
      const unsub2 = subscribeProgress('task-b', vi.fn())

      expect(getListenerCount('task-a')).toBe(1)
      expect(getListenerCount('task-b')).toBe(1)
      expect(getListenerCount('task-c')).toBe(0)

      unsub1()
      unsub2()
    })
  })

  describe('事件类型', () => {
    it('事件应该包含正确的 type', () => {
      const events: ProgressEvent[] = []
      const unsubscribe = subscribeProgress(taskId, (e) => events.push(e))

      publishProgress(taskId, { total: 10, completed: 0, failed: 0 })
      publishCompleted(taskId, {})
      publishFailed('other-task', 'error') // 不同任务，不应收到
      publishStopped(taskId)

      expect(events.map((e) => e.type)).toEqual(['progress', 'completed', 'stopped'])

      unsubscribe()
    })
  })
})
