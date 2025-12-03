import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound, forbidden } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/projects/[id] - 获取项目详情
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是项目成员
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      )
    }

    const project = await prisma.project.findUnique({
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

    if (!project) {
      return NextResponse.json(notFound('项目不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        ...project,
        role: membership.role,
      })
    )
  } catch (err) {
    console.error('Get project error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取项目详情失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/projects/[id] - 更新项目
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是项目管理员
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      )
    }

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(forbidden('无权修改项目'), { status: 403 })
    }

    const body = await request.json()
    const { name, description, avatar } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description || null
    if (avatar !== undefined) updateData.avatar = avatar || null

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(success(project))
  } catch (err) {
    console.error('Update project error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新项目失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/projects/[id] - 删除项目
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查用户是否是项目所有者
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: id, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      )
    }

    if (membership.role !== 'OWNER') {
      return NextResponse.json(forbidden('只有项目所有者可以删除项目'), {
        status: 403,
      })
    }

    // 删除项目（级联删除成员关系）
    await prisma.project.delete({ where: { id } })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete project error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除项目失败'),
      { status: 500 }
    )
  }
}
