/**
 * Failure API 测试
 *
 * 测试用例：
 * TC-FR-001: 报告失败
 * TC-FR-002: 错误分类正确
 * TC-FR-003: 重试恢复
 * TC-FR-004: 回滚恢复
 * TC-FR-005: 无效策略
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

import { GET as getReport, POST as createReport } from '@/app/api/goi/failure/report/route'
import { POST as executeRecover } from '@/app/api/goi/failure/recover/route'

function createGetRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/goi/failure/report')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

function createPostRequest(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Failure Report API', () => {
  describe('GET - TC-FR-001: 获取失败报告', () => {
    it('应该返回失败报告', async () => {
      const request = createGetRequest({ failureId: 'failure-123' })
      const response = await getReport(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data.failureId).toBe('failure-123')
      expect(data.data.location).toBeDefined()
      expect(data.data.reason).toBeDefined()
      expect(data.data.suggestions).toBeDefined()
    })

    it('缺少 failureId 应返回错误', async () => {
      const request = createGetRequest({})
      const response = await getReport(request)
      const data = await response.json()

      expect(data.code).toBe(400001)
    })
  })

  describe('POST - TC-FR-002: 生成失败报告', () => {
    it('应该生成失败报告', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/report', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        todoListTotal: 10,
        phaseName: '数据集配置',
      })

      const response = await createReport(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.failureId).toBe('failure-123')
      expect(data.data.suggestions).toBeInstanceOf(Array)
      expect(data.data.suggestions.length).toBeGreaterThan(0)
    })

    it('应该包含正确的恢复选项', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/report', {
        sessionId: 'session-1',
        failureId: 'failure-123',
      })

      const response = await createReport(request)
      const data = await response.json()

      const actions = data.data.suggestions.map((s: { action: string }) => s.action)
      expect(actions).toContain('retry')
      expect(actions).toContain('modify')
      expect(actions).toContain('takeover')
      expect(actions).toContain('skip')
      expect(actions).toContain('abort')
    })

    it('缺少必要参数应返回错误', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/report', {
        sessionId: 'session-1',
      })

      const response = await createReport(request)
      const data = await response.json()

      expect(data.code).toBe(400001)
    })
  })
})

describe('Failure Recover API', () => {
  describe('POST - TC-FR-003: 重试恢复', () => {
    it('应该成功执行重试', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: {
          action: 'retry',
          optionId: 'retry-1',
        },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.success).toBe(true)
      expect(data.data.action).toBe('retry')
      expect(data.data.message).toBeDefined()
    })
  })

  describe('POST - TC-FR-004: 修改参数恢复', () => {
    it('应该使用新参数执行恢复', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: {
          action: 'modify',
          optionId: 'modify-1',
          userInput: '新的搜索关键词',
        },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.action).toBe('modify')
      expect(data.data.message).toContain('新的搜索关键词')
    })
  })

  describe('POST - 其他恢复动作', () => {
    it('应该成功执行跳过', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: { action: 'skip', optionId: 'skip-1' },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.data.action).toBe('skip')
      expect(data.data.success).toBe(true)
    })

    it('应该成功执行接管', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: { action: 'takeover', optionId: 'takeover-1' },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.data.action).toBe('takeover')
      expect(data.data.success).toBe(true)
    })

    it('应该成功执行放弃', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: { action: 'abort', optionId: 'abort-1' },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.data.action).toBe('abort')
      expect(data.data.success).toBe(true)
    })

    it('应该成功执行重新规划', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: { action: 'replan', optionId: 'replan-1' },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.data.action).toBe('replan')
      expect(data.data.success).toBe(true)
    })
  })

  describe('POST - TC-FR-005: 无效策略', () => {
    it('应该返回 400 错误', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
        failureId: 'failure-123',
        selection: { action: 'invalid_action', optionId: 'invalid-1' },
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.code).toBe(400002)
      expect(data.message).toContain('无效的恢复动作')
    })
  })

  describe('参数验证', () => {
    it('缺少必要参数应返回 400', async () => {
      const request = createPostRequest('http://localhost:3000/api/goi/failure/recover', {
        sessionId: 'session-1',
      })

      const response = await executeRecover(request)
      const data = await response.json()

      expect(data.code).toBe(400001)
    })
  })
})
