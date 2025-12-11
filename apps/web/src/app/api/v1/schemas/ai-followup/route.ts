import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES, type AISchemaOutput } from '@platform/shared'
import { followUpSchema, type ConversationMessage } from '@/services/aiSchemaGenerator'

export const dynamic = 'force-dynamic'

// POST /api/v1/schemas/ai-followup - AI 追问修改 Schema
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { modelId, sceneName, followUp, currentSchema, conversationHistory, teamId } = body

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

    if (!followUp || typeof followUp !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '追问内容不能为空'),
        { status: 400 }
      )
    }

    if (!currentSchema || !currentSchema.inputs || !currentSchema.outputs) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '当前 Schema 状态无效'),
        { status: 400 }
      )
    }

    // 调用 AI 处理追问
    const result = await followUpSchema({
      modelId,
      sceneName,
      followUp,
      currentSchema: currentSchema as AISchemaOutput,
      conversationHistory: conversationHistory as ConversationMessage[] | undefined,
      userId: session.id,
      teamId,
    })

    if (!result.success || !result.result) {
      return NextResponse.json(
        error(ERROR_CODES.INTERNAL_ERROR, result.error || 'Schema 更新失败'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      success({
        aiRawOutput: result.aiRawOutput,
        inputSchema: result.result.inputSchema,
        outputSchema: result.result.outputSchema,
        templateColumns: result.result.templateColumns,
        tokens: result.tokens,
        latencyMs: result.latencyMs,
      })
    )
  } catch (err) {
    console.error('AI Schema follow-up error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, err instanceof Error ? err.message : 'Schema 更新失败'),
      { status: 500 }
    )
  }
}
