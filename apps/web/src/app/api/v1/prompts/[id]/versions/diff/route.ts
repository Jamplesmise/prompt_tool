import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/prompts/:id/versions/diff?v1=xxx&v2=xxx - 版本对比
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const v1Id = searchParams.get('v1')
    const v2Id = searchParams.get('v2')

    if (!v1Id || !v2Id) {
      return NextResponse.json(
        badRequest('请提供两个版本 ID (v1 和 v2)'),
        { status: 400 }
      )
    }

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    const [version1, version2] = await Promise.all([
      prisma.promptVersion.findUnique({
        where: { id: v1Id },
        select: {
          id: true,
          version: true,
          content: true,
          variables: true,
          changeLog: true,
          createdAt: true,
        },
      }),
      prisma.promptVersion.findUnique({
        where: { id: v2Id },
        select: {
          id: true,
          version: true,
          content: true,
          variables: true,
          changeLog: true,
          createdAt: true,
        },
      }),
    ])

    if (!version1 || !version2) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '版本不存在'),
        { status: 404 }
      )
    }

    // 返回两个版本的内容，前端负责生成 diff
    return NextResponse.json(
      success({
        v1: version1,
        v2: version2,
      })
    )
  } catch (err) {
    console.error('Get version diff error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本对比失败'),
      { status: 500 }
    )
  }
}
