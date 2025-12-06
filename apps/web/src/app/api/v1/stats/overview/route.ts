import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, internalError } from '@/lib/api'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type TaskStats = {
  passRate: number | null
  avgLatencyMs: number | null
  totalTokens: number
  passCount: number
  failCount: number
  totalCost: number
}

// GET /api/v1/stats/overview - 工作台统计概览
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const userId = session.id
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [promptCount, datasetCount, taskCount, evaluatorCount, tasks] = await Promise.all([
      prisma.prompt.count({ where: { createdById: userId } }),
      prisma.dataset.count({ where: { createdById: userId } }),
      prisma.task.count({ where: { createdById: userId } }),
      prisma.evaluator.count({ where: { createdById: userId } }),
      prisma.task.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: weekAgo },
          status: 'COMPLETED',
        },
        select: { stats: true },
      }),
    ])

    const taskCountThisWeek = tasks.length

    // 计算平均通过率
    const passRates = tasks
      .map((t) => (t.stats as TaskStats).passRate)
      .filter((rate): rate is number => rate !== null)

    const avgPassRate =
      passRates.length > 0
        ? passRates.reduce((a, b) => a + b, 0) / passRates.length
        : null

    // 计算本周总成本
    const totalCostThisWeek = tasks.reduce((sum, t) => {
      const stats = t.stats as TaskStats
      return sum + (stats.totalCost ?? 0)
    }, 0)

    // 计算本周总 Token 数
    const totalTokensThisWeek = tasks.reduce((sum, t) => {
      const stats = t.stats as TaskStats
      return sum + (stats.totalTokens ?? 0)
    }, 0)

    return NextResponse.json(
      success({
        promptCount,
        datasetCount,
        taskCount,
        evaluatorCount,
        taskCountThisWeek,
        avgPassRate,
        totalCostThisWeek,
        totalTokensThisWeek,
      })
    )
  } catch (err) {
    console.error('Get overview stats error:', err)
    return NextResponse.json(internalError('获取统计数据失败'), { status: 500 })
  }
}
