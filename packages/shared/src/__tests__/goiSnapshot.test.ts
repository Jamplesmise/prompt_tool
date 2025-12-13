import { describe, it, expect } from 'vitest'
import type {
  SnapshotTrigger,
  SessionState,
  TodoState,
  ResourceState,
  ContextState,
  GoiSnapshot,
  CreateSnapshotInput,
  RestoreResult,
} from '../types/goi/snapshot'

describe('GOI 快照系统类型', () => {
  describe('SnapshotTrigger', () => {
    it('应该支持所有定义的触发类型', () => {
      const triggers: SnapshotTrigger[] = [
        'todo_start',
        'checkpoint',
        'compact',
        'manual',
        'session_start',
        'error',
      ]

      triggers.forEach((trigger) => {
        expect(typeof trigger).toBe('string')
      })
    })
  })

  describe('SessionState', () => {
    it('应该包含完整的会话状态结构', () => {
      const sessionState: SessionState = {
        currentPage: '/prompts',
        pageParams: { id: '123' },
        openDialogs: [
          {
            id: 'dialog-1',
            type: 'confirm',
            props: { title: 'Confirm' },
            formData: { confirmed: true },
          },
        ],
        formStates: [
          {
            id: 'form-1',
            path: '/prompts/create',
            values: { name: 'Test' },
            touched: ['name'],
            errors: {},
            isDirty: true,
          },
        ],
        selectedItems: [
          {
            type: 'prompt',
            id: 'prompt-123',
            name: 'Test Prompt',
          },
        ],
        expandedItems: ['node-1', 'node-2'],
        scrollPositions: [
          { path: '/prompts', x: 0, y: 100 },
        ],
      }

      expect(sessionState.currentPage).toBe('/prompts')
      expect(sessionState.openDialogs).toHaveLength(1)
      expect(sessionState.formStates).toHaveLength(1)
      expect(sessionState.selectedItems).toHaveLength(1)
      expect(sessionState.expandedItems).toHaveLength(2)
      expect(sessionState.scrollPositions).toHaveLength(1)
    })
  })

  describe('TodoState', () => {
    it('应该包含 TODO 列表的完整状态', () => {
      const todoState: TodoState = {
        todoListId: 'todo-list-123',
        currentItemIndex: 2,
        completedItems: ['item-1', 'item-2'],
        failedItems: [],
        skippedItems: ['item-0'],
        items: [
          {
            id: 'item-1',
            title: 'First Task',
            description: 'Do something',
            status: 'completed',
            order: 0,
            result: { success: true },
          },
          {
            id: 'item-2',
            title: 'Second Task',
            status: 'completed',
            order: 1,
          },
          {
            id: 'item-3',
            title: 'Third Task',
            status: 'in_progress',
            order: 2,
          },
        ],
      }

      expect(todoState.todoListId).toBe('todo-list-123')
      expect(todoState.currentItemIndex).toBe(2)
      expect(todoState.completedItems).toHaveLength(2)
      expect(todoState.items).toHaveLength(3)
      expect(todoState.items[0].status).toBe('completed')
      expect(todoState.items[2].status).toBe('in_progress')
    })
  })

  describe('ResourceState', () => {
    it('应该追踪创建、修改、删除的资源', () => {
      const resourceState: ResourceState = {
        createdResources: [
          {
            type: 'prompt',
            id: 'prompt-new',
            name: 'New Prompt',
            data: { content: 'Hello' },
            createdAt: new Date(),
          },
        ],
        modifiedResources: [
          {
            type: 'dataset',
            id: 'dataset-123',
            name: 'Test Dataset',
            beforeData: { rowCount: 10 },
            changes: [
              { field: 'rowCount', oldValue: 10, newValue: 15 },
            ],
            modifiedAt: new Date(),
          },
        ],
        deletedResources: [
          {
            type: 'evaluator',
            id: 'eval-old',
            name: 'Old Evaluator',
            data: { type: 'CODE', config: {} },
            deletedAt: new Date(),
          },
        ],
      }

      expect(resourceState.createdResources).toHaveLength(1)
      expect(resourceState.modifiedResources).toHaveLength(1)
      expect(resourceState.deletedResources).toHaveLength(1)
      expect(resourceState.modifiedResources[0].changes[0].field).toBe('rowCount')
    })
  })

  describe('ContextState', () => {
    it('应该包含上下文和 token 使用信息', () => {
      const contextState: ContextState = {
        contextSummary: 'User is working on prompt optimization',
        tokenUsage: {
          used: 50000,
          limit: 100000,
          percentage: 50,
        },
        keyInformation: [
          {
            type: 'decision',
            content: 'Use GPT-4 for evaluation',
            importance: 'high',
            source: 'user',
          },
          {
            type: 'constraint',
            content: 'Must complete within 1 hour',
            importance: 'medium',
          },
        ],
        activeReferences: [
          {
            type: 'prompt',
            id: 'prompt-123',
            name: 'Main Prompt',
            role: 'target',
          },
          {
            type: 'dataset',
            id: 'dataset-456',
            role: 'dependency',
          },
        ],
      }

      expect(contextState.tokenUsage.percentage).toBe(50)
      expect(contextState.keyInformation).toHaveLength(2)
      expect(contextState.activeReferences).toHaveLength(2)
    })
  })

  describe('GoiSnapshot', () => {
    it('应该包含完整的快照结构', () => {
      const snapshot: GoiSnapshot = {
        id: 'snapshot-123',
        sessionId: 'session-456',
        todoItemId: 'todo-item-789',
        trigger: 'checkpoint',
        sessionState: {
          currentPage: '/prompts',
          openDialogs: [],
          formStates: [],
          selectedItems: [],
          expandedItems: [],
          scrollPositions: [],
        },
        todoState: {
          todoListId: 'todo-list',
          currentItemIndex: 0,
          completedItems: [],
          failedItems: [],
          skippedItems: [],
          items: [],
        },
        resourceState: {
          createdResources: [],
          modifiedResources: [],
          deletedResources: [],
        },
        contextState: {
          tokenUsage: { used: 0, limit: 100000, percentage: 0 },
          keyInformation: [],
          activeReferences: [],
        },
        createdAt: new Date(),
      }

      expect(snapshot.id).toBe('snapshot-123')
      expect(snapshot.sessionId).toBe('session-456')
      expect(snapshot.trigger).toBe('checkpoint')
      expect(snapshot.sessionState).toBeDefined()
      expect(snapshot.createdAt).toBeInstanceOf(Date)
    })

    it('可选字段可以为 undefined', () => {
      const minimalSnapshot: GoiSnapshot = {
        id: 'snapshot-min',
        sessionId: 'session-min',
        trigger: 'manual',
        sessionState: {
          currentPage: '/',
          openDialogs: [],
          formStates: [],
          selectedItems: [],
          expandedItems: [],
          scrollPositions: [],
        },
        createdAt: new Date(),
      }

      expect(minimalSnapshot.todoItemId).toBeUndefined()
      expect(minimalSnapshot.todoState).toBeUndefined()
      expect(minimalSnapshot.resourceState).toBeUndefined()
      expect(minimalSnapshot.contextState).toBeUndefined()
    })
  })

  describe('RestoreResult', () => {
    it('应该包含恢复操作的结果信息', () => {
      const successResult: RestoreResult = {
        success: true,
        snapshotId: 'snapshot-123',
        restoredAt: new Date(),
        rolledBackResources: {
          created: 3,
          modified: 5,
          deleted: 1,
        },
        errors: [],
      }

      expect(successResult.success).toBe(true)
      expect(successResult.rolledBackResources.created).toBe(3)
      expect(successResult.errors).toHaveLength(0)

      const failureResult: RestoreResult = {
        success: false,
        snapshotId: 'snapshot-456',
        restoredAt: new Date(),
        rolledBackResources: {
          created: 2,
          modified: 3,
          deleted: 0,
        },
        errors: [
          {
            resourceType: 'prompt',
            resourceId: 'prompt-fail',
            error: 'Failed to delete resource',
          },
        ],
      }

      expect(failureResult.success).toBe(false)
      expect(failureResult.errors).toHaveLength(1)
      expect(failureResult.errors[0].resourceType).toBe('prompt')
    })
  })
})
