import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/prompts/:id/versions - 获取版本列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    const versions = await prisma.promptVersion.findMany({
      where: { promptId: id },
      select: {
        id: true,
        version: true,
        changeLog: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json(success(versions))
  } catch (err) {
    console.error('Get prompt versions error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/:id/versions - 发布新版本
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { changeLog } = body

    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    const newVersion = prompt.currentVersion + 1

    // 使用事务创建版本并更新当前版本号
    const version = await prisma.$transaction(async (tx) => {
      const newVersionRecord = await tx.promptVersion.create({
        data: {
          promptId: id,
          version: newVersion,
          content: prompt.content,
          variables: prompt.variables as Prisma.InputJsonValue,
          changeLog: changeLog || null,
          createdById: session.id,
        },
      })

      await tx.prompt.update({
        where: { id },
        data: { currentVersion: newVersion },
      })

      return newVersionRecord
    })

    return NextResponse.json(success(version), { status: 201 })
  } catch (err) {
    console.error('Create prompt version error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '发布版本失败'),
      { status: 500 }
    )
  }
}
