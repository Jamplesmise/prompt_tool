import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
import { success, error } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

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
