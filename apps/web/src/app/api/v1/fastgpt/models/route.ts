import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getAllFastGPTModels,
  getActiveFastGPTModels,
  getFastGPTModelsByType,
  getFastGPTModelStats,
  clearFastGPTCache,
} from '@/services/fastgptModelService'

// 禁用静态生成
export const dynamic = 'force-dynamic'
import { isFastGPTEnabled } from '@/lib/mongodbCompat'
import { ModelTypeEnum } from '@/types/fastgpt'

export async function GET(request: NextRequest) {
  try {
    // 检查 FastGPT 是否启用
    if (!isFastGPTEnabled()) {
      return NextResponse.json({
        code: 200,
        message: 'FastGPT models disabled',
        data: {
          models: [],
          stats: { total: 0, active: 0, byType: {} },
          enabled: false,
        },
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ModelTypeEnum | null
    const activeOnly = searchParams.get('active') === 'true'
    const statsOnly = searchParams.get('stats') === 'true'
    const refresh = searchParams.get('refresh') === 'true'

    // 刷新缓存
    if (refresh) {
      await clearFastGPTCache()
    }

    // 仅返回统计信息
    if (statsOnly) {
      const stats = await getFastGPTModelStats()
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: { stats, enabled: true },
      })
    }

    // 按类型筛选
    let models
    if (type && Object.values(ModelTypeEnum).includes(type)) {
      models = await getFastGPTModelsByType(type)
    } else if (activeOnly) {
      models = await getActiveFastGPTModels()
    } else {
      models = await getAllFastGPTModels()
    }

    const stats = await getFastGPTModelStats()

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        models,
        stats,
        enabled: true,
      },
    })
  } catch (error) {
    console.error('[API] FastGPT models error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to fetch FastGPT models',
        data: null,
      },
      { status: 500 }
    )
  }
}
