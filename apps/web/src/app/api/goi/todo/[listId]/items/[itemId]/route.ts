/**
 * GOI TODO Item API 路由
 *
 * GET - 获取单个 TODO Item
 * PUT - 更新 TODO Item（状态转换）
 * POST - 执行 TODO Item 操作（重试、跳过等）
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoStore } from '@/lib/goi/todo/todoStore'
import { wrapTodoList } from '@/lib/goi/todo/todoList'
import {
  todoItemStateMachine,
  transitionTodoItem,
  type TransitionContext,
} from '@/lib/goi/todo/stateMachine'
import type { TodoItemStatus, UpdateTodoItemInput } from '@platform/shared'

type RouteParams = {
  params: Promise<{ listId: string; itemId: string }>
}

// ============================================
// GET - 获取单个 TODO Item
// ============================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    const { listId, itemId } = await params

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 获取 TODO Item
    const item = todoList.items.find((i) => i.id === itemId)
    if (!item) {
      return NextResponse.json(
        { code: 404002, message: 'TODO Item 不存在', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: item,
    })
  } catch (error) {
    console.error('[GOI TODO Item API] GET error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '获取 TODO Item 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - 更新 TODO Item（状态转换）
// ============================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    const { listId, itemId } = await params
    const body = await request.json()
    const { status, result, error, userFeedback, metadata } = body

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 获取 TODO Item
    const item = todoList.items.find((i) => i.id === itemId)
    if (!item) {
      return NextResponse.json(
        { code: 404002, message: 'TODO Item 不存在', data: null },
        { status: 404 }
      )
    }

    // 如果有状态变更，使用状态机处理
    if (status && status !== item.status) {
      // 验证状态转换
      if (!todoItemStateMachine.canTransition(item.status, status as TodoItemStatus)) {
        return NextResponse.json(
          {
            code: 400003,
            message: `无效的状态转换: ${item.status} → ${status}`,
            data: {
              currentStatus: item.status,
              requestedStatus: status,
              allowedTransitions: todoItemStateMachine.getAllowedTransitions(item.status),
            },
          },
          { status: 400 }
        )
      }

      // 执行状态转换
      const context: TransitionContext = {
        sessionId: todoList.sessionId,
        todoListId: listId,
        reason: body.reason,
        data: { userFeedback, userId: session.id },
      }

      const transitionResult = await transitionTodoItem(item, status as TodoItemStatus, context)
      if (!transitionResult.success) {
        return NextResponse.json(
          {
            code: 400004,
            message: transitionResult.error || '状态转换失败',
            data: null,
          },
          { status: 400 }
        )
      }
    }

    // 更新其他字段
    const updates: UpdateTodoItemInput = {}
    if (result !== undefined) updates.result = result
    if (error !== undefined) updates.error = error
    if (userFeedback !== undefined) updates.userFeedback = userFeedback
    if (metadata !== undefined) updates.metadata = metadata

    // 如果有其他更新，应用它们
    if (Object.keys(updates).length > 0) {
      const manager = wrapTodoList(todoList)
      manager.updateItem(itemId, updates)
    }

    // 保存更新
    const savedTodoList = await todoStore.save(todoList)

    // 返回更新后的 item
    const updatedItem = savedTodoList.items.find((i) => i.id === itemId)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        item: updatedItem,
        todoList: savedTodoList,
      },
    })
  } catch (error) {
    console.error('[GOI TODO Item API] PUT error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '更新 TODO Item 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// POST - 执行 TODO Item 操作
// ============================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    const { listId, itemId } = await params
    const body = await request.json()
    const { action, reason } = body

    // 验证 action
    const validActions = ['retry', 'skip', 'approve', 'reject']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        {
          code: 400005,
          message: `无效的操作: ${action}，支持的操作: ${validActions.join(', ')}`,
          data: null,
        },
        { status: 400 }
      )
    }

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 获取 TODO Item
    const item = todoList.items.find((i) => i.id === itemId)
    if (!item) {
      return NextResponse.json(
        { code: 404002, message: 'TODO Item 不存在', data: null },
        { status: 404 }
      )
    }

    const manager = wrapTodoList(todoList)
    let success = false
    let targetStatus: TodoItemStatus | null = null

    switch (action) {
      case 'retry':
        // 重试失败的项
        if (item.status !== 'failed') {
          return NextResponse.json(
            { code: 400006, message: '只有 failed 状态的项可以重试', data: null },
            { status: 400 }
          )
        }
        success = manager.retryFailedItem(itemId)
        targetStatus = 'pending'
        break

      case 'skip':
        // 跳过项
        if (!['pending', 'failed'].includes(item.status)) {
          return NextResponse.json(
            { code: 400007, message: '只有 pending 或 failed 状态的项可以跳过', data: null },
            { status: 400 }
          )
        }
        success = manager.skipItem(itemId, reason)
        targetStatus = 'skipped'
        break

      case 'approve':
        // 批准等待确认的项
        if (item.status !== 'waiting') {
          return NextResponse.json(
            { code: 400008, message: '只有 waiting 状态的项可以批准', data: null },
            { status: 400 }
          )
        }
        // 使用状态机转换
        const approveContext: TransitionContext = {
          sessionId: todoList.sessionId,
          todoListId: listId,
          reason: 'user_approved',
          data: { userId: session.id },
        }
        const approveResult = await transitionTodoItem(item, 'completed', approveContext)
        success = approveResult.success
        targetStatus = 'completed'
        break

      case 'reject':
        // 拒绝等待确认的项
        if (item.status !== 'waiting') {
          return NextResponse.json(
            { code: 400009, message: '只有 waiting 状态的项可以拒绝', data: null },
            { status: 400 }
          )
        }
        // 使用状态机转换到 failed
        const rejectContext: TransitionContext = {
          sessionId: todoList.sessionId,
          todoListId: listId,
          reason: reason || 'user_rejected',
          data: { userId: session.id },
        }
        const rejectResult = await transitionTodoItem(item, 'failed', rejectContext)
        success = rejectResult.success
        targetStatus = 'failed'
        break
    }

    if (!success) {
      return NextResponse.json(
        { code: 400010, message: `操作 ${action} 执行失败`, data: null },
        { status: 400 }
      )
    }

    // 保存更新
    const savedTodoList = await todoStore.save(manager.getTodoList())
    const updatedItem = savedTodoList.items.find((i) => i.id === itemId)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        action,
        previousStatus: item.status,
        currentStatus: targetStatus,
        item: updatedItem,
        todoList: savedTodoList,
      },
    })
  } catch (error) {
    console.error('[GOI TODO Item API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '执行操作失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
