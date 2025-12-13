/**
 * Checkpoint Rules API 测试
 *
 * 测试用例：
 * TC-CRU-001: 获取规则配置
 * TC-CRU-002: 更新规则
 * TC-CRU-003: 无效规则值
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/goi/checkpoint', () => ({
  getCheckpointRuleEngine: vi.fn(),
  DEFAULT_CHECKPOINT_RULES: [{ id: 'default-rule-1', name: 'Default Rule' }],
  STEP_MODE_RULES: [{ id: 'step-rule-1', name: 'Step Rule' }],
  AUTO_MODE_RULES: [{ id: 'auto-rule-1', name: 'Auto Rule' }],
}))

import { GET, PUT } from '@/app/api/goi/checkpoint/rules/route'
import { getCheckpointRuleEngine } from '@/lib/goi/checkpoint'

function createPutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/checkpoint/rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Checkpoint Rules API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET - TC-CRU-001: 获取规则配置', () => {
    it('应该返回当前规则和预设', async () => {
      const mockRules = [
        { id: 'rule-1', name: 'Rule 1', trigger: 'always', action: 'pause' },
        { id: 'rule-2', name: 'Rule 2', trigger: 'resource_selection', action: 'confirm' },
      ]

      const mockRuleEngine = {
        getRules: vi.fn().mockReturnValue(mockRules),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = new NextRequest('http://localhost:3000/api/goi/checkpoint/rules')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.rules).toEqual(mockRules)
      expect(data.data.presets).toBeDefined()
      expect(data.data.presets.default).toBeDefined()
      expect(data.data.presets.step).toBeDefined()
      expect(data.data.presets.auto).toBeDefined()
    })
  })

  describe('PUT - TC-CRU-002: 切换模式', () => {
    it('应该成功切换到 step 模式', async () => {
      const mockRules = [{ id: 'step-rule-1', name: 'Step Rule' }]

      const mockRuleEngine = {
        switchModeRules: vi.fn(),
        getRules: vi.fn().mockReturnValue(mockRules),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createPutRequest({
        sessionId: 'session-1',
        mode: 'step',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.mode).toBe('step')
      expect(mockRuleEngine.switchModeRules).toHaveBeenCalledWith('step')
    })

    it('应该成功切换到 auto 模式', async () => {
      const mockRules = [{ id: 'auto-rule-1', name: 'Auto Rule' }]

      const mockRuleEngine = {
        switchModeRules: vi.fn(),
        getRules: vi.fn().mockReturnValue(mockRules),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createPutRequest({
        sessionId: 'session-1',
        mode: 'auto',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.mode).toBe('auto')
    })
  })

  describe('PUT - TC-CRU-002: 添加自定义规则', () => {
    it('应该成功添加自定义规则', async () => {
      const newRules = [
        {
          id: 'custom-rule-1',
          name: 'Custom Rule',
          trigger: 'cost_threshold',
          action: 'confirm',
          threshold: 100,
        },
      ]

      const mockRuleEngine = {
        addUserRules: vi.fn(),
        getRules: vi.fn().mockReturnValue(newRules),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createPutRequest({
        sessionId: 'session-1',
        rules: newRules,
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.data.added).toBe(1)
      expect(mockRuleEngine.addUserRules).toHaveBeenCalled()
    })
  })

  describe('PUT - TC-CRU-003: 无效规则值', () => {
    it('缺少 sessionId 应返回 400', async () => {
      const request = createPutRequest({
        mode: 'step',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toContain('sessionId')
    })

    it('无效模式应返回 400', async () => {
      const request = createPutRequest({
        sessionId: 'session-1',
        mode: 'invalid',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400002)
      expect(data.message).toContain('Invalid mode')
    })

    it('不完整的规则应返回 400', async () => {
      const request = createPutRequest({
        sessionId: 'session-1',
        rules: [{ id: 'rule-1' }], // 缺少 name, trigger, action
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('id, name, trigger, and action')
    })
  })

  describe('额外场景: 无变更请求', () => {
    it('不提供 mode 或 rules 时应返回当前规则', async () => {
      const mockRules = [{ id: 'current-rule-1', name: 'Current Rule' }]

      const mockRuleEngine = {
        getRules: vi.fn().mockReturnValue(mockRules),
      }
      vi.mocked(getCheckpointRuleEngine).mockReturnValue(mockRuleEngine as never)

      const request = createPutRequest({
        sessionId: 'session-1',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('No changes made')
      expect(data.data.rules).toEqual(mockRules)
    })
  })

  describe('额外场景: 服务器错误', () => {
    it('GET 时发生错误应返回 500', async () => {
      vi.mocked(getCheckpointRuleEngine).mockImplementation(() => {
        throw new Error('Internal error')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })

    it('PUT 时发生错误应返回 500', async () => {
      vi.mocked(getCheckpointRuleEngine).mockImplementation(() => {
        throw new Error('Internal error')
      })

      const request = createPutRequest({
        sessionId: 'session-1',
        mode: 'step',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500001)
    })
  })
})
