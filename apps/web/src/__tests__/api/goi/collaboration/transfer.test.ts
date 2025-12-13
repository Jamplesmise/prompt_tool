/**
 * Collaboration Transfer API 测试
 *
 * 测试用例：
 * TC-CT-001: AI → 用户
 * TC-CT-002: 用户 → AI
 * TC-CT-003: 无效转移方向
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/collaboration', () => ({
  getControlTransferManager: vi.fn(),
}))

import { POST } from '@/app/api/goi/collaboration/transfer/route'
import { getControlTransferManager } from '@/lib/goi/collaboration'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/collaboration/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Collaboration Transfer API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CT-001: AI → 用户', () => {
    it('应该成功将控制权从 AI 转移给用户', async () => {
      const transferredAt = new Date()
      const mockTransferManager = {
        canTransferTo: vi.fn().mockReturnValue(true),
        transferTo: vi.fn().mockResolvedValue({
          success: true,
          from: 'ai',
          to: 'user',
          transferredAt,
        }),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        to: 'user',
        reason: 'user_request',
        message: '用户请求接管',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.from).toBe('ai')
      expect(data.data.to).toBe('user')
      expect(mockTransferManager.transferTo).toHaveBeenCalledWith(
        'user',
        'user_request',
        '用户请求接管'
      )
    })
  })

  describe('TC-CT-002: 用户 → AI', () => {
    it('应该成功将控制权从用户转移给 AI', async () => {
      const transferredAt = new Date()
      const mockTransferManager = {
        canTransferTo: vi.fn().mockReturnValue(true),
        transferTo: vi.fn().mockResolvedValue({
          success: true,
          from: 'user',
          to: 'ai',
          transferredAt,
        }),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        to: 'ai',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.from).toBe('user')
      expect(data.data.to).toBe('ai')
    })
  })

  describe('TC-CT-003: 无效转移方向', () => {
    it('应该返回 400 错误', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        to: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('Invalid to')
    })
  })

  describe('参数验证', () => {
    it('缺少 sessionId 应返回 400', async () => {
      const request = createRequest({ to: 'user' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })

    it('缺少 to 应返回 400', async () => {
      const request = createRequest({ sessionId: 'session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })
  })

  describe('转移限制', () => {
    it('不可转移时应返回 400', async () => {
      const mockTransferManager = {
        canTransferTo: vi.fn().mockReturnValue(false),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        to: 'user',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400004)
      expect(data.message).toContain('Cannot transfer')
    })

    it('转移失败时应返回 400', async () => {
      const mockTransferManager = {
        canTransferTo: vi.fn().mockReturnValue(true),
        transferTo: vi.fn().mockResolvedValue({
          success: false,
          error: '当前有正在执行的操作',
        }),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        to: 'user',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400005)
      expect(data.message).toContain('正在执行的操作')
    })
  })

  describe('默认 reason', () => {
    it('未提供 reason 时应使用默认值', async () => {
      const mockTransferManager = {
        canTransferTo: vi.fn().mockReturnValue(true),
        transferTo: vi.fn().mockResolvedValue({
          success: true,
          from: 'ai',
          to: 'user',
          transferredAt: new Date(),
        }),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        to: 'user',
      })

      await POST(request)

      expect(mockTransferManager.transferTo).toHaveBeenCalledWith(
        'user',
        'user_request',
        undefined
      )
    })
  })

  describe('错误处理', () => {
    it('服务器错误应返回 500', async () => {
      vi.mocked(getControlTransferManager).mockImplementation(() => {
        throw new Error('Internal error')
      })

      const request = createRequest({
        sessionId: 'session-1',
        to: 'user',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })
  })
})
