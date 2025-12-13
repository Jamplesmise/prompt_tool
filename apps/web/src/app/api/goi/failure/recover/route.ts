/**
 * 失败恢复 API
 *
 * POST: 执行恢复操作
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  RecoveryAction,
  RecoverySelection,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

type PostRecoverRequest = {
  sessionId: string
  failureId: string
  selection: RecoverySelection
}

type PostRecoverResponse = {
  code: number
  message: string
  data: {
    success: boolean
    action: RecoveryAction
    message: string
    nextStep?: string
  } | null
}

// ============================================
// POST: 执行恢复操作
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<PostRecoverResponse>> {
  try {
    const body = (await request.json()) as PostRecoverRequest
    const { sessionId, failureId, selection } = body

    if (!sessionId || !failureId || !selection) {
      return NextResponse.json({
        code: 400001,
        message: '缺少必要参数',
        data: null,
      })
    }

    // 根据选择的恢复动作执行相应操作
    let result: PostRecoverResponse['data']

    switch (selection.action) {
      case 'retry':
        // TODO: 实际执行重试
        result = {
          success: true,
          action: 'retry',
          message: '正在重新执行操作...',
          nextStep: '等待操作完成',
        }
        break

      case 'modify':
        // TODO: 使用新参数重试
        result = {
          success: true,
          action: 'modify',
          message: `使用新参数 "${selection.userInput}" 重新执行`,
          nextStep: '等待操作完成',
        }
        break

      case 'skip':
        // TODO: 跳过当前步骤
        result = {
          success: true,
          action: 'skip',
          message: '已跳过当前步骤',
          nextStep: '继续执行下一个 TODO 项',
        }
        break

      case 'replan':
        // TODO: 触发重新规划
        result = {
          success: true,
          action: 'replan',
          message: '正在重新规划任务...',
          nextStep: '等待 AI 生成新的执行计划',
        }
        break

      case 'takeover':
        // TODO: 转移控制权
        result = {
          success: true,
          action: 'takeover',
          message: '控制权已转移给用户',
          nextStep: '请手动完成当前步骤',
        }
        break

      case 'abort':
        // TODO: 取消任务
        result = {
          success: true,
          action: 'abort',
          message: '任务已取消',
          nextStep: undefined,
        }
        break

      default:
        return NextResponse.json({
          code: 400002,
          message: '无效的恢复动作',
          data: null,
        })
    }

    // 记录恢复操作事件
    // TODO: await eventBus.publish({ type: 'RECOVERY_SELECTED', payload: { ... } })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch (error) {
    console.error('Execute recovery error:', error)
    return NextResponse.json({
      code: 500001,
      message: '执行恢复操作失败',
      data: null,
    })
  }
}
