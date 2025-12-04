import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { TeamRole } from '@platform/shared'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/teams/[id]/members - 获取团队成员列表
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: teamId } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // 检查用户是否是团队成员
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

    const [members, total] = await Promise.all([
      prisma.teamMember.findMany({
        where: { teamId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // OWNER 排在前面
          { createdAt: 'asc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamMember.count({ where: { teamId } }),
    ])

    return NextResponse.json(
      success({
        list: members,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get team members error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取成员列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/teams/[id]/members - 邀请成员
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: teamId } = await params

    // 检查用户是否有管理成员的权限
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

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(forbidden('无权邀请成员'), { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body as { email: string; role: TeamRole }

    if (!email) {
      return NextResponse.json(badRequest('邮箱不能为空'), { status: 400 })
    }

    // 验证角色
    const validRoles: TeamRole[] = ['ADMIN', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(badRequest('无效的角色'), { status: 400 })
    }

    // 查找用户
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        error(ERROR_CODES.USER_NOT_FOUND, '用户不存在'),
        { status: 404 }
      )
    }

    // 检查是否已是成员
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: user.id },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        error(ERROR_CODES.MEMBER_EXISTS, '用户已是团队成员'),
        { status: 409 }
      )
    }

    // 添加成员
    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role,
        invitedById: session.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json(success(newMember), { status: 201 })
  } catch (err) {
    console.error('Invite member error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '邀请成员失败'),
      { status: 500 }
    )
  }
}
