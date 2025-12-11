import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, hashPassword, verifyPassword } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// PUT /api/v1/users/me/password - 修改当前用户密码
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    // 验证参数
    if (!currentPassword || !newPassword) {
      return NextResponse.json(badRequest('当前密码和新密码不能为空'), { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json(badRequest('新密码至少 6 个字符'), { status: 400 })
    }

    // 获取用户当前密码哈希
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    })

    if (!user) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 验证当前密码
    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(badRequest('当前密码错误'), { status: 400 })
    }

    // 更新密码
    const newPasswordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newPasswordHash },
    })

    return NextResponse.json(success({ message: '密码修改成功' }))
  } catch (err) {
    console.error('Change password error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '修改密码失败'),
      { status: 500 }
    )
  }
}
