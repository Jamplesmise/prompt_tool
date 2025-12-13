/**
 * 检查点规则配置 API
 * GET /api/goi/checkpoint/rules - 获取当前规则
 * PUT /api/goi/checkpoint/rules - 更新规则
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getCheckpointRuleEngine,
  DEFAULT_CHECKPOINT_RULES,
  STEP_MODE_RULES,
  AUTO_MODE_RULES,
} from '@/lib/goi/checkpoint'
import type { CheckpointRule } from '@platform/shared'

/**
 * 获取当前规则列表
 */
export async function GET() {
  try {
    const ruleEngine = getCheckpointRuleEngine()
    const rules = ruleEngine.getRules()

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        rules,
        presets: {
          default: DEFAULT_CHECKPOINT_RULES,
          step: STEP_MODE_RULES,
          auto: AUTO_MODE_RULES,
        },
      },
    })
  } catch (error) {
    console.error('[Checkpoint API] Failed to get rules:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to get rules', data: null },
      { status: 500 }
    )
  }
}

type PutRequestBody = {
  sessionId: string
  rules?: Omit<CheckpointRule, 'createdAt'>[]
  mode?: 'step' | 'smart' | 'auto'
  replace?: boolean
}

/**
 * 更新规则配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body: PutRequestBody = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    const ruleEngine = getCheckpointRuleEngine()

    // 如果指定了模式，切换模式规则
    if (body.mode) {
      const validModes = ['step', 'smart', 'auto']
      if (!validModes.includes(body.mode)) {
        return NextResponse.json(
          {
            code: 400002,
            message: `Invalid mode. Must be one of: ${validModes.join(', ')}`,
            data: null,
          },
          { status: 400 }
        )
      }

      ruleEngine.switchModeRules(body.mode)

      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          mode: body.mode,
          rules: ruleEngine.getRules(),
        },
      })
    }

    // 如果提供了自定义规则
    if (body.rules && body.rules.length > 0) {
      // 验证规则
      for (const rule of body.rules) {
        if (!rule.id || !rule.name || !rule.trigger || !rule.action) {
          return NextResponse.json(
            {
              code: 400003,
              message: 'Each rule must have id, name, trigger, and action',
              data: null,
            },
            { status: 400 }
          )
        }
      }

      // 添加创建时间
      const rulesWithTime: CheckpointRule[] = body.rules.map((r) => ({
        ...r,
        createdAt: new Date(),
      }))

      ruleEngine.addUserRules(rulesWithTime)

      return NextResponse.json({
        code: 200,
        message: 'success',
        data: {
          added: rulesWithTime.length,
          rules: ruleEngine.getRules(),
        },
      })
    }

    return NextResponse.json({
      code: 200,
      message: 'No changes made',
      data: {
        rules: ruleEngine.getRules(),
      },
    })
  } catch (error) {
    console.error('[Checkpoint API] Failed to update rules:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to update rules', data: null },
      { status: 500 }
    )
  }
}
