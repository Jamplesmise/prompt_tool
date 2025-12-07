import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/search - 全局搜索
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q')?.trim() || ''
    const typesParam = searchParams.get('types')
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 20)

    if (!q) {
      return NextResponse.json(
        badRequest('搜索关键词不能为空'),
        { status: 400 }
      )
    }

    // 解析要搜索的类型
    const types = typesParam
      ? typesParam.split(',').filter(t => ['prompt', 'dataset', 'task'].includes(t))
      : ['prompt', 'dataset', 'task']

    // 并行搜索
    const searchPromises: Promise<unknown>[] = []

    // 搜索提示词
    if (types.includes('prompt')) {
      searchPromises.push(
        prisma.prompt.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            currentVersion: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    // 搜索数据集
    if (types.includes('dataset')) {
      searchPromises.push(
        prisma.dataset.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            rowCount: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    // 搜索任务
    if (types.includes('task')) {
      searchPromises.push(
        prisma.task.findMany({
          where: {
            name: { contains: q, mode: 'insensitive' },
          },
          select: {
            id: true,
            name: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
      )
    } else {
      searchPromises.push(Promise.resolve([]))
    }

    const [prompts, datasets, tasks] = await Promise.all(searchPromises)

    return NextResponse.json(
      success({
        prompts,
        datasets,
        tasks,
      })
    )
  } catch (err) {
    console.error('Global search error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '搜索失败'),
      { status: 500 }
    )
  }
}
