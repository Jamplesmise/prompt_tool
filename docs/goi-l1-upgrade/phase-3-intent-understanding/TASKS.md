# Phase 3: 意图理解增强 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 3.1 定义意图类型系统 | P0 | 1h | 待开始 |
| 3.2 实现意图解析器 | P0 | 2h | 待开始 |
| 3.3 实现实体识别器 | P0 | 2h | 待开始 |
| 3.4 实现模糊匹配 | P1 | 2h | 待开始 |
| 3.5 实现置信度评估 | P1 | 1h | 待开始 |
| 3.6 实现澄清对话 | P0 | 2h | 待开始 |

---

## 3.1 定义意图类型系统

**文件**: `packages/shared/src/types/goi/intent.ts`（新建）

### 任务描述

定义意图分类、实体识别、置信度等类型。

### 具体步骤

- [ ] 创建 `intent.ts` 文件
- [ ] 定义意图分类枚举：

```typescript
/**
 * 意图分类
 */
export type IntentCategory =
  | 'navigation'     // 导航："打开xxx"、"去xxx页面"
  | 'creation'       // 创建："新建xxx"、"创建一个xxx"
  | 'modification'   // 修改："编辑xxx"、"更新xxx"
  | 'deletion'       // 删除："删除xxx"、"移除xxx"
  | 'query'          // 查询："查看xxx"、"xxx有哪些"
  | 'execution'      // 执行："运行xxx"、"测试xxx"
  | 'comparison'     // 对比："对比xxx和xxx"
  | 'export'         // 导出："导出xxx"
  | 'clarification'  // 澄清：需要更多信息
  | 'unknown'        // 未知：无法理解

/**
 * 解析后的意图
 */
export type ParsedIntent = {
  category: IntentCategory
  confidence: number          // 0-1
  resourceType?: ResourceType
  resourceId?: string
  resourceName?: string       // 用户提到的名称
  action?: string             // 具体动作
  parameters?: Record<string, unknown>
  alternatives?: ParsedIntent[] // 其他可能的解释
  clarificationNeeded?: {
    field: string             // 需要澄清的字段
    question: string          // 澄清问题
    options?: string[]        // 可选项
  }
}

/**
 * 实体匹配结果
 */
export type EntityMatch = {
  type: 'resource_type' | 'resource_name' | 'action' | 'parameter'
  value: string
  originalText: string
  confidence: number
  candidates?: Array<{
    id: string
    name: string
    score: number
  }>
}

/**
 * 意图解析结果
 */
export type IntentParseResult = {
  success: boolean
  intent?: ParsedIntent
  entities: EntityMatch[]
  rawInput: string
  processingTime: number
}
```

- [ ] 在 `packages/shared/src/types/goi/index.ts` 中导出
- [ ] 运行类型检查确保无错误

---

## 3.2 实现意图解析器

**文件**: `apps/web/src/lib/goi/intent/parser.ts`（新建）

### 任务描述

实现基于规则 + LLM 的混合意图解析器。

### 具体步骤

- [ ] 创建 `apps/web/src/lib/goi/intent/` 目录
- [ ] 创建 `parser.ts` 文件
- [ ] 实现规则解析器（快速路径）：

```typescript
/**
 * 规则匹配器 - 处理常见模式
 */
const INTENT_PATTERNS: Array<{
  pattern: RegExp
  category: IntentCategory
  extractResource?: (match: RegExpMatchArray) => string
}> = [
  // 导航意图
  { pattern: /^(打开|去|进入|跳转到?)\s*(.+?)(页面|页)?$/i, category: 'navigation', extractResource: m => m[2] },
  { pattern: /^(open|go to|navigate to)\s+(.+?)(\s+page)?$/i, category: 'navigation', extractResource: m => m[2] },

  // 创建意图
  { pattern: /^(创建|新建|添加|新增)(一个)?\s*(.+)$/i, category: 'creation', extractResource: m => m[3] },
  { pattern: /^(create|add|new)\s+(a\s+)?(.+)$/i, category: 'creation', extractResource: m => m[3] },

  // 删除意图
  { pattern: /^(删除|移除|删掉)\s*(.+)$/i, category: 'deletion', extractResource: m => m[2] },
  { pattern: /^(delete|remove)\s+(.+)$/i, category: 'deletion', extractResource: m => m[2] },

  // 查询意图
  { pattern: /^(查看|查询|看看|显示)\s*(.+)$/i, category: 'query', extractResource: m => m[2] },
  { pattern: /^(show|list|view|get)\s+(.+)$/i, category: 'query', extractResource: m => m[2] },

  // 执行意图
  { pattern: /^(运行|执行|测试|跑一下)\s*(.+)$/i, category: 'execution', extractResource: m => m[2] },
  { pattern: /^(run|execute|test)\s+(.+)$/i, category: 'execution', extractResource: m => m[2] },
]

export function parseIntentByRules(input: string): ParsedIntent | null {
  for (const { pattern, category, extractResource } of INTENT_PATTERNS) {
    const match = input.match(pattern)
    if (match) {
      const resourceText = extractResource?.(match) || ''
      return {
        category,
        confidence: 0.85,
        resourceName: resourceText.trim(),
      }
    }
  }
  return null
}
```

- [ ] 实现 LLM 解析器（兜底）：

```typescript
export async function parseIntentByLLM(input: string): Promise<ParsedIntent> {
  const prompt = buildIntentParsePrompt(input)
  const response = await callLLM(prompt)
  return parseIntentResponse(response)
}
```

- [ ] 实现混合解析器：

```typescript
export async function parseIntent(input: string): Promise<IntentParseResult> {
  const startTime = Date.now()

  // 1. 尝试规则匹配（快速）
  const ruleResult = parseIntentByRules(input)
  if (ruleResult && ruleResult.confidence > 0.8) {
    return {
      success: true,
      intent: ruleResult,
      entities: [],
      rawInput: input,
      processingTime: Date.now() - startTime,
    }
  }

  // 2. 使用 LLM 解析（精确）
  const llmResult = await parseIntentByLLM(input)
  return {
    success: llmResult.category !== 'unknown',
    intent: llmResult,
    entities: [],
    rawInput: input,
    processingTime: Date.now() - startTime,
  }
}
```

---

## 3.3 实现实体识别器

**文件**: `apps/web/src/lib/goi/intent/entityRecognizer.ts`（新建）

### 任务描述

识别用户输入中的资源类型和资源名称。

### 具体步骤

- [ ] 创建 `entityRecognizer.ts` 文件
- [ ] 实现资源类型识别：

```typescript
import { resourceTypeAliases } from '../executor/shared'

/**
 * 从文本中识别资源类型
 */
export function recognizeResourceType(text: string): EntityMatch | null {
  const normalizedText = text.toLowerCase().trim()

  // 1. 精确匹配别名
  for (const [alias, resourceType] of Object.entries(resourceTypeAliases)) {
    if (normalizedText.includes(alias.toLowerCase())) {
      return {
        type: 'resource_type',
        value: resourceType,
        originalText: alias,
        confidence: 0.95,
      }
    }
  }

  // 2. 模糊匹配（见 3.4）
  return fuzzyMatchResourceType(normalizedText)
}
```

- [ ] 实现资源名称识别：

```typescript
/**
 * 从文本中提取可能的资源名称
 */
export function extractResourceName(text: string, resourceType?: ResourceType): EntityMatch | null {
  // 移除已识别的资源类型词
  let cleaned = text

  // 移除常见动词
  const verbs = ['创建', '新建', '打开', '删除', '编辑', '查看', 'create', 'open', 'delete', 'edit']
  for (const verb of verbs) {
    cleaned = cleaned.replace(new RegExp(verb, 'gi'), '')
  }

  // 移除资源类型词
  if (resourceType) {
    for (const [alias, type] of Object.entries(resourceTypeAliases)) {
      if (type === resourceType) {
        cleaned = cleaned.replace(new RegExp(alias, 'gi'), '')
      }
    }
  }

  const name = cleaned.trim()
  if (!name) return null

  return {
    type: 'resource_name',
    value: name,
    originalText: name,
    confidence: 0.7,
  }
}
```

---

## 3.4 实现模糊匹配

**文件**: `apps/web/src/lib/goi/intent/fuzzyMatcher.ts`（新建）

### 任务描述

实现资源名称的模糊匹配，支持找到最相似的资源。

### 具体步骤

- [ ] 创建 `fuzzyMatcher.ts` 文件
- [ ] 实现编辑距离算法：

```typescript
/**
 * 计算 Levenshtein 编辑距离
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}
```

- [ ] 实现相似度评分：

```typescript
/**
 * 计算相似度得分 (0-1)
 */
export function similarityScore(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase())
  return 1 - distance / maxLen
}
```

- [ ] 实现模糊搜索：

```typescript
/**
 * 模糊搜索资源
 */
export async function fuzzySearchResources(
  resourceType: ResourceType,
  query: string,
  limit: number = 5
): Promise<Array<{ id: string; name: string; score: number }>> {
  // 1. 获取所有该类型的资源
  const resources = await getResourcesByType(resourceType)

  // 2. 计算相似度
  const scored = resources.map(r => ({
    id: r.id,
    name: r.name,
    score: calculateMatchScore(query, r.name),
  }))

  // 3. 排序并返回前 N 个
  return scored
    .filter(r => r.score > 0.3) // 最低阈值
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 综合匹配得分
 */
function calculateMatchScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // 精确匹配
  if (q === t) return 1.0

  // 包含匹配
  if (t.includes(q)) return 0.9

  // 前缀匹配
  if (t.startsWith(q)) return 0.85

  // 编辑距离
  const similarity = similarityScore(q, t)
  return similarity * 0.8
}
```

---

## 3.5 实现置信度评估

**文件**: `apps/web/src/lib/goi/intent/confidence.ts`（新建）

### 任务描述

根据意图解析结果评估置信度，决定后续行为。

### 具体步骤

- [ ] 创建 `confidence.ts` 文件
- [ ] 定义置信度阈值：

```typescript
export const CONFIDENCE_THRESHOLDS = {
  AUTO_EXECUTE: 0.9,    // 自动执行，不需确认
  CONFIRM_ONCE: 0.7,    // 确认一次后执行
  CLARIFY: 0.5,         // 需要澄清
  REJECT: 0.3,          // 无法理解，请求重新输入
} as const
```

- [ ] 实现置信度评估：

```typescript
/**
 * 评估意图置信度
 */
export function evaluateConfidence(intent: ParsedIntent, entities: EntityMatch[]): number {
  let score = intent.confidence

  // 根据实体识别情况调整
  const resourceTypeEntity = entities.find(e => e.type === 'resource_type')
  if (resourceTypeEntity) {
    score = Math.min(score, resourceTypeEntity.confidence)
  }

  // 有候选项时降低置信度
  const resourceNameEntity = entities.find(e => e.type === 'resource_name')
  if (resourceNameEntity?.candidates && resourceNameEntity.candidates.length > 1) {
    score *= 0.8 // 有多个候选，需要确认
  }

  // 缺少必要信息时降低
  if (intent.category === 'creation' && !intent.resourceType) {
    score *= 0.6
  }

  return Math.max(0, Math.min(1, score))
}
```

- [ ] 实现行为决策：

```typescript
export type ConfidenceAction = 'auto_execute' | 'confirm' | 'clarify' | 'reject'

export function decideAction(confidence: number): ConfidenceAction {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_EXECUTE) return 'auto_execute'
  if (confidence >= CONFIDENCE_THRESHOLDS.CONFIRM_ONCE) return 'confirm'
  if (confidence >= CONFIDENCE_THRESHOLDS.CLARIFY) return 'clarify'
  return 'reject'
}
```

---

## 3.6 实现澄清对话

**文件**: `apps/web/src/lib/goi/intent/clarification.ts`（新建）

### 任务描述

当意图不明确时，生成澄清问题让用户确认。

### 具体步骤

- [ ] 创建 `clarification.ts` 文件
- [ ] 实现澄清问题生成：

```typescript
/**
 * 澄清类型
 */
export type ClarificationType =
  | 'select_resource'    // 选择具体资源
  | 'confirm_action'     // 确认操作
  | 'provide_parameter'  // 提供参数
  | 'disambiguate'       // 消除歧义

/**
 * 澄清问题
 */
export type ClarificationRequest = {
  type: ClarificationType
  question: string
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
  allowFreeInput?: boolean
}

/**
 * 生成澄清问题
 */
export function generateClarification(intent: ParsedIntent, entities: EntityMatch[]): ClarificationRequest | null {
  // 1. 有多个候选资源
  const resourceNameEntity = entities.find(e => e.type === 'resource_name')
  if (resourceNameEntity?.candidates && resourceNameEntity.candidates.length > 1) {
    return {
      type: 'select_resource',
      question: `检测到多个匹配的${getResourceTypeLabel(intent.resourceType)}，请选择：`,
      options: resourceNameEntity.candidates.map(c => ({
        value: c.id,
        label: c.name,
        description: `匹配度: ${Math.round(c.score * 100)}%`,
      })),
      allowFreeInput: true,
    }
  }

  // 2. 缺少资源类型
  if (!intent.resourceType && intent.category !== 'navigation') {
    return {
      type: 'disambiguate',
      question: '请问您想操作什么类型的资源？',
      options: [
        { value: 'prompt', label: '提示词', description: '管理和编辑提示词' },
        { value: 'dataset', label: '数据集', description: '管理测试数据' },
        { value: 'task', label: '测试任务', description: '创建或查看测试任务' },
        { value: 'model', label: '模型', description: '配置AI模型' },
      ],
      allowFreeInput: true,
    }
  }

  // 3. 删除操作需要确认
  if (intent.category === 'deletion') {
    return {
      type: 'confirm_action',
      question: `确定要删除${intent.resourceName || '该资源'}吗？此操作不可撤销。`,
      options: [
        { value: 'confirm', label: '确认删除' },
        { value: 'cancel', label: '取消' },
      ],
    }
  }

  return null
}
```

- [ ] 集成到意图处理流程：

```typescript
/**
 * 处理用户输入
 */
export async function processUserInput(input: string): Promise<{
  action: ConfidenceAction
  intent?: ParsedIntent
  clarification?: ClarificationRequest
  operations?: GoiOperation[]
}> {
  // 1. 解析意图
  const parseResult = await parseIntent(input)

  if (!parseResult.success) {
    return {
      action: 'reject',
      clarification: {
        type: 'disambiguate',
        question: '抱歉，我没有理解您的意思。您可以尝试：',
        options: [
          { value: 'help', label: '查看帮助', description: '了解我能做什么' },
          { value: 'example', label: '查看示例', description: '看一些常用命令示例' },
        ],
        allowFreeInput: true,
      },
    }
  }

  // 2. 评估置信度
  const confidence = evaluateConfidence(parseResult.intent!, parseResult.entities)
  const action = decideAction(confidence)

  // 3. 根据置信度决定行为
  if (action === 'clarify' || action === 'reject') {
    const clarification = generateClarification(parseResult.intent!, parseResult.entities)
    return { action, intent: parseResult.intent, clarification }
  }

  // 4. 生成 GOI 操作
  const operations = await generateOperations(parseResult.intent!)
  return { action, intent: parseResult.intent, operations }
}
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-12 | 3.1 定义意图类型系统 | ✅ | 创建 intent.ts，定义 IntentCategory、ParsedIntent、EntityMatch 等类型 |
| 2025-12-12 | 3.2 实现意图解析器 | ✅ | 实现规则解析 + LLM 混合解析器 |
| 2025-12-12 | 3.3 实现实体识别器 | ✅ | 支持资源类型、资源名称、动作、参数识别 |
| 2025-12-12 | 3.4 实现模糊匹配 | ✅ | Levenshtein 距离 + 拼音首字母 + 多策略匹配 |
| 2025-12-12 | 3.5 实现置信度评估 | ✅ | 完整性检查 + 风险等级 + 上下文加成 |
| 2025-12-12 | 3.6 实现澄清对话 | ✅ | 资源选择、确认操作、消歧、帮助信息 |
