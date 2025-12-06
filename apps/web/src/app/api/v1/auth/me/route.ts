import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { success, error } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        error(ERROR_CODES.UNAUTHORIZED, '未登录'),
        { status: 401 }
      )
    }

    return NextResponse.json(
      success({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role.toLowerCase(),
      })
    )
  } catch (err) {
    console.error('Get user error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取用户信息失败'),
      { status: 500 }
    )
  }
}
