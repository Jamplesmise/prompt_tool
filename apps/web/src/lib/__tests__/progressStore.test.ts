import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock redis 模块
const mockRedisData: Record<string, string> = {}

vi.mock('../redis', () => ({
  redis: {
    get: vi.fn((key: string) => Promise.resolve(mockRedisData[key] || null)),
    set: vi.fn((key: string, value: string) => {
      mockRedisData[key] = value
      return Promise.resolve('OK')
    }),
    del: vi.fn((key: string) => {
      delete mockRedisData[key]
      return Promise.resolve(1)
    }),
  },
}))

import {
  saveProgress,
  getProgress,
  deleteProgress,
  addCompletedItem,
  addFailedItem,
  initProgress,
  saveCheckpoint,
  getCheckpoint,
  deleteCheckpoint,
  createCheckpointFromProgress,
  getPendingItems,
  isItemCompleted,
} from '../queue/progressStore'
import type { ExecutionProgress, Checkpoint } from '../queue/progressStore'

describe('progressStore', () => {
  beforeEach(() => {
    // 清理 mock 数据
    Object.keys(mockRedisData).forEach((key) => delete mockRedisData[key])
  })

  describe('saveProgress / getProgress', () => {
    it('应该保存和获取进度', async () => {
      const progress: ExecutionProgress = {
        taskId: 'task-1',
        total: 10,
        completed: ['item-1', 'item-2'],
        failed: ['item-3'],
        pending: ['item-4', 'item-5'],
        lastCheckpoint: '2025-01-01T00:00:00.000Z',
      }

      await saveProgress('task-1', progress)
      const result = await getProgress('task-1')

      expect(result).toEqual(progress)
    })

    it('不存在时返回 null', async () => {
      const result = await getProgress('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('deleteProgress', () => {
    it('应该删除进度', async () => {
      const progress: ExecutionProgress = {
        taskId: 'task-1',
        total: 5,
        completed: [],
        failed: [],
        pending: ['item-1'],
        lastCheckpoint: '2025-01-01T00:00:00.000Z',
      }

      await saveProgress('task-1', progress)
      await deleteProgress('task-1')
      const result = await getProgress('task-1')

      expect(result).toBeNull()
    })
  })

  describe('initProgress', () => {
    it('应该初始化进度', async () => {
      const planItemIds = ['item-1', 'item-2', 'item-3']
      const result = await initProgress('task-1', planItemIds)

      expect(result.taskId).toBe('task-1')
      expect(result.total).toBe(3)
      expect(result.completed).toEqual([])
      expect(result.failed).toEqual([])
      expect(result.pending).toEqual(planItemIds)
      expect(result.lastCheckpoint).toBeDefined()
    })
  })

  describe('addCompletedItem', () => {
    it('应该添加已完成项并从待处理中移除', async () => {
      await initProgress('task-1', ['item-1', 'item-2', 'item-3'])
      await addCompletedItem('task-1', 'item-1')

      const progress = await getProgress('task-1')

      expect(progress?.completed).toContain('item-1')
      expect(progress?.pending).not.toContain('item-1')
    })

    it('不应重复添加已完成项', async () => {
      await initProgress('task-1', ['item-1', 'item-2'])
      await addCompletedItem('task-1', 'item-1')
      await addCompletedItem('task-1', 'item-1')

      const progress = await getProgress('task-1')

      expect(progress?.completed.filter((id) => id === 'item-1')).toHaveLength(1)
    })

    it('进度不存在时不应报错', async () => {
      await expect(addCompletedItem('non-existent', 'item-1')).resolves.not.toThrow()
    })
  })

  describe('addFailedItem', () => {
    it('应该添加失败项并从待处理中移除', async () => {
      await initProgress('task-1', ['item-1', 'item-2', 'item-3'])
      await addFailedItem('task-1', 'item-2')

      const progress = await getProgress('task-1')

      expect(progress?.failed).toContain('item-2')
      expect(progress?.pending).not.toContain('item-2')
    })

    it('不应重复添加失败项', async () => {
      await initProgress('task-1', ['item-1', 'item-2'])
      await addFailedItem('task-1', 'item-1')
      await addFailedItem('task-1', 'item-1')

      const progress = await getProgress('task-1')

      expect(progress?.failed.filter((id) => id === 'item-1')).toHaveLength(1)
    })
  })

  describe('saveCheckpoint / getCheckpoint', () => {
    it('应该保存和获取检查点', async () => {
      const checkpoint: Checkpoint = {
        lastUpdated: '2025-01-01T00:00:00.000Z',
        completedItems: ['item-1', 'item-2'],
        failedItems: ['item-3'],
        currentProgress: {
          total: 10,
          completed: 2,
          failed: 1,
        },
      }

      await saveCheckpoint('task-1', checkpoint)
      const result = await getCheckpoint('task-1')

      expect(result).toEqual(checkpoint)
    })

    it('不存在时返回 null', async () => {
      const result = await getCheckpoint('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('deleteCheckpoint', () => {
    it('应该删除检查点', async () => {
      const checkpoint: Checkpoint = {
        lastUpdated: '2025-01-01T00:00:00.000Z',
        completedItems: [],
        failedItems: [],
        currentProgress: { total: 5, completed: 0, failed: 0 },
      }

      await saveCheckpoint('task-1', checkpoint)
      await deleteCheckpoint('task-1')
      const result = await getCheckpoint('task-1')

      expect(result).toBeNull()
    })
  })

  describe('createCheckpointFromProgress', () => {
    it('应该从进度创建检查点', async () => {
      await initProgress('task-1', ['item-1', 'item-2', 'item-3'])
      await addCompletedItem('task-1', 'item-1')
      await addFailedItem('task-1', 'item-2')

      const checkpoint = await createCheckpointFromProgress('task-1')

      expect(checkpoint).not.toBeNull()
      expect(checkpoint?.completedItems).toContain('item-1')
      expect(checkpoint?.failedItems).toContain('item-2')
      expect(checkpoint?.currentProgress.total).toBe(3)
      expect(checkpoint?.currentProgress.completed).toBe(1)
      expect(checkpoint?.currentProgress.failed).toBe(1)
    })

    it('进度不存在时返回 null', async () => {
      const result = await createCheckpointFromProgress('non-existent')
      expect(result).toBeNull()
    })
  })

  describe('getPendingItems', () => {
    it('应该返回待处理项列表', async () => {
      await initProgress('task-1', ['item-1', 'item-2', 'item-3'])
      await addCompletedItem('task-1', 'item-1')

      const pending = await getPendingItems('task-1')

      expect(pending).toEqual(['item-2', 'item-3'])
    })

    it('进度不存在时返回空数组', async () => {
      const pending = await getPendingItems('non-existent')
      expect(pending).toEqual([])
    })
  })

  describe('isItemCompleted', () => {
    it('已完成项应返回 true', async () => {
      await initProgress('task-1', ['item-1', 'item-2'])
      await addCompletedItem('task-1', 'item-1')

      const result = await isItemCompleted('task-1', 'item-1')

      expect(result).toBe(true)
    })

    it('未完成项应返回 false', async () => {
      await initProgress('task-1', ['item-1', 'item-2'])

      const result = await isItemCompleted('task-1', 'item-1')

      expect(result).toBe(false)
    })

    it('进度不存在时返回 false', async () => {
      const result = await isItemCompleted('non-existent', 'item-1')
      expect(result).toBe(false)
    })
  })
})
