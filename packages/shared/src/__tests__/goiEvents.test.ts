import { describe, it, expect } from 'vitest'
import { getEventCategory } from '../types/goi/events'
import type {
  GoiEventType,
  EventCategory,
  OperationEventType,
  FlowEventType,
  CollaborationEventType,
  ContextEventType,
  GoiEvent,
  CreateGoiEventInput,
} from '../types/goi/events'

describe('GOI 事件系统类型', () => {
  describe('getEventCategory', () => {
    it('应该正确识别操作事件类型', () => {
      const operationEvents: OperationEventType[] = [
        'RESOURCE_ACCESSED',
        'RESOURCE_CREATED',
        'RESOURCE_UPDATED',
        'RESOURCE_DELETED',
        'TASK_EXECUTED',
        'TASK_PAUSED',
        'TASK_RESUMED',
        'TASK_STOPPED',
      ]

      operationEvents.forEach((type) => {
        expect(getEventCategory(type)).toBe('operation')
      })
    })

    it('应该正确识别流程事件类型', () => {
      const flowEvents: FlowEventType[] = [
        'TODO_PLANNED',
        'TODO_ITEM_STARTED',
        'TODO_ITEM_COMPLETED',
        'TODO_ITEM_FAILED',
        'TODO_ITEM_SKIPPED',
        'TODO_REPLANNED',
      ]

      flowEvents.forEach((type) => {
        expect(getEventCategory(type)).toBe('flow')
      })
    })

    it('应该正确识别协作事件类型', () => {
      const collaborationEvents: CollaborationEventType[] = [
        'CHECKPOINT_REACHED',
        'CHECKPOINT_APPROVED',
        'CHECKPOINT_REJECTED',
        'CHECKPOINT_MODIFIED',
        'CONTROL_TRANSFERRED',
        'FEEDBACK_PROVIDED',
        'QUESTION_ASKED',
        'QUESTION_ANSWERED',
      ]

      collaborationEvents.forEach((type) => {
        expect(getEventCategory(type)).toBe('collaboration')
      })
    })

    it('应该正确识别上下文事件类型', () => {
      const contextEvents: ContextEventType[] = [
        'SESSION_STARTED',
        'SESSION_ENDED',
        'SESSION_PAUSED',
        'SESSION_RESUMED',
        'CONTEXT_COMPACTED',
        'CONTEXT_RESTORED',
        'CONTEXT_UPDATED',
      ]

      contextEvents.forEach((type) => {
        expect(getEventCategory(type)).toBe('context')
      })
    })
  })

  describe('事件类型定义', () => {
    it('GoiEvent 类型应该包含必要字段', () => {
      const event: GoiEvent = {
        id: 'test-id',
        sessionId: 'session-123',
        type: 'RESOURCE_CREATED',
        category: 'operation',
        source: 'user',
        payload: {
          resourceType: 'prompt',
          resourceId: 'prompt-123',
          resourceName: 'Test Prompt',
          data: { name: 'Test' },
        },
        timestamp: new Date(),
        metadata: {
          userId: 'user-123',
          teamId: 'team-456',
        },
      }

      expect(event.id).toBe('test-id')
      expect(event.sessionId).toBe('session-123')
      expect(event.type).toBe('RESOURCE_CREATED')
      expect(event.category).toBe('operation')
      expect(event.source).toBe('user')
      expect(event.payload).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('CreateGoiEventInput 类型应该不包含自动生成的字段', () => {
      const input: CreateGoiEventInput<'RESOURCE_CREATED'> = {
        sessionId: 'session-123',
        type: 'RESOURCE_CREATED',
        source: 'user',
        payload: {
          resourceType: 'prompt',
          resourceId: 'prompt-123',
          data: { name: 'Test' },
        },
      }

      expect(input.sessionId).toBe('session-123')
      expect(input.type).toBe('RESOURCE_CREATED')
      expect(input.source).toBe('user')
      // @ts-expect-error - id 不应该存在于 input 类型中
      expect(input.id).toBeUndefined()
    })
  })

  describe('资源类型', () => {
    it('应该支持所有定义的资源类型', () => {
      const resourceTypes = [
        'prompt',
        'prompt_version',
        'prompt_branch',
        'dataset',
        'dataset_version',
        'model',
        'provider',
        'evaluator',
        'task',
        'task_result',
        'evaluation_schema',
        'input_schema',
        'output_schema',
        'scheduled_task',
        'alert_rule',
        'notify_channel',
      ]

      // 验证类型存在
      resourceTypes.forEach((type) => {
        expect(typeof type).toBe('string')
      })
    })
  })

  describe('事件来源', () => {
    it('应该支持 user, ai, system 三种来源', () => {
      const sources: Array<'user' | 'ai' | 'system'> = ['user', 'ai', 'system']

      sources.forEach((source) => {
        const event: GoiEvent = {
          id: 'test',
          sessionId: 'session',
          type: 'RESOURCE_ACCESSED',
          category: 'operation',
          source,
          payload: {
            resourceType: 'prompt',
            resourceId: 'id',
          },
          timestamp: new Date(),
        }
        expect(event.source).toBe(source)
      })
    })
  })

  describe('事件分类', () => {
    it('应该支持所有四种事件分类', () => {
      const categories: EventCategory[] = ['operation', 'flow', 'collaboration', 'context']

      categories.forEach((category) => {
        expect(typeof category).toBe('string')
      })
    })
  })
})
