/**
 * GOI Agent Checkpoint API
 *
 * POST - 用户确认或拒绝检查点
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
    const { sessionId, itemId, action, feedback, reason, selectedResourceId } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    if (!itemId) {
      return NextResponse.json(
        { code: 400002, message: '缺少 itemId', data: null },
        { status: 400 }
      )
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { code: 400003, message: 'action 必须是 approve 或 reject', data: null },
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

    // 检查状态 - 允许 waiting 或 idle 状态处理检查点
    // idle 状态也需要处理，因为用户可能在表单页面手动完成操作
    const currentStatus = agentLoop.getStatus()
    const todoList = agentLoop.getTodoList()
    const targetItem = todoList?.items.find(i => i.id === itemId)

    // 如果目标项不是 waiting 状态，拒绝处理
    if (!targetItem) {
      return NextResponse.json({
        code: 400004,
        message: '找不到指定的 TODO 项',
        data: { status: currentStatus },
      }, { status: 400 })
    }

    if (targetItem.status !== 'waiting') {
      return NextResponse.json({
        code: 400004,
        message: `无法处理检查点：TODO 项状态为 ${targetItem.status}`,
        data: { status: currentStatus, itemStatus: targetItem.status },
      }, { status: 400 })
    }

    // 执行确认或拒绝
    if (action === 'approve') {
      const stepResult = await agentLoop.approveCheckpoint(itemId, feedback, selectedResourceId)

      // 如果下一步也返回 waiting 状态，构建新的检查点信息
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
        message: '检查点已通过',
        data: {
          ...stepResult,
          status: agentLoop.getStatus(),
          todoList: agentLoop.getTodoList(), // 返回完整的 todoList
          pendingCheckpoint, // 返回下一个检查点（如果有）
        },
      })
    } else {
      if (!reason) {
        return NextResponse.json(
          { code: 400005, message: '拒绝检查点时必须提供 reason', data: null },
          { status: 400 }
        )
      }

      const stepResult = await agentLoop.rejectCheckpoint(itemId, reason)

      return NextResponse.json({
        code: 200,
        message: '检查点已拒绝',
        data: {
          ...stepResult,
          status: agentLoop.getStatus(),
        },
      })
    }
  } catch (error) {
    console.error('[GOI Agent Checkpoint API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '处理检查点失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
