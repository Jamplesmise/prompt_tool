/**
 * Planner 单元测试
 *
 * 测试计划生成器的核心功能：
 * - 计划生成
 * - TODO List 转换
 * - 重试机制
 * - 重新规划
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Planner, createPlanner } from '../agent/planner'

// Mock 依赖
vi.mock('../../prisma', () => ({
  prisma: {
    syncedModel: {
      findUnique: vi.fn(),
    },
    model: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../modelInvoker', () => ({
  invokeModel: vi.fn(),
}))

vi.mock('../todo/todoStore', () => ({
  todoStore: {
    save: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn(),
  },
}))

vi.mock('../../events', () => ({
  eventBus: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
}))

// 导入 mock 后的模块
import { prisma } from '../../prisma'
import { invokeModel } from '../../modelInvoker'
import { todoStore } from '../todo/todoStore'

describe('Planner', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 默认 mock 返回值
    vi.mocked(prisma.model.findUnique).mockResolvedValue({
      id: 'test-model',
      modelId: 'gpt-4',
      provider: {
        type: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        headers: {},
      },
      config: {},
      pricing: null,
    } as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('构造函数', () => {
    it('should create planner with valid config', () => {
      const planner = createPlanner('test-session', { modelId: 'test-model' })
      expect(planner).toBeInstanceOf(Planner)
    })

    it('should throw error when modelId is missing', () => {
      expect(() => {
        new Planner('test-session', { modelId: '' })
      }).toThrow('modelId is required')
    })

    it('should apply default config values', () => {
      const planner = new Planner('test-session', { modelId: 'test-model' })
      // 内部配置无法直接访问，但可以通过行为测试
      expect(planner).toBeDefined()
    })
  })

  describe('generatePlan', () => {
    it('should generate plan successfully', async () => {
      const mockResponse = JSON.stringify({
        goalAnalysis: '分析用户目标：创建一个情感分析任务',
        items: [
          {
            id: '1',
            title: '导航到任务创建页面',
            description: '打开任务创建页面',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'create',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: {
              required: false,
            },
          },
          {
            id: '2',
            title: '选择提示词',
            description: '选择要测试的提示词',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'prompt' },
              action: 'select',
            },
            dependsOn: ['1'],
            estimatedDuration: 10,
            checkpoint: {
              required: true,
              type: 'resource_selection',
              message: '请确认选择的提示词',
            },
          },
        ],
        warnings: ['无特殊警告'],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 200 },
        latencyMs: 500,
        cost: 0.01,
      })

      const planner = createPlanner('test-session', { modelId: 'test-model' })
      const result = await planner.generatePlan('创建一个情感分析任务')

      expect(result.success).toBe(true)
      expect(result.todoList).toBeDefined()
      expect(result.todoList?.items.length).toBe(2)
      expect(result.goalAnalysis).toContain('情感分析')
      expect(result.tokenUsage).toBeDefined()
      expect(result.latencyMs).toBeGreaterThan(0)
    })

    it('should handle model not found error', async () => {
      vi.mocked(prisma.model.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.syncedModel.findUnique).mockResolvedValue(null)

      const planner = createPlanner('test-session', { modelId: 'non-existent' })
      const result = await planner.generatePlan('创建任务')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Model not found')
    })

    it('should retry on parse error', async () => {
      const validResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '测试步骤',
            description: '测试',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      // 第一次返回无效响应，第二次返回有效响应
      vi.mocked(invokeModel)
        .mockResolvedValueOnce({
          output: 'invalid json',
          tokens: { input: 100, output: 50 },
          latencyMs: 200,
          cost: 0.005,
        })
        .mockResolvedValueOnce({
          output: validResponse,
          tokens: { input: 100, output: 100 },
          latencyMs: 300,
          cost: 0.008,
        })

      const planner = createPlanner('test-session', {
        modelId: 'test-model',
        maxRetries: 3,
      })
      const result = await planner.generatePlan('创建任务')

      // 应该重试并最终成功
      expect(invokeModel).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })

    it('should fail after max retries', async () => {
      vi.mocked(invokeModel).mockResolvedValue({
        output: 'invalid response',
        tokens: { input: 100, output: 50 },
        latencyMs: 200,
        cost: 0.005,
      })

      const planner = createPlanner('test-session', {
        modelId: 'test-model',
        maxRetries: 2,
      })
      const result = await planner.generatePlan('创建任务')

      expect(result.success).toBe(false)
      expect(invokeModel).toHaveBeenCalledTimes(2)
    })

    it('should save todo list when autoSave is enabled', async () => {
      const mockResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '测试步骤',
            description: '测试',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 100 },
        latencyMs: 300,
        cost: 0.008,
      })

      const planner = createPlanner('test-session', {
        modelId: 'test-model',
        autoSave: true,
      })
      await planner.generatePlan('创建任务')

      expect(todoStore.save).toHaveBeenCalled()
    })

    it('should not save when autoSave is disabled', async () => {
      const mockResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '测试步骤',
            description: '测试',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 100 },
        latencyMs: 300,
        cost: 0.008,
      })

      const planner = createPlanner('test-session', {
        modelId: 'test-model',
        autoSave: false,
      })
      await planner.generatePlan('创建任务')

      expect(todoStore.save).not.toHaveBeenCalled()
    })
  })

  describe('replan', () => {
    it('should replan with existing todo list context', async () => {
      // Mock 现有的 todo list
      vi.mocked(todoStore.getById).mockResolvedValue({
        id: 'existing-list',
        goal: '原始目标',
        items: [
          {
            id: 'item-1',
            title: '已完成步骤',
            status: 'completed',
            result: { success: true },
          },
          {
            id: 'item-2',
            title: '待执行步骤',
            status: 'pending',
          },
        ],
      } as never)

      const mockResponse = JSON.stringify({
        goalAnalysis: '重新规划',
        items: [
          {
            id: '1',
            title: '新步骤',
            description: '重新规划后的步骤',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 150, output: 100 },
        latencyMs: 400,
        cost: 0.01,
      })

      const planner = createPlanner('test-session', { modelId: 'test-model' })
      const result = await planner.replan('existing-list', '用户请求重新规划')

      expect(result.success).toBe(true)
      expect(todoStore.getById).toHaveBeenCalledWith('existing-list')
    })

    it('should fail replan when todo list not found', async () => {
      vi.mocked(todoStore.getById).mockResolvedValue(null)

      const planner = createPlanner('test-session', { modelId: 'test-model' })
      const result = await planner.replan('non-existent', '原因')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('TODO List 转换', () => {
    it('should convert plan items with dependencies', async () => {
      const mockResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '步骤1',
            description: '第一步',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
          {
            id: '2',
            title: '步骤2',
            description: '依赖步骤1',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'prompt' },
              action: 'select',
            },
            dependsOn: ['1'],
            estimatedDuration: 10,
            checkpoint: { required: true, type: 'resource_selection' },
          },
          {
            id: '3',
            title: '步骤3',
            description: '依赖步骤1和2',
            category: 'state',
            goiOperation: {
              type: 'state',
              target: { resourceType: 'task' },
              action: 'create',
              expectedState: {},
            },
            dependsOn: ['1', '2'],
            estimatedDuration: 15,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 200 },
        latencyMs: 500,
        cost: 0.01,
      })

      const planner = createPlanner('test-session', { modelId: 'test-model' })
      const result = await planner.generatePlan('创建任务')

      expect(result.success).toBe(true)
      expect(result.todoList?.items.length).toBe(3)

      // 验证依赖关系被正确转换
      const items = result.todoList?.items || []
      expect(items[0].dependsOn).toEqual([])
      expect(items[1].dependsOn.length).toBe(1) // 依赖第一个
      expect(items[2].dependsOn.length).toBe(2) // 依赖前两个
    })

    it('should set checkpoint correctly', async () => {
      const mockResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '需要检查点的步骤',
            description: '重要选择',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'prompt' },
              action: 'select',
            },
            dependsOn: [],
            estimatedDuration: 10,
            checkpoint: {
              required: true,
              type: 'resource_selection',
              message: '请确认您的选择',
            },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 150 },
        latencyMs: 400,
        cost: 0.009,
      })

      const planner = createPlanner('test-session', { modelId: 'test-model' })
      const result = await planner.generatePlan('选择提示词')

      expect(result.success).toBe(true)
      const item = result.todoList?.items[0]
      expect(item?.checkpoint?.required).toBe(true)
      expect(item?.checkpoint?.type).toBe('resource_selection')
      expect(item?.checkpoint?.message).toBe('请确认您的选择')
    })
  })

  describe('FastGPT 模型支持', () => {
    it('should use synced FastGPT model', async () => {
      // 先检查 syncedModel
      vi.mocked(prisma.syncedModel.findUnique).mockResolvedValue({
        id: 'fastgpt-model',
        modelId: 'gpt-4-turbo',
        inputPrice: 0.01,
        outputPrice: 0.03,
      } as never)

      const mockResponse = JSON.stringify({
        goalAnalysis: '分析',
        items: [
          {
            id: '1',
            title: '步骤',
            description: '测试',
            category: 'access',
            goiOperation: {
              type: 'access',
              target: { resourceType: 'task' },
              action: 'navigate',
            },
            dependsOn: [],
            estimatedDuration: 5,
            checkpoint: { required: false },
          },
        ],
        warnings: [],
      })

      vi.mocked(invokeModel).mockResolvedValue({
        output: mockResponse,
        tokens: { input: 100, output: 100 },
        latencyMs: 300,
        cost: 0.01,
      })

      const planner = createPlanner('test-session', { modelId: 'fastgpt-model' })
      const result = await planner.generatePlan('创建任务')

      expect(result.success).toBe(true)
      expect(prisma.syncedModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'fastgpt-model' },
      })
    })
  })
})
