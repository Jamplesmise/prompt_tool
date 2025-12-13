/**
 * GOI API 测试 - 环境设置
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Mock 用户数据
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin' as const,
}

// Mock getSession 函数
export function mockAuthenticated() {
  vi.doMock('@/lib/auth', () => ({
    getSession: vi.fn().mockResolvedValue(mockUser),
  }))
}

// Mock 未认证状态
export function mockUnauthenticated() {
  vi.doMock('@/lib/auth', () => ({
    getSession: vi.fn().mockResolvedValue(null),
  }))
}

// 创建 Mock Request
export function createMockRequest(
  method: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): Request {
  const url = 'http://localhost:3000/api/goi/test'

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// 创建带认证的 Mock Request
export function createAuthenticatedRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  return createMockRequest(method, body, {
    Authorization: 'Bearer sk-test-token',
  })
}

// 生成唯一会话 ID
export function generateSessionId(): string {
  return `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// 测试超时设置
export const TEST_TIMEOUT = 30000

// 全局测试设置
export function setupApiTests() {
  beforeAll(async () => {
    // 设置环境变量
    process.env.SESSION_SECRET = 'test-session-secret-key-min-32-chars-required'
  })

  afterAll(async () => {
    // 清理
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })
}

// API 响应断言辅助
export function expectSuccessResponse(response: { code: number; message: string; data: unknown }) {
  expect(response.code).toBe(200)
  expect(response.message).toBe('success')
  expect(response.data).toBeDefined()
}

export function expectErrorResponse(
  response: { code: number; message: string; data: unknown },
  expectedCode: number,
  expectedStatus?: number
) {
  expect(response.code).toBe(expectedCode)
  expect(response.data).toBeNull()
}
