import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string; vid: string }> }

// GET /api/v1/prompts/:id/versions/:vid - 获取指定版本详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, vid } = await params

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    const version = await prisma.promptVersion.findUnique({
      where: { id: vid },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!version || version.promptId !== id) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '版本不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(success(version))
  } catch (err) {
    console.error('Get prompt version error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本详情失败'),
      { status: 500 }
    )
  }
}
