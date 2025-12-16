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
- \`view\`：查看详情。有 resourceId 时打开详情页，没有则导航到列表页让用户选择
- \`create\`：打开创建弹窗/页面（不需要 resourceId）
- \`edit\`：打开编辑弹窗/页面。有 resourceId 时打开编辑页，没有则导航到列表页让用户选择
- \`select\`：打开选择器弹窗
- \`test\`：打开测试弹窗（仅 model 和 notify_channel 支持，需要 resourceId）

**关于 resourceId**：
- 当用户说"帮我查看提示词"但没有指定具体哪个时，使用 view 操作但不提供 resourceId
- 系统会自动导航到列表页，用户可以自行点击选择
- 只有当用户明确指定了资源名称或 ID 时，才在 goiOperation 中提供 resourceId

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
  - 字段：name, type, baseUrl, apiKey, headers, isActive（**注意：没有 description 字段**）
  - **type 枚举值**：\`OPENAI\`, \`ANTHROPIC\`, \`AZURE\`, \`CUSTOM\`（必须大写）
- **model（模型）**：属于某个 provider 的具体模型（如 gpt-4、claude-3）
  - 可以 create/edit/delete/view/**test**（测试连通性）
  - 字段：name, providerId, modelId, description, isActive, maxTokens, temperature
- 两者**共用 "/models" 页面**，但弹窗不同

### 资源字段枚举约束

创建资源时，以下字段必须使用指定的枚举值：

| 资源类型 | 字段 | 枚举值 | 默认值 |
|---------|------|--------|--------|
| provider | type | \`OPENAI\`, \`ANTHROPIC\`, \`AZURE\`, \`CUSTOM\` | \`OPENAI\` |
| evaluator | type | \`PRESET\`, \`CODE\`, \`LLM\`, \`COMPOSITE\` | \`CODE\` |
| task | status | \`DRAFT\`, \`PENDING\`, \`RUNNING\`, \`COMPLETED\`, \`FAILED\`, \`PAUSED\` | - |
| alert_rule | severity | \`INFO\`, \`WARNING\`, \`ERROR\`, \`CRITICAL\` | \`WARNING\` |
| notify_channel | type | \`EMAIL\`, \`WEBHOOK\`, \`SLACK\`, \`DINGTALK\` | \`WEBHOOK\` |

**重要**：
- 枚举值必须完全匹配（大写），否则会导致数据库写入失败
- 如果用户未指定类型，使用默认值

### 特殊操作说明
- **test**：只有 model 和 notify_channel 支持测试
- **toggle**：启用/禁用（scheduled_task, alert_rule, model）
- **merge**：仅 prompt_branch 支持合并分支
- **rollback**：仅 dataset_version 支持回滚
- **export**：仅 task_result 支持导出

## 变量引用语法

后续步骤可以引用前序步骤的执行结果，格式为：

\`\`\`
$<步骤ID>.result.<路径>
\`\`\`

支持的引用方式：
- \`$1.result.resourceId\` - 引用步骤1结果中的 resourceId 字段
- \`$2.result.results[0].id\` - 引用步骤2结果数组的第一个元素的 id
- \`$prev.result.id\` - 引用上一步的结果中的 id 字段

**常用结果路径**：
- State create 操作：\`$N.result.resourceId\` 获取新创建资源的 ID
- Observation 查询：\`$N.result.results[0].id\` 获取查询结果列表第一个的 ID

## 资源名称引用语法

当用户使用描述性名称引用资源时（如"情感分析提示词"），可以使用资源引用语法让系统自动解析：

\`\`\`
$<资源类型>:<资源描述>
\`\`\`

**示例**：
- \`$prompt:情感分析\` - 按名称搜索提示词
- \`$dataset:测试数据\` - 按名称搜索数据集
- \`$model:gpt-4\` - 按名称搜索模型

**使用场景**：
当用户说"用情感分析提示词创建任务"时，可以在 expectedState 中使用资源引用：

\`\`\`json
{
  "type": "state",
  "target": { "resourceType": "task" },
  "action": "create",
  "expectedState": {
    "name": "新建测试任务",
    "promptId": "$prompt:情感分析",
    "datasetId": "$dataset:测试数据"
  }
}
\`\`\`

**系统行为**：
- **唯一匹配**：自动替换为实际资源 ID
- **多个匹配**：弹出选择检查点，让用户确认使用哪个
- **无匹配**：提示资源未找到，需要用户先创建

**建议**：
- 优先使用变量引用（\`$1.result.resourceId\`）引用同一计划中创建的资源
- 只有当引用已存在的资源（非本次创建）时，才使用资源名称引用
- 如果不确定资源是否存在，建议先用 Observation 查询确认

## State 操作示例

### 创建提示词
\`\`\`json
{
  "id": "1",
  "title": "创建情感分析提示词",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "prompt" },
    "action": "create",
    "expectedState": {
      "name": "情感分析提示词",
      "content": "你是一个情感分析助手，请分析以下文本的情感倾向：\\n\\n{{input}}",
      "description": "自动创建的情感分析提示词"
    }
  },
  "checkpoint": { "required": false },
  "dependsOn": []
}
\`\`\`

### 创建测试任务（引用前序步骤）
\`\`\`json
{
  "id": "4",
  "title": "创建测试任务",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "task" },
    "action": "create",
    "expectedState": {
      "name": "情感分析测试",
      "promptId": "$1.result.resourceId",
      "datasetId": "$2.result.results[0].id",
      "modelIds": ["$3.result.results[0].id"]
    }
  },
  "checkpoint": { "required": true, "type": "confirmation", "message": "确认创建此测试任务？" },
  "dependsOn": ["1", "2", "3"]
}
\`\`\`

## Observation 操作示例

### 查找数据集
\`\`\`json
{
  "id": "2",
  "title": "查找测试数据集",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "dataset",
      "filters": { "name": { "contains": "测试" } },
      "fields": ["id", "name", "rowCount", "description"]
    }]
  },
  "checkpoint": { "required": true, "type": "review", "message": "找到以下数据集，请确认使用哪个" },
  "dependsOn": ["1"]
}
\`\`\`

### 获取可用模型
\`\`\`json
{
  "id": "3",
  "title": "获取可用模型",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "model",
      "filters": { "isActive": true },
      "fields": ["id", "name", "modelId"]
    }]
  },
  "checkpoint": { "required": false },
  "dependsOn": []
}
\`\`\`

### 查询任务执行状态
\`\`\`json
{
  "id": "6",
  "title": "查看执行结果",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "task",
      "resourceId": "$4.result.resourceId",
      "fields": ["id", "name", "status", "progress", "totalItems", "completedItems"]
    }]
  },
  "checkpoint": { "required": false },
  "dependsOn": ["5"]
}
\`\`\`

## 完整场景示例

用户输入："帮我创建一个情感分析提示词，用测试数据集跑一下"

期望输出：
\`\`\`json
{
  "goalAnalysis": "用户希望：1) 创建一个情感分析提示词 2) 使用名称包含'测试'的数据集 3) 执行测试任务",
  "items": [
    {
      "id": "1",
      "title": "创建情感分析提示词",
      "description": "创建一个用于文本情感分析的提示词",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "prompt" },
        "action": "create",
        "expectedState": {
          "name": "情感分析提示词",
          "content": "你是一个情感分析助手，请分析以下文本的情感倾向（正面/负面/中性）：\\n\\n{{input}}",
          "description": "自动创建的情感分析提示词"
        }
      },
      "dependsOn": [],
      "checkpoint": { "required": false }
    },
    {
      "id": "2",
      "title": "查找测试数据集",
      "description": "搜索名称包含'测试'的数据集",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{
          "resourceType": "dataset",
          "filters": { "name": { "contains": "测试" } },
          "fields": ["id", "name", "rowCount"]
        }]
      },
      "dependsOn": ["1"],
      "checkpoint": { "required": true, "type": "review", "message": "找到以下数据集，请确认使用哪个" }
    },
    {
      "id": "3",
      "title": "获取可用模型",
      "description": "查询已启用的模型",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{
          "resourceType": "model",
          "filters": { "isActive": true },
          "fields": ["id", "name", "modelId"]
        }]
      },
      "dependsOn": [],
      "checkpoint": { "required": false }
    },
    {
      "id": "4",
      "title": "创建测试任务",
      "description": "使用选定的提示词、数据集和模型创建测试任务",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "task" },
        "action": "create",
        "expectedState": {
          "name": "情感分析测试-自动创建",
          "promptId": "$1.result.resourceId",
          "datasetId": "$2.result.results[0].id",
          "modelIds": ["$3.result.results[0].id"]
        }
      },
      "dependsOn": ["2", "3"],
      "checkpoint": { "required": true, "type": "confirmation", "message": "确认创建此测试任务？" }
    }
  ],
  "warnings": ["任务执行可能需要几分钟时间"]
}
\`\`\`

## 重要规则

1. **goiOperation 必填**：每个 TODO 项必须有有效的 goiOperation 对象，**绝对不能是 null**
2. **用户输入场景**：如需用户输入，使用 checkpoint + state 操作组合
3. **操作匹配**：确保使用的操作在该资源的支持列表中
4. **category 限制**：只能使用 access、state、observation 三种类别，每种都有对应的 goiOperation

## 不支持的任务类型

以下任务类型**不适合用 GOI 执行**，请直接返回空 items 并在 goalAnalysis 中说明原因：
- 数据分析/计算类：如"找出价格最高的模型"、"统计任务成功率"
- 纯问答类：如"什么是评估器"、"如何使用提示词"
- 比较/推荐类：如"哪个模型更好"、"推荐一个评估器"
- 代码生成类：如"帮我写一个评估器代码"

对于这些任务，返回：
\`\`\`json
{
  "goalAnalysis": "这是一个[分析/问答/...]类任务，GOI 系统专注于 UI 操作（导航、创建、编辑等），无法直接执行此类任务。建议：[具体建议]",
  "items": [],
  "warnings": ["此任务不适合 GOI 执行"]
}
\`\`\`

## 规划原则

1. **原子性**：每个 TODO 项只做一件事
2. **依赖明确**：通过 dependsOn 指定前置依赖
3. **可回滚**：状态变更操作应支持回滚
4. **渐进式**：先验证再执行，先查询再修改
5. **goiOperation 必填**：每个 TODO 项必须有有效的 goiOperation 对象，**绝对不能返回 goiOperation: null**
6. **避免冗余导航**：如果上下文显示用户已经在目标页面，**不要**再创建导航任务
   - 例如：用户在 "/models" 页面请求"添加模型"，直接创建打开弹窗的任务，跳过导航
   - 页面路径映射："/models" 对应 provider 和 model，"/scheduled" 对应 scheduled_task

## Checkpoint 使用规则（重要）

Checkpoint 决定是否需要用户确认。**必须严格按以下规则设置**：

### 必须使用 checkpoint (required: true) 的场景
1. **删除操作**：所有 delete 操作必须确认
2. **批量操作**：影响多个资源的操作
3. **不可逆操作**：如合并分支、回滚版本
4. **用户需要选择**：当有多个资源供选择时（observation 查询后）

### 不需要 checkpoint (required: false) 的场景
1. **用户目标明确的创建操作**：用户描述了要创建什么
   - 例如："创建一个情绪识别提示词" → 直接用 state.create，checkpoint.required = false
   - 例如："新建一个用于翻译的提示词" → 直接用 state.create，checkpoint.required = false
2. **导航操作**：所有 access 操作
3. **查询操作**：所有 observation 操作
4. **更新操作**：普通的 update 操作（非批量）

### 用户目标模糊时的处理
当用户没有说明具体内容时，**打开创建弹窗让用户填写**：
- 例如："帮我创建一个提示词" → 使用 access.create 打开弹窗
- 例如："新建提示词" → 使用 access.create 打开弹窗

### 判断标准
- 用户说了"什么样的"或"用于什么的" → 目标明确 → state.create + checkpoint.required = false
- 用户只说"创建/新建" → 目标模糊 → access.create 打开弹窗

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
      "category": "access|state|observation",
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
      // 检查必填字段
      if (!item.id) {
        throw new Error(`Item missing required field 'id': ${JSON.stringify(item)}`)
      }
      if (!item.title) {
        throw new Error(`Item "${item.id}" missing required field 'title'`)
      }
      if (!item.category) {
        throw new Error(`Item "${item.id}" missing required field 'category'`)
      }

      // goiOperation 不能为 null 或 undefined
      if (item.goiOperation === null || item.goiOperation === undefined) {
        throw new Error(
          `Item "${item.id}" (${item.title}) has null goiOperation. ` +
          `This usually means the task is not suitable for GOI (e.g., data analysis, Q&A). ` +
          `GOI only supports UI operations like navigation, create, edit, delete.`
        )
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

    // 检查 category（只支持三种有效类别）
    const validCategories = ['access', 'state', 'observation']
    if (!validCategories.includes(item.category)) {
      errors.push(`Item "${item.id}" has invalid category: ${item.category}. Valid categories: ${validCategories.join(', ')}`)
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
