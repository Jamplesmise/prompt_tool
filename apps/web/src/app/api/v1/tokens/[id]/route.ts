import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound, forbidden } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type Params = { params: Promise<{ id: string }> }

// DELETE /api/v1/tokens/[id] - 删除 API Token
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 查找 Token
    const apiToken = await prisma.apiToken.findUnique({
      where: { id },
    })

    if (!apiToken) {
      return NextResponse.json(
        error(ERROR_CODES.API_TOKEN_NOT_FOUND, 'Token 不存在'),
        { status: 404 }
      )
    }

    // 检查所有权
    if (apiToken.userId !== session.id) {
      return NextResponse.json(forbidden('无权删除此 Token'), { status: 403 })
    }

    // 删除 Token
    await prisma.apiToken.delete({ where: { id } })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete token error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除 Token 失败'),
      { status: 500 }
    )
  }
}
