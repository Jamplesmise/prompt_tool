import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { success, error } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await clearSession()
    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '登出失败'),
      { status: 500 }
    )
  }
}
