import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// POST /api/v1/teams/[id]/transfer - 转让团队所有权
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: teamId } = await params

    // 检查用户是否是团队所有者
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

    if (membership.role !== 'OWNER') {
      return NextResponse.json(forbidden('只有团队所有者可以转让所有权'), {
        status: 403,
      })
    }

    const body = await request.json()
    const { newOwnerId } = body as { newOwnerId: string }

    if (!newOwnerId) {
      return NextResponse.json(badRequest('新所有者 ID 不能为空'), {
        status: 400,
      })
    }

    // 检查新所有者是否是团队成员
    const newOwnerMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: newOwnerId },
      },
    })

    if (!newOwnerMembership) {
      return NextResponse.json(
        error(ERROR_CODES.MEMBER_NOT_FOUND, '新所有者必须是团队成员'),
        { status: 404 }
      )
    }

    // 使用事务转让所有权
    await prisma.$transaction(async (tx) => {
      // 更新团队所有者
      await tx.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      })

      // 将原所有者降级为管理员
      await tx.teamMember.update({
        where: {
          teamId_userId: { teamId, userId: session.id },
        },
        data: { role: 'ADMIN' },
      })

      // 将新所有者提升为所有者
      await tx.teamMember.update({
        where: {
          teamId_userId: { teamId, userId: newOwnerId },
        },
        data: { role: 'OWNER' },
      })
    })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Transfer ownership error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '转让所有权失败'),
      { status: 500 }
    )
  }
}
