import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// GET /api/v1/projects - 获取用户所属项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // 查询用户所属的项目
    const [memberships, total] = await Promise.all([
      prisma.projectMember.findMany({
        where: { userId: session.id },
        include: {
          project: {
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
      prisma.projectMember.count({ where: { userId: session.id } }),
    ])

    const projects = memberships.map((m) => ({
      ...m.project,
      role: m.role,
      memberCount: m.project._count.members,
    }))

    return NextResponse.json(
      success({
        list: projects,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get projects error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取项目列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/projects - 创建项目
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, avatar } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(badRequest('项目名称不能为空'), { status: 400 })
    }

    // 使用事务创建项目和所有者成员关系
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: name.trim(),
          description: description || null,
          avatar: avatar || null,
          ownerId: session.id,
        },
      })

      // 创建所有者成员关系
      await tx.projectMember.create({
        data: {
          projectId: newProject.id,
          userId: session.id,
          role: 'OWNER',
        },
      })

      return newProject
    })

    return NextResponse.json(success(project), { status: 201 })
  } catch (err) {
    console.error('Create project error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建项目失败'),
      { status: 500 }
    )
  }
}
