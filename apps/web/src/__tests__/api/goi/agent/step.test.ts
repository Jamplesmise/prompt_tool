/**
 * Agent Step API 测试
 *
 * 测试用例：
 * TC-ST-001: 正常执行
 * TC-ST-002: 会话不存在
 * TC-ST-003: 遇到检查点
 * TC-ST-004: 所有步骤完成
 * TC-ST-005: 会话已暂停
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

import { POST } from '@/app/api/goi/agent/step/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/agent/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Agent Step API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-ST-001: 正常执行', () => {
    it('应该成功执行单步并返回结果', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 50,
        }),
        step: vi.fn().mockResolvedValue({
          done: false,
          waiting: false,
          stepResult: { action: 'select_prompt', result: 'success' },
        }),
        getTodoList: vi.fn().mockReturnValue([
          { id: '1', content: '选择提示词', status: 'completed' },
          { id: '2', content: '配置参数', status: 'in_progress' },
        ]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.status).toBeDefined()
      expect(data.data.todoList).toBeDefined()
    })
  })

  describe('TC-ST-002: 会话不存在', () => {
    it('应该返回 404 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.get).mockReturnValue(null as never)

      const request = createRequest({ sessionId: 'non-existent-session' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe(404001)
      expect(data.message).toContain('Agent Loop 不存在')
    })
  })

  describe('TC-ST-003: 遇到检查点', () => {
    it('应该返回等待检查点状态', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'waiting',
          currentItemId: '2',
          progress: 30,
        }),
        getTodoList: vi.fn().mockReturnValue([
          { id: '1', content: '选择提示词', status: 'completed' },
          { id: '2', content: '确认参数', status: 'in_progress' },
        ]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('等待用户确认检查点')
      expect(data.data.waiting).toBe(true)
      expect(data.data.done).toBe(false)
    })
  })

  describe('TC-ST-004: 所有步骤完成', () => {
    it('应该返回完成状态', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'completed',
          currentItemId: null,
          progress: 100,
        }),
        getTodoList: vi.fn().mockReturnValue([
          { id: '1', content: '选择提示词', status: 'completed' },
          { id: '2', content: '配置参数', status: 'completed' },
          { id: '3', content: '运行测试', status: 'completed' },
        ]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('所有任务已完成')
      expect(data.data.done).toBe(true)
    })
  })

  describe('TC-ST-005: 缺少 sessionId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toBe('缺少 sessionId')
    })
  })

  describe('额外场景: 未授权访问', () => {
    it('应该返回 401 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
    })
  })

  describe('额外场景: Agent 已失败', () => {
    it('应该返回失败状态', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'failed',
          currentItemId: '2',
          progress: 30,
          error: '模型调用超时',
        }),
        getTodoList: vi.fn().mockReturnValue([]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('已失败')
      expect(data.data.done).toBe(true)
    })
  })

  describe('额外场景: 正在规划中', () => {
    it('应该返回规划中状态', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'planning',
          currentItemId: null,
          progress: 0,
        }),
        getTodoList: vi.fn().mockReturnValue([]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('正在规划中')
      expect(data.data.done).toBe(false)
      expect(data.data.waiting).toBe(false)
    })
  })
})
