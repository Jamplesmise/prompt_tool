/**
 * GOI Agent Start API
 *
 * POST - 启动 Agent Loop
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

export async function POST(request: NextRequest) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const {
      sessionId,
      goal,
      modelId,
      autoRun = false,
      mode = 'assisted', // 运行模式：manual, assisted, auto
      maxRetries = 3,
      stepDelay = 500,
      plannerConfig,
      gathererConfig,
      verifierConfig,
      context, // 上下文信息（当前页面等）
    } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    if (!goal) {
      return NextResponse.json(
        { code: 400002, message: '缺少 goal', data: null },
        { status: 400 }
      )
    }

    if (!modelId) {
      return NextResponse.json(
        { code: 400003, message: '缺少 modelId，请选择一个模型', data: null },
        { status: 400 }
      )
    }

    // 检查是否已有活跃会话
    if (agentSessionManager.has(sessionId)) {
      const existingStatus = agentSessionManager.getStatus(sessionId)
      if (existingStatus && existingStatus.status !== 'completed' && existingStatus.status !== 'failed' && existingStatus.status !== 'idle') {
        return NextResponse.json(
          {
            code: 409001,
            message: '该会话已有活跃的 Agent Loop，请先暂停或等待完成',
            data: { status: existingStatus },
          },
          { status: 409 }
        )
      }
    }

    console.log('[GOI Agent Start API] Creating agent with config:', {
      sessionId,
      modelId,
      autoRun,
      goal: goal.substring(0, 50),
    })

    // 获取或创建 Agent Loop（传递用户 ID 用于资源创建）
    const agentLoop = agentSessionManager.getOrCreate(sessionId, {
      modelId,
      userId: session.id,
      autoRun,
      mode, // 传递运行模式
      maxRetries,
      stepDelay,
      plannerConfig,
      gathererConfig,
      verifierConfig,
    })

    // 启动 Agent Loop（传递上下文信息）
    const planResult = await agentLoop.start(goal, context)

    if (!planResult.success) {
      return NextResponse.json({
        code: 500002,
        message: planResult.error || '生成计划失败',
        data: {
          planResult,
          status: agentLoop.getStatus(),
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        todoList: planResult.todoList,
        goalAnalysis: planResult.goalAnalysis,
        warnings: planResult.warnings,
        tokenUsage: planResult.tokenUsage,
        latencyMs: planResult.latencyMs,
        status: agentLoop.getStatus(),
      },
    })
  } catch (error) {
    console.error('[GOI Agent Start API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '启动 Agent 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
