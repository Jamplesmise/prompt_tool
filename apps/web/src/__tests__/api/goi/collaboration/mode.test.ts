/**
 * Collaboration Mode API 测试
 *
 * 测试用例：
 * TC-CM-001: 切换到手动
 * TC-CM-002: 切换到辅助
 * TC-CM-003: 切换到自动
 * TC-CM-004: 无效模式
 * TC-CM-005: 保持会话状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/collaboration', () => ({
  getControlTransferManager: vi.fn(),
}))

vi.mock('@/lib/goi/checkpoint', () => ({
  getCheckpointRuleEngine: vi.fn(),
}))

import { GET, POST } from '@/app/api/goi/collaboration/mode/route'
import { getControlTransferManager } from '@/lib/goi/collaboration'
import { getCheckpointRuleEngine } from '@/lib/goi/checkpoint'

function createGetRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/collaboration/mode')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/collaboration/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Collaboration Mode API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET - 获取当前模式', () => {
    it('应该返回当前模式信息', async () => {
      const mockRuleEngine = {
        getRules: vi.fn().mockReturnValue([]),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.sessionId).toBe('session-1')
      expect(data.data.mode).toBeDefined()
      expect(data.data.modeConfig).toBeDefined()
    })

    it('缺少 sessionId 应返回 400', async () => {
      const request = createGetRequest({})
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })

    it('应该根据规则判断为 manual 模式', async () => {
      const mockRuleEngine = {
        getRules: vi.fn().mockReturnValue([
          { id: 'step-mode-all-confirm', name: 'Step Mode Rule' },
        ]),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.mode).toBe('manual')
    })

    it('应该根据规则判断为 auto 模式', async () => {
      const mockRuleEngine = {
        getRules: vi.fn().mockReturnValue([
          { id: 'auto-mode-auto-pass', name: 'Auto Mode Rule' },
        ]),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createGetRequest({ sessionId: 'session-1' })
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.mode).toBe('auto')
    })
  })

  describe('POST - TC-CM-001: 切换到手动', () => {
    it('应该成功切换到手动模式', async () => {
      const mockRuleEngine = {
        switchModeRules: vi.fn(),
        getRules: vi.fn().mockReturnValue([]),
      }
      const mockTransferManager = {
        setMode: vi.fn(),
      }

      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)
      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        mode: 'manual',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.mode).toBe('manual')
      expect(mockRuleEngine.switchModeRules).toHaveBeenCalledWith('step')
      expect(mockTransferManager.setMode).toHaveBeenCalledWith('manual')
    })
  })

  describe('POST - TC-CM-002: 切换到辅助', () => {
    it('应该成功切换到辅助模式', async () => {
      const mockRuleEngine = {
        switchModeRules: vi.fn(),
        getRules: vi.fn().mockReturnValue([]),
      }
      const mockTransferManager = {
        setMode: vi.fn(),
      }

      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)
      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        mode: 'assisted',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.mode).toBe('assisted')
      expect(mockRuleEngine.switchModeRules).toHaveBeenCalledWith('smart')
    })
  })

  describe('POST - TC-CM-003: 切换到自动', () => {
    it('应该成功切换到自动模式', async () => {
      const mockRuleEngine = {
        switchModeRules: vi.fn(),
        getRules: vi.fn().mockReturnValue([]),
      }
      const mockTransferManager = {
        setMode: vi.fn(),
      }

      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)
      vi.mocked(getControlTransferManager).mockReturnValue(mockTransferManager as never)

      const request = createPostRequest({
        sessionId: 'session-1',
        mode: 'auto',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.mode).toBe('auto')
      expect(mockRuleEngine.switchModeRules).toHaveBeenCalledWith('auto')
    })
  })

  describe('POST - TC-CM-004: 无效模式', () => {
    it('应该返回 400 错误', async () => {
      const request = createPostRequest({
        sessionId: 'session-1',
        mode: 'invalid',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('Invalid mode')
    })
  })

  describe('POST - 参数验证', () => {
    it('缺少 sessionId 应返回 400', async () => {
      const request = createPostRequest({ mode: 'manual' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
    })

    it('缺少 mode 应返回 400', async () => {
      const request = createPostRequest({ sessionId: 'session-1' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
    })
  })
})
