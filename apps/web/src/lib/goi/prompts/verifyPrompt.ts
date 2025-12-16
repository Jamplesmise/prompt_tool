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
 * 页面路由映射：多资源类型共用页面
 */
const SHARED_PAGE_MAP: Record<string, string[]> = {
  '/models': ['provider', 'model'],
  '/monitor/alerts': ['alert_rule', 'notify_channel'],
  '/schemas': ['input_schema', 'output_schema'],
}

/**
 * 检查导航路径是否匹配资源类型
 */
function isValidNavigationPath(resourceType: string, path: string): boolean {
  // 直接匹配
  if (path.includes(resourceType)) return true

  // 检查共用页面
  for (const [pagePath, types] of Object.entries(SHARED_PAGE_MAP)) {
    if (path.includes(pagePath) && types.includes(resourceType)) {
      return true
    }
  }

  // 资源类型到页面路径的映射
  const resourcePathMap: Record<string, string> = {
    prompt: '/prompts',
    prompt_version: '/prompts',
    prompt_branch: '/prompts',
    dataset: '/datasets',
    dataset_version: '/datasets',
    task: '/tasks',
    task_result: '/tasks',
    evaluator: '/evaluators',
    scheduled_task: '/scheduled',
  }

  const expectedPath = resourcePathMap[resourceType]
  return expectedPath ? path.includes(expectedPath) : false
}

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

  // 根据操作类型进行验证
  const operation = todoItem.goiOperation as GoiOperation
  switch (operation.type) {
    case 'access':
      return verifyAccessOperation(operation, result)

    case 'state':
      return verifyStateOperation(operation, result)

    case 'observation':
      return verifyObservationOperation(operation, result)
  }

  // 无法通过规则判断，返回 null 表示需要 LLM 验证
  return null
}

/**
 * 验证 Access 操作
 */
function verifyAccessOperation(
  operation: GoiOperation,
  result: Record<string, unknown>
): VerifyResult | null {
  const accessOp = operation as {
    type: 'access'
    target?: { resourceType?: string }
    action?: string
  }

  // 检查是否返回了 URL 或导航成功标志
  if ('url' in result || 'navigatedTo' in result || 'success' in result) {
    const url = (result.url || result.navigatedTo) as string | undefined
    const resourceType = accessOp.target?.resourceType

    // 如果有 URL 和资源类型，验证路径是否匹配
    if (url && resourceType) {
      const isValid = isValidNavigationPath(resourceType, url)
      if (!isValid) {
        return {
          success: false,
          method: 'rule',
          reason: `导航路径 "${url}" 与资源类型 "${resourceType}" 不匹配`,
          confidence: 0.9,
          needsHumanReview: true,
          suggestedAction: 'retry',
        }
      }
    }

    // 根据 action 类型返回不同的消息
    const actionMessages: Record<string, string> = {
      navigate: '导航成功',
      view: '查看操作成功',
      create: '已打开创建弹窗',
      edit: '已打开编辑弹窗',
      select: '已打开选择器',
      test: '已打开测试弹窗',
    }

    return {
      success: true,
      method: 'rule',
      reason: actionMessages[accessOp.action || 'navigate'] || '访问操作成功',
      confidence: 0.95,
      needsHumanReview: false,
      suggestedAction: 'continue',
    }
  }

  // 弹窗操作可能只返回 dialogOpened
  if ('dialogOpened' in result && result.dialogOpened === true) {
    return {
      success: true,
      method: 'rule',
      reason: '弹窗已打开',
      confidence: 0.95,
      needsHumanReview: false,
      suggestedAction: 'continue',
    }
  }

  return null
}

/**
 * 验证 State 操作
 */
function verifyStateOperation(
  operation: GoiOperation,
  result: Record<string, unknown>
): VerifyResult | null {
  const stateOp = operation as {
    type: 'state'
    action?: string
    target?: { resourceType?: string }
    expectedState?: Record<string, unknown>
  }
  const action = stateOp.action

  switch (action) {
    case 'create':
      // 创建操作：必须返回新资源 ID
      if ('id' in result || 'resourceId' in result) {
        const resourceId = (result.id || result.resourceId) as string
        return {
          success: true,
          method: 'rule',
          reason: `创建成功，资源 ID: ${resourceId}`,
          confidence: 0.95,
          needsHumanReview: false,
          suggestedAction: 'continue',
          details: { resourceId },
        }
      }
      break

    case 'update':
      // 更新操作：返回 ID 或 success
      if ('id' in result || 'resourceId' in result || result.success === true) {
        return {
          success: true,
          method: 'rule',
          reason: '更新成功',
          confidence: 0.9,
          needsHumanReview: false,
          suggestedAction: 'continue',
        }
      }
      break

    case 'delete':
      // 删除操作：返回 success 或 deleted
      if (result.success === true || 'deleted' in result) {
        return {
          success: true,
          method: 'rule',
          reason: '删除成功',
          confidence: 0.9,
          needsHumanReview: true, // 删除操作需要人工确认
          suggestedAction: 'continue',
        }
      }
      break
  }

  // 通用：如果有 id/resourceId 字段，视为成功
  if ('id' in result || 'resourceId' in result) {
    return {
      success: true,
      method: 'rule',
      reason: `${action} 操作成功`,
      confidence: 0.85,
      needsHumanReview: action === 'delete',
      suggestedAction: 'continue',
    }
  }

  return null
}

/**
 * 验证 Observation 操作
 */
function verifyObservationOperation(
  operation: GoiOperation,
  result: Record<string, unknown>
): VerifyResult | null {
  // 检查是否返回了数据
  const hasData = 'data' in result || 'results' in result || Array.isArray(result)

  if (hasData) {
    const data = (result.data || result.results || result) as unknown[]
    const count = Array.isArray(data) ? data.length : 1

    // 空结果也是有效的查询结果
    if (Array.isArray(data) && data.length === 0) {
      return {
        success: true,
        method: 'rule',
        reason: '查询成功，未找到匹配记录',
        confidence: 0.95,
        needsHumanReview: false,
        suggestedAction: 'continue',
        details: { count: 0 },
      }
    }

    return {
      success: true,
      method: 'rule',
      reason: `查询成功，找到 ${count} 条记录`,
      confidence: 0.95,
      needsHumanReview: false,
      suggestedAction: 'continue',
      details: { count },
    }
  }

  // 单个资源查询
  if ('id' in result && 'name' in result) {
    return {
      success: true,
      method: 'rule',
      reason: '资源查询成功',
      confidence: 0.95,
      needsHumanReview: false,
      suggestedAction: 'continue',
    }
  }

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
