/**
 * GOI 验证 Prompt
 *
 * 用于引导 LLM 验证操作执行结果
 */

import type { TodoItem, GoiOperation } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 验证结果
 */
export type VerifyResult = {
  /** 是否验证通过 */
  success: boolean
  /** 验证方式 */
  method: 'rule' | 'llm'
  /** 验证原因/说明 */
  reason: string
  /** 置信度 (0-1) */
  confidence: number
  /** 是否需要人工确认 */
  needsHumanReview: boolean
  /** 建议的下一步操作 */
  suggestedAction?: 'continue' | 'retry' | 'skip' | 'replan'
  /** 详细信息 */
  details?: Record<string, unknown>
}

/**
 * 验证上下文
 */
export type VerifyContext = {
  /** 期望的结果 */
  expectedOutcome?: string
  /** 前置依赖的结果 */
  dependencyResults?: Record<string, unknown>
  /** 额外的验证规则 */
  additionalRules?: string[]
}

// ============================================
// Prompt 模板
// ============================================

/**
 * 验证系统 Prompt
 */
export const VERIFY_SYSTEM_PROMPT = `你是一个操作验证专家。你的任务是验证操作执行结果是否符合预期。

## 验证原则

1. **结果正确性**：操作是否产生了预期的结果
2. **状态一致性**：系统状态是否与预期一致
3. **错误检测**：是否有异常或错误发生
4. **副作用检查**：是否产生了意外的副作用

## 页面路由映射（重要）

以下资源类型共用同一个页面，导航结果正确：
- provider（模型供应商）和 model（模型）都在 "/models" 页面
- alert_rule（告警规则）和 notify_channel（通知渠道）都在 "/monitor/alerts" 页面
- input_schema 和 output_schema 都在 "/schemas" 页面

**验证导航时**：如果 resourceType 是 provider 且 navigatedTo 是 "/models"，这是正确的！

## 输出格式

返回 JSON 格式的验证结果：

\`\`\`json
{
  "success": true/false,
  "reason": "验证通过/失败的原因说明",
  "confidence": 0.0-1.0,
  "needsHumanReview": true/false,
  "suggestedAction": "continue|retry|skip|replan",
  "details": {
    "checkedItems": ["检查项1", "检查项2"],
    "issues": ["发现的问题"]
  }
}
\`\`\`

## 验证规则

- confidence >= 0.8 且 success = true：自动通过
- confidence < 0.8 或存在不确定因素：需要人工确认
- 明确失败：返回 success = false 和失败原因
`

/**
 * 构建验证用户 Prompt
 */
export function buildVerifyUserPrompt(
  todoItem: TodoItem,
  executionResult: unknown,
  context?: VerifyContext
): string {
  let prompt = `## 待验证操作

**标题**: ${todoItem.title}
**描述**: ${todoItem.description}
**类别**: ${todoItem.category}

## 操作定义

\`\`\`json
${JSON.stringify(todoItem.goiOperation, null, 2)}
\`\`\`

## 执行结果

\`\`\`json
${JSON.stringify(executionResult, null, 2)}
\`\`\`
`

  if (context?.expectedOutcome) {
    prompt += `
## 期望结果

${context.expectedOutcome}
`
  }

  if (context?.dependencyResults && Object.keys(context.dependencyResults).length > 0) {
    prompt += `
## 前置依赖结果

\`\`\`json
${JSON.stringify(context.dependencyResults, null, 2)}
\`\`\`
`
  }

  if (context?.additionalRules && context.additionalRules.length > 0) {
    prompt += `
## 额外验证规则

${context.additionalRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}
`
  }

  prompt += `
## 任务

请验证上述操作的执行结果是否符合预期，返回 JSON 格式的验证结果。
注意：直接返回 JSON，不要添加 markdown 代码块标记。
`

  return prompt
}

/**
 * 构建完整的消息列表
 */
export function buildVerifyMessages(
  todoItem: TodoItem,
  executionResult: unknown,
  context?: VerifyContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: VERIFY_SYSTEM_PROMPT },
    { role: 'user', content: buildVerifyUserPrompt(todoItem, executionResult, context) },
  ]
}

// ============================================
// 响应解析
// ============================================

/**
 * 解析验证响应
 */
export function parseVerifyResponse(response: string): VerifyResult {
  // 移除可能的 markdown 代码块标记
  let jsonStr = response.trim()
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }
  jsonStr = jsonStr.trim()

  try {
    const parsed = JSON.parse(jsonStr)

    return {
      success: Boolean(parsed.success),
      method: 'llm',
      reason: parsed.reason || (parsed.success ? '验证通过' : '验证失败'),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      needsHumanReview: Boolean(parsed.needsHumanReview),
      suggestedAction: parsed.suggestedAction || (parsed.success ? 'continue' : 'retry'),
      details: parsed.details,
    }
  } catch (error) {
    // 解析失败，返回需要人工确认的结果
    return {
      success: false,
      method: 'llm',
      reason: `验证响应解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      needsHumanReview: true,
      suggestedAction: 'retry',
    }
  }
}

// ============================================
// 规则验证
// ============================================

/**
 * 基于规则的简单验证
 * 对于简单场景，不需要调用 LLM
 */
export function ruleBasedVerify(
  todoItem: TodoItem,
  executionResult: unknown
): VerifyResult | null {
  const result = executionResult as Record<string, unknown> | null

  // 检查结果是否存在
  if (result === null || result === undefined) {
    return {
      success: false,
      method: 'rule',
      reason: '执行结果为空',
      confidence: 1,
      needsHumanReview: false,
      suggestedAction: 'retry',
    }
  }

  // 检查是否有明确的成功标志
  if ('success' in result && result.success === false) {
    return {
      success: false,
      method: 'rule',
      reason: (result.error as string) || (result.message as string) || '操作返回失败状态',
      confidence: 1,
      needsHumanReview: false,
      suggestedAction: 'retry',
    }
  }

  // 根据操作类型进行简单验证
  const operation = todoItem.goiOperation as GoiOperation
  switch (operation.type) {
    case 'access':
      // 访问操作：检查是否返回了 URL
      if ('url' in result && typeof result.url === 'string') {
        return {
          success: true,
          method: 'rule',
          reason: '访问操作成功，已获取目标 URL',
          confidence: 0.9,
          needsHumanReview: false,
          suggestedAction: 'continue',
        }
      }
      break

    case 'state':
      // 状态操作：检查是否返回了资源 ID
      if ('id' in result || 'resourceId' in result) {
        const action = (operation as { action?: string }).action
        return {
          success: true,
          method: 'rule',
          reason: `${action} 操作成功`,
          confidence: 0.85,
          needsHumanReview: action === 'delete', // 删除操作需要人工确认
          suggestedAction: 'continue',
        }
      }
      break

    case 'observation':
      // 查询操作：检查是否返回了数据
      if ('data' in result || Array.isArray(result)) {
        return {
          success: true,
          method: 'rule',
          reason: '查询操作成功，已获取数据',
          confidence: 0.9,
          needsHumanReview: false,
          suggestedAction: 'continue',
        }
      }
      break
  }

  // 无法通过规则判断，返回 null 表示需要 LLM 验证
  return null
}

/**
 * 判断是否可以使用规则验证
 */
export function canUseRuleVerification(todoItem: TodoItem): boolean {
  // 如果 checkpoint 配置为需要人工审查，则不使用规则验证
  if (todoItem.checkpoint?.required && todoItem.checkpoint.type === 'review') {
    return false
  }

  // 复合操作不使用规则验证
  if (todoItem.category === 'compound') {
    return false
  }

  // 默认尝试使用规则验证
  return true
}
