import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import { validateCode } from '@/lib/sandbox'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/evaluators - 获取评估器列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type.toUpperCase()
    }

    const evaluators = await prisma.evaluator.findMany({
      where,
      orderBy: [{ isPreset: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isPreset: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const list = evaluators.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      type: e.type.toLowerCase(),
      isPreset: e.isPreset,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }))

    return NextResponse.json(success({
      list,
      total: list.length,
    }))
  } catch (err) {
    console.error('Get evaluators error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取评估器列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/evaluators - 创建评估器
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, type, config } = body

    // 参数验证
    if (!name) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '名称不能为空'),
        { status: 400 }
      )
    }

    const validTypes = ['code', 'preset', 'llm', 'composite']
    if (!type || !validTypes.includes(type.toLowerCase())) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, `类型必须为 ${validTypes.join(', ')} 之一`),
        { status: 400 }
      )
    }

    const evaluatorType = type.toLowerCase()

    // 验证代码评估器配置
    if (evaluatorType === 'code') {
      if (!config?.code) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, '代码评估器必须提供代码'),
          { status: 400 }
        )
      }

      // 验证语言类型
      const language = config.language || 'nodejs'
      const validLanguages = ['nodejs', 'python']
      if (!validLanguages.includes(language)) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `语言必须为 ${validLanguages.join(' 或 ')}`),
          { status: 400 }
        )
      }

      // 验证代码语法
      const validation = validateCode(config.code, language)
      if (!validation.valid) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `代码语法错误: ${validation.error}`),
          { status: 400 }
        )
      }
    }

    // 验证预置评估器配置
    if (evaluatorType === 'preset') {
      const validPresetTypes = ['exact_match', 'contains', 'regex', 'json_schema', 'similarity']
      if (!config?.presetType || !validPresetTypes.includes(config.presetType)) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `预置类型必须为 ${validPresetTypes.join(', ')} 之一`),
          { status: 400 }
        )
      }
    }

    // 验证 LLM 评估器配置
    if (evaluatorType === 'llm') {
      if (!config?.modelId) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, 'LLM 评估器必须指定模型'),
          { status: 400 }
        )
      }
    }

    // 验证组合评估器配置
    if (evaluatorType === 'composite') {
      if (!config?.evaluatorIds || !Array.isArray(config.evaluatorIds) || config.evaluatorIds.length === 0) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, '组合评估器必须指定子评估器'),
          { status: 400 }
        )
      }
    }

    // 根据类型构建配置
    let evaluatorConfig: Record<string, unknown>
    if (evaluatorType === 'code') {
      evaluatorConfig = {
        language: config?.language || 'nodejs',
        code: config?.code || '',
        timeout: config?.timeout || 5000,
      }
    } else if (evaluatorType === 'llm') {
      evaluatorConfig = {
        modelId: config.modelId,
        prompt: config.prompt || '',
        scoreRange: config.scoreRange || { min: 0, max: 10 },
        passThreshold: config.passThreshold ?? 0.6,
      }
    } else if (evaluatorType === 'composite') {
      evaluatorConfig = {
        evaluatorIds: config.evaluatorIds,
        mode: config.mode || 'parallel',
        aggregation: config.aggregation || 'and',
        weights: config.weights,
      }
    } else {
      // preset 类型
      evaluatorConfig = {
        presetType: config.presetType,
        params: config.params || {},
      }
    }

    const evaluator = await prisma.evaluator.create({
      data: {
        name,
        description: description || null,
        type: evaluatorType.toUpperCase(),
        config: evaluatorConfig as object,
        isPreset: false,
        createdById: session.id,
      },
    })

    return NextResponse.json(
      success({
        id: evaluator.id,
        name: evaluator.name,
        description: evaluator.description,
        type: evaluator.type.toLowerCase(),
        config: evaluator.config,
        isPreset: evaluator.isPreset,
        createdAt: evaluator.createdAt.toISOString(),
        updatedAt: evaluator.updatedAt.toISOString(),
      })
    )
  } catch (err) {
    console.error('Create evaluator error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建评估器失败'),
      { status: 500 }
    )
  }
}
