import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

// 禁用静态生成
export const dynamic = 'force-dynamic'

import { isFastGPTEnabled } from '@/lib/mongodbCompat'
import type { UnifiedModelType } from '@/types/fastgpt'
import { ModelTypeEnum } from '@/types/fastgpt'

type ModelWithProvider = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  config: unknown
  pricing: unknown
  provider: {
    id: string
    name: string
    type: string
  }
}

// 将模型转换为统一格式
function transformModel(model: ModelWithProvider): UnifiedModelType {
  const config = model.config as Record<string, unknown> | null
  const pricing = model.pricing as {
    inputPerMillion?: number
    outputPerMillion?: number
  } | null

  // 判断是否来自 FastGPT 同步（通过 Provider 名称前缀）
  const isFromFastGPT = model.provider.name.startsWith('FastGPT-')
  // 显示原始提供商名称（去掉 FastGPT- 前缀）
  const displayProvider = isFromFastGPT
    ? model.provider.name.replace('FastGPT-', '')
    : model.provider.name

  return {
    id: model.id,
    name: model.name,
    provider: displayProvider,
    type: (config?.type as ModelTypeEnum) || ModelTypeEnum.llm,
    isActive: model.isActive,
    isCustom: !isFromFastGPT,
    source: isFromFastGPT ? 'fastgpt' : 'local',

    // 定价
    inputPrice: pricing?.inputPerMillion ? pricing.inputPerMillion / 1000 : undefined,
    outputPrice: pricing?.outputPerMillion ? pricing.outputPerMillion / 1000 : undefined,

    // LLM 配置
    maxContext: config?.maxContext as number | undefined,
    maxResponse: config?.maxResponse as number | undefined,
    vision: config?.vision as boolean | undefined,
    toolChoice: config?.toolChoice as boolean | undefined,
    functionCall: config?.functionCall as boolean | undefined,
    reasoning: config?.reasoning as boolean | undefined,

    // Embedding 配置
    maxToken: config?.maxToken as number | undefined,
    defaultToken: config?.defaultToken as number | undefined,

    // TTS 配置
    voices: config?.voices as { label: string; value: string }[] | undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ModelTypeEnum | null
    const activeOnly = searchParams.get('active') === 'true'
    const source = searchParams.get('source') as 'fastgpt' | 'local' | null

    // 构建查询条件
    const where: { isActive?: boolean; provider?: { name?: { startsWith?: string; not?: { startsWith: string } } } } = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (source === 'fastgpt') {
      where.provider = { name: { startsWith: 'FastGPT-' } }
    } else if (source === 'local') {
      where.provider = { name: { not: { startsWith: 'FastGPT-' } } }
    }

    // 获取所有模型（统一从 Model 表获取）
    const dbModels = await prisma.model.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [
        { provider: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    let allModels = dbModels.map(transformModel)

    // 按类型筛选
    if (type && Object.values(ModelTypeEnum).includes(type)) {
      allModels = allModels.filter((m) => m.type === type)
    }

    // 统计
    const fastgptCount = allModels.filter((m) => m.source === 'fastgpt').length
    const localCount = allModels.filter((m) => m.source === 'local').length

    const stats = {
      total: allModels.length,
      active: allModels.filter((m) => m.isActive).length,
      fastgpt: fastgptCount,
      local: localCount,
      byType: allModels.reduce(
        (acc, m) => {
          acc[m.type] = (acc[m.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ),
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        models: allModels,
        stats,
        fastgptEnabled: isFastGPTEnabled(),
      },
    })
  } catch (error) {
    console.error('[API] All models error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to fetch models',
        data: null,
      },
      { status: 500 }
    )
  }
}
