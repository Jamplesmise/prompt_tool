import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  getAllSyncedModels,
  getSyncedModelsByType,
  getSyncedModelStats,
} from '@/services/syncedModelService'
import type { SyncedModelType } from '@prisma/client'

// 禁用静态生成
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as SyncedModelType | null
    const activeOnly = searchParams.get('active') === 'true'
    const statsOnly = searchParams.get('stats') === 'true'

    // 仅返回统计信息
    if (statsOnly) {
      const stats = await getSyncedModelStats()
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: { stats },
      })
    }

    // 按类型筛选
    let models
    if (type && ['llm', 'embedding', 'tts', 'stt', 'rerank'].includes(type)) {
      models = await getSyncedModelsByType(type, activeOnly)
    } else {
      models = await getAllSyncedModels(activeOnly)
    }

    const stats = await getSyncedModelStats()

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        models,
        stats,
      },
    })
  } catch (error) {
    console.error('[API] Synced models error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to fetch synced models',
        data: null,
      },
      { status: 500 }
    )
  }
}
