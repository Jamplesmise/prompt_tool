import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import { generateSchema, saveGeneratedSchemas } from '@/services/aiSchemaGenerator'

export const dynamic = 'force-dynamic'

// POST /api/v1/schemas/ai-generate - AI 生成 Schema
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { modelId, sceneName, description, save, teamId } = body

    // 参数校验
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '模型 ID 不能为空'),
        { status: 400 }
      )
    }

    if (!sceneName || typeof sceneName !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '场景名称不能为空'),
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '场景描述不能为空'),
        { status: 400 }
      )
    }

    if (description.length < 10) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '场景描述太短，请提供更详细的说明'),
        { status: 400 }
      )
    }

    // 调用 AI 生成 Schema
    const generateResult = await generateSchema({
      modelId,
      sceneName,
      description,
      userId: session.id,
      teamId,
    })

    if (!generateResult.success || !generateResult.result) {
      return NextResponse.json(
        error(ERROR_CODES.INTERNAL_ERROR, generateResult.error || 'Schema 生成失败'),
        { status: 500 }
      )
    }

    // 如果需要保存
    let savedIds: { evaluationSchemaId?: string; inputSchemaId?: string; outputSchemaId?: string } = {}
    if (save) {
      const saveResult = await saveGeneratedSchemas({
        inputSchema: generateResult.result.inputSchema,
        outputSchema: generateResult.result.outputSchema,
        userId: session.id,
        teamId,
      })

      if (!saveResult.success) {
        return NextResponse.json(
          error(ERROR_CODES.INTERNAL_ERROR, saveResult.error || '保存 Schema 失败'),
          { status: 500 }
        )
      }

      savedIds = {
        evaluationSchemaId: saveResult.evaluationSchemaId,
        inputSchemaId: saveResult.inputSchemaId,
        outputSchemaId: saveResult.outputSchemaId,
      }
    }

    return NextResponse.json(
      success({
        aiRawOutput: generateResult.aiRawOutput,
        inputSchema: generateResult.result.inputSchema,
        outputSchema: generateResult.result.outputSchema,
        templateColumns: generateResult.result.templateColumns,
        tokens: generateResult.tokens,
        latencyMs: generateResult.latencyMs,
        ...savedIds,
      })
    )
  } catch (err) {
    console.error('AI Schema generation error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, err instanceof Error ? err.message : 'Schema 生成失败'),
      { status: 500 }
    )
  }
}
