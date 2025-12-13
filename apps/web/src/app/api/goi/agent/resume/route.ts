/**
 * GOI Agent Resume API
 *
 * POST - 从现有 TODO List 恢复 Agent Loop
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
      todoListId,
      modelId,
      autoRun = false,
      maxRetries = 3,
      stepDelay = 500,
    } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    if (!todoListId) {
      return NextResponse.json(
        { code: 400002, message: '缺少 todoListId', data: null },
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
      if (
        existingStatus &&
        existingStatus.status !== 'completed' &&
        existingStatus.status !== 'failed' &&
        existingStatus.status !== 'idle'
      ) {
        return NextResponse.json(
          {
            code: 409001,
            message: '该会话已有活跃的 Agent Loop，请先暂停或等待完成',
            data: { status: existingStatus },
          },
          { status: 409 }
        )
      }
      // 清理已完成的会话
      agentSessionManager.delete(sessionId)
    }

    // 创建新的 Agent Loop
    const agentLoop = agentSessionManager.getOrCreate(sessionId, {
      modelId,
      autoRun,
      maxRetries,
      stepDelay,
    })

    // 从 TODO List 恢复
    try {
      await agentLoop.resume(todoListId)
    } catch (error) {
      // 恢复失败，清理会话
      agentSessionManager.delete(sessionId)
      throw error
    }

    const todoList = agentLoop.getTodoList()

    return NextResponse.json({
      code: 200,
      message: '已从 TODO List 恢复',
      data: {
        todoList,
        status: agentLoop.getStatus(),
      },
    })
  } catch (error) {
    console.error('[GOI Agent Resume API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '恢复 Agent 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
