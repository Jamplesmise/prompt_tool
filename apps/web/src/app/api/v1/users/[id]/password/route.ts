import { NextRequest, NextResponse } from 'next/server'
import { getSession, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { success, error, unauthorized, forbidden, notFound, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// 重置用户密码（管理员）
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
    const { password } = body

    if (!password || password.length < 6) {
      return NextResponse.json(badRequest('密码长度至少6位'), { status: 400 })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json(notFound('用户不存在'), { status: 404 })
    }

    // 更新密码
    const passwordHash = await hashPassword(password)
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    })

    return NextResponse.json(success(null, '密码已重置'))
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '重置密码失败'),
      { status: 500 }
    )
  }
}
