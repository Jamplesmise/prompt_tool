import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { retryFailedResults, startTaskExecution, isTaskRunning } from '@/lib/taskExecutor'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/tasks/:id/retry - 重试失败用例
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const task = await prisma.task.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 检查任务状态（只有完成或失败的任务才能重试）
    if (!['COMPLETED', 'FAILED', 'STOPPED'].includes(task.status)) {
      return NextResponse.json(
        badRequest(`任务状态不允许重试: ${task.status}`),
        { status: 400 }
      )
    }

    // 检查是否正在运行
    if (isTaskRunning(id)) {
      return NextResponse.json(badRequest('任务正在执行中'), { status: 400 })
    }

    // 重置失败用例
    await retryFailedResults(id)

    // 重新启动任务
    await startTaskExecution(id)

    return NextResponse.json(success({ message: '重试已启动' }))
  } catch (err) {
    console.error('Retry task error:', err)
    const errorMessage = err instanceof Error ? err.message : '重试失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
