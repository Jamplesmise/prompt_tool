import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// DELETE /api/v1/prompts/batch - 批量删除提示词
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        badRequest('请提供要删除的提示词 ID 列表'),
        { status: 400 }
      )
    }

    // 使用事务批量删除
    const result = await prisma.$transaction(async (tx) => {
      // 先删除关联的版本
      await tx.promptVersion.deleteMany({
        where: { promptId: { in: ids } },
      })

      // 删除关联的分支
      await tx.promptBranch.deleteMany({
        where: { promptId: { in: ids } },
      })

      // 删除提示词
      const deleted = await tx.prompt.deleteMany({
        where: { id: { in: ids } },
      })

      return deleted.count
    })

    return NextResponse.json(
      success({ deleted: result })
    )
  } catch (err) {
    console.error('Batch delete prompts error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '批量删除失败'),
      { status: 500 }
    )
  }
}

// GET /api/v1/prompts/batch/export?ids=id1,id2,id3 - 批量导出提示词
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        badRequest('请提供要导出的提示词 ID 列表'),
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json(
        badRequest('请提供有效的提示词 ID 列表'),
        { status: 400 }
      )
    }

    // 获取提示词及其版本
    const prompts = await prisma.prompt.findMany({
      where: { id: { in: ids } },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 格式化导出数据
    const exportData = prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      variables: prompt.variables,
      tags: prompt.tags,
      currentVersion: prompt.currentVersion,
      versions: prompt.versions.map((v) => ({
        version: v.version,
        content: v.content,
        variables: v.variables,
        changeLog: v.changeLog,
        createdAt: v.createdAt,
      })),
      createdBy: prompt.createdBy.name,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }))

    // 返回 JSON 文件下载
    const fileName = `prompts-export-${Date.now()}.json`
    const jsonContent = JSON.stringify(exportData, null, 2)

    return new NextResponse(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('Export prompts error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '导出失败'),
      { status: 500 }
    )
  }
}
