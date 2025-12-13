/**
 * Snapshot API 测试
 *
 * 测试用例：
 * TC-SN-001: 创建快照
 * TC-SN-002: 会话不存在
 * TC-SN-003: 获取快照
 * TC-SN-004: 快照不存在
 * TC-SN-005: 恢复快照
 * TC-SN-006: 恢复后进度正确
 * TC-SN-007: 清理过期快照
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

vi.mock('@/lib/snapshot', () => ({
  snapshotStore: {
    query: vi.fn(),
    count: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
  },
  snapshotManager: {
    createSnapshot: vi.fn(),
    restoreSnapshot: vi.fn(),
  },
}))

vi.mock('@/lib/api', () => ({
  success: (data: unknown) => ({ code: 200, message: 'success', data }),
  error: (code: number, message: string) => ({ code, message, data: null }),
  unauthorized: () => ({ code: 401001, message: '未授权访问', data: null }),
  badRequest: (message: string) => ({ code: 400001, message, data: null }),
  notFound: (message: string) => ({ code: 404001, message, data: null }),
}))

vi.mock('@platform/shared', () => ({
  ERROR_CODES: { INTERNAL_ERROR: 500001 },
}))

import { GET as getSnapshots, POST as createSnapshot } from '@/app/api/goi/snapshots/route'
import { GET as getSnapshot, DELETE as deleteSnapshot } from '@/app/api/goi/snapshots/[id]/route'
import { POST as restoreSnapshot } from '@/app/api/goi/snapshots/[id]/restore/route'
import { getSession } from '@/lib/auth'
import { snapshotStore, snapshotManager } from '@/lib/snapshot'

function createGetRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/snapshots')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Snapshot API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET /api/goi/snapshots - 查询快照列表', () => {
    it('应该返回快照列表', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockSnapshots = [
        { id: 'snap-1', sessionId: 'session-1', trigger: 'manual', createdAt: new Date() },
        { id: 'snap-2', sessionId: 'session-1', trigger: 'checkpoint', createdAt: new Date() },
      ]

      vi.mocked(snapshotStore.query).mockResolvedValue(mockSnapshots as never)
      vi.mocked(snapshotStore.count).mockResolvedValue(2)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await getSnapshots(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.list).toHaveLength(2)
      expect(data.data.total).toBe(2)
    })

    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createGetRequest({})
      const response = await getSnapshots(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('未授权应返回 401', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await getSnapshots(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/goi/snapshots - TC-SN-001: 创建快照', () => {
    it('应该成功创建快照', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockSnapshot = {
        id: 'snap-new',
        sessionId: 'session-1',
        trigger: 'manual',
        createdAt: new Date(),
      }

      vi.mocked(snapshotManager.createSnapshot).mockResolvedValue(mockSnapshot as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        trigger: 'manual',
      })

      const response = await createSnapshot(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.code).toBe(200)
      expect(data.data.id).toBe('snap-new')
      expect(snapshotManager.createSnapshot).toHaveBeenCalledWith('session-1', 'manual', undefined)
    })

    it('缺少 sessionId 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({ trigger: 'manual' })
      const response = await createSnapshot(request)

      expect(response.status).toBe(400)
    })

    it('缺少 trigger 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({ sessionId: 'session-1' })
      const response = await createSnapshot(request)

      expect(response.status).toBe(400)
    })

    it('无效的 trigger 应返回 400', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createPostRequest({
        sessionId: 'session-1',
        trigger: 'invalid_trigger',
      })

      const response = await createSnapshot(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/goi/snapshots/[id] - TC-SN-003: 获取快照', () => {
    it('应该返回快照详情', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockSnapshot = {
        id: 'snap-1',
        sessionId: 'session-1',
        trigger: 'manual',
        state: { todoList: [], currentStep: 2 },
        createdAt: new Date(),
      }

      vi.mocked(snapshotStore.getById).mockResolvedValue(mockSnapshot as never)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/snap-1')
      const mockParams = Promise.resolve({ id: 'snap-1' })

      const response = await getSnapshot(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.id).toBe('snap-1')
      expect(data.data.state).toBeDefined()
    })
  })

  describe('GET /api/goi/snapshots/[id] - TC-SN-004: 快照不存在', () => {
    it('应该返回 404', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(snapshotStore.getById).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/non-existent')
      const mockParams = Promise.resolve({ id: 'non-existent' })

      const response = await getSnapshot(request, { params: mockParams })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/goi/snapshots/[id]/restore - TC-SN-005: 恢复快照', () => {
    it('应该成功恢复快照', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const mockSnapshot = {
        id: 'snap-1',
        sessionId: 'session-1',
        trigger: 'manual',
        state: { todoList: [], currentStep: 2 },
      }

      vi.mocked(snapshotStore.getById).mockResolvedValue(mockSnapshot as never)
      vi.mocked(snapshotManager.restoreSnapshot).mockResolvedValue({
        success: true,
        restoredAt: new Date(),
        stepIndex: 2,
      } as never)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/snap-1/restore', {
        method: 'POST',
      })
      const mockParams = Promise.resolve({ id: 'snap-1' })

      const response = await restoreSnapshot(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(snapshotManager.restoreSnapshot).toHaveBeenCalledWith('snap-1')
    })

    it('快照不存在应返回 404', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(snapshotStore.getById).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/non-existent/restore', {
        method: 'POST',
      })
      const mockParams = Promise.resolve({ id: 'non-existent' })

      const response = await restoreSnapshot(request, { params: mockParams })

      expect(response.status).toBe(404)
    })

    it('恢复失败应返回 500', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      vi.mocked(snapshotStore.getById).mockResolvedValue({ id: 'snap-1' } as never)
      vi.mocked(snapshotManager.restoreSnapshot).mockResolvedValue({
        success: false,
        error: '恢复失败',
      } as never)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/snap-1/restore', {
        method: 'POST',
      })
      const mockParams = Promise.resolve({ id: 'snap-1' })

      const response = await restoreSnapshot(request, { params: mockParams })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/goi/snapshots/[id]', () => {
    it('应该成功删除快照', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(snapshotStore.delete).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/snap-1', {
        method: 'DELETE',
      })
      const mockParams = Promise.resolve({ id: 'snap-1' })

      const response = await deleteSnapshot(request, { params: mockParams })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.deleted).toBe(true)
    })

    it('快照不存在应返回 404', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(snapshotStore.delete).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/goi/snapshots/non-existent', {
        method: 'DELETE',
      })
      const mockParams = Promise.resolve({ id: 'non-existent' })

      const response = await deleteSnapshot(request, { params: mockParams })

      expect(response.status).toBe(404)
    })
  })
})
