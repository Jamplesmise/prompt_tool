/**
 * Agent Status API 测试
 *
 * 测试用例：
 * TC-SS-001: 获取单个会话状态
 * TC-SS-002: 会话不存在
 * TC-SS-003: 状态完整性检查
 * TC-SS-004: 获取所有会话摘要
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
    getAllSessions: vi.fn(),
    getStats: vi.fn(),
  },
}))

import { GET } from '@/app/api/goi/agent/status/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

function createRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/agent/status')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

describe('Agent Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-SS-001: 获取单个会话状态', () => {
    it('应该返回指定会话的状态', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '2',
          progress: 40,
          startTime: Date.now() - 60000,
        }),
        getTodoList: vi.fn().mockReturnValue([
          { id: '1', content: '步骤1', status: 'completed' },
          { id: '2', content: '步骤2', status: 'in_progress' },
        ]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.status).toBeDefined()
      expect(data.data.status.status).toBe('running')
      expect(data.data.status.currentItemId).toBe('2')
      expect(data.data.status.progress).toBe(40)
    })
  })

  describe('TC-SS-002: 会话不存在', () => {
    it('应该返回 404 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.get).mockReturnValue(null as never)

      const request = createRequest({ sessionId: 'non-existent' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.code).toBe(404001)
      expect(data.message).toContain('Agent Loop 不存在')
    })
  })

  describe('TC-SS-003: 状态完整性检查', () => {
    it('状态对象应包含所有必要字段', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 50,
          startTime: Date.now(),
          lastStepTime: Date.now(),
          stepCount: 5,
          retryCount: 0,
        }),
        getTodoList: vi.fn().mockReturnValue([]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        includeTodoList: 'true',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.status).toHaveProperty('status')
      expect(data.data.status).toHaveProperty('currentItemId')
      expect(data.data.status).toHaveProperty('progress')
      expect(data.data).toHaveProperty('todoList')
    })
  })

  describe('TC-SS-004: 获取所有会话摘要', () => {
    it('不指定 sessionId 时应返回所有会话', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      vi.mocked(agentSessionManager.getAllSessions).mockReturnValue([
        { sessionId: 'session-1', status: 'running', progress: 50 },
        { sessionId: 'session-2', status: 'paused', progress: 30 },
        { sessionId: 'session-3', status: 'completed', progress: 100 },
      ] as never)

      vi.mocked(agentSessionManager.getStats).mockReturnValue({
        total: 3,
        running: 1,
        paused: 1,
        completed: 1,
      } as never)

      const request = createRequest({ includeStats: 'true' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.sessions).toHaveLength(3)
      expect(data.data.stats).toBeDefined()
      expect(data.data.stats.total).toBe(3)
    })
  })

  describe('额外场景: 未授权访问', () => {
    it('应该返回 401 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
    })
  })

  describe('额外场景: 带 todoList 的状态', () => {
    it('includeTodoList=true 时应返回 todoList', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockTodoList = [
        { id: '1', content: '步骤1', status: 'completed' },
        { id: '2', content: '步骤2', status: 'in_progress' },
        { id: '3', content: '步骤3', status: 'pending' },
      ]

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '2',
          progress: 33,
        }),
        getTodoList: vi.fn().mockReturnValue(mockTodoList),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        includeTodoList: 'true',
      })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.todoList).toEqual(mockTodoList)
    })

    it('includeTodoList=false 时不应返回 todoList', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockAgentLoop = {
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 50,
        }),
        getTodoList: vi.fn().mockReturnValue([]),
      }
      vi.mocked(agentSessionManager.get).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({ sessionId: 'test-session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.todoList).toBeUndefined()
      expect(mockAgentLoop.getTodoList).not.toHaveBeenCalled()
    })
  })
})
