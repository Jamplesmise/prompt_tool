import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound, forbidden } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/teams/[id] - 获取团队详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是团队成员
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.TEAM_NOT_FOUND, '团队不存在或无权访问'),
        { status: 404 }
      )
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
            prompts: true,
            datasets: true,
            tasks: true,
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json(notFound('团队不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        ...team,
        role: membership.role,
      })
    )
  } catch (err) {
    console.error('Get team error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取团队详情失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/teams/[id] - 更新团队
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是团队管理员
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.TEAM_NOT_FOUND, '团队不存在或无权访问'),
        { status: 404 }
      )
    }

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(forbidden('无权修改团队'), { status: 403 })
    }

    const body = await request.json()
    const { name, description, avatar } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description || null
    if (avatar !== undefined) updateData.avatar = avatar || null

    const team = await prisma.team.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(success(team))
  } catch (err) {
    console.error('Update team error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新团队失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/teams/[id] - 删除团队
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是团队所有者
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.TEAM_NOT_FOUND, '团队不存在或无权访问'),
        { status: 404 }
      )
    }

    if (membership.role !== 'OWNER') {
      return NextResponse.json(forbidden('只有团队所有者可以删除团队'), {
        status: 403,
      })
    }

    // 删除团队（级联删除成员关系）
    await prisma.team.delete({ where: { id } })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete team error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除团队失败'),
      { status: 500 }
    )
  }
}
