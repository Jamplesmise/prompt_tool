/**
 * Checkpoint Pending API 测试
 *
 * 测试用例：
 * TC-CP-001: 获取待处理列表
 * TC-CP-002: 检查点信息完整
 * TC-CP-003: 无待处理检查点
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/checkpoint', () => ({
  getCheckpointController: vi.fn(),
}))

import { GET } from '@/app/api/goi/checkpoint/pending/route'
import { getCheckpointController } from '@/lib/goi/checkpoint'

function createRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/checkpoint/pending')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

describe('Checkpoint Pending API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CP-001: 获取待处理列表', () => {
    it('应该返回待处理检查点列表', async () => {
      const mockCheckpoints = [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          todoItemId: 'item-1',
          todoItem: {
            id: 'item-1',
            title: '选择提示词',
            description: '请选择要使用的提示词',
            category: 'resource_selection',
          },
          reason: '需要用户确认选择',
          preview: { options: ['选项1', '选项2'] },
          options: [
            { id: 'opt-1', label: '选项1' },
            { id: 'opt-2', label: '选项2' },
          ],
          status: 'pending',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 300000),
        },
        {
          id: 'cp-2',
          sessionId: 'session-1',
          todoItemId: 'item-2',
          todoItem: {
            id: 'item-2',
            title: '确认参数',
            description: '请确认以下参数',
            category: 'parameter_confirmation',
          },
          reason: '需要用户确认参数',
          preview: { temperature: 0.7 },
          options: [],
          status: 'pending',
          createdAt: new Date(),
          expiresAt: null,
        },
      ]

      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue(mockCheckpoints),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.checkpoints).toHaveLength(2)
      expect(data.data.total).toBe(2)
    })
  })

  describe('TC-CP-002: 检查点信息完整', () => {
    it('检查点对象应包含所有必要字段', async () => {
      const now = new Date()
      const expiresAt = new Date(Date.now() + 300000)

      const mockCheckpoints = [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          todoItemId: 'item-1',
          todoItem: {
            id: 'item-1',
            title: '选择资源',
            description: '描述',
            category: 'resource_selection',
          },
          reason: '需要选择',
          preview: {},
          options: [{ id: 'opt-1', label: '选项1', description: '描述1' }],
          status: 'pending',
          createdAt: now,
          expiresAt: expiresAt,
        },
      ]

      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue(mockCheckpoints),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      const checkpoint = data.data.checkpoints[0]

      expect(checkpoint).toHaveProperty('id')
      expect(checkpoint).toHaveProperty('sessionId')
      expect(checkpoint).toHaveProperty('todoItemId')
      expect(checkpoint).toHaveProperty('todoItem')
      expect(checkpoint.todoItem).toHaveProperty('id')
      expect(checkpoint.todoItem).toHaveProperty('title')
      expect(checkpoint.todoItem).toHaveProperty('description')
      expect(checkpoint.todoItem).toHaveProperty('category')
      expect(checkpoint).toHaveProperty('reason')
      expect(checkpoint).toHaveProperty('preview')
      expect(checkpoint).toHaveProperty('options')
      expect(checkpoint).toHaveProperty('status')
      expect(checkpoint).toHaveProperty('createdAt')
      expect(checkpoint).toHaveProperty('expiresAt')
      expect(checkpoint).toHaveProperty('remainingTime')
    })
  })

  describe('TC-CP-003: 无待处理检查点', () => {
    it('应该返回空数组', async () => {
      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.checkpoints).toEqual([])
      expect(data.data.total).toBe(0)
    })
  })

  describe('额外场景: 缺少 sessionId', () => {
    it('应该返回 400 错误', async () => {
      const request = createRequest({})
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toContain('sessionId')
    })
  })

  describe('额外场景: 按状态过滤', () => {
    it('应该只返回指定状态的检查点', async () => {
      const mockCheckpoints = [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          todoItemId: 'item-1',
          todoItem: { id: 'item-1', title: '标题', description: '', category: '' },
          reason: '',
          preview: {},
          options: [],
          status: 'pending',
          createdAt: new Date(),
          expiresAt: null,
        },
        {
          id: 'cp-2',
          sessionId: 'session-1',
          todoItemId: 'item-2',
          todoItem: { id: 'item-2', title: '标题2', description: '', category: '' },
          reason: '',
          preview: {},
          options: [],
          status: 'responded',
          createdAt: new Date(),
          expiresAt: null,
        },
      ]

      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue(mockCheckpoints),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1', status: 'pending' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.checkpoints).toHaveLength(1)
      expect(data.data.checkpoints[0].status).toBe('pending')
    })
  })

  describe('额外场景: 剩余时间计算', () => {
    it('过期时间为 null 时 remainingTime 应为 null', async () => {
      const mockCheckpoints = [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          todoItemId: 'item-1',
          todoItem: { id: 'item-1', title: '标题', description: '', category: '' },
          reason: '',
          preview: {},
          options: [],
          status: 'pending',
          createdAt: new Date(),
          expiresAt: null,
        },
      ]

      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue(mockCheckpoints),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.checkpoints[0].remainingTime).toBeNull()
    })

    it('已过期时 remainingTime 应为 0', async () => {
      const mockCheckpoints = [
        {
          id: 'cp-1',
          sessionId: 'session-1',
          todoItemId: 'item-1',
          todoItem: { id: 'item-1', title: '标题', description: '', category: '' },
          reason: '',
          preview: {},
          options: [],
          status: 'pending',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 60000), // 1分钟前过期
        },
      ]

      const mockController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue(mockCheckpoints),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.checkpoints[0].remainingTime).toBe(0)
    })
  })
})
