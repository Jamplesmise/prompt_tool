import { NextRequest, NextResponse } from 'next/server'
import { validateCredentials, createSession } from '@/lib/auth'
import { success, error } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 参数验证
    if (!email || !password) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '邮箱和密码不能为空'),
        { status: 400 }
      )
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '请输入有效的邮箱地址'),
        { status: 400 }
      )
    }

    // 密码长度验证
    if (password.length < 6) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '密码至少需要6位'),
        { status: 400 }
      )
    }

    // 验证凭据
    const user = await validateCredentials(email, password)
    if (!user) {
      return NextResponse.json(
        error(ERROR_CODES.UNAUTHORIZED, '邮箱或密码错误'),
        { status: 401 }
      )
    }

    // 创建会话
    await createSession(user.id)

    return NextResponse.json(
      success({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.toLowerCase(),
        },
      })
    )
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '登录失败，请稍后重试'),
      { status: 500 }
    )
  }
}
