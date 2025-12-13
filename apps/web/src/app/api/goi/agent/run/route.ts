/**
 * GOI Agent Run API
 *
 * POST - 开始执行 Agent Loop（执行所有步骤）
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
    const { sessionId } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    // 获取 Agent Loop
    const agentLoop = agentSessionManager.get(sessionId)
    if (!agentLoop) {
      return NextResponse.json(
        { code: 404001, message: 'Agent Loop 不存在，请先调用 /api/goi/agent/start', data: null },
        { status: 404 }
      )
    }

    // 检查状态
    const currentStatus = agentLoop.getStatus()
    if (currentStatus.status === 'completed') {
      return NextResponse.json({
        code: 200,
        message: '所有任务已完成',
        data: {
          done: true,
          status: currentStatus,
        },
      })
    }

    if (currentStatus.status === 'failed') {
      return NextResponse.json({
        code: 200,
        message: 'Agent Loop 已失败',
        data: {
          done: true,
          status: currentStatus,
        },
      })
    }

    if (currentStatus.status === 'running') {
      return NextResponse.json({
        code: 200,
        message: 'Agent Loop 已在运行中',
        data: {
          running: true,
          status: currentStatus,
        },
      })
    }

    // 开始运行（这会在后台持续执行）
    // 使用 Promise 不等待完成，让它在后台运行
    agentLoop.run().catch((error) => {
      console.error('[GOI Agent Run API] Run error:', error)
    })

    // 等待一小段时间让第一步开始
    await new Promise((resolve) => setTimeout(resolve, 100))

    return NextResponse.json({
      code: 200,
      message: '已开始执行',
      data: {
        running: true,
        status: agentLoop.getStatus(),
        todoList: agentLoop.getTodoList(),
      },
    })
  } catch (error) {
    console.error('[GOI Agent Run API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '执行失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
