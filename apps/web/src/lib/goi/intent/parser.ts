/**
 * GOI 意图解析器
 *
 * 实现基于规则 + LLM 的混合意图解析器：
 * 1. 规则解析器：快速处理常见模式
 * 2. LLM 解析器：处理复杂/模糊输入
 */

import type {
  IntentCategory,
  ParsedIntent,
  IntentParseResult,
  EntityMatch,
  ResourceType,
} from '@platform/shared'
import {
  RESOURCE_TYPE_ALIASES,
  ACTION_ALIASES,
  normalizeAction,
} from '@platform/shared'

// ============================================
// 规则模式定义
// ============================================

/**
 * 意图模式定义
 */
type IntentPattern = {
  /** 匹配的正则表达式 */
  pattern: RegExp
  /** 对应的意图分类 */
  category: IntentCategory
  /** 从匹配结果中提取资源文本 */
  extractResource?: (match: RegExpMatchArray) => string
  /** 从匹配结果中提取动作 */
  extractAction?: (match: RegExpMatchArray) => string
  /** 基础置信度 */
  confidence: number
}

/**
 * 意图匹配规则
 * 按优先级排序，先匹配的优先
 */
const INTENT_PATTERNS: IntentPattern[] = [
  // === 单词导航（高优先级）===
  // 匹配单独的页面关键词，如 "首页"、"仪表盘"、"设置"
  {
    pattern: /^(首页|仪表盘|工作台|dashboard)$/i,
    category: 'navigation',
    extractResource: () => 'dashboard',
    confidence: 0.9,
  },
  {
    pattern: /^(设置|系统设置|settings)$/i,
    category: 'navigation',
    extractResource: () => 'settings',
    confidence: 0.9,
  },
  {
    pattern: /^(监控|监控中心|monitor)$/i,
    category: 'navigation',
    extractResource: () => 'monitor',
    confidence: 0.9,
  },

  // === 发布/配置意图 ===
  {
    pattern: /^(发布|上线)\s*(.+)$/i,
    category: 'creation',
    extractResource: (m) => m[2],
    extractAction: () => 'publish',
    confidence: 0.85,
  },
  {
    pattern: /^(配置|设置)\s*(.+)$/i,
    category: 'modification',
    extractResource: (m) => m[2],
    extractAction: () => 'configure',
    confidence: 0.85,
  },

  // === 导航意图 ===
  {
    pattern: /^(打开|去|进入|跳转到?|访问)\s*(.+?)(页面|页)?$/i,
    category: 'navigation',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(open|go\s*to|navigate\s*to|visit)\s+(.+?)(\s+page)?$/i,
    category: 'navigation',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },

  // === 创建意图 ===
  {
    pattern: /^(创建|新建|添加|新增)(一个|个)?\s*(.+)$/i,
    category: 'creation',
    extractResource: (m) => m[3],
    confidence: 0.85,
  },
  {
    pattern: /^(create|add|new)\s+(a\s+)?(.+)$/i,
    category: 'creation',
    extractResource: (m) => m[3],
    confidence: 0.85,
  },

  // === 删除意图 ===
  {
    pattern: /^(删除|移除|删掉|去掉)\s*(.+)$/i,
    category: 'deletion',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(delete|remove|del)\s+(.+)$/i,
    category: 'deletion',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },

  // === 修改意图 ===
  {
    pattern: /^(编辑|修改|更新|改)\s*(.+)$/i,
    category: 'modification',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(edit|update|modify)\s+(.+)$/i,
    category: 'modification',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },

  // === 查询意图 ===
  {
    pattern: /^(查看|查询|看看|显示|列出)\s*(.+)$/i,
    category: 'query',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(show|list|view|get|display)\s+(.+)$/i,
    category: 'query',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(.+?)(有哪些|列表|清单)$/i,
    category: 'query',
    extractResource: (m) => m[1],
    confidence: 0.8,
  },

  // === 执行意图 ===
  {
    pattern: /^(运行|执行|跑一下|启动)\s*(.+)$/i,
    category: 'execution',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(run|execute|start)\s+(.+)$/i,
    category: 'execution',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },

  // === 测试意图 ===
  {
    pattern: /^(测试|试试|试一下)\s*(.+)$/i,
    category: 'execution',
    extractResource: (m) => m[2],
    extractAction: () => 'test',
    confidence: 0.85,
  },
  {
    pattern: /^(用|使用)\s*(.+?)\s*(测试|试试|跑一下).*$/i,
    category: 'execution',
    extractResource: (m) => m[2],
    extractAction: () => 'test',
    confidence: 0.8,
  },
  {
    pattern: /^(test)\s+(.+)$/i,
    category: 'execution',
    extractResource: (m) => m[2],
    extractAction: () => 'test',
    confidence: 0.85,
  },

  // === 导出意图 ===
  {
    pattern: /^(导出|下载|保存)\s*(.+)$/i,
    category: 'export',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },
  {
    pattern: /^(export|download|save)\s+(.+)$/i,
    category: 'export',
    extractResource: (m) => m[2],
    confidence: 0.85,
  },

  // === 对比意图 ===
  {
    pattern: /^(对比|比较|比对)\s*(.+?)\s*(和|与|跟)\s*(.+)$/i,
    category: 'comparison',
    extractResource: (m) => `${m[2]}|${m[4]}`,
    confidence: 0.85,
  },
  {
    pattern: /^(compare)\s+(.+?)\s+(with|and|to)\s+(.+)$/i,
    category: 'comparison',
    extractResource: (m) => `${m[2]}|${m[4]}`,
    confidence: 0.85,
  },
]

// ============================================
// 规则解析器
// ============================================

/**
 * 从资源文本中提取资源类型
 * 按别名长度降序匹配，确保更具体的别名（如"定时任务"）优先于通用别名（如"任务"）
 */
function extractResourceType(text: string): ResourceType | undefined {
  const normalizedText = text.toLowerCase().trim()

  // 按长度降序排序别名，确保更长的别名优先匹配
  const sortedAliases = Object.entries(RESOURCE_TYPE_ALIASES)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [alias, resourceType] of sortedAliases) {
    if (normalizedText.includes(alias.toLowerCase())) {
      return resourceType
    }
  }

  return undefined
}

/**
 * 从资源文本中提取资源名称
 * 去除资源类型关键词，留下具体名称
 */
function extractResourceName(text: string, resourceType?: ResourceType): string | undefined {
  let cleaned = text.trim()

  // 移除资源类型关键词
  for (const alias of Object.keys(RESOURCE_TYPE_ALIASES)) {
    const regex = new RegExp(alias, 'gi')
    cleaned = cleaned.replace(regex, '')
  }

  // 移除常见修饰词
  const modifiers = ['的', '一个', '个', '这个', '那个', 'the', 'a', 'an', 'this', 'that']
  for (const mod of modifiers) {
    cleaned = cleaned.replace(new RegExp(`^${mod}\\s*|\\s*${mod}$`, 'gi'), '')
  }

  cleaned = cleaned.trim()
  return cleaned || undefined
}

/**
 * 基于规则的意图解析
 */
export function parseIntentByRules(input: string): ParsedIntent | null {
  const normalizedInput = input.trim()

  for (const { pattern, category, extractResource, extractAction, confidence } of INTENT_PATTERNS) {
    const match = normalizedInput.match(pattern)
    if (match) {
      const resourceText = extractResource?.(match) || ''
      const resourceType = extractResourceType(resourceText)
      const resourceName = extractResourceName(resourceText, resourceType)
      const action = extractAction?.(match) || normalizeAction(match[1] || '')

      return {
        category,
        confidence,
        resourceType,
        resourceName,
        action,
      }
    }
  }

  return null
}

// ============================================
// LLM 意图解析 Prompt
// ============================================

/**
 * 构建意图解析 Prompt
 */
export function buildIntentParsePrompt(input: string): Array<{
  role: 'system' | 'user'
  content: string
}> {
  const systemPrompt = `你是一个意图理解专家。你的任务是分析用户的输入，识别出用户的意图和涉及的资源。

## 意图分类

- navigation: 导航（打开、去、进入某个页面）
- creation: 创建（新建、添加资源）
- modification: 修改（编辑、更新资源）
- deletion: 删除（删除、移除资源）
- query: 查询（查看、显示信息）
- execution: 执行（运行、测试）
- comparison: 对比（比较两个资源）
- export: 导出（导出、下载）
- clarification: 需要澄清（用户意图不明确）
- unknown: 无法理解

## 资源类型

- prompt: 提示词
- dataset: 数据集
- model: 模型
- provider: 模型供应商
- evaluator: 评估器
- task: 测试任务
- scheduled_task: 定时任务
- alert_rule: 告警规则
- notify_channel: 通知渠道
- dashboard: 工作台
- settings: 设置
- monitor: 监控

## 输出格式

必须返回纯 JSON（不要 markdown 代码块），格式如下：

{
  "category": "意图分类",
  "confidence": 0.0-1.0,
  "resourceType": "资源类型（可选）",
  "resourceName": "资源名称（可选，用户提到的具体名称）",
  "action": "具体动作（可选，如 create、edit、delete 等）",
  "clarificationNeeded": {
    "field": "需要澄清的字段",
    "question": "澄清问题"
  }
}

## 示例

输入："打开模型配置"
输出：{"category":"navigation","confidence":0.95,"resourceType":"model","action":"navigate"}

输入："创建一个情感分析的prompt"
输出：{"category":"creation","confidence":0.9,"resourceType":"prompt","resourceName":"情感分析","action":"create"}

输入："帮我看看"
输出：{"category":"clarification","confidence":0.4,"clarificationNeeded":{"field":"target","question":"请问您想查看什么？"}}
`

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析以下用户输入的意图：\n\n"${input}"` },
  ]
}

/**
 * 解析 LLM 响应
 */
export function parseLLMResponse(response: string): ParsedIntent {
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
    const parsed = JSON.parse(jsonStr) as ParsedIntent

    // 验证并规范化
    if (!parsed.category) {
      parsed.category = 'unknown'
    }
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0.5
    }

    return parsed
  } catch {
    return {
      category: 'unknown',
      confidence: 0.3,
    }
  }
}

// ============================================
// 混合解析器
// ============================================

/**
 * LLM 调用函数类型
 */
export type LLMInvoker = (messages: Array<{
  role: 'system' | 'user' | 'assistant'
  content: string
}>) => Promise<string>

/**
 * 解析器配置
 */
export type ParserConfig = {
  /** LLM 调用函数 */
  llmInvoker?: LLMInvoker
  /** 规则匹配的最低置信度阈值（低于此值使用 LLM） */
  ruleConfidenceThreshold?: number
  /** 是否跳过 LLM（仅使用规则） */
  skipLLM?: boolean
}

/**
 * 混合意图解析器
 *
 * 1. 先尝试规则匹配（快速）
 * 2. 如果规则匹配置信度不够，使用 LLM（精确）
 */
export async function parseIntent(
  input: string,
  config: ParserConfig = {}
): Promise<IntentParseResult> {
  const startTime = Date.now()
  const {
    llmInvoker,
    ruleConfidenceThreshold = 0.8,
    skipLLM = false,
  } = config

  // 1. 尝试规则匹配
  const ruleResult = parseIntentByRules(input)

  if (ruleResult && ruleResult.confidence >= ruleConfidenceThreshold) {
    return {
      success: true,
      intent: ruleResult,
      entities: buildEntitiesFromIntent(ruleResult, input),
      rawInput: input,
      processingTime: Date.now() - startTime,
      method: 'rule',
    }
  }

  // 2. 如果需要，使用 LLM
  if (!skipLLM && llmInvoker) {
    try {
      const messages = buildIntentParsePrompt(input)
      const response = await llmInvoker(messages)
      const llmResult = parseLLMResponse(response)

      return {
        success: llmResult.category !== 'unknown',
        intent: llmResult,
        entities: buildEntitiesFromIntent(llmResult, input),
        rawInput: input,
        processingTime: Date.now() - startTime,
        method: 'llm',
      }
    } catch (error) {
      // LLM 调用失败，降级到规则结果
      if (ruleResult) {
        return {
          success: true,
          intent: {
            ...ruleResult,
            confidence: ruleResult.confidence * 0.8, // 降低置信度
          },
          entities: buildEntitiesFromIntent(ruleResult, input),
          rawInput: input,
          processingTime: Date.now() - startTime,
          method: 'rule',
          error: error instanceof Error ? error.message : 'LLM invocation failed',
        }
      }
    }
  }

  // 3. 规则结果（即使置信度不高）或失败
  if (ruleResult) {
    return {
      success: ruleResult.confidence > 0.5,
      intent: ruleResult,
      entities: buildEntitiesFromIntent(ruleResult, input),
      rawInput: input,
      processingTime: Date.now() - startTime,
      method: 'rule',
    }
  }

  // 4. 完全无法解析
  return {
    success: false,
    intent: {
      category: 'unknown',
      confidence: 0,
    },
    entities: [],
    rawInput: input,
    processingTime: Date.now() - startTime,
    method: 'rule',
  }
}

/**
 * 从解析的意图构建实体列表
 */
function buildEntitiesFromIntent(intent: ParsedIntent, input: string): EntityMatch[] {
  const entities: EntityMatch[] = []

  if (intent.resourceType) {
    entities.push({
      type: 'resource_type',
      value: intent.resourceType,
      originalText: input,
      confidence: intent.confidence,
    })
  }

  if (intent.resourceName) {
    entities.push({
      type: 'resource_name',
      value: intent.resourceName,
      originalText: intent.resourceName,
      confidence: intent.confidence * 0.9, // 名称识别置信度略低
    })
  }

  if (intent.action) {
    entities.push({
      type: 'action',
      value: intent.action,
      originalText: input,
      confidence: intent.confidence,
    })
  }

  return entities
}

// ============================================
// 便捷函数
// ============================================

/**
 * 快速解析意图（仅使用规则）
 */
export function quickParseIntent(input: string): IntentParseResult {
  const startTime = Date.now()
  const result = parseIntentByRules(input)

  if (result) {
    return {
      success: result.confidence > 0.5,
      intent: result,
      entities: buildEntitiesFromIntent(result, input),
      rawInput: input,
      processingTime: Date.now() - startTime,
      method: 'rule',
    }
  }

  return {
    success: false,
    intent: {
      category: 'unknown',
      confidence: 0,
    },
    entities: [],
    rawInput: input,
    processingTime: Date.now() - startTime,
    method: 'rule',
  }
}

/**
 * 检查是否需要澄清
 */
export function needsClarification(result: IntentParseResult): boolean {
  if (!result.success) return true
  if (!result.intent) return true
  if (result.intent.category === 'clarification') return true
  if (result.intent.category === 'unknown') return true
  if (result.intent.confidence < 0.5) return true
  return false
}
