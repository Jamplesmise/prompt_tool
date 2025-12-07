import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 禁用静态生成
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/synced-models/sync
 * 手动触发 FastGPT 模型同步到本地 Provider + Model 表
 */
export async function POST() {
  try {
    console.log('[API] 开始同步 FastGPT 模型...')

    // 动态导入 MongoDB 同步模块
    const { syncFastGPTModels } = await import('@/lib/sync/fastgptSync')
    const result = await syncFastGPTModels()

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json({
        code: 500002,
        message: result.errors[0] || '同步失败',
        data: { result },
      })
    }

    return NextResponse.json({
      code: 200,
      message: `同步成功: 供应商 ${result.providersCreated} 创建 / ${result.providersUpdated} 更新, 模型 ${result.modelsCreated} 创建 / ${result.modelsUpdated} 更新`,
      data: { result },
    })
  } catch (error) {
    console.error('[API] Sync error:', error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return NextResponse.json(
      {
        code: 500001,
        message,
        data: null,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/synced-models/sync
 * 获取同步状态（统计 FastGPT 同步的供应商和模型数量）
 */
export async function GET() {
  try {
    // 统计带有 FastGPT 前缀的供应商
    const providers = await prisma.provider.findMany({
      where: { name: { startsWith: 'FastGPT-' } },
      include: { _count: { select: { models: true } } },
    })

    const stats = {
      providers: providers.length,
      models: providers.reduce((sum, p) => sum + p._count.models, 0),
      byProvider: providers.map(p => ({
        name: p.name.replace('FastGPT-', ''),
        models: p._count.models,
        isActive: p.isActive,
      })),
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { stats },
    })
  } catch (error) {
    console.error('[API] Sync status error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to get sync status',
        data: null,
      },
      { status: 500 }
    )
  }
}
