/**
 * GOI TODO Items 集合 API 路由
 *
 * GET - 获取 TODO List 的所有 Items
 * POST - 添加新的 TODO Item
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { todoStore } from '@/lib/goi/todo/todoStore'
import { wrapTodoList } from '@/lib/goi/todo/todoList'
import type { CreateTodoItemInput } from '@platform/shared'

type RouteParams = {
  params: Promise<{ listId: string }>
}

// ============================================
// GET - 获取 TODO List 的所有 Items
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

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // 过滤 items
    let items = todoList.items
    if (status) {
      const statuses = status.split(',')
      items = items.filter((item) => statuses.includes(item.status))
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        items,
        total: todoList.items.length,
        filtered: items.length,
        progress: todoList.progress,
      },
    })
  } catch (error) {
    console.error('[GOI TODO Items API] GET error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '获取 TODO Items 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// POST - 添加新的 TODO Item
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

    const { listId } = await params
    const body = await request.json()

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 验证 TODO List 状态（只有 planning 或 running 状态可以添加）
    if (!['planning', 'ready', 'running', 'paused'].includes(todoList.status)) {
      return NextResponse.json(
        {
          code: 400011,
          message: `TODO List 状态为 ${todoList.status}，不允许添加新项`,
          data: null,
        },
        { status: 400 }
      )
    }

    // 验证必填字段
    const { title, description, category, goiOperation, dependsOn, priority } = body
    if (!title) {
      return NextResponse.json(
        { code: 400001, message: '缺少 title', data: null },
        { status: 400 }
      )
    }

    // 构建创建输入
    const input: CreateTodoItemInput = {
      title,
      description,
      category,
      goiOperation,
      dependsOn: dependsOn ?? [],
      priority,
      checkpoint: body.checkpoint,
      rollback: body.rollback,
      metadata: body.metadata,
    }

    // 验证依赖项
    if (input.dependsOn && input.dependsOn.length > 0) {
      const existingIds = new Set(todoList.items.map((i) => i.id))
      const invalidDeps = input.dependsOn.filter((depId) => !existingIds.has(depId))
      if (invalidDeps.length > 0) {
        return NextResponse.json(
          {
            code: 400012,
            message: `无效的依赖项: ${invalidDeps.join(', ')}`,
            data: null,
          },
          { status: 400 }
        )
      }
    }

    // 添加 TODO Item
    const manager = wrapTodoList(todoList)
    const newItem = manager.addItem(input)

    // 保存更新
    const savedTodoList = await todoStore.save(manager.getTodoList())

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        item: newItem,
        todoList: savedTodoList,
      },
    })
  } catch (error) {
    console.error('[GOI TODO Items API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '添加 TODO Item 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// PUT - 批量添加/重新规划 TODO Items
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
    const { items, replan, reason } = body

    // 获取 TODO List
    const todoList = await todoStore.getById(listId)
    if (!todoList) {
      return NextResponse.json(
        { code: 404001, message: 'TODO List 不存在', data: null },
        { status: 404 }
      )
    }

    // 验证 items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { code: 400013, message: '缺少 items 数组或为空', data: null },
        { status: 400 }
      )
    }

    // 验证每个 item
    for (const item of items) {
      if (!item.title) {
        return NextResponse.json(
          { code: 400001, message: '每个 item 必须有 title', data: null },
          { status: 400 }
        )
      }
    }

    const manager = wrapTodoList(todoList)

    if (replan) {
      // 重新规划：标记现有未完成项为 replanned，添加新项
      manager.replan(items, reason)
    } else {
      // 批量添加
      for (const itemInput of items) {
        const input: CreateTodoItemInput = {
          title: itemInput.title,
          description: itemInput.description,
          category: itemInput.category,
          goiOperation: itemInput.goiOperation,
          dependsOn: itemInput.dependsOn ?? [],
          priority: itemInput.priority,
          checkpoint: itemInput.checkpoint,
          rollback: itemInput.rollback,
          metadata: itemInput.metadata,
        }
        manager.addItem(input)
      }
    }

    // 保存更新
    const savedTodoList = await todoStore.save(manager.getTodoList())

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        replan: !!replan,
        addedCount: items.length,
        todoList: savedTodoList,
      },
    })
  } catch (error) {
    console.error('[GOI TODO Items API] PUT error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '批量操作 TODO Items 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
