import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { success, error, unauthorized, forbidden, notFound, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// 获取用户详情（管理员）
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 检查是否为管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(forbidden('需要管理员权限'), { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedTeams: true,
            teamMembers: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(notFound('用户不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        ...user,
        role: user.role.toLowerCase(),
        teamCount: user._count.ownedTeams + user._count.teamMembers,
      })
    )
  } catch (err) {
    console.error('Get user error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取用户失败'),
      { status: 500 }
    )
  }
}

// 更新用户（管理员）
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 检查是否为管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(forbidden('需要管理员权限'), { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, role } = body

    // 验证角色
    if (role && !['ADMIN', 'USER'].includes(role.toUpperCase())) {
      return NextResponse.json(badRequest('无效的角色'), { status: 400 })
    }

    // 不能修改自己的角色
    if (id === session.id && role) {
      return NextResponse.json(badRequest('不能修改自己的角色'), { status: 400 })
    }

    const updateData: { name?: string; role?: string } = {}
    if (name) updateData.name = name.trim()
    if (role) updateData.role = role.toUpperCase()

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      success({
        ...user,
        role: user.role.toLowerCase(),
      })
    )
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新用户失败'),
      { status: 500 }
    )
  }
}

// 删除用户（管理员）
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 检查是否为管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true },
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(forbidden('需要管理员权限'), { status: 403 })
    }

    const { id } = await params

    // 不能删除自己
    if (id === session.id) {
      return NextResponse.json(badRequest('不能删除自己'), { status: 400 })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json(notFound('用户不存在'), { status: 404 })
    }

    // 删除用户（级联删除会自动处理关联数据）
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json(success(null, '用户已删除'))
  } catch (err) {
    console.error('Delete user error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除用户失败'),
      { status: 500 }
    )
  }
}
