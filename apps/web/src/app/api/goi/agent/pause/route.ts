/**
 * GOI Agent Pause/Resume API
 *
 * POST - 暂停或恢复 Agent Loop
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
    const { sessionId, action } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    if (!action || !['pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { code: 400002, message: 'action 必须是 pause 或 resume', data: null },
        { status: 400 }
      )
    }

    // 获取 Agent Loop
    const agentLoop = agentSessionManager.get(sessionId)
    if (!agentLoop) {
      return NextResponse.json(
        { code: 404001, message: 'Agent Loop 不存在', data: null },
        { status: 404 }
      )
    }

    const currentStatus = agentLoop.getStatus()

    if (action === 'pause') {
      // 暂停
      if (currentStatus.status !== 'running') {
        return NextResponse.json({
          code: 400003,
          message: `无法暂停：当前状态为 ${currentStatus.status}`,
          data: { status: currentStatus },
        }, { status: 400 })
      }

      await agentLoop.pause()

      return NextResponse.json({
        code: 200,
        message: 'Agent Loop 已暂停',
        data: {
          status: agentLoop.getStatus(),
        },
      })
    } else {
      // 恢复
      if (currentStatus.status !== 'paused' && currentStatus.status !== 'waiting' && currentStatus.status !== 'idle') {
        return NextResponse.json({
          code: 400003,
          message: `无法恢复：当前状态为 ${currentStatus.status}`,
          data: { status: currentStatus },
        }, { status: 400 })
      }

      // 恢复运行（不等待完成，让前端轮询）
      agentLoop.unpause().catch(console.error)

      return NextResponse.json({
        code: 200,
        message: 'Agent Loop 已恢复',
        data: {
          status: agentLoop.getStatus(),
        },
      })
    }
  } catch (error) {
    console.error('[GOI Agent Pause API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '操作失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
