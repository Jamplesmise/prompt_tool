import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import { getTrendData } from '@/lib/metrics/aggregator'
import type { TimeRange, GroupBy } from '@platform/shared'

// GET /api/v1/stats/trends - 获取趋势数据
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
    const groupBy = searchParams.get('groupBy') as GroupBy | null
    const taskIds = searchParams.get('taskIds')?.split(',').filter(Boolean)
    const promptIds = searchParams.get('promptIds')?.split(',').filter(Boolean)
    const modelIds = searchParams.get('modelIds')?.split(',').filter(Boolean)

    // 验证时间范围
    if (!['24h', '7d', '30d', 'custom'].includes(range)) {
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

    const result = await getTrendData({
      range,
      start,
      end,
      groupBy: groupBy || undefined,
      taskIds,
      promptIds,
      modelIds,
      userId: session.id,
    })

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Get trends error:', err)
    return NextResponse.json(internalError('获取趋势数据失败'), { status: 500 })
  }
}
