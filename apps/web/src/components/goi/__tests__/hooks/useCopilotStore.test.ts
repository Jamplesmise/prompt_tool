/**
 * useCopilotStore 测试
 *
 * 测试用例：
 * TC-SC-001: 初始状态
 * TC-SC-002: 模式切换
 * TC-SC-003: 会话管理
 * TC-SC-004: TODO 更新
 * TC-SC-005: 状态重置
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// 直接导入 store
import { useCopilotStore } from '../../hooks/useCopilot'

describe('useCopilotStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    act(() => {
      useCopilotStore.getState().reset()
    })
  })

  describe('TC-SC-001: 初始状态', () => {
    it('应该有正确的初始模式', () => {
      const state = useCopilotStore.getState()
      expect(state.mode).toBe('assisted')
    })

    it('应该有正确的初始 sessionId', () => {
      const state = useCopilotStore.getState()
      expect(state.sessionId).toBeNull()
    })

    it('应该有正确的初始 todoList', () => {
      const state = useCopilotStore.getState()
      expect(state.todoList).toBeNull()
    })

    it('应该有正确的初始 controller', () => {
      const state = useCopilotStore.getState()
      expect(state.controller).toBe('user')
    })

    it('应该有正确的初始 isLoading', () => {
      const state = useCopilotStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('TC-SC-002: 模式切换', () => {
    it('setMode 应该更新模式为 manual', () => {
      act(() => {
        useCopilotStore.getState().setMode('manual')
      })

      expect(useCopilotStore.getState().mode).toBe('manual')
    })

    it('setMode 应该更新模式为 auto', () => {
      act(() => {
        useCopilotStore.getState().setMode('auto')
      })

      expect(useCopilotStore.getState().mode).toBe('auto')
    })

    it('setMode 应该更新模式为 assisted', () => {
      act(() => {
        useCopilotStore.getState().setMode('manual')
        useCopilotStore.getState().setMode('assisted')
      })

      expect(useCopilotStore.getState().mode).toBe('assisted')
    })
  })

  describe('TC-SC-003: 会话管理', () => {
    it('setSessionId 应该更新 sessionId', () => {
      act(() => {
        useCopilotStore.getState().setSessionId('test-session-123')
      })

      expect(useCopilotStore.getState().sessionId).toBe('test-session-123')
    })

    it('setSessionId 为 null 应该清除 sessionId', () => {
      act(() => {
        useCopilotStore.getState().setSessionId('test-session-123')
        useCopilotStore.getState().setSessionId(null)
      })

      expect(useCopilotStore.getState().sessionId).toBeNull()
    })
  })

  describe('TC-SC-004: TODO 更新', () => {
    it('setTodoList 应该更新 todoList', () => {
      const todoList = {
        id: 'list-1',
        goal: '测试任务',
        status: 'running' as const,
        items: [
          { id: '1', title: '步骤 1', status: 'completed' as const },
          { id: '2', title: '步骤 2', status: 'in_progress' as const },
        ],
        currentItemIndex: 1,
        completedItems: 1,
      }

      act(() => {
        useCopilotStore.getState().setTodoList(todoList as never)
      })

      const state = useCopilotStore.getState()
      expect(state.todoList).toEqual(todoList)
    })

    it('setTodoList 应该更新 currentTodoItem', () => {
      const todoList = {
        id: 'list-1',
        goal: '测试任务',
        status: 'running' as const,
        items: [
          { id: '1', title: '步骤 1', status: 'completed' as const },
          { id: '2', title: '步骤 2', status: 'in_progress' as const },
        ],
        currentItemIndex: 1,
        completedItems: 1,
      }

      act(() => {
        useCopilotStore.getState().setTodoList(todoList as never)
      })

      const state = useCopilotStore.getState()
      expect(state.currentTodoItem).toEqual(todoList.items[1])
    })

    it('setTodoList 为 null 应该清除 todoList', () => {
      act(() => {
        useCopilotStore.getState().setTodoList({
          id: 'list-1',
          items: [],
        } as never)
        useCopilotStore.getState().setTodoList(null)
      })

      expect(useCopilotStore.getState().todoList).toBeNull()
    })
  })

  describe('TC-SC-005: 状态重置', () => {
    it('reset 应该恢复初始状态', () => {
      // 先修改一些状态
      act(() => {
        useCopilotStore.getState().setMode('auto')
        useCopilotStore.getState().setSessionId('test-session')
        useCopilotStore.getState().setIsLoading(true)
        useCopilotStore.getState().setError('测试错误')
      })

      // 重置
      act(() => {
        useCopilotStore.getState().reset()
      })

      const state = useCopilotStore.getState()
      expect(state.mode).toBe('assisted')
      expect(state.sessionId).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('其他状态操作', () => {
    it('setController 应该更新 controller', () => {
      act(() => {
        useCopilotStore.getState().setController('ai')
      })

      expect(useCopilotStore.getState().controller).toBe('ai')
    })

    it('setIsLoading 应该更新 isLoading', () => {
      act(() => {
        useCopilotStore.getState().setIsLoading(true)
      })

      expect(useCopilotStore.getState().isLoading).toBe(true)
    })

    it('setError 应该更新 error', () => {
      act(() => {
        useCopilotStore.getState().setError('测试错误')
      })

      expect(useCopilotStore.getState().error).toBe('测试错误')
    })

    it('setContextUsage 应该更新 contextUsage', () => {
      act(() => {
        useCopilotStore.getState().setContextUsage(5000)
      })

      expect(useCopilotStore.getState().contextUsage).toBe(5000)
    })

    it('setPendingCheckpoint 应该更新 pendingCheckpoint', () => {
      const checkpoint = {
        id: 'cp-1',
        type: 'resource_selection',
        reason: '请确认选择',
      }

      act(() => {
        useCopilotStore.getState().setPendingCheckpoint(checkpoint as never)
      })

      expect(useCopilotStore.getState().pendingCheckpoint).toEqual(checkpoint)
    })

    it('togglePanel 应该切换面板状态', () => {
      const initialState = useCopilotStore.getState().panelState.isOpen

      act(() => {
        useCopilotStore.getState().togglePanel()
      })

      expect(useCopilotStore.getState().panelState.isOpen).toBe(!initialState)
    })

    it('setPanelOpen 应该设置面板状态', () => {
      act(() => {
        useCopilotStore.getState().setPanelOpen(true)
      })

      expect(useCopilotStore.getState().panelState.isOpen).toBe(true)

      act(() => {
        useCopilotStore.getState().setPanelOpen(false)
      })

      expect(useCopilotStore.getState().panelState.isOpen).toBe(false)
    })
  })

  describe('模型配置', () => {
    it('setComplexModelId 应该更新 complexModelId', () => {
      act(() => {
        useCopilotStore.getState().setComplexModelId('gpt-4')
      })

      expect(useCopilotStore.getState().complexModelId).toBe('gpt-4')
    })

    it('setSimpleModelId 应该更新 simpleModelId', () => {
      act(() => {
        useCopilotStore.getState().setSimpleModelId('gpt-3.5')
      })

      expect(useCopilotStore.getState().simpleModelId).toBe('gpt-3.5')
    })
  })
})
