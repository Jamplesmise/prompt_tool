/**
 * Collaboration Status API 测试
 *
 * 测试用例：
 * TC-CS-001: 获取协作状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/collaboration', () => ({
  getControlTransferManager: vi.fn(),
  getSyncManager: vi.fn(),
}))

vi.mock('@/lib/goi/checkpoint', () => ({
  getCheckpointController: vi.fn(),
}))

import { GET } from '@/app/api/goi/collaboration/status/route'
import { getControlTransferManager, getSyncManager } from '@/lib/goi/collaboration'
import { getCheckpointController } from '@/lib/goi/checkpoint'

function createRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/collaboration/status')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

describe('Collaboration Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CS-001: 获取协作状态', () => {
    it('应该返回完整的协作状态', async () => {
      const mockTransferManager = {
        getController: vi.fn().mockReturnValue('ai'),
      }

      const mockSyncManager = {
        getUnderstanding: vi.fn().mockReturnValue({
          summary: '正在执行测试任务',
          currentGoal: '创建测试任务',
          selectedResources: {
            prompt: { id: 'prompt-1', name: '测试提示词' },
          },
          currentPhase: 'executing',
          confidence: 0.85,
          updatedAt: new Date(),
        }),
      }

      const mockCheckpointController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue([
          { id: 'cp-1', status: 'pending' },
        ]),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)
      vi.mocked(getSyncManager).mockReturnValue(mockSyncManager as never)
      vi.mocked(getCheckpointController).mockReturnValue(mockCheckpointController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.sessionId).toBe('session-1')
      expect(data.data.controller).toBe('ai')
      expect(data.data.understanding).toBeDefined()
      expect(data.data.understanding.summary).toBe('正在执行测试任务')
      expect(data.data.understanding.currentGoal).toBe('创建测试任务')
      expect(data.data.understanding.confidence).toBe(0.85)
      expect(data.data.hasPendingCheckpoint).toBe(true)
      expect(data.data.pendingCheckpointCount).toBe(1)
    })

    it('无待处理检查点时应正确返回', async () => {
      const mockTransferManager = {
        getController: vi.fn().mockReturnValue('user'),
      }

      const mockSyncManager = {
        getUnderstanding: vi.fn().mockReturnValue({
          summary: '',
          currentGoal: '',
          selectedResources: {},
          currentPhase: 'idle',
          confidence: 0,
          updatedAt: new Date(),
        }),
      }

      const mockCheckpointController = {
        getPendingCheckpoints: vi.fn().mockResolvedValue([]),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)
      vi.mocked(getSyncManager).mockReturnValue(mockSyncManager as never)
      vi.mocked(getCheckpointController).mockReturnValue(mockCheckpointController as never)

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.hasPendingCheckpoint).toBe(false)
      expect(data.data.pendingCheckpointCount).toBe(0)
    })
  })

  describe('参数验证', () => {
    it('缺少 sessionId 应返回 400', async () => {
      const request = createRequest({})
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toContain('sessionId')
    })
  })

  describe('错误处理', () => {
    it('服务器错误应返回 500', async () => {
      vi.mocked(getControlTransferManager).mockImplementation(() => {
        throw new Error('Internal error')
      })

      const request = createRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })
  })
})
