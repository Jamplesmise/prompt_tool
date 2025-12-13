/**
 * Mock EventSource for SSE testing
 */

import { vi } from 'vitest'

type EventHandler = (event: MessageEvent) => void
type ErrorHandler = (event: Event) => void

export interface MockEventSource {
  url: string
  readyState: number
  onmessage: EventHandler | null
  onerror: ErrorHandler | null
  onopen: (() => void) | null
  close: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  emit: (type: string, data: unknown) => void
  simulateOpen: () => void
  simulateError: () => void
  simulateClose: () => void
}

// 创建 Mock EventSource
export function createMockEventSource(): MockEventSource {
  const listeners: Record<string, Set<EventHandler>> = {}

  const mockEventSource: MockEventSource = {
    url: '',
    readyState: 0, // CONNECTING
    onmessage: null,
    onerror: null,
    onopen: null,
    close: vi.fn(() => {
      mockEventSource.readyState = 2 // CLOSED
    }),
    addEventListener: vi.fn((type: string, handler: EventHandler) => {
      if (!listeners[type]) {
        listeners[type] = new Set()
      }
      listeners[type].add(handler)
    }),
    removeEventListener: vi.fn((type: string, handler: EventHandler) => {
      if (listeners[type]) {
        listeners[type].delete(handler)
      }
    }),
    emit: (type: string, data: unknown) => {
      const event = new MessageEvent(type, {
        data: JSON.stringify(data),
      })

      // 调用 onmessage
      if (type === 'message' && mockEventSource.onmessage) {
        mockEventSource.onmessage(event)
      }

      // 调用注册的 listeners
      if (listeners[type]) {
        listeners[type].forEach((handler) => handler(event))
      }
    },
    simulateOpen: () => {
      mockEventSource.readyState = 1 // OPEN
      if (mockEventSource.onopen) {
        mockEventSource.onopen()
      }
    },
    simulateError: () => {
      if (mockEventSource.onerror) {
        mockEventSource.onerror(new Event('error'))
      }
    },
    simulateClose: () => {
      mockEventSource.readyState = 2 // CLOSED
    },
  }

  return mockEventSource
}

// Mock EventSource 构造函数
export function mockEventSourceConstructor() {
  const instances: MockEventSource[] = []

  const MockEventSourceClass = vi.fn((url: string) => {
    const instance = createMockEventSource()
    instance.url = url
    instances.push(instance)
    // 模拟异步打开连接
    setTimeout(() => {
      instance.simulateOpen()
    }, 0)
    return instance
  })

  return {
    MockEventSourceClass,
    instances,
    getLatestInstance: () => instances[instances.length - 1],
  }
}

// GOI 事件类型
export const GOI_EVENT_TYPES = {
  TODO_UPDATED: 'todo_updated',
  CHECKPOINT_CREATED: 'checkpoint_created',
  CHECKPOINT_RESOLVED: 'checkpoint_resolved',
  STATUS_CHANGED: 'status_changed',
  STEP_COMPLETED: 'step_completed',
  SESSION_COMPLETED: 'session_completed',
  SESSION_FAILED: 'session_failed',
  CONTROL_TRANSFERRED: 'control_transferred',
} as const

// 创建 Mock 事件数据
export function createMockEvent(type: keyof typeof GOI_EVENT_TYPES, data?: Record<string, unknown>) {
  return {
    type: GOI_EVENT_TYPES[type],
    sessionId: 'test-session-123',
    timestamp: new Date().toISOString(),
    payload: data || {},
  }
}
