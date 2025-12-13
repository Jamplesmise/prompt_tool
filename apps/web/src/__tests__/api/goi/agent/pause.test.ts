/**
 * Agent Pause API 测试
 *
 * 测试用例：
 * TC-PA-001: 正常暂停
 * TC-PA-002: 暂停已完成会话
 * TC-PA-003: 暂停后保存快照
 * TC-PA-004: 响应时间 < 500ms
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

import { POST } from '@/app/api/goi/agent/pause/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/agent/pause', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Agent Pause API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-PA-001: 正常暂停', () => {
    it('应该成功暂停运行中的 Agent', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi
          .fn()
          .mockReturnValueOnce({
            status: 'running',
            currentItemId: '1',
            progress: 50,
          })
          .mockReturnValue({
            status: 'paused',
            currentItemId: '1',
            progress: 50,
          }),
        pause: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'pause',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('已暂停')
      expect(mockAgentLoop.pause).toHaveBeenCalled()
    })
  })

  describe('TC-PA-002: 暂停已完成会话', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'completed',
          currentItemId: null,
          progress: 100,
        }),
        pause: vi.fn(),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'pause',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('无法暂停')
      expect(mockAgentLoop.pause).not.toHaveBeenCalled()
    })
  })

  describe('TC-PA-003: 恢复已暂停会话', () => {
    it('应该成功恢复已暂停的 Agent', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi
          .fn()
          .mockReturnValueOnce({
            status: 'paused',
            currentItemId: '1',
            progress: 50,
          })
          .mockReturnValue({
            status: 'running',
            currentItemId: '1',
            progress: 50,
          }),
        unpause: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'resume',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('已恢复')
    })
  })

  describe('TC-PA-004: 响应时间检测', () => {
    it('暂停操作应该在 500ms 内完成', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi
          .fn()
          .mockReturnValueOnce({ status: 'running', currentItemId: '1', progress: 50 })
          .mockReturnValue({ status: 'paused', currentItemId: '1', progress: 50 }),
        pause: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'pause',
      })

      const startTime = Date.now()
      await POST(request)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(500)
    })
  })

  describe('额外场景: 缺少 sessionId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({ action: 'pause' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })
  })

  describe('额外场景: 无效 action', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
      expect(data.message).toContain('pause 或 resume')
    })
  })

  describe('额外场景: 会话不存在', () => {
    it('应该返回 404 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.get).mockReturnValue(null as never)

      const request = createRequest({
        sessionId: 'non-existent',
        action: 'pause',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe(404001)
    })
  })

  describe('额外场景: 恢复非暂停状态', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 50,
        }),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        action: 'resume',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('无法恢复')
    })
  })
})
