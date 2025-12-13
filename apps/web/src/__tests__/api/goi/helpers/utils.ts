/**
 * GOI API 测试 - 工具函数
 */

import { vi } from 'vitest'

// 基础 API 调用封装
const BASE_URL = 'http://localhost:3000'

export type ApiResponse<T = unknown> = {
  code: number
  message: string
  data: T
}

// 通用 fetch 封装（用于集成测试时的真实调用）
async function callApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ response: Response; data: ApiResponse<T> }> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await response.json()
  return { response, data }
}

// Agent API 工具函数
export async function startAgent(
  sessionId: string,
  goal: string,
  modelId: string = 'gpt-4',
  options: {
    autoRun?: boolean
    maxRetries?: number
    stepDelay?: number
    context?: Record<string, unknown>
  } = {}
) {
  return callApi('/api/goi/agent/start', {
    method: 'POST',
    body: JSON.stringify({
      sessionId,
      goal,
      modelId,
      ...options,
    }),
  })
}

export async function stepAgent(sessionId: string) {
  return callApi('/api/goi/agent/step', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function pauseAgent(sessionId: string, reason?: string) {
  return callApi('/api/goi/agent/pause', {
    method: 'POST',
    body: JSON.stringify({ sessionId, reason }),
  })
}

export async function resumeAgent(sessionId: string) {
  return callApi('/api/goi/agent/resume', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  })
}

export async function getAgentStatus(sessionId: string) {
  return callApi(`/api/goi/agent/status?sessionId=${sessionId}`, {
    method: 'GET',
  })
}

// 执行直到遇到检查点
export async function executeUntilCheckpoint(
  sessionId: string,
  maxIterations: number = 10
): Promise<{ checkpoint: unknown | null; iterations: number }> {
  let checkpoint = null
  let iterations = 0

  while (!checkpoint && iterations < maxIterations) {
    const { data } = await stepAgent(sessionId)

    if (data.data?.status?.status === 'checkpoint') {
      checkpoint = data.data.checkpoint
    } else if (
      data.data?.status?.status === 'completed' ||
      data.data?.status?.status === 'failed'
    ) {
      break
    }

    iterations++
  }

  return { checkpoint, iterations }
}

// Checkpoint API 工具函数
export async function getPendingCheckpoints(sessionId: string) {
  return callApi(`/api/goi/checkpoint/pending?sessionId=${sessionId}`, {
    method: 'GET',
  })
}

export async function respondToCheckpoint(
  checkpointId: string,
  action: 'approve' | 'modify' | 'skip',
  data?: Record<string, unknown>
) {
  return callApi(`/api/goi/checkpoint/${checkpointId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action, data }),
  })
}

export async function getCheckpointRules(sessionId: string) {
  return callApi(`/api/goi/checkpoint/rules?sessionId=${sessionId}`, {
    method: 'GET',
  })
}

export async function updateCheckpointRules(
  sessionId: string,
  rules: Record<string, unknown>
) {
  return callApi('/api/goi/checkpoint/rules', {
    method: 'PUT',
    body: JSON.stringify({ sessionId, rules }),
  })
}

// Collaboration API 工具函数
export async function setCollaborationMode(
  sessionId: string,
  mode: 'manual' | 'assisted' | 'auto'
) {
  return callApi('/api/goi/collaboration/mode', {
    method: 'POST',
    body: JSON.stringify({ sessionId, mode }),
  })
}

export async function getCollaborationStatus(sessionId: string) {
  return callApi(`/api/goi/collaboration/status?sessionId=${sessionId}`, {
    method: 'GET',
  })
}

export async function sendCommand(sessionId: string, command: string) {
  return callApi('/api/goi/collaboration/command', {
    method: 'POST',
    body: JSON.stringify({ sessionId, command }),
  })
}

export async function transferControl(
  sessionId: string,
  to: 'user' | 'ai'
) {
  return callApi('/api/goi/collaboration/transfer', {
    method: 'POST',
    body: JSON.stringify({ sessionId, to }),
  })
}

// Snapshot API 工具函数
export async function createSnapshot(sessionId: string, label?: string) {
  return callApi('/api/goi/snapshots', {
    method: 'POST',
    body: JSON.stringify({ sessionId, label }),
  })
}

export async function getSnapshot(snapshotId: string) {
  return callApi(`/api/goi/snapshots/${snapshotId}`, {
    method: 'GET',
  })
}

export async function restoreSnapshot(snapshotId: string) {
  return callApi(`/api/goi/snapshots/${snapshotId}/restore`, {
    method: 'POST',
  })
}

export async function cleanupSnapshots(sessionId: string, maxAge?: number) {
  return callApi('/api/goi/snapshots/cleanup', {
    method: 'POST',
    body: JSON.stringify({ sessionId, maxAge }),
  })
}

// TODO API 工具函数
export async function createTodoList(
  sessionId: string,
  goal: string,
  items?: Array<{ content: string; status?: string }>
) {
  return callApi('/api/goi/todo', {
    method: 'POST',
    body: JSON.stringify({ sessionId, goal, items }),
  })
}

export async function getTodoList(listId: string) {
  return callApi(`/api/goi/todo/${listId}`, {
    method: 'GET',
  })
}

export async function updateTodoItem(
  listId: string,
  itemId: string,
  updates: { status?: string; content?: string }
) {
  return callApi(`/api/goi/todo/${listId}/items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// Events API 工具函数
export async function subscribeToEvents(sessionId: string) {
  return callApi(`/api/goi/events/subscribe?sessionId=${sessionId}`, {
    method: 'GET',
  })
}

export async function publishEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  return callApi('/api/goi/events', {
    method: 'POST',
    body: JSON.stringify({ sessionId, eventType, payload }),
  })
}

// Failure API 工具函数
export async function reportFailure(
  sessionId: string,
  error: { type: string; message: string; stack?: string }
) {
  return callApi('/api/goi/failure/report', {
    method: 'POST',
    body: JSON.stringify({ sessionId, error }),
  })
}

export async function recoverFromFailure(
  sessionId: string,
  failureId: string,
  strategy: 'retry' | 'rollback' | 'skip' | 'abort'
) {
  return callApi('/api/goi/failure/recover', {
    method: 'POST',
    body: JSON.stringify({ sessionId, failureId, strategy }),
  })
}

// 测试计时器
export function measureResponseTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = Date.now()
  return fn().then((result) => ({
    result,
    duration: Date.now() - start,
  }))
}

// Mock Session Manager
export function createMockSessionManager() {
  const sessions = new Map<string, {
    status: string
    todoList: unknown[]
    currentStep: number
    mode: string
    controller: string
  }>()

  return {
    has: vi.fn((sessionId: string) => sessions.has(sessionId)),
    getStatus: vi.fn((sessionId: string) => sessions.get(sessionId)),
    getOrCreate: vi.fn((sessionId: string, config: unknown) => {
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          status: 'idle',
          todoList: [],
          currentStep: 0,
          mode: 'assisted',
          controller: 'ai',
        })
      }
      return {
        start: vi.fn().mockResolvedValue({
          success: true,
          todoList: [{ id: '1', content: 'Test step', status: 'pending' }],
        }),
        step: vi.fn().mockResolvedValue({ success: true }),
        pause: vi.fn().mockResolvedValue({ success: true }),
        resume: vi.fn().mockResolvedValue({ success: true }),
        getStatus: vi.fn(() => sessions.get(sessionId)),
      }
    }),
    delete: vi.fn((sessionId: string) => sessions.delete(sessionId)),
    clear: vi.fn(() => sessions.clear()),
  }
}
