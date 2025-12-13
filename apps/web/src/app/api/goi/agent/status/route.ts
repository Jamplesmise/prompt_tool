/**
 * GOI Agent Status API
 *
 * GET - 获取 Agent Loop 状态
 */

import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染，因为使用了 headers (getSession)
export const dynamic = 'force-dynamic'
import { getSession } from '@/lib/auth'
import { agentSessionManager } from '@/lib/goi/agent/sessionManager'

export async function GET(request: NextRequest) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const includeStats = searchParams.get('includeStats') === 'true'
    const includeTodoList = searchParams.get('includeTodoList') === 'true'

    // 如果没有指定 sessionId，返回所有会话摘要
    if (!sessionId) {
      const sessions = agentSessionManager.getAllSessions()
      const result: {
        sessions: typeof sessions
        stats?: ReturnType<typeof agentSessionManager.getStats>
      } = { sessions }

      if (includeStats) {
        result.stats = agentSessionManager.getStats()
      }

      return NextResponse.json({
        code: 200,
        message: 'success',
        data: result,
      })
    }

    // 获取指定会话的状态
    const agentLoop = agentSessionManager.get(sessionId)
    if (!agentLoop) {
      return NextResponse.json(
        { code: 404001, message: 'Agent Loop 不存在', data: null },
        { status: 404 }
      )
    }

    const status = agentLoop.getStatus()
    const result: {
      status: typeof status
      todoList?: ReturnType<typeof agentLoop.getTodoList>
    } = { status }

    if (includeTodoList) {
      result.todoList = agentLoop.getTodoList()
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch (error) {
    console.error('[GOI Agent Status API] GET error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '获取状态失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
