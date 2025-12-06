import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, unauthorized } from '@/lib/api'
import { PRESET_EVALUATOR_DEFINITIONS } from '@platform/evaluators'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/evaluators/presets - 获取预置评估器列表
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 返回预置评估器定义
    const presets = PRESET_EVALUATOR_DEFINITIONS.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      type: 'preset',
      config: {
        presetType: preset.presetType,
        params: preset.defaultParams || {},
      },
    }))

    return NextResponse.json(success(presets))
  } catch (err) {
    console.error('Get preset evaluators error:', err)
    return NextResponse.json(success([]))
  }
}
