/**
 * GOI TODO List API 路由
 *
 * POST - 创建 TODO List
 * GET - 查询 TODO List
 */

import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染，因为使用了 headers (getSession)
export const dynamic = 'force-dynamic'

import { getSession } from '@/lib/auth'
import { todoStore } from '@/lib/goi/todo/todoStore'
import type { CreateTodoListInput } from '@platform/shared'

// ============================================
// POST - 创建 TODO List
// ============================================

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
    const { sessionId, goal, goalAnalysis, items, metadata } = body

    // 验证必填字段
    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: '缺少 sessionId', data: null },
        { status: 400 }
      )
    }

    if (!goal) {
      return NextResponse.json(
        { code: 400002, message: '缺少 goal', data: null },
        { status: 400 }
      )
    }

    // 创建 TODO List 输入
    const input: CreateTodoListInput = {
      sessionId,
      goal,
      goalAnalysis,
      items: items ?? [],
      metadata: {
        ...metadata,
        createdBy: session.id,
      },
    }

    // 创建 TODO List
    const todoList = await todoStore.create(input)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: todoList,
    })
  } catch (error) {
    console.error('[GOI TODO API] POST error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '创建 TODO List 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}

// ============================================
// GET - 查询 TODO List
// ============================================

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
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // 如果指定了 sessionId，获取该会话的 TODO Lists
    if (sessionId) {
      // 检查是否只要最新的
      const latest = searchParams.get('latest')
      if (latest === 'true') {
        const todoList = await todoStore.getLatestBySessionId(sessionId)
        return NextResponse.json({
          code: 200,
          message: 'success',
          data: todoList,
        })
      }

      // 检查是否只要活跃的
      const active = searchParams.get('active')
      if (active === 'true') {
        const todoList = await todoStore.getActiveBySessionId(sessionId)
        return NextResponse.json({
          code: 200,
          message: 'success',
          data: todoList,
        })
      }

      // 获取会话的所有 TODO Lists
      const todoLists = await todoStore.getBySessionId(sessionId)
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: todoLists,
      })
    }

    // 通用查询
    const result = await todoStore.query({
      status: status ? (status.split(',') as any) : undefined,
      createdBy: session.id,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch (error) {
    console.error('[GOI TODO API] GET error:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: error instanceof Error ? error.message : '查询 TODO List 失败',
        data: null,
      },
      { status: 500 }
    )
  }
}
