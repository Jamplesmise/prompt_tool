/**
 * GOI Agent Step API
 *
 * POST - 执行下一步
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
          waiting: false,
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
          waiting: false,
          status: currentStatus,
        },
      })
    }

    if (currentStatus.status === 'waiting') {
      return NextResponse.json({
        code: 200,
        message: '等待用户确认检查点',
        data: {
          done: false,
          waiting: true,
          currentItemId: currentStatus.currentItemId,
          status: currentStatus,
        },
      })
    }

    if (currentStatus.status === 'planning') {
      return NextResponse.json({
        code: 200,
        message: '正在规划中',
        data: {
          done: false,
          waiting: false,
          status: currentStatus,
        },
      })
    }

    // 执行单步
    const stepResult = await agentLoop.step()

    // 如果返回 waiting 状态且有 currentItem，构建检查点信息
    let pendingCheckpoint = null
    if (stepResult.waiting && stepResult.currentItem) {
      const item = stepResult.currentItem
      if (item.checkpoint?.required) {
        pendingCheckpoint = {
          id: `checkpoint-${item.id}-${Date.now()}`,
          todoItem: item,
          reason: item.checkpoint.message || '需要用户确认',
          options: (item.checkpoint as { options?: Array<{ id: string; label: string; description?: string }> }).options || [],
          createdAt: new Date(),
        }
      }
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        ...stepResult,
        status: agentLoop.getStatus(),
        todoList: agentLoop.getTodoList(), // 返回完整的 todoList
        pendingCheckpoint, // 包含检查点信息
      },
    })
  } catch (error) {
    console.error('[GOI Agent Step API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '执行步骤失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
