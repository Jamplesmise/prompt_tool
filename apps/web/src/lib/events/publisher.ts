/**
 * GOI 事件发布辅助函数
 *
 * 提供简化的事件发布接口，用于在 Service/API 层发布资源事件
 */

import { eventBus } from './eventBus'
import type {
  ResourceType,
  EventSource,
  ResourceCreatedPayload,
  ResourceUpdatedPayload,
  ResourceDeletedPayload,
  ResourceAccessedPayload,
  TaskExecutedPayload,
} from '@platform/shared'

// ============================================
// 功能开关
// ============================================

/**
 * GOI 功能开关
 * 通过环境变量控制是否启用 GOI 事件系统
 */
export function isGoiEnabled(): boolean {
  return process.env.GOI_ENABLED === 'true'
}

/**
 * 获取当前会话 ID
 * 在实际使用中，会话 ID 应该从请求上下文中获取
 */
export function getCurrentSessionId(): string | null {
  // 这个函数需要在实际使用时从请求上下文中获取
  // 目前返回 null，表示没有活跃的 GOI 会话
  return null
}

// ============================================
// 资源事件发布
// ============================================

/**
 * 发布资源访问事件
 */
export async function publishResourceAccessed(
  sessionId: string,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string,
  source: EventSource = 'user'
): Promise<void> {
  if (!isGoiEnabled()) return

  try {
    await eventBus.publish({
      sessionId,
      type: 'RESOURCE_ACCESSED',
      source,
      payload: {
        resourceType,
        resourceId,
        resourceName,
      } as ResourceAccessedPayload,
    })
  } catch (error) {
    console.error('[GOI] Failed to publish RESOURCE_ACCESSED event:', error)
  }
}

/**
 * 发布资源创建事件
 */
export async function publishResourceCreated(
  sessionId: string,
  resourceType: ResourceType,
  resourceId: string,
  data: Record<string, unknown>,
  resourceName?: string,
  source: EventSource = 'user'
): Promise<void> {
  if (!isGoiEnabled()) return

  try {
    await eventBus.publish({
      sessionId,
      type: 'RESOURCE_CREATED',
      source,
      payload: {
        resourceType,
        resourceId,
        resourceName,
        data,
      } as ResourceCreatedPayload,
    })
  } catch (error) {
    console.error('[GOI] Failed to publish RESOURCE_CREATED event:', error)
  }
}

/**
 * 发布资源更新事件
 */
export async function publishResourceUpdated(
  sessionId: string,
  resourceType: ResourceType,
  resourceId: string,
  changes: { field: string; oldValue: unknown; newValue: unknown }[],
  resourceName?: string,
  source: EventSource = 'user'
): Promise<void> {
  if (!isGoiEnabled()) return

  try {
    await eventBus.publish({
      sessionId,
      type: 'RESOURCE_UPDATED',
      source,
      payload: {
        resourceType,
        resourceId,
        resourceName,
        changes,
      } as ResourceUpdatedPayload,
    })
  } catch (error) {
    console.error('[GOI] Failed to publish RESOURCE_UPDATED event:', error)
  }
}

/**
 * 发布资源删除事件
 */
export async function publishResourceDeleted(
  sessionId: string,
  resourceType: ResourceType,
  resourceId: string,
  resourceName?: string,
  data?: Record<string, unknown>,
  source: EventSource = 'user'
): Promise<void> {
  if (!isGoiEnabled()) return

  try {
    await eventBus.publish({
      sessionId,
      type: 'RESOURCE_DELETED',
      source,
      payload: {
        resourceType,
        resourceId,
        resourceName,
        data,
      } as ResourceDeletedPayload,
    })
  } catch (error) {
    console.error('[GOI] Failed to publish RESOURCE_DELETED event:', error)
  }
}

// ============================================
// 任务事件发布
// ============================================

/**
 * 发布任务执行事件
 */
export async function publishTaskExecuted(
  sessionId: string,
  taskId: string,
  taskName: string,
  action: 'started' | 'completed' | 'failed',
  progress?: { total: number; completed: number; failed: number },
  error?: string,
  source: EventSource = 'system'
): Promise<void> {
  if (!isGoiEnabled()) return

  try {
    await eventBus.publish({
      sessionId,
      type: 'TASK_EXECUTED',
      source,
      payload: {
        taskId,
        taskName,
        action,
        progress,
        error,
      } as TaskExecutedPayload,
    })
  } catch (error) {
    console.error('[GOI] Failed to publish TASK_EXECUTED event:', error)
  }
}

// ============================================
// 通用事件发布
// ============================================

/**
 * 发布通用资源事件
 * 自动根据操作类型选择正确的事件类型
 */
export async function publishResourceEvent(options: {
  sessionId: string
  operation: 'access' | 'create' | 'update' | 'delete'
  resourceType: ResourceType
  resourceId: string
  resourceName?: string
  data?: Record<string, unknown>
  changes?: { field: string; oldValue: unknown; newValue: unknown }[]
  source?: EventSource
}): Promise<void> {
  const { sessionId, operation, resourceType, resourceId, resourceName, data, changes, source = 'user' } = options

  switch (operation) {
    case 'access':
      await publishResourceAccessed(sessionId, resourceType, resourceId, resourceName, source)
      break
    case 'create':
      await publishResourceCreated(sessionId, resourceType, resourceId, data || {}, resourceName, source)
      break
    case 'update':
      await publishResourceUpdated(sessionId, resourceType, resourceId, changes || [], resourceName, source)
      break
    case 'delete':
      await publishResourceDeleted(sessionId, resourceType, resourceId, resourceName, data, source)
      break
  }
}

// ============================================
// 请求上下文辅助
// ============================================

/**
 * 从请求头中提取 GOI 会话 ID
 */
export function getGoiSessionFromRequest(request: Request): string | null {
  return request.headers.get('x-goi-session-id')
}

/**
 * 检查请求是否在 GOI 会话中
 */
export function isInGoiSession(request: Request): boolean {
  return isGoiEnabled() && !!getGoiSessionFromRequest(request)
}
