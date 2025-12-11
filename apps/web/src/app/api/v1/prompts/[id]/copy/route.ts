import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// POST /api/v1/prompts/[id]/copy - 复制提示词
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = params

    // 获取原始提示词
    const original = await prisma.prompt.findUnique({
      where: { id },
      include: {
        versions: {
          where: { branchId: null },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    })

    if (!original) {
      return NextResponse.json(notFound('提示词不存在'), { status: 404 })
    }

    // 创建副本
    const copy = await prisma.$transaction(async (tx) => {
      // 生成新名称（带副本标记）
      const baseName = original.name.replace(/\s*\(副本\s*\d*\)$/, '')
      const existingCopies = await tx.prompt.count({
        where: {
          name: {
            startsWith: baseName,
            contains: '(副本',
          },
        },
      })
      const newName = `${baseName} (副本${existingCopies > 0 ? ` ${existingCopies + 1}` : ''})`

      // 创建新提示词
      const newPrompt = await tx.prompt.create({
        data: {
          name: newName,
          description: original.description,
          systemPrompt: original.systemPrompt,
          content: original.content,
          variables: original.variables as Prisma.InputJsonValue,
          tags: original.tags,
          currentVersion: 1,
          createdById: session.id,
          teamId: original.teamId,
        },
      })

      // 创建初始版本
      await tx.promptVersion.create({
        data: {
          promptId: newPrompt.id,
          version: 1,
          systemPrompt: original.systemPrompt,
          content: original.content,
          variables: original.variables as Prisma.InputJsonValue,
          changeLog: `从 "${original.name}" 复制`,
          createdById: session.id,
        },
      })

      return newPrompt
    })

    return NextResponse.json(success(copy), { status: 201 })
  } catch (err) {
    console.error('Copy prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '复制提示词失败'),
      { status: 500 }
    )
  }
}
