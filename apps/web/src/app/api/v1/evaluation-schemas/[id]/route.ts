import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

export const dynamic = 'force-dynamic'

// GET /api/v1/evaluation-schemas/:id - 获取评估结构详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const schema = await prisma.evaluationSchema.findUnique({
      where: { id },
      include: {
        inputSchema: true,
        outputSchema: true,
        _count: {
          select: { prompts: true, datasets: true },
        },
      },
    })

    if (!schema) {
      return NextResponse.json(error(ERROR_CODES.NOT_FOUND, '评估结构不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        id: schema.id,
        name: schema.name,
        description: schema.description,
        inputSchema: schema.inputSchema
          ? {
              id: schema.inputSchema.id,
              name: schema.inputSchema.name,
              description: schema.inputSchema.description,
              variables: schema.inputSchema.variables,
              createdAt: schema.inputSchema.createdAt.toISOString(),
              updatedAt: schema.inputSchema.updatedAt.toISOString(),
            }
          : null,
        outputSchema: schema.outputSchema
          ? {
              id: schema.outputSchema.id,
              name: schema.outputSchema.name,
              description: schema.outputSchema.description,
              fields: schema.outputSchema.fields,
              parseMode: schema.outputSchema.parseMode,
              parseConfig: schema.outputSchema.parseConfig,
              aggregation: schema.outputSchema.aggregation,
              createdAt: schema.outputSchema.createdAt.toISOString(),
              updatedAt: schema.outputSchema.updatedAt.toISOString(),
            }
          : null,
        createdById: schema.createdById,
        teamId: schema.teamId,
        createdAt: schema.createdAt.toISOString(),
        updatedAt: schema.updatedAt.toISOString(),
        _count: schema._count,
      })
    )
  } catch (err) {
    console.error('Get evaluation schema error:', err)
    return NextResponse.json(error(ERROR_CODES.INTERNAL_ERROR, '获取评估结构详情失败'), {
      status: 500,
    })
  }
}

// PUT /api/v1/evaluation-schemas/:id - 更新评估结构
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, inputSchema, outputSchema } = body

    // 检查是否存在
    const existing = await prisma.evaluationSchema.findUnique({
      where: { id },
      include: {
        inputSchema: true,
        outputSchema: true,
      },
    })

    if (!existing) {
      return NextResponse.json(error(ERROR_CODES.NOT_FOUND, '评估结构不存在'), { status: 404 })
    }

    // 使用事务更新
    const result = await prisma.$transaction(async (tx) => {
      // 更新评估结构基本信息
      const updatedSchema = await tx.evaluationSchema.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          description: description !== undefined ? description : undefined,
        },
      })

      // 更新输入结构
      let updatedInputSchema = existing.inputSchema
      if (inputSchema !== undefined) {
        if (inputSchema === null) {
          // 删除关联的输入结构
          if (existing.inputSchema) {
            await tx.inputSchema.delete({ where: { id: existing.inputSchema.id } })
            updatedInputSchema = null
          }
        } else if (existing.inputSchema) {
          // 更新现有的输入结构
          updatedInputSchema = await tx.inputSchema.update({
            where: { id: existing.inputSchema.id },
            data: {
              name: inputSchema.name || existing.inputSchema.name,
              description:
                inputSchema.description !== undefined
                  ? inputSchema.description
                  : existing.inputSchema.description,
              variables:
                inputSchema.variables !== undefined
                  ? (inputSchema.variables as object)
                  : (existing.inputSchema.variables as object),
            },
          })
        } else {
          // 创建新的输入结构
          updatedInputSchema = await tx.inputSchema.create({
            data: {
              name: inputSchema.name || `${updatedSchema.name} - 输入结构`,
              description: inputSchema.description || null,
              variables: (inputSchema.variables as object) || [],
              createdById: session.id,
              teamId: existing.teamId,
              evaluationSchemaId: id,
            },
          })
        }
      }

      // 更新输出结构
      let updatedOutputSchema = existing.outputSchema
      if (outputSchema !== undefined) {
        if (outputSchema === null) {
          // 删除关联的输出结构
          if (existing.outputSchema) {
            await tx.outputSchema.delete({ where: { id: existing.outputSchema.id } })
            updatedOutputSchema = null
          }
        } else if (existing.outputSchema) {
          // 更新现有的输出结构
          updatedOutputSchema = await tx.outputSchema.update({
            where: { id: existing.outputSchema.id },
            data: {
              name: outputSchema.name || existing.outputSchema.name,
              description:
                outputSchema.description !== undefined
                  ? outputSchema.description
                  : existing.outputSchema.description,
              fields:
                outputSchema.fields !== undefined
                  ? (outputSchema.fields as object)
                  : (existing.outputSchema.fields as object),
              parseMode: outputSchema.parseMode || existing.outputSchema.parseMode,
              parseConfig:
                outputSchema.parseConfig !== undefined
                  ? (outputSchema.parseConfig as object)
                  : (existing.outputSchema.parseConfig as object),
              aggregation:
                outputSchema.aggregation !== undefined
                  ? (outputSchema.aggregation as object)
                  : (existing.outputSchema.aggregation as object),
            },
          })
        } else {
          // 创建新的输出结构
          updatedOutputSchema = await tx.outputSchema.create({
            data: {
              name: outputSchema.name || `${updatedSchema.name} - 输出结构`,
              description: outputSchema.description || null,
              fields: (outputSchema.fields as object) || [],
              parseMode: outputSchema.parseMode || 'JSON_EXTRACT',
              parseConfig: (outputSchema.parseConfig as object) || {},
              aggregation: (outputSchema.aggregation as object) || { mode: 'critical_first' },
              createdById: session.id,
              teamId: existing.teamId,
              evaluationSchemaId: id,
            },
          })
        }
      }

      return {
        evaluationSchema: updatedSchema,
        inputSchema: updatedInputSchema,
        outputSchema: updatedOutputSchema,
      }
    })

    return NextResponse.json(
      success({
        id: result.evaluationSchema.id,
        name: result.evaluationSchema.name,
        description: result.evaluationSchema.description,
        inputSchema: result.inputSchema
          ? {
              id: result.inputSchema.id,
              name: result.inputSchema.name,
              description: result.inputSchema.description,
              variables: result.inputSchema.variables,
            }
          : null,
        outputSchema: result.outputSchema
          ? {
              id: result.outputSchema.id,
              name: result.outputSchema.name,
              description: result.outputSchema.description,
              fields: result.outputSchema.fields,
              parseMode: result.outputSchema.parseMode,
              parseConfig: result.outputSchema.parseConfig,
              aggregation: result.outputSchema.aggregation,
            }
          : null,
        createdById: result.evaluationSchema.createdById,
        teamId: result.evaluationSchema.teamId,
        updatedAt: result.evaluationSchema.updatedAt.toISOString(),
      })
    )
  } catch (err) {
    console.error('Update evaluation schema error:', err)
    return NextResponse.json(error(ERROR_CODES.INTERNAL_ERROR, '更新评估结构失败'), {
      status: 500,
    })
  }
}

// DELETE /api/v1/evaluation-schemas/:id - 删除评估结构
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查是否存在及关联情况
    const existing = await prisma.evaluationSchema.findUnique({
      where: { id },
      include: {
        inputSchema: true,
        outputSchema: true,
        _count: {
          select: { prompts: true, datasets: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(error(ERROR_CODES.NOT_FOUND, '评估结构不存在'), { status: 404 })
    }

    // 检查是否有关联的提示词或数据集
    if (existing._count.prompts > 0 || existing._count.datasets > 0) {
      return NextResponse.json(
        error(
          ERROR_CODES.VALIDATION_ERROR,
          `无法删除：该评估结构关联了 ${existing._count.prompts} 个提示词和 ${existing._count.datasets} 个数据集`
        ),
        { status: 400 }
      )
    }

    // 使用事务删除
    await prisma.$transaction(async (tx) => {
      // 先删除关联的输入输出结构
      if (existing.inputSchema) {
        await tx.inputSchema.delete({ where: { id: existing.inputSchema.id } })
      }
      if (existing.outputSchema) {
        await tx.outputSchema.delete({ where: { id: existing.outputSchema.id } })
      }
      // 最后删除评估结构
      await tx.evaluationSchema.delete({ where: { id } })
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete evaluation schema error:', err)
    return NextResponse.json(error(ERROR_CODES.INTERNAL_ERROR, '删除评估结构失败'), {
      status: 500,
    })
  }
}
