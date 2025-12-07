import { NextRequest, NextResponse } from 'next/server'
import { getModelComparison } from '@/services/comparisonService'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/comparison/models
 * 运行模型对比分析
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptId, promptVersionId, datasetId, modelIds } = body

    // 参数验证
    if (!promptId || !promptVersionId || !datasetId || !modelIds || modelIds.length < 2) {
      return NextResponse.json(
        {
          code: 400001,
          message: '缺少必要参数或模型数量不足',
          data: null,
        },
        { status: 400 }
      )
    }

    // 获取对比结果
    const result = await getModelComparison(
      promptId,
      promptVersionId,
      datasetId,
      modelIds
    )

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch (error) {
    console.error('模型对比失败:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: '模型对比失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
