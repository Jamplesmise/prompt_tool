// 审计日志记录器
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { AuditAction, AuditResource } from '@platform/shared'

type LogActionParams = {
  action: AuditAction
  resource: AuditResource
  resourceId?: string
  details?: Record<string, unknown>
  userId: string
  teamId?: string
  request?: Request
}

// 记录审计日志
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        details: (params.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        userId: params.userId,
        teamId: params.teamId || null,
        ipAddress: params.request?.headers.get('x-forwarded-for')?.split(',')[0] || null,
        userAgent: params.request?.headers.get('user-agent') || null,
      },
    })
  } catch (error) {
    // 日志记录失败不应该影响主业务
    console.error('Failed to log action:', error)
  }
}

// 批量记录审计日志
export async function logActions(logs: LogActionParams[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: logs.map((log) => ({
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId || null,
        details: (log.details ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        userId: log.userId,
        teamId: log.teamId || null,
        ipAddress: log.request?.headers.get('x-forwarded-for')?.split(',')[0] || null,
        userAgent: log.request?.headers.get('user-agent') || null,
      })),
    })
  } catch (error) {
    console.error('Failed to log actions:', error)
  }
}

// 便捷方法
export const audit = {
  // 登录
  login: (userId: string, request?: Request) =>
    logAction({ action: 'login', resource: 'user', userId, request }),

  // 登出
  logout: (userId: string, request?: Request) =>
    logAction({ action: 'logout', resource: 'user', userId, request }),

  // 创建资源
  create: (
    resource: AuditResource,
    resourceId: string,
    userId: string,
    teamId?: string,
    details?: Record<string, unknown>,
    request?: Request
  ) =>
    logAction({
      action: 'create',
      resource,
      resourceId,
      userId,
      teamId,
      details,
      request,
    }),

  // 更新资源
  update: (
    resource: AuditResource,
    resourceId: string,
    userId: string,
    teamId?: string,
    details?: Record<string, unknown>,
    request?: Request
  ) =>
    logAction({
      action: 'update',
      resource,
      resourceId,
      userId,
      teamId,
      details,
      request,
    }),

  // 删除资源
  delete: (
    resource: AuditResource,
    resourceId: string,
    userId: string,
    teamId?: string,
    details?: Record<string, unknown>,
    request?: Request
  ) =>
    logAction({
      action: 'delete',
      resource,
      resourceId,
      userId,
      teamId,
      details,
      request,
    }),

  // 执行操作
  execute: (
    resource: AuditResource,
    resourceId: string,
    userId: string,
    teamId?: string,
    details?: Record<string, unknown>,
    request?: Request
  ) =>
    logAction({
      action: 'execute',
      resource,
      resourceId,
      userId,
      teamId,
      details,
      request,
    }),

  // 邀请成员
  invite: (
    teamId: string,
    userId: string,
    targetUserId: string,
    role: string,
    request?: Request
  ) =>
    logAction({
      action: 'invite',
      resource: 'member',
      resourceId: targetUserId,
      userId,
      teamId,
      details: { role },
      request,
    }),

  // 移除成员
  remove: (
    teamId: string,
    userId: string,
    targetUserId: string,
    request?: Request
  ) =>
    logAction({
      action: 'remove',
      resource: 'member',
      resourceId: targetUserId,
      userId,
      teamId,
      request,
    }),

  // 转让所有权
  transfer: (
    teamId: string,
    userId: string,
    newOwnerId: string,
    request?: Request
  ) =>
    logAction({
      action: 'transfer',
      resource: 'team',
      resourceId: teamId,
      userId,
      teamId,
      details: { newOwnerId },
      request,
    }),
}
