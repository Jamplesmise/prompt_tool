// 权限检查中间件
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, unauthorized, forbidden } from '@/lib/api'
import { hasPermission } from './permissions'
import { getTeamIdFromHeader } from '@/lib/team/context'
import { ERROR_CODES } from '@platform/shared'
import type { PermissionAction, PermissionResource, TeamRole } from '@platform/shared'

export type PermissionContext = {
  userId: string
  teamId: string
  role: TeamRole
}

// 获取权限上下文
export async function getPermissionContext(
  request: Request
): Promise<PermissionContext | null> {
  const session = await getSession()
  if (!session) return null

  const teamId = getTeamIdFromHeader(request)
  if (!teamId) return null

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId: session.id },
    },
  })

  if (!membership) return null

  return {
    userId: session.id,
    teamId,
    role: membership.role as TeamRole,
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

    const teamId = getTeamIdFromHeader(request)
    if (!teamId) {
      return NextResponse.json(
        error(ERROR_CODES.BAD_REQUEST, '缺少团队 ID'),
        { status: 400 }
      )
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.TEAM_NOT_FOUND, '团队不存在或无权访问'),
        { status: 404 }
      )
    }

    const role = membership.role as TeamRole
    if (!hasPermission(role, action, resource)) {
      return NextResponse.json(
        forbidden(`无权执行此操作（需要 ${resource}:${action} 权限）`),
        { status: 403 }
      )
    }

    const permContext: PermissionContext = {
      userId: session.id,
      teamId,
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

  const teamId = getTeamIdFromHeader(request)
  if (!teamId) {
    return {
      success: false,
      response: NextResponse.json(
        error(ERROR_CODES.BAD_REQUEST, '缺少团队 ID'),
        { status: 400 }
      ),
    }
  }

  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId: session.id },
    },
  })

  if (!membership) {
    return {
      success: false,
      response: NextResponse.json(
        error(ERROR_CODES.TEAM_NOT_FOUND, '团队不存在或无权访问'),
        { status: 404 }
      ),
    }
  }

  const role = membership.role as TeamRole
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
      teamId,
      role,
    },
  }
}
