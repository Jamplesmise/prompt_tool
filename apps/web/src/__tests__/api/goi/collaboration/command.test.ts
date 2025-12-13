/**
 * Collaboration Command API 测试
 *
 * 测试用例：
 * TC-CC-001: 发送命令
 * TC-CC-002: 空命令
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/collaboration', () => ({
  getControlTransferManager: vi.fn(),
}))

import { POST } from '@/app/api/goi/collaboration/command/route'
import { getControlTransferManager } from '@/lib/goi/collaboration'

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/collaboration/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Collaboration Command API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CC-001: 发送命令', () => {
    it('用户控制时应该成功发送命令', async () => {
      const mockTransferManager = {
        getController: vi.fn().mockReturnValue('user'),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        command: '创建一个测试任务',
        context: { currentPage: '/tasks' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.command).toBe('创建一个测试任务')
      expect(data.data.accepted).toBe(true)
      expect(data.data.message).toContain('正在处理')
    })

    it('AI 控制时应该返回繁忙状态', async () => {
      const mockTransferManager = {
        getController: vi.fn().mockReturnValue('ai'),
      }

      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createRequest({
        sessionId: 'session-1',
        command: '创建一个测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.accepted).toBe(false)
      expect(data.data.message).toContain('AI 正在执行')
    })
  })

  describe('TC-CC-002: 空命令', () => {
    it('应该返回 400 错误', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        command: '',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
      expect(data.message).toContain('command')
    })

    it('只有空格的命令应该返回 400', async () => {
      const request = createRequest({
        sessionId: 'session-1',
        command: '   ',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })

    it('缺少 command 字段应该返回 400', async () => {
      const request = createRequest({
        sessionId: 'session-1',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })
  })

  describe('参数验证', () => {
    it('缺少 sessionId 应返回 400', async () => {
      const request = createRequest({
        command: '创建测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })
  })

  describe('错误处理', () => {
    it('服务器错误应返回 500', async () => {
      vi.mocked(getControlTransferManager).mockImplementation(() => {
        throw new Error('Internal error')
      })

      const request = createRequest({
        sessionId: 'session-1',
        command: '创建测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })
  })
})
