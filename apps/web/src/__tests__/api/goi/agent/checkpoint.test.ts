/**
 * Agent Checkpoint API 测试
 *
 * 测试用例：
 * TC-AC-001: 处理检查点响应 - approve
 * TC-AC-002: 处理检查点响应 - reject
 * TC-AC-003: 会话不存在
 * TC-AC-004: 非等待状态的会话
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
}

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/goi/agent/sessionManager', () => ({
  agentSessionManager: {
    get: vi.fn(),
  },
}))

import { POST } from '@/app/api/goi/agent/checkpoint/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/agent/checkpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Agent Checkpoint API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-AC-001: 处理检查点响应 - approve', () => {
    it('应该成功通过检查点', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 50,
        }),
        approveCheckpoint: vi.fn().mockResolvedValue({
          success: true,
          nextStep: 'continue',
        }),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toBe('检查点已通过')
      expect(mockAgentLoop.approveCheckpoint).toHaveBeenCalledWith('item-123', undefined)
    })

    it('应该支持带反馈的 approve', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 50,
        }),
        approveCheckpoint: vi.fn().mockResolvedValue({
          success: true,
        }),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'approve',
        feedback: '参数确认正确',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockAgentLoop.approveCheckpoint).toHaveBeenCalledWith('item-123', '参数确认正确')
    })
  })

  describe('TC-AC-002: 处理检查点响应 - reject', () => {
    it('应该成功拒绝检查点', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 30,
        }),
        rejectCheckpoint: vi.fn().mockResolvedValue({
          success: true,
          nextStep: 'rollback',
        }),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'reject',
        reason: '参数配置有误',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toBe('检查点已拒绝')
      expect(mockAgentLoop.rejectCheckpoint).toHaveBeenCalledWith('item-123', '参数配置有误')
    })

    it('reject 缺少 reason 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 30,
        }),
        rejectCheckpoint: vi.fn(),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'reject',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400005)
      expect(data.message).toContain('reason')
      expect(mockAgentLoop.rejectCheckpoint).not.toHaveBeenCalled()
    })
  })

  describe('TC-AC-003: 会话不存在', () => {
    it('应该返回 404 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.get).mockReturnValue(null as never)

      const request = createRequest({
        sessionId: 'non-existent',
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe(404001)
    })
  })

  describe('参数验证', () => {
    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })

    it('缺少 itemId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })

    it('无效 action 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('approve')
      expect(data.message).toContain('reject')
    })

    it('缺少 action 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
    })
  })

  describe('认证', () => {
    it('未授权应返回 401', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
    })
  })

  describe('TC-AC-004: 非等待状态的会话', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 50,
        }),
        approveCheckpoint: vi.fn(),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400004)
      expect(mockAgentLoop.approveCheckpoint).not.toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    it('approveCheckpoint 抛出错误应返回 500', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 50,
        }),
        approveCheckpoint: vi.fn().mockRejectedValue(new Error('内部错误')),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        itemId: 'item-123',
        action: 'approve',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })
  })
})
