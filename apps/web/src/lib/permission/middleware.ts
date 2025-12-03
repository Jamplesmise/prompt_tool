// 权限检查中间件
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, unauthorized, forbidden } from '@/lib/api'
import { hasPermission } from './permissions'
import { getProjectIdFromHeader } from '@/lib/project/context'
import { ERROR_CODES } from '@platform/shared'
import type { PermissionAction, PermissionResource, ProjectRole } from '@platform/shared'

export type PermissionContext = {
  userId: string
  projectId: string
  role: ProjectRole
}

// 获取权限上下文
export async function getPermissionContext(
  request: Request
): Promise<PermissionContext | null> {
  const session = await getSession()
  if (!session) return null

  const projectId = getProjectIdFromHeader(request)
  if (!projectId) return null

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: session.id },
    },
  })

  if (!membership) return null

  return {
    userId: session.id,
    projectId,
    role: membership.role as ProjectRole,
  }
}

// 权限检查包装函数
export function withPermission<T>(
  action: PermissionAction,
  resource: PermissionResource,
  handler: (
    request: Request,
    context: PermissionContext,
    ...args: unknown[]
  ) => Promise<T>
) {
  return async (request: Request, ...args: unknown[]): Promise<T | NextResponse> => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const projectId = getProjectIdFromHeader(request)
    if (!projectId) {
      return NextResponse.json(
        error(ERROR_CODES.BAD_REQUEST, '缺少项目 ID'),
        { status: 400 }
      )
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      )
    }

    const role = membership.role as ProjectRole
    if (!hasPermission(role, action, resource)) {
      return NextResponse.json(
        forbidden(`无权执行此操作（需要 ${resource}:${action} 权限）`),
        { status: 403 }
      )
    }

    const permContext: PermissionContext = {
      userId: session.id,
      projectId,
      role,
    }

    return handler(request, permContext, ...args)
  }
}

// 快速权限检查（不包装整个处理函数）
export async function checkPermission(
  request: Request,
  action: PermissionAction,
  resource: PermissionResource
): Promise<{ success: true; context: PermissionContext } | { success: false; response: NextResponse }> {
  const session = await getSession()
  if (!session) {
    return {
      success: false,
      response: NextResponse.json(unauthorized(), { status: 401 }),
    }
  }

  const projectId = getProjectIdFromHeader(request)
  if (!projectId) {
    return {
      success: false,
      response: NextResponse.json(
        error(ERROR_CODES.BAD_REQUEST, '缺少项目 ID'),
        { status: 400 }
      ),
    }
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: session.id },
    },
  })

  if (!membership) {
    return {
      success: false,
      response: NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      ),
    }
  }

  const role = membership.role as ProjectRole
  if (!hasPermission(role, action, resource)) {
    return {
      success: false,
      response: NextResponse.json(
        forbidden(`无权执行此操作（需要 ${resource}:${action} 权限）`),
        { status: 403 }
      ),
    }
  }

  return {
    success: true,
    context: {
      userId: session.id,
      projectId,
      role,
    },
  }
}
