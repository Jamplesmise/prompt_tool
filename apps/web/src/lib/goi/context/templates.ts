/**
 * 压缩摘要模板
 *
 * 定义各种压缩场景下的摘要生成模板
 */

import type { ContextSummary, CompletedPhase, CurrentState } from '@platform/shared'

// ============================================
// 压缩 Prompt 模板
// ============================================

/**
 * 标准压缩 Prompt
 */
export const STANDARD_COMPRESSION_PROMPT = `
你是一个上下文压缩专家。请将以下任务执行记录压缩为简洁的摘要。

## 压缩要求
1. 必须保留：用户目标、当前进度、已选资源ID、关键决策
2. 可以简化：操作详情改为一句话描述
3. 可以丢弃：中间查询结果、重复信息、调试日志

## 保留最近 3 个操作的详情

## 原始内容
{{ORIGINAL_CONTENT}}

## 输出格式（JSON）
{
  "goal": "用户目标的简洁描述",
  "completedPhases": [
    { "name": "阶段名", "summary": "一句话摘要", "itemCount": 数量 }
  ],
  "currentState": {
    "page": "当前页面路径",
    "selectedResources": [
      { "type": "资源类型", "id": "资源ID", "name": "资源名称" }
    ],
    "pendingConfigurations": ["待配置项1", "待配置项2"],
    "progressPercent": 进度百分比
  },
  "keyDecisions": ["决策1", "决策2"],
  "nextStep": "下一步操作描述",
  "constraints": ["约束条件1", "约束条件2"]
}
`

/**
 * 深度压缩 Prompt
 */
export const DEEP_COMPRESSION_PROMPT = `
你是一个上下文压缩专家。请将以下任务执行记录进行深度压缩，只保留最关键的信息。

## 压缩要求（深度压缩）
1. 必须保留：用户目标、TODO List状态、关键决策、资源ID
2. 大幅简化：所有操作合并为一段简短摘要（不超过100字）
3. 完全丢弃：操作详情、查询结果、中间状态

## 原始内容
{{ORIGINAL_CONTENT}}

## 输出格式（JSON）
{
  "goal": "用户目标",
  "completedPhases": [
    { "name": "阶段名", "summary": "极简摘要", "itemCount": 数量 }
  ],
  "currentState": {
    "page": "当前页面",
    "selectedResources": [
      { "type": "类型", "id": "ID", "name": "名称" }
    ]
  },
  "keyDecisions": ["核心决策"],
  "nextStep": "下一步",
  "constraints": ["关键约束"]
}
`

/**
 * 阶段完成压缩 Prompt
 */
export const PHASE_COMPRESSION_PROMPT = `
你是一个上下文压缩专家。一个阶段已完成，请将该阶段的所有操作压缩为简短摘要。

## 压缩要求（阶段压缩）
1. 保留：阶段完成状态、产出物ID
2. 压缩：整个阶段的操作合并为一段摘要（不超过50字）
3. 丢弃：阶段内的所有中间状态和操作详情

## 已完成阶段
{{PHASE_NAME}}

## 阶段内容
{{PHASE_CONTENT}}

## 输出格式（JSON）
{
  "name": "阶段名称",
  "summary": "阶段完成摘要",
  "itemCount": 完成的TODO项数量,
  "outputIds": ["产出物ID列表"]
}
`

// ============================================
// 摘要格式化模板
// ============================================

/**
 * 摘要显示模板
 */
export const SUMMARY_DISPLAY_TEMPLATE = `
┌─────────────────────────────────────────────────────────────────┐
│                      上下文压缩摘要                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 【会话目标】                                                     │
│ {{GOAL}}
│                                                                 │
│ 【已完成工作】                                                   │
{{COMPLETED_PHASES}}
│                                                                 │
│ 【当前状态】                                                     │
│ • 页面: {{CURRENT_PAGE}}
{{SELECTED_RESOURCES}}
{{PENDING_CONFIGS}}
│                                                                 │
│ 【关键决策】                                                     │
{{KEY_DECISIONS}}
│                                                                 │
│ 【下一步】                                                       │
│ {{NEXT_STEP}}
│                                                                 │
│ 【约束条件】                                                     │
{{CONSTRAINTS}}
└─────────────────────────────────────────────────────────────────┘
`

// ============================================
// 模板渲染函数
// ============================================

/**
 * 渲染压缩 Prompt
 */
export function renderCompressionPrompt(
  template: string,
  content: string,
  variables?: Record<string, string>
): string {
  let result = template.replace('{{ORIGINAL_CONTENT}}', content)

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
  }

  return result
}

/**
 * 渲染摘要显示
 */
export function renderSummaryDisplay(summary: ContextSummary): string {
  const completedPhasesText = summary.completedPhases
    .map((phase) => {
      const status = '✅'
      return `│ ${status} ${phase.name}（${phase.itemCount}项）: ${phase.summary}`
    })
    .join('\n')

  const selectedResourcesText = summary.currentState.selectedResources
    .map((r) => `│   - ${r.type}: "${r.name}" (${r.id})`)
    .join('\n')

  const pendingConfigsText = summary.currentState.pendingConfigurations
    ? `│ • 待配置: ${summary.currentState.pendingConfigurations.join('、')}`
    : ''

  const keyDecisionsText = summary.keyDecisions
    .map((d, i) => `│ ${i + 1}. ${d}`)
    .join('\n')

  const constraintsText = summary.constraints
    .map((c, i) => `│ ${i + 1}. ${c}`)
    .join('\n')

  return SUMMARY_DISPLAY_TEMPLATE
    .replace('{{GOAL}}', summary.goal)
    .replace('{{COMPLETED_PHASES}}', completedPhasesText || '│ （无）')
    .replace('{{CURRENT_PAGE}}', summary.currentState.page)
    .replace('{{SELECTED_RESOURCES}}', selectedResourcesText || '│   （无）')
    .replace('{{PENDING_CONFIGS}}', pendingConfigsText)
    .replace('{{KEY_DECISIONS}}', keyDecisionsText || '│ （无）')
    .replace('{{NEXT_STEP}}', summary.nextStep)
    .replace('{{CONSTRAINTS}}', constraintsText || '│ （无）')
}

// ============================================
// 摘要构建工具
// ============================================

/**
 * 创建空摘要
 */
export function createEmptySummary(): ContextSummary {
  return {
    goal: '',
    completedPhases: [],
    currentState: {
      page: '/',
      selectedResources: [],
    },
    keyDecisions: [],
    nextStep: '',
    constraints: [],
    version: 1,
    generatedAt: new Date(),
  }
}

/**
 * 合并摘要
 */
export function mergeSummaries(
  base: ContextSummary,
  update: Partial<ContextSummary>
): ContextSummary {
  return {
    ...base,
    ...update,
    currentState: {
      ...base.currentState,
      ...(update.currentState || {}),
    },
    completedPhases: update.completedPhases || base.completedPhases,
    keyDecisions: update.keyDecisions || base.keyDecisions,
    constraints: update.constraints || base.constraints,
    version: base.version + 1,
    generatedAt: new Date(),
  }
}

/**
 * 添加已完成阶段
 */
export function addCompletedPhase(
  summary: ContextSummary,
  phase: CompletedPhase
): ContextSummary {
  return {
    ...summary,
    completedPhases: [...summary.completedPhases, phase],
    version: summary.version + 1,
    generatedAt: new Date(),
  }
}

/**
 * 更新当前状态
 */
export function updateCurrentState(
  summary: ContextSummary,
  state: Partial<CurrentState>
): ContextSummary {
  return {
    ...summary,
    currentState: {
      ...summary.currentState,
      ...state,
    },
    version: summary.version + 1,
    generatedAt: new Date(),
  }
}

/**
 * 添加关键决策
 */
export function addKeyDecision(
  summary: ContextSummary,
  decision: string
): ContextSummary {
  return {
    ...summary,
    keyDecisions: [...summary.keyDecisions, decision],
    version: summary.version + 1,
    generatedAt: new Date(),
  }
}

// ============================================
// 验证函数
// ============================================

/**
 * 验证摘要是否完整
 */
export function validateSummary(summary: ContextSummary): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!summary.goal) {
    errors.push('缺少用户目标')
  }

  if (!summary.currentState.page) {
    errors.push('缺少当前页面')
  }

  if (!summary.nextStep) {
    errors.push('缺少下一步操作')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 解析 LLM 返回的摘要 JSON
 */
export function parseSummaryFromLLM(response: string): ContextSummary | null {
  try {
    // 尝试提取 JSON 块
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    // 验证必要字段
    if (!parsed.goal || !parsed.currentState) {
      return null
    }

    return {
      goal: parsed.goal || '',
      completedPhases: parsed.completedPhases || [],
      currentState: {
        page: parsed.currentState?.page || '/',
        selectedResources: parsed.currentState?.selectedResources || [],
        pendingConfigurations: parsed.currentState?.pendingConfigurations,
        progressPercent: parsed.currentState?.progressPercent,
      },
      keyDecisions: parsed.keyDecisions || [],
      nextStep: parsed.nextStep || '',
      constraints: parsed.constraints || [],
      version: 1,
      generatedAt: new Date(),
    }
  } catch {
    return null
  }
}
