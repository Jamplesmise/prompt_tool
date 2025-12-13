/**
 * Mock GOI 上下文和状态
 */

import { vi } from 'vitest'
import type { CollaborationMode } from '@platform/shared'

// Mock GOI 状态
export const mockGoiState = {
  mode: 'assisted' as CollaborationMode,
  sessionId: 'test-session-123',
  isRunning: false,
  isPaused: false,
  currentStep: 0,
  todoList: null as null | {
    id: string
    goal: string
    items: Array<{
      id: string
      content: string
      status: 'pending' | 'in_progress' | 'completed' | 'skipped'
    }>
  },
  checkpoint: null as null | {
    id: string
    type: string
    reason: string
    options?: Array<{
      id: string
      label: string
      recommended?: boolean
    }>
  },
  status: 'idle' as 'idle' | 'running' | 'paused' | 'waiting' | 'completed' | 'failed',
}

// Mock GOI Actions
export const mockGoiActions = {
  switchMode: vi.fn(),
  startWithGoal: vi.fn(),
  executeStep: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  approveCheckpoint: vi.fn(),
  rejectCheckpoint: vi.fn(),
  skipCheckpoint: vi.fn(),
  takeover: vi.fn(),
  handback: vi.fn(),
  reset: vi.fn(),
}

// 创建 Mock TODO List
export function createMockTodoList(overrides?: Partial<typeof mockGoiState.todoList>) {
  return {
    id: 'todo-list-1',
    goal: '创建一个测试任务',
    items: [
      { id: 'item-1', content: '步骤 1：准备数据', status: 'completed' as const },
      { id: 'item-2', content: '步骤 2：执行操作', status: 'in_progress' as const },
      { id: 'item-3', content: '步骤 3：验证结果', status: 'pending' as const },
    ],
    ...overrides,
  }
}

// 创建 Mock Checkpoint
export function createMockCheckpoint(overrides?: Partial<typeof mockGoiState.checkpoint>) {
  return {
    id: 'checkpoint-1',
    type: 'resource_selection',
    reason: '请确认选择的资源',
    options: [
      { id: 'opt-1', label: '选项 A', recommended: true },
      { id: 'opt-2', label: '选项 B', recommended: false },
      { id: 'opt-3', label: '选项 C', recommended: false },
    ],
    ...overrides,
  }
}

// 重置所有 Mock
export function resetMocks() {
  Object.values(mockGoiActions).forEach((fn) => {
    if (typeof fn.mockReset === 'function') {
      fn.mockReset()
    }
  })
}
