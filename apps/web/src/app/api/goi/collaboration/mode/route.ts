/**
 * 模式切换 API
 * GET /api/goi/collaboration/mode - 获取当前模式
 * POST /api/goi/collaboration/mode - 切换模式
 */

import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染，因为使用了 searchParams
export const dynamic = 'force-dynamic'
import { getControlTransferManager } from '@/lib/goi/collaboration'
import { getCheckpointRuleEngine } from '@/lib/goi/checkpoint'
import type { CollaborationMode } from '@platform/shared'

// 模式配置映射
const MODE_RULE_MAP: Record<CollaborationMode, 'step' | 'smart' | 'auto'> = {
  manual: 'step',
  assisted: 'smart',
  auto: 'auto',
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    // 获取当前模式（从规则引擎推断）
    const ruleEngine = getCheckpointRuleEngine()
    const rules = ruleEngine.getRules()

    // 根据规则判断模式
    let mode: CollaborationMode = 'assisted'
    const hasStepRule = rules.some((r) => r.id === 'step-mode-all-confirm')
    const hasAutoRule = rules.some((r) => r.id === 'auto-mode-auto-pass')

    if (hasStepRule) {
      mode = 'manual'
    } else if (hasAutoRule) {
      mode = 'auto'
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        sessionId,
        mode,
        modeConfig: {
          manual: {
            description: '纯人工模式',
            checkpointPolicy: 'AI 不执行操作，只观察和建议',
          },
          assisted: {
            description: 'AI 辅助模式（推荐）',
            checkpointPolicy: '根据规则智能判断是否需要确认',
          },
          auto: {
            description: 'AI 自动模式',
            checkpointPolicy: '除删除外都自动执行',
          },
        },
      },
    })
  } catch (error) {
    console.error('[Collaboration API] Failed to get mode:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to get mode', data: null },
      { status: 500 }
    )
  }
}

type PostRequestBody = {
  sessionId: string
  mode: CollaborationMode
}

export async function POST(request: NextRequest) {
  try {
    const body: PostRequestBody = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    if (!body.mode) {
      return NextResponse.json(
        { code: 400002, message: 'mode is required', data: null },
        { status: 400 }
      )
    }

    const validModes: CollaborationMode[] = ['manual', 'assisted', 'auto']
    if (!validModes.includes(body.mode)) {
      return NextResponse.json(
        {
          code: 400003,
          message: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
          data: null,
        },
        { status: 400 }
      )
    }

    // 更新规则引擎
    const ruleEngine = getCheckpointRuleEngine()
    ruleEngine.switchModeRules(MODE_RULE_MAP[body.mode])

    // 更新控制权管理器
    const transferManager = getControlTransferManager()
    transferManager.setMode(body.mode)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        sessionId: body.sessionId,
        mode: body.mode,
        rules: ruleEngine.getRules(),
      },
    })
  } catch (error) {
    console.error('[Collaboration API] Failed to switch mode:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to switch mode', data: null },
      { status: 500 }
    )
  }
}
