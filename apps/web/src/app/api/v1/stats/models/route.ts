import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import { getModelPerformance } from '@/lib/metrics/aggregator'
import type { TimeRange } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/stats/models - 获取模型性能数据
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const range = (searchParams.get('range') || '7d') as TimeRange
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')

    // 验证时间范围
    if (!['24h', '7d', '14d', '30d', '60d', 'custom'].includes(range)) {
      return NextResponse.json(badRequest('无效的时间范围'), { status: 400 })
    }

    // 自定义范围需要提供起止时间
    let start: Date | undefined
    let end: Date | undefined

    if (range === 'custom') {
      if (!startStr || !endStr) {
        return NextResponse.json(
          badRequest('自定义时间范围需要提供 start 和 end 参数'),
          { status: 400 }
        )
      }
      start = new Date(startStr)
      end = new Date(endStr)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(badRequest('无效的时间格式'), { status: 400 })
      }
    }

    const result = await getModelPerformance({
      range,
      start,
      end,
      userId: session.id,
    })

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Get model performance error:', err)
    return NextResponse.json(internalError('获取模型性能数据失败'), { status: 500 })
  }
}
