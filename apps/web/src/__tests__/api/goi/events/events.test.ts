/**
 * Events API 测试
 *
 * 测试用例：
 * TC-EV-001: 查询事件列表
 * TC-EV-002: 订阅事件流 (SSE)
 * TC-EV-003: 发布事件
 * TC-EV-004: 缺少事件类型
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

vi.mock('@/lib/events', () => ({
  eventBus: {
    publish: vi.fn(),
    subscribe: vi.fn(),
  },
  eventStore: {
    query: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock('@/lib/api', () => ({
  success: (data: unknown) => ({ code: 200, message: 'success', data }),
  error: (code: number, message: string) => ({ code, message, data: null }),
  unauthorized: () => ({ code: 401001, message: '未授权访问', data: null }),
  badRequest: (message: string) => ({ code: 400001, message, data: null }),
}))

vi.mock('@platform/shared', () => ({
  ERROR_CODES: { INTERNAL_ERROR: 500001 },
}))

import { GET, POST } from '@/app/api/goi/events/route'
import { getSession } from '@/lib/auth'
import { eventBus, eventStore } from '@/lib/events'

function createGetRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/events')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Events API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET - TC-EV-001: 查询事件列表', () => {
    it('应该返回事件列表', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockEvents = [
        { id: 'event-1', type: 'todo_updated', sessionId: 'session-1', createdAt: new Date() },
        { id: 'event-2', type: 'checkpoint_created', sessionId: 'session-1', createdAt: new Date() },
      ]

      vi.mocked(eventStore.query).mockResolvedValue(mockEvents as never)
      vi.mocked(eventStore.count).mockResolvedValue(2)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.list).toHaveLength(2)
      expect(data.data.total).toBe(2)
    })

    it('支持类型过滤', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(eventStore.query).mockResolvedValue([])
      vi.mocked(eventStore.count).mockResolvedValue(0)

      const request = createGetRequest({
        sessionId: 'session-1',
        types: 'todo_updated,checkpoint_created',
      })

      await GET(request)

      expect(eventStore.query).toHaveBeenCalledWith(expect.objectContaining({
        types: ['todo_updated', 'checkpoint_created'],
      }))
    })

    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createGetRequest({})
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST - TC-EV-003: 发布事件', () => {
    it('应该成功发布事件', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockEvent = {
        id: 'event-new',
        sessionId: 'session-1',
        type: 'custom_event',
        payload: { key: 'value' },
        createdAt: new Date(),
      }

      vi.mocked(eventBus.publish).mockResolvedValue(mockEvent as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        type: 'custom_event',
        payload: { key: 'value' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.code).toBe(200)
      expect(data.data.id).toBe('event-new')
      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'session-1',
        type: 'custom_event',
        source: 'user',
        payload: { key: 'value' },
      }))
    })
  })

  describe('POST - TC-EV-004: 缺少必要参数', () => {
    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        type: 'custom_event',
        payload: {},
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('缺少 type 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        sessionId: 'session-1',
        payload: {},
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('缺少 payload 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        sessionId: 'session-1',
        type: 'custom_event',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('认证', () => {
    it('GET 未授权应返回 401', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('POST 未授权应返回 401', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createPostRequest({
        sessionId: 'session-1',
        type: 'custom_event',
        payload: {},
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
