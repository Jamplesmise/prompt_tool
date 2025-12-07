/**
 * MongoDB API 认证适配中间件
 * 复用本项目的 Session 认证
 * 注意：此文件不能在顶层导入 mongoose，否则会导致构建时连接 MongoDB
 */
import { getSession } from '@/lib/auth'
import { getTeamId } from '@/lib/team/context'
import { prisma } from '@/lib/prisma'

export type AuthContext = {
  userId: string
  teamId: string
  tmbId: string
  isOwner: boolean
}

/**
 * 获取认证上下文
 */
export async function getAuthContext(request?: Request): Promise<AuthContext | null> {
  const session = await getSession()

  if (!session?.id) {
    return null
  }

  // 动态导入并确保 MongoDB 已连接
  const { connectMongo } = await import('./connection')
  await connectMongo()

  // 获取当前团队 ID
  const teamId = await getTeamId(request)

  if (!teamId) {
    return {
      userId: session.id,
      teamId: '',
      tmbId: '',
      isOwner: false,
    }
  }

  // 查找用户在该团队的成员身份
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId: session.id,
      teamId,
    },
    select: {
      id: true,
      role: true,
    },
  })

  return {
    userId: session.id,
    teamId,
    tmbId: teamMember?.id || '',
    isOwner: teamMember?.role === 'OWNER',
  }
}

// 从 helpers.ts 导入并重新导出辅助函数
import { AuthError, jsonResponse, errorResponse } from './helpers'
export { AuthError, jsonResponse, errorResponse }

/**
 * 认证守卫 - 未登录返回 401
 */
export async function requireAuth(request?: Request): Promise<AuthContext> {
  const context = await getAuthContext(request)

  if (!context) {
    throw new AuthError('未登录或登录已过期', 401)
  }

  if (!context.teamId) {
    throw new AuthError('请先选择团队', 400)
  }

  if (!context.tmbId) {
    throw new AuthError('您不是该团队的成员', 403)
  }

  return context
}
