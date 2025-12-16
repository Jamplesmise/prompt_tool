/**
 * GOI 资源解析器 - 模糊匹配资源 ID
 *
 * 当用户使用描述性名称引用资源时（如"情感分析提示词"），
 * 系统自动搜索并解析到正确的资源 ID。
 *
 * 支持的引用格式：
 * - $prompt:情感分析     - 按名称模糊搜索提示词
 * - $dataset:测试数据    - 按名称模糊搜索数据集
 * - $model:gpt-4         - 按名称搜索模型
 *
 * 解析结果：
 * - 精确匹配/唯一匹配：直接返回资源 ID
 * - 多个匹配：返回候选列表，需要用户确认
 * - 无匹配：返回 resolved: false
 */

import { prisma } from '../../prisma'
import type { ResourceType } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 资源引用提示
 */
export type ResourceHint = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 用户描述（如 "情感分析"、"测试数据集"） */
  hint: string
}

/**
 * 候选资源
 */
export type ResourceCandidate = {
  /** 资源 ID */
  id: string
  /** 资源名称 */
  name: string
  /** 资源描述或摘要 */
  description?: string
  /** 匹配分数（0-100，用于排序） */
  score: number
}

/**
 * 解析结果
 */
export type ResolveResult = {
  /** 是否成功解析 */
  resolved: boolean
  /** 解析到的资源 ID（唯一匹配时） */
  resourceId?: string
  /** 解析到的资源名称 */
  resourceName?: string
  /** 候选资源列表（多个匹配时） */
  candidates?: ResourceCandidate[]
  /** 是否需要用户确认 */
  needsConfirmation?: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 资源引用正则模式
 * 匹配: $prompt:情感分析, $dataset:测试数据, $model:gpt-4
 */
const RESOURCE_REFERENCE_PATTERN = /\$([a-z_]+):([^$\s]+)/g

/**
 * 完整资源引用模式（判断整个字符串是否为单个资源引用）
 */
const FULL_RESOURCE_REFERENCE_PATTERN = /^\$([a-z_]+):([^$\s]+)$/

// ============================================
// 资源解析函数
// ============================================

/**
 * 解析资源引用
 *
 * @param hint - 资源引用提示
 * @param limit - 最大返回候选数
 * @returns 解析结果
 *
 * @example
 * ```typescript
 * // 唯一匹配
 * const result = await resolveResource({ resourceType: 'prompt', hint: '情感分析' })
 * // => { resolved: true, resourceId: 'prompt-123', resourceName: '情感分析' }
 *
 * // 多个匹配
 * const result = await resolveResource({ resourceType: 'prompt', hint: '测试' })
 * // => { resolved: false, needsConfirmation: true, candidates: [...] }
 * ```
 */
export async function resolveResource(
  hint: ResourceHint,
  limit: number = 5
): Promise<ResolveResult> {
  try {
    const { resourceType, hint: searchHint } = hint

    // 模糊搜索资源
    const candidates = await searchResources(resourceType, searchHint, limit)

    if (candidates.length === 0) {
      return {
        resolved: false,
        error: `未找到匹配的${getResourceTypeName(resourceType)}："${searchHint}"`,
      }
    }

    // 精确匹配检查
    const exactMatch = candidates.find(
      (c) => c.name.toLowerCase() === searchHint.toLowerCase()
    )
    if (exactMatch) {
      return {
        resolved: true,
        resourceId: exactMatch.id,
        resourceName: exactMatch.name,
      }
    }

    // 唯一模糊匹配
    if (candidates.length === 1) {
      return {
        resolved: true,
        resourceId: candidates[0].id,
        resourceName: candidates[0].name,
      }
    }

    // 多个匹配，需要用户确认
    return {
      resolved: false,
      needsConfirmation: true,
      candidates,
    }
  } catch (error) {
    console.error('[ResourceResolver] Failed to resolve resource:', error)
    return {
      resolved: false,
      error: error instanceof Error ? error.message : '资源解析失败',
    }
  }
}

/**
 * 搜索资源
 *
 * @param resourceType - 资源类型
 * @param keyword - 搜索关键词
 * @param limit - 最大返回数量
 * @returns 候选资源列表
 */
async function searchResources(
  resourceType: ResourceType,
  keyword: string,
  limit: number
): Promise<ResourceCandidate[]> {
  const lowerKeyword = keyword.toLowerCase()

  switch (resourceType) {
    case 'prompt':
      return searchPrompts(lowerKeyword, limit)

    case 'dataset':
      return searchDatasets(lowerKeyword, limit)

    case 'model':
      return searchModels(lowerKeyword, limit)

    case 'evaluator':
      return searchEvaluators(lowerKeyword, limit)

    case 'task':
      return searchTasks(lowerKeyword, limit)

    case 'provider':
      return searchProviders(lowerKeyword, limit)

    case 'input_schema':
      return searchInputSchemas(lowerKeyword, limit)

    case 'output_schema':
      return searchOutputSchemas(lowerKeyword, limit)

    default:
      console.warn(`[ResourceResolver] Unsupported resource type: ${resourceType}`)
      return []
  }
}

// ============================================
// 各类资源搜索实现
// ============================================

async function searchPrompts(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return prompts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    score: calculateMatchScore(p.name, keyword),
  }))
}

async function searchDatasets(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const datasets = await prisma.dataset.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true, rowCount: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return datasets.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description ? `${d.description} (${d.rowCount} 行)` : `${d.rowCount} 行`,
    score: calculateMatchScore(d.name, keyword),
  }))
}

async function searchModels(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const models = await prisma.model.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { modelId: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      modelId: true,
      provider: { select: { name: true } },
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return models.map((m) => ({
    id: m.id,
    name: m.name,
    description: `${m.provider.name} - ${m.modelId}`,
    score: calculateMatchScore(m.name, keyword),
  }))
}

async function searchEvaluators(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const evaluators = await prisma.evaluator.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true, type: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return evaluators.map((e) => ({
    id: e.id,
    name: e.name,
    description: `${e.type} 评估器${e.description ? ': ' + e.description : ''}`,
    score: calculateMatchScore(e.name, keyword),
  }))
}

async function searchTasks(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const tasks = await prisma.task.findMany({
    where: {
      name: { contains: keyword, mode: 'insensitive' },
    },
    select: { id: true, name: true, status: true, createdAt: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })

  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    description: `状态: ${t.status}`,
    score: calculateMatchScore(t.name, keyword),
  }))
}

async function searchProviders(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const providers = await prisma.provider.findMany({
    where: {
      name: { contains: keyword, mode: 'insensitive' },
    },
    select: { id: true, name: true, type: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return providers.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.type,
    score: calculateMatchScore(p.name, keyword),
  }))
}

async function searchInputSchemas(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const schemas = await prisma.inputSchema.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return schemas.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '输入结构定义',
    score: calculateMatchScore(s.name, keyword),
  }))
}

async function searchOutputSchemas(keyword: string, limit: number): Promise<ResourceCandidate[]> {
  const schemas = await prisma.outputSchema.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, description: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  return schemas.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '输出结构定义',
    score: calculateMatchScore(s.name, keyword),
  }))
}

// ============================================
// 辅助函数
// ============================================

/**
 * 计算匹配分数
 *
 * 分数规则：
 * - 精确匹配：100
 * - 以关键词开头：80
 * - 包含关键词：60
 * - 其他：40
 */
function calculateMatchScore(name: string, keyword: string): number {
  const lowerName = name.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()

  if (lowerName === lowerKeyword) return 100
  if (lowerName.startsWith(lowerKeyword)) return 80
  if (lowerName.includes(lowerKeyword)) return 60
  return 40
}

/**
 * 获取资源类型的中文名称
 */
function getResourceTypeName(resourceType: ResourceType): string {
  const names: Record<ResourceType, string> = {
    prompt: '提示词',
    dataset: '数据集',
    model: '模型',
    evaluator: '评估器',
    task: '任务',
    task_result: '任务结果',
    provider: '供应商',
    prompt_version: '提示词版本',
    prompt_branch: '提示词分支',
    dataset_version: '数据集版本',
    evaluation_schema: '评估结构',
    scheduled_task: '定时任务',
    alert_rule: '告警规则',
    notify_channel: '通知渠道',
    input_schema: '输入结构',
    output_schema: '输出结构',
    settings: '设置',
    dashboard: '仪表盘',
    monitor: '监控',
    schema: '结构定义',
    comparison: '对比分析',
  }
  return names[resourceType] || resourceType
}

// ============================================
// 字符串中资源引用的解析
// ============================================

/**
 * 提取字符串中的所有资源引用
 *
 * @param value - 包含资源引用的值
 * @returns 资源引用列表
 *
 * @example
 * ```typescript
 * extractResourceReferences('用 $prompt:情感分析 和 $dataset:测试数据 创建任务')
 * // => [
 * //   { resourceType: 'prompt', hint: '情感分析' },
 * //   { resourceType: 'dataset', hint: '测试数据' }
 * // ]
 * ```
 */
export function extractResourceReferences(value: unknown): ResourceHint[] {
  const references: ResourceHint[] = []

  function extract(v: unknown): void {
    if (typeof v === 'string') {
      const matches = v.matchAll(RESOURCE_REFERENCE_PATTERN)
      for (const match of matches) {
        references.push({
          resourceType: match[1] as ResourceType,
          hint: match[2],
        })
      }
    } else if (Array.isArray(v)) {
      v.forEach(extract)
    } else if (v !== null && typeof v === 'object') {
      Object.values(v).forEach(extract)
    }
  }

  extract(value)
  return references
}

/**
 * 判断值是否包含资源引用
 */
export function hasResourceReference(value: unknown): boolean {
  if (typeof value === 'string') {
    return RESOURCE_REFERENCE_PATTERN.test(value)
  }

  if (Array.isArray(value)) {
    return value.some(hasResourceReference)
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasResourceReference)
  }

  return false
}

/**
 * 判断字符串是否为单个资源引用
 */
export function isResourceReference(str: string): boolean {
  return FULL_RESOURCE_REFERENCE_PATTERN.test(str)
}

/**
 * 解析单个资源引用字符串
 *
 * @param ref - 资源引用字符串（如 "$prompt:情感分析"）
 * @returns 资源引用提示，如果不是有效引用则返回 null
 */
export function parseResourceReference(ref: string): ResourceHint | null {
  const match = ref.match(FULL_RESOURCE_REFERENCE_PATTERN)
  if (!match) return null

  return {
    resourceType: match[1] as ResourceType,
    hint: match[2],
  }
}

/**
 * 批量解析资源引用
 *
 * 解析数据中的所有资源引用，返回需要确认的引用列表。
 *
 * @param data - 包含资源引用的数据
 * @returns 解析结果映射
 */
export async function resolveAllResourceReferences(
  data: unknown
): Promise<{
  /** 已解析的引用（引用字符串 -> 资源ID） */
  resolved: Record<string, string>
  /** 需要确认的引用 */
  needsConfirmation: Array<{
    reference: string
    resourceType: ResourceType
    hint: string
    candidates: ResourceCandidate[]
  }>
  /** 解析失败的引用 */
  failed: Array<{
    reference: string
    resourceType: ResourceType
    hint: string
    error: string
  }>
}> {
  const references = extractResourceReferences(data)
  const resolved: Record<string, string> = {}
  const needsConfirmation: Array<{
    reference: string
    resourceType: ResourceType
    hint: string
    candidates: ResourceCandidate[]
  }> = []
  const failed: Array<{
    reference: string
    resourceType: ResourceType
    hint: string
    error: string
  }> = []

  for (const ref of references) {
    const refString = `$${ref.resourceType}:${ref.hint}`
    const result = await resolveResource(ref)

    if (result.resolved && result.resourceId) {
      resolved[refString] = result.resourceId
    } else if (result.needsConfirmation && result.candidates) {
      needsConfirmation.push({
        reference: refString,
        resourceType: ref.resourceType,
        hint: ref.hint,
        candidates: result.candidates,
      })
    } else {
      failed.push({
        reference: refString,
        resourceType: ref.resourceType,
        hint: ref.hint,
        error: result.error || '未知错误',
      })
    }
  }

  return { resolved, needsConfirmation, failed }
}

/**
 * 替换数据中的资源引用为实际 ID
 *
 * @param data - 包含资源引用的数据
 * @param resolvedMap - 已解析的引用映射
 * @returns 替换后的数据
 */
export function replaceResourceReferences(
  data: unknown,
  resolvedMap: Record<string, string>
): unknown {
  if (typeof data === 'string') {
    // 如果整个字符串是单个资源引用，直接返回 ID
    if (isResourceReference(data) && resolvedMap[data]) {
      return resolvedMap[data]
    }
    // 否则替换字符串中的所有引用
    let result = data
    for (const [ref, id] of Object.entries(resolvedMap)) {
      result = result.replace(ref, id)
    }
    return result
  }

  if (Array.isArray(data)) {
    return data.map((item) => replaceResourceReferences(item, resolvedMap))
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = replaceResourceReferences(value, resolvedMap)
    }
    return result
  }

  return data
}
