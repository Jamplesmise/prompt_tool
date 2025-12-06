import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// 获取当前用户信息
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
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

    if (!user) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    return NextResponse.json(
      success({
        ...user,
        role: user.role.toLowerCase(),
      })
    )
  } catch (err) {
    console.error('Get current user error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取用户信息失败'),
      { status: 500 }
    )
  }
}

// 更新当前用户信息
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(badRequest('昵称不能为空'), { status: 400 })
    }

    if (name.length > 50) {
      return NextResponse.json(badRequest('昵称不能超过50个字符'), { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: { name: name.trim() },
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
      error(ERROR_CODES.INTERNAL_ERROR, '更新失败'),
      { status: 500 }
    )
  }
}
