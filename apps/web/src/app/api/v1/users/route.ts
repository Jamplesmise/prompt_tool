import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { success, error, unauthorized, forbidden } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { UserRole } from '@prisma/client'

// 获取用户列表（管理员）
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''

    // 构建查询条件
    const where: {
      OR?: { email?: { contains: string }; name?: { contains: string } }[]
      role?: UserRole
    } = {}

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ]
    }

    if (role) {
      where.role = role.toUpperCase() as UserRole
    }

    // 查询用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])

    const list = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role.toLowerCase(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      teamCount: user._count.ownedTeams + user._count.teamMembers,
    }))

    return NextResponse.json(
      success({
        list,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('List users error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取用户列表失败'),
      { status: 500 }
    )
  }
}
