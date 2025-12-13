/**
 * 上下文管理 API
 *
 * GET: 获取上下文使用量
 * POST: 触发压缩
 */

import { NextRequest, NextResponse } from 'next/server'
import type {
  CompressionLevel,
  ContextUsage,
  CompressionResult,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

type GetContextResponse = {
  code: number
  message: string
  data: {
    usage: ContextUsage
    suggestion: {
      shouldCompress: boolean
      level?: CompressionLevel
      urgency: string
      message?: string
    }
  } | null
}

type PostCompressRequest = {
  sessionId: string
  level: CompressionLevel
}

type PostCompressResponse = {
  code: number
  message: string
  data: CompressionResult | null
}

// ============================================
// Mock 数据（实际应从 ContextManager 获取）
// ============================================

function getMockUsage(sessionId: string): ContextUsage {
  // 模拟数据，实际应从 ContextManager 获取
  const mockUsagePercent = Math.random() * 100
  const mockTotalTokens = Math.round(mockUsagePercent * 1800)

  return {
    totalTokens: mockTotalTokens,
    maxTokens: 180000,
    usagePercent: mockUsagePercent,
    layerBreakdown: {
      system: 2000,
      session: Math.round(mockTotalTokens * 0.4),
      working: Math.round(mockTotalTokens * 0.35),
      instant: Math.round(mockTotalTokens * 0.15),
    },
    warningLevel:
      mockUsagePercent >= 95
        ? 'critical'
        : mockUsagePercent >= 90
          ? 'high'
          : mockUsagePercent >= 70
            ? 'warning'
            : 'normal',
    calculatedAt: new Date(),
  }
}

function getMockSuggestion(usage: ContextUsage) {
  const { usagePercent, warningLevel } = usage

  if (usagePercent >= 95) {
    return {
      shouldCompress: true,
      level: 'deep' as CompressionLevel,
      urgency: 'critical',
      message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，必须立即压缩`,
    }
  }

  if (usagePercent >= 90) {
    return {
      shouldCompress: true,
      level: 'deep' as CompressionLevel,
      urgency: 'high',
      message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，建议立即压缩`,
    }
  }

  if (usagePercent >= 85) {
    return {
      shouldCompress: true,
      level: 'standard' as CompressionLevel,
      urgency: 'medium',
      message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，自动触发压缩`,
    }
  }

  if (usagePercent >= 70) {
    return {
      shouldCompress: false,
      urgency: 'low',
      message: `上下文使用率已达 ${usagePercent.toFixed(1)}%，建议手动压缩`,
    }
  }

  return {
    shouldCompress: false,
    urgency: 'none',
  }
}

// ============================================
// GET: 获取上下文使用量
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<GetContextResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        code: 400001,
        message: '缺少 sessionId 参数',
        data: null,
      })
    }

    // TODO: 从实际的 ContextManager 获取数据
    // const manager = await getContextManager(sessionId)
    // const usage = manager.getUsage()
    // const suggestion = manager.checkThreshold()

    const usage = getMockUsage(sessionId)
    const suggestion = getMockSuggestion(usage)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        usage,
        suggestion,
      },
    })
  } catch (error) {
    console.error('Get context usage error:', error)
    return NextResponse.json({
      code: 500001,
      message: '获取上下文使用量失败',
      data: null,
    })
  }
}

// ============================================
// POST: 触发压缩
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<PostCompressResponse>> {
  try {
    const body = (await request.json()) as PostCompressRequest
    const { sessionId, level } = body

    if (!sessionId) {
      return NextResponse.json({
        code: 400001,
        message: '缺少 sessionId 参数',
        data: null,
      })
    }

    if (!level) {
      return NextResponse.json({
        code: 400002,
        message: '缺少 level 参数',
        data: null,
      })
    }

    const validLevels: CompressionLevel[] = ['standard', 'deep', 'phase', 'checkpoint']
    if (!validLevels.includes(level)) {
      return NextResponse.json({
        code: 400003,
        message: '无效的压缩级别',
        data: null,
      })
    }

    // TODO: 实际执行压缩
    // const manager = await getContextManager(sessionId)
    // const compressor = createCompressor({ llmInvoker: ... })
    // const result = await compressor.compress(...)

    // 模拟压缩结果
    const retentionRates: Record<CompressionLevel, number> = {
      standard: 0.6,
      deep: 0.3,
      phase: 0.2,
      checkpoint: 0.5,
    }

    const beforeTokens = Math.round(Math.random() * 100000 + 50000)
    const compressionRatio = retentionRates[level]
    const afterTokens = Math.round(beforeTokens * compressionRatio)

    const result: CompressionResult = {
      success: true,
      beforeTokens,
      afterTokens,
      compressionRatio,
      summary: {
        goal: '用户目标示例',
        completedPhases: [
          { name: '阶段1', summary: '已完成资源选择', itemCount: 3 },
        ],
        currentState: {
          page: '/tasks/new',
          selectedResources: [
            { type: 'prompt', id: 'prompt-123', name: '示例提示词' },
          ],
        },
        keyDecisions: ['选择了标准模板'],
        nextStep: '继续配置评估器',
        constraints: ['使用精确匹配评估'],
        version: 1,
        generatedAt: new Date(),
      },
      droppedInfo: ['中间查询结果', '调试日志'],
      duration: Math.round(Math.random() * 1000 + 500),
      compressedAt: new Date(),
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    })
  } catch (error) {
    console.error('Compress context error:', error)
    return NextResponse.json({
      code: 500001,
      message: '压缩上下文失败',
      data: null,
    })
  }
}
