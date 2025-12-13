/**
 * Agent Start API 测试
 *
 * 测试用例：
 * TC-AS-001: 正常启动
 * TC-AS-002: 缺少 sessionId
 * TC-AS-003: 缺少 goal
 * TC-AS-004: 缺少 modelId
 * TC-AS-005: 重复启动
 * TC-AS-006: 未授权
 * TC-AS-007: 超长 goal
 * TC-AS-008: 特殊字符 goal (XSS 防护)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock 数据
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin',
}

const mockTodoList = [
  { id: '1', content: '选择提示词', status: 'pending' },
  { id: '2', content: '配置参数', status: 'pending' },
]

// Mock 认证模块
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}))

// Mock Agent Session Manager
vi.mock('@/lib/goi/agent/sessionManager', () => ({
  agentSessionManager: {
    has: vi.fn(),
    getStatus: vi.fn(),
    getOrCreate: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { POST } from '@/app/api/goi/agent/start/route'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

// 创建 Mock Request
function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/goi/agent/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Agent Start API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-AS-001: 正常启动', () => {
    it('应该成功启动 Agent 并返回 todoList', async () => {
      // 设置认证
      vi.mocked(getSession).mockResolvedValue(mockUser)

      // 设置会话管理器
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        start: vi.fn().mockResolvedValue({
          success: true,
          todoList: mockTodoList,
          goalAnalysis: { complexity: 'medium' },
          warnings: [],
          tokenUsage: { prompt: 100, completion: 50 },
          latencyMs: 1500,
        }),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: null,
          progress: 0,
        }),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
      expect(data.message).toBe('success')
      expect(data.data.todoList).toEqual(mockTodoList)
      expect(data.data.status).toBeDefined()
    })
  })

  describe('TC-AS-002: 缺少 sessionId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400001)
      expect(data.message).toBe('缺少 sessionId')
      expect(data.data).toBeNull()
    })
  })

  describe('TC-AS-003: 缺少 goal', () => {
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
      expect(data.message).toBe('缺少 goal')
      expect(data.data).toBeNull()
    })
  })

  describe('TC-AS-004: 缺少 modelId', () => {
    it('应该返回 400 错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      const request = createRequest({
        sessionId: 'test-session-1',
        goal: '创建一个测试任务',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe(400003)
      expect(data.message).toContain('缺少 modelId')
      expect(data.data).toBeNull()
    })
  })

  describe('TC-AS-005: 重复启动', () => {
    it('应该返回 409 冲突错误', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)

      // 模拟已有活跃会话
      vi.mocked(agentSessionManager.has).mockReturnValue(true)
      vi.mocked(agentSessionManager.getStatus).mockReturnValue({
        status: 'running',
        currentItemId: '1',
        progress: 50,
      } as never)

      const request = createRequest({
        sessionId: 'test-session-active',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.code).toBe(409001)
      expect(data.message).toContain('已有活跃的 Agent Loop')
    })
  })

  describe('TC-AS-006: 未授权', () => {
    it('应该返回 401 未授权错误', async () => {
      vi.mocked(getSession).mockResolvedValue(null)

      const request = createRequest({
        sessionId: 'test-session-1',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe(401001)
      expect(data.message).toBe('未授权访问')
      expect(data.data).toBeNull()
    })
  })

  describe('TC-AS-007: 超长 goal', () => {
    it('应该正常处理超长 goal', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        start: vi.fn().mockResolvedValue({
          success: true,
          todoList: mockTodoList,
          goalAnalysis: { complexity: 'high' },
          warnings: ['目标描述过长，已截断处理'],
          tokenUsage: { prompt: 500, completion: 100 },
          latencyMs: 2000,
        }),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: null,
          progress: 0,
        }),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const longGoal = '这是一个非常长的目标描述'.repeat(100)
      const request = createRequest({
        sessionId: 'test-session-1',
        goal: longGoal,
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      // 应该成功处理，不应崩溃
      expect(response.status).toBe(200)
      expect(data.code).toBe(200)
    })
  })

  describe('TC-AS-008: 特殊字符 goal (XSS 防护)', () => {
    it('应该安全处理包含脚本标签的 goal', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        start: vi.fn().mockResolvedValue({
          success: true,
          todoList: mockTodoList,
          goalAnalysis: { complexity: 'medium' },
          warnings: [],
          tokenUsage: { prompt: 100, completion: 50 },
          latencyMs: 1500,
        }),
        getStatus: vi.fn().mockReturnValue({
          status: 'idle',
          currentItemId: null,
          progress: 0,
        }),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const xssGoal = '创建任务 <script>alert("xss")</script>'
      const request = createRequest({
        sessionId: 'test-session-1',
        goal: xssGoal,
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      // 应该成功处理，XSS 脚本不应被执行（API 层面只需确保不崩溃）
      expect(response.status).toBe(200)
      expect(data.code).toBe(200)

      // 验证 start 被调用时接收到的 goal
      expect(mockAgentLoop.start).toHaveBeenCalledWith(xssGoal, undefined)
    })
  })

  describe('额外场景: 带可选参数启动', () => {
    it('应该正确传递 autoRun 和其他可选参数', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        start: vi.fn().mockResolvedValue({
          success: true,
          todoList: mockTodoList,
          goalAnalysis: { complexity: 'medium' },
          warnings: [],
          tokenUsage: { prompt: 100, completion: 50 },
          latencyMs: 1500,
        }),
        getStatus: vi.fn().mockReturnValue({
          status: 'running',
          currentItemId: '1',
          progress: 10,
        }),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
        autoRun: true,
        maxRetries: 5,
        stepDelay: 1000,
        context: { currentPage: '/tasks' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(agentSessionManager.getOrCreate).toHaveBeenCalledWith(
        'test-session-1',
        expect.objectContaining({
          modelId: 'gpt-4',
          autoRun: true,
          maxRetries: 5,
          stepDelay: 1000,
        })
      )
    })
  })

  describe('额外场景: 计划生成失败', () => {
    it('应该返回 500 错误当计划生成失败时', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser)
      vi.mocked(agentSessionManager.has).mockReturnValue(false)

      const mockAgentLoop = {
        start: vi.fn().mockResolvedValue({
          success: false,
          error: '模型调用失败',
        }),
        getStatus: vi.fn().mockReturnValue({
          status: 'failed',
          currentItemId: null,
          progress: 0,
        }),
      }
      vi.mocked(agentSessionManager.getOrCreate).mockReturnValue(mockAgentLoop as never)

      const request = createRequest({
        sessionId: 'test-session-1',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.code).toBe(500002)
      expect(data.message).toContain('模型调用失败')
    })
  })
})
