/**
 * 失败报告 API
 *
 * GET: 获取失败报告
 * POST: 生成失败报告
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  FailureReport,
  FailureInfo,
  RecoveryOption,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

type GetReportResponse = {
  code: number
  message: string
  data: FailureReport | null
}

type PostReportRequest = {
  sessionId: string
  failureId: string
  todoListTotal?: number
  phaseName?: string
}

type PostReportResponse = {
  code: number
  message: string
  data: FailureReport | null
}

// ============================================
// Mock 数据
// ============================================

function createMockReport(failureId: string, options?: {
  todoListTotal?: number
  phaseName?: string
}): FailureReport {
  const suggestions: RecoveryOption[] = [
    {
      id: 'retry-1',
      label: '重新尝试',
      description: '使用相同参数重新执行',
      action: 'retry',
      recommended: true,
    },
    {
      id: 'modify-1',
      label: '修改参数',
      description: '修改搜索条件后重试',
      action: 'modify',
      requiresInput: true,
      inputPrompt: '请输入新的搜索关键词',
    },
    {
      id: 'takeover-1',
      label: '手动完成',
      description: '我来手动完成此步骤',
      action: 'takeover',
    },
    {
      id: 'skip-1',
      label: '跳过此步',
      description: '暂时跳过，稍后配置',
      action: 'skip',
    },
    {
      id: 'abort-1',
      label: '放弃任务',
      description: '取消本次任务创建',
      action: 'abort',
    },
  ]

  return {
    id: `report-${Date.now()}`,
    failureId,
    location: {
      todoItem: '选中数据集',
      phase: options?.phaseName || '数据集配置',
      progress: `第3项，共${options?.todoListTotal || 12}项`,
      page: '/datasets',
    },
    reason: {
      summary: '搜索 "test-data" 未找到匹配的数据集',
      possibleCauses: [
        '数据集名称拼写错误',
        '数据集已被删除',
        '当前用户无权限访问该数据集',
      ],
      technicalDetails: '[GOI2001] Resource not found: dataset with name "test-data"',
    },
    rollback: {
      executed: true,
      actions: [
        '关闭了数据集选择器',
        '清除了搜索条件',
      ],
      restoredTo: '选择提示词完成后',
      snapshotId: 'snapshot-123',
    },
    suggestions,
    generatedAt: new Date(),
  }
}

// ============================================
// GET: 获取失败报告
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<GetReportResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const failureId = searchParams.get('failureId')

    if (!failureId) {
      return NextResponse.json({
        code: 400001,
        message: '缺少 failureId 参数',
        data: null,
      })
    }

    // TODO: 从实际存储获取失败报告
    const report = createMockReport(failureId)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: report,
    })
  } catch (error) {
    console.error('Get failure report error:', error)
    return NextResponse.json({
      code: 500001,
      message: '获取失败报告失败',
      data: null,
    })
  }
}

// ============================================
// POST: 生成失败报告
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<PostReportResponse>> {
  try {
    const body = (await request.json()) as PostReportRequest
    const { sessionId, failureId, todoListTotal, phaseName } = body

    if (!sessionId || !failureId) {
      return NextResponse.json({
        code: 400001,
        message: '缺少必要参数',
        data: null,
      })
    }

    // TODO: 使用 FailureReporter 生成实际报告
    // const reporter = createReporter()
    // const failureInfo = await getFailureInfo(failureId)
    // const rollbackResult = await getRollbackResult(failureId)
    // const report = reporter.generateReport(failureInfo, rollbackResult, { todoListTotal, phaseName })

    const report = createMockReport(failureId, { todoListTotal, phaseName })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: report,
    })
  } catch (error) {
    console.error('Generate failure report error:', error)
    return NextResponse.json({
      code: 500001,
      message: '生成失败报告失败',
      data: null,
    })
  }
}
