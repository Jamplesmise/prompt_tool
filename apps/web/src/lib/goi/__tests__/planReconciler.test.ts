/**
 * PlanReconciler 单元测试
 *
 * 测试计划协调器的核心功能：
 * - 协调计划与用户操作
 * - 标记用户完成的步骤
 * - 获取下一个待执行步骤
 * - 生成续跑建议
 * - 匹配 Access/State 操作
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PlanReconciler } from '../agent/planReconciler'
import type { TaskPlan, PlanStep } from '@platform/shared'
import type { TrackedAction, ReconciledPlan } from '../collaboration/types'

describe('PlanReconciler', () => {
  let reconciler: PlanReconciler

  beforeEach(() => {
    reconciler = new PlanReconciler()
  })

  // 辅助函数：创建测试计划
  function createTestPlan(steps: Partial<PlanStep>[]): TaskPlan {
    return {
      id: 'test-plan',
      goal: '测试目标',
      steps: steps.map((step, index) => ({
        id: step.id || `step-${index + 1}`,
        order: index,
        userLabel: step.userLabel || `步骤 ${index + 1}`,
        operation: step.operation || {
          type: 'access',
          target: { resourceType: 'prompt' },
          action: 'navigate',
        },
        status: step.status || 'pending',
        isOptional: step.isOptional || false,
        completedAt: step.completedAt,
      })) as PlanStep[],
      createdAt: new Date(),
      status: 'pending',
    }
  }

  // 辅助函数：创建测试操作
  function createTestAction(overrides: Partial<TrackedAction>): TrackedAction {
    return {
      id: overrides.id || `action-${Date.now()}`,
      type: overrides.type || 'click',
      timestamp: overrides.timestamp || new Date(),
      target: {
        element: '[data-testid="test"]',
        ...overrides.target,
      },
      context: {
        url: 'http://localhost:3000/prompts',
        sessionId: 'test-session',
        ...overrides.context,
      },
      data: overrides.data,
    }
  }

  describe('reconcile - 基本功能', () => {
    it('should reconcile plan with empty user actions', () => {
      const plan = createTestPlan([
        { userLabel: '导航到提示词列表' },
        { userLabel: '选择提示词' },
      ])

      const result = reconciler.reconcile(plan, [])

      expect(result.id).toBe('test-plan')
      expect(result.steps.length).toBe(2)
      expect(result.steps[0].status).toBe('pending')
      expect(result.steps[1].status).toBe('pending')
      expect(result.userCompletedCount).toBe(0)
      expect(result.aiCompletedCount).toBe(0)
      expect(result.pendingCount).toBe(2)
      expect(result.progressPercent).toBe(0)
    })

    it('should preserve completed step status', () => {
      const plan = createTestPlan([
        { userLabel: '导航到提示词列表', status: 'completed', completedAt: new Date() },
        { userLabel: '选择提示词' },
      ])

      const result = reconciler.reconcile(plan, [])

      expect(result.steps[0].status).toBe('completed')
      expect(result.steps[0].completedBy).toBe('ai')
      expect(result.steps[1].status).toBe('pending')
    })

    it('should calculate progress correctly', () => {
      const plan = createTestPlan([
        { userLabel: '步骤1', status: 'completed' },
        { userLabel: '步骤2', status: 'completed' },
        { userLabel: '步骤3' },
        { userLabel: '步骤4' },
      ])

      const result = reconciler.reconcile(plan, [])

      expect(result.progressPercent).toBe(50)
    })
  })

  describe('reconcile - Access 操作匹配', () => {
    it('should match navigate action to access step', () => {
      const plan = createTestPlan([
        {
          userLabel: '导航到提示词列表',
          operation: {
            type: 'access',
            target: { resourceType: 'prompt' },
            action: 'navigate',
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'navigate',
          context: { url: 'http://localhost:3000/prompts/', sessionId: 'test' },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
      expect(result.steps[0].completedBy).toBe('user')
    })

    it('should match select action with specific resource ID', () => {
      const plan = createTestPlan([
        {
          userLabel: '选择提示词',
          operation: {
            type: 'access',
            target: { resourceType: 'prompt', resourceId: 'prompt-123' },
            action: 'select',
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'click',
          target: {
            element: '[data-testid="prompt-item"]',
            resourceType: 'prompt',
            resourceId: 'prompt-123',
          },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
      expect(result.steps[0].completedBy).toBe('user')
    })

    it('should not match select action with different resource ID', () => {
      const plan = createTestPlan([
        {
          userLabel: '选择提示词',
          operation: {
            type: 'access',
            target: { resourceType: 'prompt', resourceId: 'prompt-123' },
            action: 'select',
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'click',
          target: {
            element: '[data-testid="prompt-item"]',
            resourceType: 'prompt',
            resourceId: 'prompt-456', // 不同的 ID
          },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('pending')
    })

    it('should match create action by button label', () => {
      const plan = createTestPlan([
        {
          userLabel: '点击创建按钮',
          operation: {
            type: 'access',
            target: { resourceType: 'task' },
            action: 'create',
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'click',
          target: {
            element: '[data-testid="create-btn"]',
            label: '新建任务',
          },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
    })

    it('should match edit action by button label', () => {
      const plan = createTestPlan([
        {
          userLabel: '点击编辑',
          operation: {
            type: 'access',
            target: { resourceType: 'prompt' },
            action: 'edit',
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'click',
          target: {
            element: '[data-testid="edit-btn"]',
            label: '编辑提示词',
          },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
    })
  })

  describe('reconcile - State 操作匹配', () => {
    it('should match submit action to state create step', () => {
      const plan = createTestPlan([
        {
          userLabel: '创建任务',
          operation: {
            type: 'state',
            target: { resourceType: 'task' },
            action: 'create',
            expectedState: { name: '新任务' },
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'submit',
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
    })

    it('should match delete action by button label', () => {
      const plan = createTestPlan([
        {
          userLabel: '删除任务',
          operation: {
            type: 'state',
            target: { resourceType: 'task' },
            action: 'delete',
            expectedState: {},
          },
        },
      ])

      const actions: TrackedAction[] = [
        createTestAction({
          type: 'click',
          target: {
            element: '[data-testid="delete-btn"]',
            label: '删除',
          },
        }),
      ]

      const result = reconciler.reconcile(plan, actions)

      expect(result.steps[0].status).toBe('completed')
    })
  })

  describe('getNextPendingStep', () => {
    it('should return first pending step', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'pending' },
          { id: 'step-3', description: '步骤3', action: 'submit', status: 'pending' },
        ],
        userCompletedCount: 0,
        aiCompletedCount: 1,
        pendingCount: 2,
        progressPercent: 33,
      }

      const nextStep = reconciler.getNextPendingStep(plan)

      expect(nextStep?.id).toBe('step-2')
    })

    it('should return undefined when all steps completed', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'completed' },
        ],
        userCompletedCount: 2,
        aiCompletedCount: 0,
        pendingCount: 0,
        progressPercent: 100,
      }

      const nextStep = reconciler.getNextPendingStep(plan)

      expect(nextStep).toBeUndefined()
    })
  })

  describe('generateSuggestion', () => {
    it('should suggest completion when all steps done', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 0,
        progressPercent: 100,
      }

      const suggestion = reconciler.generateSuggestion(plan)

      expect(suggestion.canContinue).toBe(false)
      expect(suggestion.message).toContain('完成')
    })

    it('should suggest next step when user completed some steps', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed', completedBy: 'user' },
          { id: 'step-2', description: '选择提示词', action: 'select', status: 'pending' },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 1,
        progressPercent: 50,
      }

      const suggestion = reconciler.generateSuggestion(plan)

      expect(suggestion.canContinue).toBe(true)
      expect(suggestion.nextStep?.id).toBe('step-2')
      expect(suggestion.message).toContain('选择提示词')
      expect(suggestion.userCompletedSteps.length).toBe(1)
    })

    it('should suggest starting from first step when no user actions', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '导航到列表', action: 'navigate', status: 'pending' },
          { id: 'step-2', description: '选择项目', action: 'select', status: 'pending' },
        ],
        userCompletedCount: 0,
        aiCompletedCount: 0,
        pendingCount: 2,
        progressPercent: 0,
      }

      const suggestion = reconciler.generateSuggestion(plan)

      expect(suggestion.canContinue).toBe(true)
      expect(suggestion.nextStep?.id).toBe('step-1')
      expect(suggestion.userCompletedSteps.length).toBe(0)
    })
  })

  describe('isPlanCompleted', () => {
    it('should return true when all steps completed', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'completed' },
        ],
        userCompletedCount: 2,
        aiCompletedCount: 0,
        pendingCount: 0,
        progressPercent: 100,
      }

      expect(reconciler.isPlanCompleted(plan)).toBe(true)
    })

    it('should return true when steps are completed or skipped', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'skipped' },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 0,
        progressPercent: 100,
      }

      expect(reconciler.isPlanCompleted(plan)).toBe(true)
    })

    it('should return false when steps are pending', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'pending' },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 1,
        progressPercent: 50,
      }

      expect(reconciler.isPlanCompleted(plan)).toBe(false)
    })
  })

  describe('isPlanSuccessful', () => {
    it('should return true when all required steps completed', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed', required: true },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'skipped', required: false },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 0,
        progressPercent: 100,
      }

      expect(reconciler.isPlanSuccessful(plan)).toBe(true)
    })

    it('should return false when required steps not completed', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed', required: true },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'pending', required: true },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 0,
        pendingCount: 1,
        progressPercent: 50,
      }

      expect(reconciler.isPlanSuccessful(plan)).toBe(false)
    })
  })

  describe('getProgressDescription', () => {
    it('should describe mixed progress', () => {
      const plan: ReconciledPlan = {
        id: 'test',
        goal: 'test',
        steps: [
          { id: 'step-1', description: '步骤1', action: 'navigate', status: 'completed', completedBy: 'user' },
          { id: 'step-2', description: '步骤2', action: 'select', status: 'completed', completedBy: 'ai' },
          { id: 'step-3', description: '步骤3', action: 'submit', status: 'pending' },
        ],
        userCompletedCount: 1,
        aiCompletedCount: 1,
        pendingCount: 1,
        progressPercent: 67,
      }

      const description = reconciler.getProgressDescription(plan)

      expect(description).toContain('用户完成 1 步')
      expect(description).toContain('AI 完成 1 步')
      expect(description).toContain('待执行 1 步')
      expect(description).toContain('2/3')
    })
  })
})
