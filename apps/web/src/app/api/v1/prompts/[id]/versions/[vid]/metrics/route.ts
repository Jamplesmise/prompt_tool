import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateMetricsForVersion } from '@/lib/comparison'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/prompts/:id/versions/:vid/metrics
 * 获取提示词版本的性能指标
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const { id: promptId, vid: versionId } = await params

    // 验证版本存在
    const version = await prisma.promptVersion.findFirst({
      where: {
        id: versionId,
        promptId,
      },
    })

    if (!version) {
      return NextResponse.json(
        { code: 404001, message: '版本不存在', data: null },
        { status: 404 }
      )
    }

    // 计算指标
    const metrics = await calculateMetricsForVersion(versionId)

    if (!metrics) {
      // 返回空指标
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          versionId,
          version: version.version,
          passRate: 0,
          avgLatency: 0,
          avgTokens: 0,
          estimatedCost: 0,
          formatAccuracy: 0,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          avgScore: null,
        },
      })
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: metrics,
    })
  } catch (error) {
    console.error('获取版本指标失败:', error)
    return NextResponse.json(
      { code: 500001, message: '获取版本指标失败', data: null },
      { status: 500 }
    )
  }
}
