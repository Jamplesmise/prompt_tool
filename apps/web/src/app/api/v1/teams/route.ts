import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// GET /api/v1/teams - 获取用户所属团队列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // 查询用户所属的团队
    const [memberships, total] = await Promise.all([
      prisma.teamMember.findMany({
        where: { userId: session.id },
        include: {
          team: {
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
                select: { members: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.teamMember.count({ where: { userId: session.id } }),
    ])

    const teams = memberships.map((m) => ({
      ...m.team,
      role: m.role,
      memberCount: m.team._count.members,
    }))

    return NextResponse.json(
      success({
        list: teams,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get teams error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取团队列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/teams - 创建团队
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, avatar } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(badRequest('团队名称不能为空'), { status: 400 })
    }

    // 使用事务创建团队和所有者成员关系
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name: name.trim(),
          description: description || null,
          avatar: avatar || null,
          ownerId: session.id,
        },
      })

      // 创建所有者成员关系
      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.id,
          role: 'OWNER',
        },
      })

      return newTeam
    })

    return NextResponse.json(success(team), { status: 201 })
  } catch (err) {
    console.error('Create team error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建团队失败'),
      { status: 500 }
    )
  }
}
