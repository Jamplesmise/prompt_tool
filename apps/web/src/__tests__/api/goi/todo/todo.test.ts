/**
 * TODO API 测试
 *
 * 测试用例：
 * TC-TD-001: 创建 TODO List
 * TC-TD-002: 缺少 goal
 * TC-TD-003: 获取 TODO List
 * TC-TD-004: 不存在的 List
 * TC-TD-005: 更新状态
 * TC-TD-006: 无效状态值
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

vi.mock('@/lib/goi/todo/todoStore', () => ({
  todoStore: {
    create: vi.fn(),
    getById: vi.fn(),
    getBySessionId: vi.fn(),
    getLatestBySessionId: vi.fn(),
    getActiveBySessionId: vi.fn(),
    query: vi.fn(),
    updateItemStatus: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/goi/todo/route'
import { getSession } from '@/lib/auth'
import { todoStore } from '@/lib/goi/todo/todoStore'

function createGetRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/todo')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/todo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('TODO API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST - TC-TD-001: 创建 TODO List', () => {
    it('应该成功创建 TODO List', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockTodoList = {
        id: 'todo-1',
        sessionId: 'session-1',
        goal: '创建测试任务',
        items: [
          { id: 'item-1', content: '步骤1', status: 'pending' },
        ],
        createdAt: new Date(),
      }

      vi.mocked(todoStore.create).mockResolvedValue(mockTodoList as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        goal: '创建测试任务',
        items: [{ content: '步骤1', status: 'pending' }],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.id).toBe('todo-1')
      expect(data.data.goal).toBe('创建测试任务')
    })
  })

  describe('POST - TC-TD-002: 缺少 goal', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        sessionId: 'session-1',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
      expect(data.message).toContain('goal')
    })

    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        goal: '创建测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })
  })

  describe('GET - TC-TD-003: 获取 TODO List', () => {
    it('应该返回会话的 TODO Lists', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockTodoLists = [
        { id: 'todo-1', sessionId: 'session-1', goal: '任务1' },
        { id: 'todo-2', sessionId: 'session-1', goal: '任务2' },
      ]

      vi.mocked(todoStore.getBySessionId).mockResolvedValue(mockTodoLists as never)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data).toHaveLength(2)
    })

    it('获取最新的 TODO List', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockTodoList = { id: 'todo-latest', sessionId: 'session-1', goal: '最新任务' }
      vi.mocked(todoStore.getLatestBySessionId).mockResolvedValue(mockTodoList as never)

      const request = createGetRequest({ sessionId: 'session-1', latest: 'true' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.id).toBe('todo-latest')
    })

    it('获取活跃的 TODO List', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockTodoList = { id: 'todo-active', sessionId: 'session-1', goal: '活跃任务', status: 'active' }
      vi.mocked(todoStore.getActiveBySessionId).mockResolvedValue(mockTodoList as never)

      const request = createGetRequest({ sessionId: 'session-1', active: 'true' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.id).toBe('todo-active')
    })
  })

  describe('GET - TC-TD-004: 通用查询', () => {
    it('不指定 sessionId 时应查询用户的所有 TODO Lists', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockResult = {
        list: [{ id: 'todo-1' }, { id: 'todo-2' }],
        total: 2,
      }
      vi.mocked(todoStore.query).mockResolvedValue(mockResult as never)

      const request = createGetRequest({})
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(todoStore.query).toHaveBeenCalledWith(expect.objectContaining({
        createdBy: 'test-user-id',
      }))
    })
  })

  describe('认证', () => {
    it('未授权应返回 401', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createPostRequest({
        sessionId: 'session-1',
        goal: '测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
    })
  })
})
