/**
 * Agent Resume API 测试
 *
 * 测试用例：
 * TC-RE-001: 从暂停恢复
 * TC-RE-002: 保持进度
 * TC-RE-003: 恢复未暂停会话
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
    has: vi.fn(),
    getStatus: vi.fn(),
    getOrCreate: vi.fn(),
    delete: vi.fn(),
  },
}))

import { POST } from '@/app/api/goi/agent/resume/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/agent/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Agent Resume API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-RE-001: 从 TODO List 恢复', () => {
    it('应该成功从 TODO List 恢复 Agent', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockTodoList = [
        { id: '1', content: '步骤1', status: 'completed' },
        { id: '2', content: '步骤2', status: 'pending' },
        { id: '3', content: '步骤3', status: 'pending' },
      ]

      const mockAgentLoop = {
        resume: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: '2',
          progress: 33,
        }),
        getTodoList: vi.fn().mockReturnValue(mockTodoList),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        todoListId: 'todo-list-123',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toContain('已从 TODO List 恢复')
      expect(data.data.todoList).toEqual(mockTodoList)
      expect(mockAgentLoop.resume).toHaveBeenCalledWith('todo-list-123')
    })
  })

  describe('TC-RE-002: 保持进度', () => {
    it('恢复后应保持原有进度', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockTodoList = [
        { id: '1', content: '步骤1', status: 'completed' },
        { id: '2', content: '步骤2', status: 'in_progress' },
        { id: '3', content: '步骤3', status: 'pending' },
      ]

      const mockAgentLoop = {
        resume: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: '2',
          progress: 33,
          stepIndex: 1,
        }),
        getTodoList: vi.fn().mockReturnValue(mockTodoList),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        todoListId: 'todo-list-123',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // 验证 todoList 中第一项已完成
      expect(data.data.todoList[0].status).toBe('completed')
      // 验证当前项是第二项
      expect(data.data.status.currentItemId).toBe('2')
    })
  })

  describe('TC-RE-003: 已有活跃会话', () => {
    it('应该返回 409 冲突错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(true)
      vi.mocked(agentSessionManager.getStatus).mockReturnValue({
        status: 'running',
        currentItemId: '1',
        progress: 50,
      } as never)

      const request = createRequest({
        sessionId: 'test-session-active',
        todoListId: 'todo-list-123',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.code).toBe(409001)
      expect(data.message).toContain('已有活跃的 Agent Loop')
    })
  })

  describe('额外场景: 缺少 sessionId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        todoListId: 'todo-list-123',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })
  })

  describe('额外场景: 缺少 todoListId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })
  })

  describe('额外场景: 缺少 modelId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        todoListId: 'todo-list-123',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
    })
  })

  describe('额外场景: 未授权访问', () => {
    it('应该返回 401 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createRequest({
        sessionId: 'test-session-1',
        todoListId: 'todo-list-123',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
    })
  })

  describe('额外场景: 恢复失败', () => {
    it('应该返回 500 错误并清理会话', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        resume: vi.fn().mockRejectedValue(new Error('TODO List 不存在')),
        getStatus: vi.fn(),
        getTodoList: vi.fn(),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        todoListId: 'non-existent-todo',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
      expect(agentSessionManager.delete).toHaveBeenCalledWith('test-session-1')
    })
  })

  describe('额外场景: 清理已完成会话后恢复', () => {
    it('应该删除旧会话并创建新会话', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(true)
      vi.mocked(agentSessionManager.getStatus).mockReturnValue({
        status: 'completed',
        currentItemId: null,
        progress: 100,
      } as never)

      const mockAgentLoop = {
        resume: vi.fn().mockResolvedValue(undefined),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: '1',
          progress: 0,
        }),
        getTodoList: vi.fn().mockReturnValue([]),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-completed',
        todoListId: 'todo-list-new',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(agentSessionManager.delete).toHaveBeenCalledWith('test-session-completed')
    })
  })
})
