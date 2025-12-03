import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound, forbidden, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { ProjectRole } from '@platform/shared'

type Params = { params: Promise<{ id: string; userId: string }> }

// PUT /api/v1/projects/[id]/members/[userId] - 修改成员角色
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params

    // 检查用户是否有管理成员的权限
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

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(forbidden('无权修改成员角色'), { status: 403 })
    }

    // 查找目标成员
    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        error(ERROR_CODES.MEMBER_NOT_FOUND, '成员不存在'),
        { status: 404 }
      )
    }

    // 不能修改所有者的角色
    if (targetMember.role === 'OWNER') {
      return NextResponse.json(
        error(ERROR_CODES.CANNOT_CHANGE_OWNER_ROLE, '不能修改所有者角色'),
        { status: 409 }
      )
    }

    const body = await request.json()
    const { role } = body as { role: ProjectRole }

    // 验证角色
    const validRoles: ProjectRole[] = ['ADMIN', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(badRequest('无效的角色'), { status: 400 })
    }

    // 更新角色
    const updatedMember = await prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
      data: { role },
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

    return NextResponse.json(success(updatedMember))
  } catch (err) {
    console.error('Update member role error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '修改成员角色失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/projects/[id]/members/[userId] - 移除成员
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: projectId, userId: targetUserId } = await params

    // 检查用户是否有管理成员的权限
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

    // 查找目标成员
    const targetMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        error(ERROR_CODES.MEMBER_NOT_FOUND, '成员不存在'),
        { status: 404 }
      )
    }

    // 不能移除所有者
    if (targetMember.role === 'OWNER') {
      return NextResponse.json(
        error(ERROR_CODES.CANNOT_REMOVE_OWNER, '不能移除项目所有者'),
        { status: 409 }
      )
    }

    // 用户可以移除自己（退出项目）
    const isSelf = targetUserId === session.id
    // 管理员可以移除其他成员
    const isAdmin = ['OWNER', 'ADMIN'].includes(membership.role)

    if (!isSelf && !isAdmin) {
      return NextResponse.json(forbidden('无权移除成员'), { status: 403 })
    }

    // 移除成员
    await prisma.projectMember.delete({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Remove member error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '移除成员失败'),
      { status: 500 }
    )
  }
}
