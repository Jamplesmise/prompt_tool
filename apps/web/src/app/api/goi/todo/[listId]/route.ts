/**
 * GOI TODO List 单个资源 API 路由
 *
 * GET - 获取单个 TODO List
 * PUT - 更新 TODO List
 * DELETE - 删除 TODO List
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoStore } from '@/lib/goi/todo/todoStore'
import { wrapTodoList } from '@/lib/goi/todo/todoList'
import { todoListStateMachine } from '@/lib/goi/todo/stateMachine'
import type { TodoListStatus, UpdateTodoListInput } from '@platform/shared'

type RouteParams = {
  params: Promise<{ listId: string }>
}

// ============================================
// GET - 获取单个 TODO List
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

    const { listId } = await params
    const todoList = await todoStore.getById(listId)

    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: todoList,
    })
  } catch (error) {
    console.error('[GOI TODO API] GET error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '获取 TODO List 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - 更新 TODO List
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

    const { listId } = await params
    const body = await request.json()
    const { status, currentItemIndex, metadata, version } = body

    // 获取现有 TODO List
    const existingTodoList = await todoStore.getById(listId)
    if (!existingTodoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 创建管理器
    const manager = wrapTodoList(existingTodoList)

    // 处理状态变更
    if (status && status !== existingTodoList.status) {
      // 验证状态转换
      if (!todoListStateMachine.canTransition(existingTodoList.status, status as TodoListStatus)) {
        return NextResponse.json(
          {
            code: 400003,
            message: `无效的状态转换: ${existingTodoList.status} → ${status}`,
            data: {
              currentStatus: existingTodoList.status,
              requestedStatus: status,
              allowedTransitions: todoListStateMachine.getAllowedTransitions(existingTodoList.status),
            },
          },
          { status: 400 }
        )
      }
    }

    // 构建更新输入
    const updates: UpdateTodoListInput = {}
    if (status) updates.status = status
    if (currentItemIndex !== undefined) updates.currentItemIndex = currentItemIndex
    if (metadata) updates.metadata = metadata

    // 应用更新
    manager.updateList(updates)

    // 保存更新（可选使用乐观锁）
    let savedTodoList
    if (version !== undefined) {
      savedTodoList = await todoStore.saveWithVersion(manager.getTodoList(), version)
      if (!savedTodoList) {
        return NextResponse.json(
          {
            code: 409001,
            message: '版本冲突，数据已被其他操作修改',
            data: null,
          },
          { status: 409 }
        )
      }
    } else {
      savedTodoList = await todoStore.save(manager.getTodoList())
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: savedTodoList,
    })
  } catch (error) {
    console.error('[GOI TODO API] PUT error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '更新 TODO List 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - 删除 TODO List
// ============================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 验证用户会话
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未授权访问', data: null },
        { status: 401 }
      )
    }

    const { listId } = await params
    const deleted = await todoStore.delete(listId)

    if (!deleted) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { deleted: true },
    })
  } catch (error) {
    console.error('[GOI TODO API] DELETE error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '删除 TODO List 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
