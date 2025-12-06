import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; vid: string }> }

// POST /api/v1/prompts/:id/versions/:vid/rollback - 回滚到指定版本
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const targetVersion = await prisma.promptVersion.findUnique({
      where: { id: vid },
    })

    if (!targetVersion || targetVersion.promptId !== id) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '版本不存在'),
        { status: 404 }
      )
    }

    const newVersionNumber = prompt.currentVersion + 1

    // 使用事务：创建新版本并更新提示词内容
    const result = await prisma.$transaction(async (tx) => {
      // 创建新版本（基于回滚目标的内容）
      const newVersion = await tx.promptVersion.create({
        data: {
          promptId: id,
          version: newVersionNumber,
          content: targetVersion.content,
          variables: targetVersion.variables as Prisma.InputJsonValue,
          changeLog: `回滚至 v${targetVersion.version}`,
          createdById: session.id,
        },
      })

      // 更新提示词草稿内容和当前版本号
      const updatedPrompt = await tx.prompt.update({
        where: { id },
        data: {
          content: targetVersion.content,
          variables: targetVersion.variables as Prisma.InputJsonValue,
          currentVersion: newVersionNumber,
        },
      })

      return { version: newVersion, prompt: updatedPrompt }
    })

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Rollback prompt version error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '回滚版本失败'),
      { status: 500 }
    )
  }
}
