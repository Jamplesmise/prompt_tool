import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import { parseJsonOutput, inferSchemaFromOutput } from '@/services/schemaInfer'

export const dynamic = 'force-dynamic'

// POST /api/v1/schemas/infer-from-output - 从样本输出推断 Schema
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { sampleOutput } = body

    // 参数校验
    if (!sampleOutput || typeof sampleOutput !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '样本输出不能为空'),
        { status: 400 }
      )
    }

    if (sampleOutput.trim().length === 0) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '样本输出不能为空'),
        { status: 400 }
      )
    }

    // 解析 JSON
    let parsedOutput: Record<string, unknown>
    try {
      parsedOutput = parseJsonOutput(sampleOutput)
    } catch (parseError) {
      return NextResponse.json(
        error(
          ERROR_CODES.VALIDATION_ERROR,
          parseError instanceof Error ? parseError.message : '无法解析 JSON 输出'
        ),
        { status: 400 }
      )
    }

    // 推断字段
    let fields
    try {
      fields = inferSchemaFromOutput(parsedOutput)
    } catch (inferError) {
      return NextResponse.json(
        error(
          ERROR_CODES.VALIDATION_ERROR,
          inferError instanceof Error ? inferError.message : '推断失败'
        ),
        { status: 400 }
      )
    }

    return NextResponse.json(
      success({
        fields,
        parsedOutput,
        fieldCount: fields.length,
      })
    )
  } catch (err) {
    console.error('Schema inference error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, err instanceof Error ? err.message : '推断失败'),
      { status: 500 }
    )
  }
}
