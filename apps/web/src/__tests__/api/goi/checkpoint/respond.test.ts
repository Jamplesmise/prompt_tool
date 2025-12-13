/**
 * Checkpoint Respond API 测试
 *
 * 测试用例：
 * TC-CR-001: 确认检查点
 * TC-CR-002: 修改选择
 * TC-CR-003: 拒绝检查点
 * TC-CR-004: 不存在的检查点
 * TC-CR-005: 已响应的检查点
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/checkpoint', () => ({
  getCheckpointController: vi.fn(),
}))

import { POST } from '@/app/api/goi/checkpoint/[id]/respond/route'
import { getCheckpointController } from '@/lib/goi/checkpoint'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/checkpoint/cp-123/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Checkpoint Respond API', () => {
  const mockParams = Promise.resolve({ id: 'cp-123' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CR-001: 确认检查点', () => {
    it('应该成功确认检查点', async () => {
      const mockController = {
        respond: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ action: 'approve' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.checkpointId).toBe('cp-123')
      expect(data.data.action).toBe('approve')
      expect(data.data.respondedAt).toBeDefined()
      expect(mockController.respond).toHaveBeenCalledWith('cp-123', {
        action: 'approve',
        modifications: undefined,
        reason: undefined,
      })
    })
  })

  describe('TC-CR-002: 修改选择', () => {
    it('应该成功修改检查点', async () => {
      const mockController = {
        respond: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const modifications = {
        selectedOption: 'option-2',
        parameters: { temperature: 0.8 },
      }

      const request = createRequest({
        action: 'modify',
        modifications,
        reason: '需要使用不同的参数',
      })

      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.action).toBe('modify')
      expect(mockController.respond).toHaveBeenCalledWith('cp-123', {
        action: 'modify',
        modifications,
        reason: '需要使用不同的参数',
      })
    })

    it('修改时缺少 modifications 应返回 400', async () => {
      const request = createRequest({ action: 'modify' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('modifications')
    })
  })

  describe('TC-CR-003: 拒绝/接管检查点', () => {
    it('应该成功拒绝检查点', async () => {
      const mockController = {
        respond: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({
        action: 'reject',
        reason: '不需要执行此操作',
      })

      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.action).toBe('reject')
    })

    it('应该成功接管控制', async () => {
      const mockController = {
        respond: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ action: 'takeover' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.action).toBe('takeover')
    })
  })

  describe('TC-CR-004: 不存在的检查点', () => {
    it('应该返回 404 错误', async () => {
      const mockController = {
        respond: vi.fn().mockRejectedValue(new Error('Checkpoint not found')),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ action: 'approve' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe(404001)
      expect(data.message).toContain('not found')
    })
  })

  describe('TC-CR-005: 已响应的检查点', () => {
    it('应该返回 400 错误', async () => {
      const mockController = {
        respond: vi.fn().mockRejectedValue(new Error('Checkpoint is not pending')),
      }
      vi.mocked(getCheckpointController).mockReturnValue(mockController as never)

      const request = createRequest({ action: 'approve' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400004)
      expect(data.message).toContain('not in pending status')
    })
  })

  describe('额外场景: 缺少 action', () => {
    it('应该返回 400 错误', async () => {
      const request = createRequest({})
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toContain('action')
    })
  })

  describe('额外场景: 无效 action', () => {
    it('应该返回 400 错误', async () => {
      const request = createRequest({ action: 'invalid' })
      const response = await POST(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
      expect(data.message).toContain('Invalid action')
    })
  })
})
