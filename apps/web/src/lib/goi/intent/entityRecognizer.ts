/**
 * GOI 实体识别器
 *
 * 从用户输入中识别：
 * - 资源类型（prompt、dataset、model 等）
 * - 资源名称（具体的资源标识）
 * - 动作（create、edit、delete 等）
 * - 参数（数量、条件等）
 */

import type {
  EntityMatch,
  EntityType,
  EntityCandidate,
  ResourceType,
} from '@platform/shared'
import {
  RESOURCE_TYPE_ALIASES,
  ACTION_ALIASES,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 实体识别上下文
 */
export type RecognitionContext = {
  /** 当前页面 */
  currentPage?: string
  /** 当前选中的资源类型 */
  currentResourceType?: ResourceType
  /** 最近操作的资源 */
  recentResources?: Array<{
    type: ResourceType
    id: string
    name: string
  }>
}

/**
 * 实体识别结果
 */
export type RecognitionResult = {
  /** 识别出的实体列表 */
  entities: EntityMatch[]
  /** 未识别的文本片段 */
  unrecognized: string[]
  /** 识别耗时 */
  processingTime: number
}

// ============================================
// 资源类型识别
// ============================================

/**
 * 从文本中识别资源类型
 */
export function recognizeResourceType(
  text: string,
  context?: RecognitionContext
): EntityMatch | null {
  const normalizedText = text.toLowerCase().trim()

  // 1. 精确匹配别名
  for (const [alias, resourceType] of Object.entries(RESOURCE_TYPE_ALIASES)) {
    const lowerAlias = alias.toLowerCase()
    if (normalizedText === lowerAlias || normalizedText.includes(lowerAlias)) {
      // 找到原始文本中的位置
      const index = normalizedText.indexOf(lowerAlias)
      return {
        type: 'resource_type',
        value: resourceType,
        originalText: alias,
        confidence: normalizedText === lowerAlias ? 1.0 : 0.95,
        position: index >= 0 ? { start: index, end: index + alias.length } : undefined,
      }
    }
  }

  // 2. 使用上下文推断
  if (context?.currentResourceType) {
    return {
      type: 'resource_type',
      value: context.currentResourceType,
      originalText: text,
      confidence: 0.6, // 上下文推断置信度较低
    }
  }

  return null
}

/**
 * 识别所有资源类型（可能有多个）
 */
export function recognizeAllResourceTypes(text: string): EntityMatch[] {
  const normalizedText = text.toLowerCase()
  const results: EntityMatch[] = []
  const foundTypes = new Set<ResourceType>()

  for (const [alias, resourceType] of Object.entries(RESOURCE_TYPE_ALIASES)) {
    const lowerAlias = alias.toLowerCase()
    const index = normalizedText.indexOf(lowerAlias)

    if (index >= 0 && !foundTypes.has(resourceType)) {
      foundTypes.add(resourceType)
      results.push({
        type: 'resource_type',
        value: resourceType,
        originalText: alias,
        confidence: 0.9,
        position: { start: index, end: index + alias.length },
      })
    }
  }

  return results
}

// ============================================
// 资源名称提取
// ============================================

/**
 * 常见动词列表（用于清理）
 */
const COMMON_VERBS = [
  // 中文
  '创建', '新建', '添加', '新增',
  '打开', '去', '进入', '跳转',
  '删除', '移除', '删掉', '去掉',
  '编辑', '修改', '更新', '改',
  '查看', '查询', '看看', '显示',
  '运行', '执行', '跑', '启动',
  '测试', '试试', '试一下',
  '导出', '下载', '保存',
  '对比', '比较', '比对',
  // 英文
  'create', 'add', 'new',
  'open', 'go', 'navigate', 'visit',
  'delete', 'remove', 'del',
  'edit', 'update', 'modify',
  'view', 'show', 'list', 'get',
  'run', 'execute', 'start',
  'test', 'try',
  'export', 'download', 'save',
  'compare', 'diff',
]

/**
 * 常见修饰词
 */
const MODIFIERS = [
  '的', '一个', '个', '这个', '那个', '所有', '全部',
  'the', 'a', 'an', 'this', 'that', 'all', 'every',
]

/**
 * 从文本中提取资源名称
 */
export function extractResourceName(
  text: string,
  resourceType?: ResourceType
): EntityMatch | null {
  let cleaned = text.trim()

  // 1. 移除动词
  for (const verb of COMMON_VERBS) {
    cleaned = cleaned.replace(new RegExp(`^${verb}\\s*`, 'gi'), '')
    cleaned = cleaned.replace(new RegExp(`\\s*${verb}$`, 'gi'), '')
  }

  // 2. 移除资源类型关键词
  for (const alias of Object.keys(RESOURCE_TYPE_ALIASES)) {
    cleaned = cleaned.replace(new RegExp(alias, 'gi'), '')
  }

  // 3. 移除修饰词
  for (const mod of MODIFIERS) {
    cleaned = cleaned.replace(new RegExp(`^${mod}\\s*`, 'gi'), '')
    cleaned = cleaned.replace(new RegExp(`\\s*${mod}$`, 'gi'), '')
  }

  // 4. 清理多余空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  if (!cleaned) {
    return null
  }

  // 5. 处理引号包裹的名称
  const quotedMatch = cleaned.match(/["'「」『』](.+?)["'「」『』]/)
  if (quotedMatch) {
    return {
      type: 'resource_name',
      value: quotedMatch[1],
      originalText: quotedMatch[0],
      confidence: 0.95, // 引号包裹的名称置信度高
    }
  }

  return {
    type: 'resource_name',
    value: cleaned,
    originalText: cleaned,
    confidence: 0.7, // 推断的名称置信度较低
  }
}

/**
 * 提取多个资源名称（用于对比场景）
 */
export function extractMultipleResourceNames(text: string): EntityMatch[] {
  const results: EntityMatch[] = []

  // 处理 "A和B"、"A与B"、"A跟B" 格式
  const separators = ['和', '与', '跟', 'and', 'with', 'to', '|', ',', '，']
  for (const sep of separators) {
    if (text.includes(sep)) {
      const parts = text.split(sep).map((p) => p.trim()).filter(Boolean)
      for (const part of parts) {
        const entity = extractResourceName(part)
        if (entity) {
          results.push(entity)
        }
      }
      if (results.length > 0) {
        return results
      }
    }
  }

  // 单个名称
  const single = extractResourceName(text)
  if (single) {
    results.push(single)
  }

  return results
}

// ============================================
// 动作识别
// ============================================

/**
 * 从文本中识别动作
 */
export function recognizeAction(text: string): EntityMatch | null {
  const normalizedText = text.toLowerCase().trim()

  // 遍历动作别名
  for (const [alias, action] of Object.entries(ACTION_ALIASES)) {
    const lowerAlias = alias.toLowerCase()
    if (normalizedText.startsWith(lowerAlias) || normalizedText.includes(` ${lowerAlias} `)) {
      return {
        type: 'action',
        value: action,
        originalText: alias,
        confidence: 0.9,
      }
    }
  }

  return null
}

// ============================================
// 参数识别
// ============================================

/**
 * 数量模式
 */
const QUANTITY_PATTERNS = [
  /(\d+)\s*(个|条|项|份|次)/,
  /前\s*(\d+)/,
  /最近\s*(\d+)/,
  /top\s*(\d+)/i,
  /last\s*(\d+)/i,
  /(\d+)\s*(items?|records?|rows?)/i,
]

/**
 * 从文本中提取参数
 */
export function extractParameters(text: string): EntityMatch[] {
  const results: EntityMatch[] = []

  // 识别数量
  for (const pattern of QUANTITY_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      results.push({
        type: 'parameter',
        value: JSON.stringify({ type: 'quantity', value: parseInt(match[1], 10) }),
        originalText: match[0],
        confidence: 0.9,
      })
    }
  }

  // 识别时间范围
  const timePatterns = [
    { pattern: /今天/, value: 'today' },
    { pattern: /昨天/, value: 'yesterday' },
    { pattern: /本周/, value: 'this_week' },
    { pattern: /上周/, value: 'last_week' },
    { pattern: /本月/, value: 'this_month' },
    { pattern: /上月/, value: 'last_month' },
    { pattern: /today/i, value: 'today' },
    { pattern: /yesterday/i, value: 'yesterday' },
    { pattern: /this\s*week/i, value: 'this_week' },
    { pattern: /last\s*week/i, value: 'last_week' },
  ]

  for (const { pattern, value } of timePatterns) {
    const match = text.match(pattern)
    if (match) {
      results.push({
        type: 'parameter',
        value: JSON.stringify({ type: 'time_range', value }),
        originalText: match[0],
        confidence: 0.85,
      })
    }
  }

  return results
}

// ============================================
// 综合实体识别
// ============================================

/**
 * 综合实体识别
 */
export function recognizeEntities(
  text: string,
  context?: RecognitionContext
): RecognitionResult {
  const startTime = Date.now()
  const entities: EntityMatch[] = []
  const processedSegments = new Set<string>()

  // 1. 识别资源类型
  const resourceType = recognizeResourceType(text, context)
  if (resourceType) {
    entities.push(resourceType)
    processedSegments.add(resourceType.originalText.toLowerCase())
  }

  // 2. 识别动作
  const action = recognizeAction(text)
  if (action) {
    entities.push(action)
    processedSegments.add(action.originalText.toLowerCase())
  }

  // 3. 提取资源名称
  const resourceName = extractResourceName(
    text,
    resourceType?.value as ResourceType | undefined
  )
  if (resourceName && resourceName.value.length > 0) {
    entities.push(resourceName)
  }

  // 4. 提取参数
  const parameters = extractParameters(text)
  entities.push(...parameters)

  // 5. 找出未识别的部分
  let remaining = text.toLowerCase()
  for (const segment of processedSegments) {
    remaining = remaining.replace(segment, ' ')
  }
  const unrecognized = remaining
    .split(/\s+/)
    .filter((s) => s.length > 1 && !MODIFIERS.includes(s))

  return {
    entities,
    unrecognized,
    processingTime: Date.now() - startTime,
  }
}

// ============================================
// 实体增强（添加候选项）
// ============================================

/**
 * 为资源名称实体添加候选项
 * 需要配合 fuzzyMatcher 使用
 */
export async function enrichEntityWithCandidates(
  entity: EntityMatch,
  searchFunction: (type: ResourceType, query: string) => Promise<EntityCandidate[]>
): Promise<EntityMatch> {
  if (entity.type !== 'resource_name') {
    return entity
  }

  // 这里应该调用 fuzzyMatcher 进行搜索
  // 暂时返回原实体，具体实现在 fuzzyMatcher.ts 中
  return entity
}

// ============================================
// 工具函数
// ============================================

/**
 * 合并多个识别结果中的实体
 */
export function mergeEntities(results: RecognitionResult[]): EntityMatch[] {
  const merged: EntityMatch[] = []
  const seen = new Set<string>()

  for (const result of results) {
    for (const entity of result.entities) {
      const key = `${entity.type}:${entity.value}`
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(entity)
      } else {
        // 如果已存在，选择置信度更高的
        const existing = merged.find((e) => `${e.type}:${e.value}` === key)
        if (existing && entity.confidence > existing.confidence) {
          Object.assign(existing, entity)
        }
      }
    }
  }

  return merged
}

/**
 * 按类型过滤实体
 */
export function filterEntitiesByType(
  entities: EntityMatch[],
  type: EntityType
): EntityMatch[] {
  return entities.filter((e) => e.type === type)
}

/**
 * 获取最高置信度的实体
 */
export function getTopConfidenceEntity(
  entities: EntityMatch[],
  type?: EntityType
): EntityMatch | undefined {
  const filtered = type ? filterEntitiesByType(entities, type) : entities
  if (filtered.length === 0) return undefined

  return filtered.reduce((top, current) =>
    current.confidence > top.confidence ? current : top
  )
}
