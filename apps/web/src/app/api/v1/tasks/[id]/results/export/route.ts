import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { unauthorized, notFound, badRequest } from '@/lib/api'
import {
  transformResultsForExport,
  exportResults,
  type ExportFormat,
} from '@/lib/exporter'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id/results/export - 导出任务结果
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: taskId } = await params
    const searchParams = request.nextUrl.searchParams
    const format = (searchParams.get('format') || 'xlsx') as ExportFormat

    // 验证格式
    if (!['xlsx', 'csv', 'json'].includes(format)) {
      return NextResponse.json(
        badRequest('不支持的导出格式，请使用 xlsx、csv 或 json'),
        { status: 400 }
      )
    }

    // 检查任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, name: true, createdById: true },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 获取任务结果
    const results = await prisma.taskResult.findMany({
      where: { taskId },
      include: {
        datasetRow: { select: { rowIndex: true } },
        promptVersion: {
          select: {
            version: true,
            prompt: { select: { name: true } },
          },
        },
        model: { select: { name: true } },
        evaluations: { select: { passed: true } },
      },
      orderBy: { datasetRow: { rowIndex: 'asc' } },
    })

    // 转换数据格式
    const exportData = transformResultsForExport(results)

    // 导出
    const { content, contentType, extension } = exportResults(exportData, format)

    // 生成文件名
    const fileName = `${task.name}_results_${Date.now()}.${extension}`

    // 返回文件
    const responseBody = typeof content === 'string' ? content : content as unknown as BodyInit
    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    })
  } catch (err) {
    console.error('Export results error:', err)
    return NextResponse.json(
      { code: 500, message: '导出失败', data: null },
      { status: 500 }
    )
  }
}
