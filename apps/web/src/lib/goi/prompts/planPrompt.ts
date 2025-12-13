/**
 * GOI 计划生成 Prompt
 *
 * 用于引导 LLM 将用户目标拆分为原子操作的 TODO List
 */

import type { TodoItemCategory } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 计划生成上下文
 */
export type PlanContext = {
  /** 当前页面 */
  currentPage?: string
  /** 选中的资源 */
  selectedResources?: Array<{
    type: string
    id: string
    name?: string
  }>
  /** 最近操作的资源 */
  recentResources?: Array<{
    type: string
    id: string
    name?: string
    action: string
  }>
  /** 系统状态摘要 */
  systemSummary?: string
  /** 用户偏好 */
  userPreferences?: Record<string, unknown>
}

/**
 * 计划项（LLM 输出格式）
 */
export type PlanItem = {
  id: string
  title: string
  description: string
  category: TodoItemCategory
  goiOperation: {
    type: 'access' | 'state' | 'observation'
    [key: string]: unknown
  }
  dependsOn: string[]
  checkpoint: {
    required: boolean
    type?: 'review' | 'approval' | 'decision' | 'confirmation'
    message?: string
  }
  estimatedDuration?: number
}

/**
 * 计划输出（LLM 响应格式）
 */
export type PlanOutput = {
  goalAnalysis: string
  items: PlanItem[]
  warnings?: string[]
}

// ============================================
// Prompt 模板
// ============================================

/**
 * 系统 Prompt
 */
export const PLAN_SYSTEM_PROMPT = `你是一个 AI 测试平台的操作规划专家。你的任务是将用户的高级目标拆分为一系列原子操作。

## 系统能力

你可以执行以下类型的操作：

### 1. Access（访问操作）
- 导航到资源列表或详情页
- 打开创建/编辑弹窗
- 选择资源

\`\`\`typescript
{
  type: 'access',
  target: { resourceType: string, resourceId?: string },
  action: 'view' | 'edit' | 'create' | 'select' | 'navigate' | 'test',
  context?: { page?: string, dialog?: string }
}
\`\`\`

**Access action 说明**：
- \`navigate\`：导航到列表页
- \`view\`：查看详情（需要 resourceId）
- \`create\`：打开创建弹窗（不需要 resourceId）
- \`edit\`：打开编辑弹窗（需要 resourceId）
- \`select\`：打开选择器弹窗
- \`test\`：打开测试弹窗（仅 model 支持，需要 resourceId）

### 2. State（状态变更）
- 创建新资源
- 更新资源属性
- 删除资源

\`\`\`typescript
{
  type: 'state',
  target: { resourceType: string, resourceId?: string },
  action: 'create' | 'update' | 'delete',
  expectedState: Record<string, unknown>
}
\`\`\`

### 3. Observation（信息查询）
- 查询资源状态
- 获取统计信息
- 检查执行结果

\`\`\`typescript
{
  type: 'observation',
  queries: Array<{
    resourceType: string,
    resourceId?: string,
    fields: string[],
    filters?: Record<string, unknown>
  }>
}
\`\`\`

## 可用资源类型及支持的操作

| 类型 | 说明 | 支持的操作 | 页面路径 |
|------|------|-----------|----------|
| provider | 模型供应商 | create, edit, delete, view | /models |
| model | 模型配置 | create, edit, delete, view, **test** | /models |
| prompt | 提示词 | create, edit, delete, view | /prompts |
| prompt_version | 提示词版本 | create, view | /prompts/{id} |
| prompt_branch | 提示词分支 | create, edit, delete, view, merge | /prompts/{id} |
| dataset | 数据集 | create, edit, delete, view, upload | /datasets |
| dataset_version | 数据集版本 | create, view, rollback | /datasets/{id} |
| evaluator | 评估器 | create, edit, delete, view | /evaluators |
| task | 测试任务 | create, view, pause, resume, stop | /tasks |
| task_result | 任务结果 | view, export | /tasks/{id}/results |
| scheduled_task | 定时任务 | create, edit, delete, view, toggle | /scheduled |
| alert_rule | 告警规则 | create, edit, delete, view, toggle | /monitor/alerts |
| notify_channel | 通知渠道 | create, edit, delete, view, **test** | /monitor/alerts |
| input_schema | 输入 Schema | create, edit, delete, view | /schemas |
| output_schema | 输出 Schema | create, edit, delete, view | /schemas |

## 资源操作详解

### provider vs model（重要区分）
- **provider（模型供应商）**：API 连接配置（如 OpenAI、Azure、Anthropic）
  - 只能 create/edit/delete/view，**不能测试**
  - 包含：name, type, baseUrl, apiKey
- **model（模型）**：属于某个 provider 的具体模型（如 gpt-4、claude-3）
  - 可以 create/edit/delete/view/**test**（测试连通性）
  - 包含：name, providerId, modelId, isActive
- 两者**共用 "/models" 页面**，但弹窗不同

### 特殊操作说明
- **test**：只有 model 和 notify_channel 支持测试
- **toggle**：启用/禁用（scheduled_task, alert_rule, model）
- **merge**：仅 prompt_branch 支持合并分支
- **rollback**：仅 dataset_version 支持回滚
- **export**：仅 task_result 支持导出

## 重要规则

1. **goiOperation 必填**：每个 TODO 项必须有有效的 goiOperation，不能为 null
2. **用户输入场景**：如需用户输入，使用 checkpoint + state 操作组合
3. **操作匹配**：确保使用的操作在该资源的支持列表中

## 规划原则

1. **原子性**：每个 TODO 项只做一件事
2. **依赖明确**：通过 dependsOn 指定前置依赖
3. **检查点合理**：关键步骤（如删除、批量操作）需要用户确认
4. **可回滚**：状态变更操作应支持回滚
5. **渐进式**：先验证再执行，先查询再修改
6. **goiOperation 必填**：每个 TODO 项必须有有效的 goiOperation 对象，绝对不能是 null
   - 如果步骤需要等待用户输入，使用 checkpoint + state 操作组合
   - 例如：用 checkpoint.required=true 暂停，然后用 state.create 操作执行创建
7. **避免冗余导航**：如果上下文显示用户已经在目标页面，**不要**再创建导航任务
   - 例如：用户在 "/models" 页面请求"添加模型"，直接创建打开弹窗的任务，跳过导航
   - 页面路径映射："/models" 对应 provider 和 model，"/scheduled" 对应 scheduled_task

## 输出格式

必须返回有效的 JSON，格式如下：

\`\`\`json
{
  "goalAnalysis": "对用户目标的理解和分析",
  "items": [
    {
      "id": "1",
      "title": "简短标题（用户可见）",
      "description": "详细描述（AI 理解用）",
      "category": "access|state|observation|verify",
      "goiOperation": { ... },
      "dependsOn": [],
      "checkpoint": {
        "required": true/false,
        "type": "confirmation",
        "message": "需要用户确认的提示信息"
      },
      "estimatedDuration": 1000
    }
  ],
  "warnings": ["可能存在的风险或注意事项"]
}
\`\`\`
`

/**
 * 构建用户 Prompt
 */
export function buildPlanUserPrompt(goal: string, context?: PlanContext): string {
  let prompt = `## 用户目标

${goal}
`

  if (context) {
    prompt += `
## 当前上下文
`
    if (context.currentPage) {
      prompt += `- 当前页面：${context.currentPage}\n`
    }

    if (context.selectedResources && context.selectedResources.length > 0) {
      prompt += `- 选中的资源：\n`
      for (const resource of context.selectedResources) {
        prompt += `  - ${resource.type}: ${resource.name || resource.id}\n`
      }
    }

    if (context.recentResources && context.recentResources.length > 0) {
      prompt += `- 最近操作：\n`
      for (const resource of context.recentResources) {
        prompt += `  - ${resource.action} ${resource.type}: ${resource.name || resource.id}\n`
      }
    }

    if (context.systemSummary) {
      prompt += `- 系统状态：${context.systemSummary}\n`
    }
  }

  prompt += `
## 任务

请将上述用户目标拆分为一系列原子操作，生成 TODO List。

要求：
1. 每个 TODO 项只做一件事
2. 明确指定依赖关系（使用 id 引用）
3. 关键步骤需要设置检查点
4. 返回纯 JSON 格式（不要包含 markdown 代码块标记）
`

  return prompt
}

/**
 * 构建完整的消息列表
 */
export function buildPlanMessages(
  goal: string,
  context?: PlanContext
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    { role: 'system', content: PLAN_SYSTEM_PROMPT },
    { role: 'user', content: buildPlanUserPrompt(goal, context) },
  ]
}

// ============================================
// 响应解析
// ============================================

/**
 * 解析 LLM 响应为计划输出
 */
export function parsePlanResponse(response: string): PlanOutput {
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
    const parsed = JSON.parse(jsonStr) as PlanOutput

    // 验证必要字段
    if (!parsed.goalAnalysis) {
      parsed.goalAnalysis = ''
    }
    if (!Array.isArray(parsed.items)) {
      throw new Error('items must be an array')
    }

    // 验证每个 item
    for (const item of parsed.items) {
      if (!item.id || !item.title || !item.category || !item.goiOperation) {
        throw new Error(`Invalid item: ${JSON.stringify(item)}`)
      }
      // 确保 dependsOn 是数组
      if (!Array.isArray(item.dependsOn)) {
        item.dependsOn = []
      }
      // 确保 checkpoint 存在
      if (!item.checkpoint) {
        item.checkpoint = { required: false }
      }
    }

    return parsed
  } catch (error) {
    throw new Error(
      `Failed to parse plan response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * 验证计划的有效性
 */
export function validatePlan(plan: PlanOutput): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const itemIds = new Set(plan.items.map((item) => item.id))

  for (const item of plan.items) {
    // 检查依赖是否存在
    for (const depId of item.dependsOn) {
      if (!itemIds.has(depId)) {
        errors.push(`Item "${item.id}" depends on non-existent item "${depId}"`)
      }
    }

    // 检查循环依赖（简单检查）
    if (item.dependsOn.includes(item.id)) {
      errors.push(`Item "${item.id}" has self-dependency`)
    }

    // 检查 goiOperation 类型
    const validTypes = ['access', 'state', 'observation']
    if (!validTypes.includes(item.goiOperation.type)) {
      errors.push(`Item "${item.id}" has invalid operation type: ${item.goiOperation.type}`)
    }

    // 检查 category
    const validCategories = ['access', 'state', 'observation', 'verify', 'compound']
    if (!validCategories.includes(item.category)) {
      errors.push(`Item "${item.id}" has invalid category: ${item.category}`)
    }
  }

  // 检查是否有循环依赖（拓扑排序）
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(itemId: string): boolean {
    if (recursionStack.has(itemId)) return true
    if (visited.has(itemId)) return false

    visited.add(itemId)
    recursionStack.add(itemId)

    const item = plan.items.find((i) => i.id === itemId)
    if (item) {
      for (const depId of item.dependsOn) {
        if (hasCycle(depId)) return true
      }
    }

    recursionStack.delete(itemId)
    return false
  }

  for (const item of plan.items) {
    if (hasCycle(item.id)) {
      errors.push(`Circular dependency detected involving item "${item.id}"`)
      break
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
