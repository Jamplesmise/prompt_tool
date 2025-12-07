import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { detectPatterns, generateSuggestions } from '@/lib/analysis'
import type { FailedResult, PromptInfo } from '@/lib/analysis'

// 强制动态渲染
export const dynamic = 'force-dynamic'

// POST /api/v1/analysis/suggestions - 生成优化建议
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { taskId, promptId } = body

    if (!taskId) {
      return NextResponse.json(badRequest('taskId 是必填项'), { status: 400 })
    }

    // 验证任务存在且属于当前用户
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        createdById: session.id,
      },
      select: {
        id: true,
        prompts: {
          include: {
            prompt: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 获取提示词信息
    let promptInfo: PromptInfo | null = null

    // 获取任务关联的提示词版本
    const taskPrompts = task.prompts
    const targetPromptId = promptId || taskPrompts[0]?.promptId

    if (targetPromptId) {
      const taskPrompt = taskPrompts.find(p => p.promptId === targetPromptId)
      if (taskPrompt) {
        // 获取提示词版本内容
        const promptVersion = await prisma.promptVersion.findUnique({
          where: { id: taskPrompt.promptVersionId },
          include: { prompt: true },
        })
        if (promptVersion) {
          promptInfo = {
            id: promptVersion.prompt.id,
            name: promptVersion.prompt.name,
            content: promptVersion.content,
          }
        }
      }
    }

    if (!promptInfo) {
      return NextResponse.json(badRequest('未找到提示词信息'), { status: 400 })
    }

    // 获取失败的结果
    const failedResults = await prisma.taskResult.findMany({
      where: {
        taskId,
        OR: [
          { status: { in: ['FAILED', 'ERROR', 'TIMEOUT'] } },
          { evaluations: { some: { passed: false } } },
        ],
      },
      include: {
        evaluations: {
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: 500,
    })

    // 转换格式
    const analysisResults: FailedResult[] = failedResults.map(r => ({
      id: r.id,
      input: r.input as Record<string, unknown>,
      output: r.output,
      expected: r.expected,
      status: r.status,
      error: r.error,
      evaluations: r.evaluations.map(e => ({
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        passed: e.passed,
        score: e.score ? Number(e.score) : null,
        reason: e.reason,
      })),
    }))

    // 检测失败模式
    const detectionResult = detectPatterns(analysisResults)

    // 生成优化建议
    const suggestions = generateSuggestions(detectionResult.patterns, promptInfo)

    return NextResponse.json(
      success({
        taskId,
        promptId: promptInfo.id,
        promptName: promptInfo.name,
        suggestions,
        patternsAnalyzed: detectionResult.patterns.length,
        totalFailed: detectionResult.totalFailed,
      })
    )
  } catch (err) {
    console.error('Generate suggestions error:', err)
    return NextResponse.json(internalError('生成优化建议失败'), { status: 500 })
  }
}
