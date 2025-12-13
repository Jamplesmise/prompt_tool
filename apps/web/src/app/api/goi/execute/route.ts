import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { execute, executeBatch, GoiExecutor } from '@/lib/goi/executor'
import { ERROR_CODES } from '@platform/shared'
import type { GoiOperation } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/goi/execute - 执行 GOI 操作
 *
 * Body:
 * - sessionId: 会话 ID（必填）
 * - operation: GOI 操作定义（必填）
 * - options: 执行选项（可选）
 *   - skipPreCheck: 是否跳过前置检查
 *   - skipPostValidation: 是否跳过后置验证
 *   - timeout: 超时时间（毫秒）
 *
 * Response:
 * - success: 是否成功
 * - status: 执行状态
 * - result: 执行结果（根据操作类型不同）
 * - error: 错误信息
 * - duration: 执行耗时
 * - events: 产生的事件
 * - snapshotId: 快照 ID（用于回滚）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { sessionId, operation, options } = body

    // 参数验证
    if (!sessionId) {
      return NextResponse.json(badRequest('sessionId 是必填的'), { status: 400 })
    }

    if (!operation) {
      return NextResponse.json(badRequest('operation 是必填的'), { status: 400 })
    }

    if (!operation.type) {
      return NextResponse.json(badRequest('operation.type 是必填的'), { status: 400 })
    }

    // 验证操作类型
    const validTypes = ['access', 'state', 'observation']
    if (!validTypes.includes(operation.type)) {
      return NextResponse.json(
        badRequest(`无效的操作类型: ${operation.type}，有效类型为: ${validTypes.join(', ')}`),
        { status: 400 }
      )
    }

    // 执行操作
    const result = await execute(
      operation as GoiOperation,
      {
        sessionId,
        userId: session.id,
        enableLogging: true,
        enablePreValidation: true,
        enablePostValidation: true,
      },
      options
    )

    // 根据执行结果返回不同的状态码
    if (result.success) {
      return NextResponse.json(success(result))
    } else {
      // 操作失败但不是服务器错误
      return NextResponse.json(
        success({
          ...result,
          _warning: '操作执行失败，请检查 error 字段',
        })
      )
    }
  } catch (err) {
    console.error('[GOI Execute] Error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '执行 GOI 操作失败'),
      { status: 500 }
    )
  }
}

/**
 * PUT /api/goi/execute - 批量执行 GOI 操作
 *
 * Body:
 * - sessionId: 会话 ID（必填）
 * - operations: GOI 操作列表（必填）
 * - options: 执行选项（可选）
 *   - stopOnError: 遇到错误是否停止
 *   - parallel: 是否并行执行
 *
 * Response:
 * - results: 执行结果列表
 * - summary: 执行摘要
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { sessionId, operations, options } = body

    // 参数验证
    if (!sessionId) {
      return NextResponse.json(badRequest('sessionId 是必填的'), { status: 400 })
    }

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(badRequest('operations 必须是非空数组'), { status: 400 })
    }

    // 限制批量操作数量
    const maxBatchSize = 20
    if (operations.length > maxBatchSize) {
      return NextResponse.json(
        badRequest(`批量操作数量不能超过 ${maxBatchSize}`),
        { status: 400 }
      )
    }

    // 执行批量操作
    const results = await executeBatch(
      operations as GoiOperation[],
      {
        sessionId,
        userId: session.id,
        enableLogging: true,
        enablePreValidation: true,
        enablePostValidation: true,
      },
      {
        stopOnError: options?.stopOnError ?? false,
        ...options,
      }
    )

    // 生成执行摘要
    const summary = {
      total: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    }

    return NextResponse.json(
      success({
        results,
        summary,
      })
    )
  } catch (err) {
    console.error('[GOI Execute Batch] Error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '批量执行 GOI 操作失败'),
      { status: 500 }
    )
  }
}

/**
 * GET /api/goi/execute/validate - 验证 GOI 操作
 *
 * Query params:
 * - operation: URL 编码的操作 JSON
 *
 * Response:
 * - valid: 是否有效
 * - errors: 错误列表
 * - warnings: 警告列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const operationParam = searchParams.get('operation')

    if (!operationParam) {
      return NextResponse.json(badRequest('operation 参数是必填的'), { status: 400 })
    }

    let operation: GoiOperation
    try {
      operation = JSON.parse(decodeURIComponent(operationParam))
    } catch {
      return NextResponse.json(badRequest('operation 参数格式错误'), { status: 400 })
    }

    // 创建 executor 进行验证
    const executor = new GoiExecutor({
      sessionId: 'validation',
      userId: session.id,
    })

    const validation = executor.validateOperation(operation)

    return NextResponse.json(success(validation))
  } catch (err) {
    console.error('[GOI Validate] Error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '验证 GOI 操作失败'),
      { status: 500 }
    )
  }
}
