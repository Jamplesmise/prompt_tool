/**
 * 命令发送 API
 * POST /api/goi/collaboration/command
 */

import { NextRequest, NextResponse } from 'next/server'
import { getControlTransferManager } from '@/lib/goi/collaboration'

type RequestBody = {
  sessionId: string
  command: string
  context?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    if (!body.command || !body.command.trim()) {
      return NextResponse.json(
        { code: 400002, message: 'command is required', data: null },
        { status: 400 }
      )
    }

    const transferManager = getControlTransferManager()
    const currentController = transferManager.getController()

    // 如果当前是用户控制，可以发送命令让 AI 接手
    if (currentController === 'user') {
      // TODO: 解析命令，生成 TODO List，启动 Agent Loop
      // 这里先返回一个占位响应

      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          sessionId: body.sessionId,
          command: body.command,
          accepted: true,
          message: '命令已接收，正在处理...',
          // todoListId: 'xxx', // 生成的 TODO List ID
        },
      })
    }

    // 如果 AI 正在控制，可能需要队列命令或返回繁忙状态
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        sessionId: body.sessionId,
        command: body.command,
        accepted: false,
        message: 'AI 正在执行任务，请稍后再试或选择"我来操作"接管',
      },
    })
  } catch (error) {
    console.error('[Collaboration API] Failed to process command:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to process command', data: null },
      { status: 500 }
    )
  }
}
