/**
 * GOI 资源预解析
 *
 * 在规划阶段预先解析用户提到的资源，提供候选项
 */

import type { ResourceType, TaskPlan, ResourceRequirement } from '@platform/shared'
import { prisma } from '../../prisma'

// ============================================
// 类型定义
// ============================================

/**
 * 资源候选项
 */
export type ResourceCandidate = {
  /** 资源 ID */
  id: string
  /** 资源名称 */
  name: string
  /** 匹配分数 (0-1) */
  score: number
  /** 额外信息 */
  metadata?: Record<string, unknown>
}

/**
 * 资源解析结果
 */
export type ResolvedResource = {
  /** 资源类型 */
  type: ResourceType
  /** 用户输入的名称 */
  inputName: string
  /** 候选项列表 */
  candidates: ResourceCandidate[]
  /** 最佳匹配 */
  bestMatch?: {
    id: string
    name: string
    confidence: number
  }
  /** 是否需要用户澄清 */
  needsClarification: boolean
}

/**
 * 资源解析配置
 */
export type ResolverConfig = {
  /** 最大候选项数量 */
  maxCandidates?: number
  /** 最小匹配分数 */
  minScore?: number
  /** 自动选择阈值（高于此分数自动选择） */
  autoSelectThreshold?: number
}

// ============================================
// 模糊匹配算法
// ============================================

/**
 * 计算字符串相似度（Levenshtein 距离）
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * 计算匹配分数
 */
function calculateMatchScore(input: string, target: string): number {
  const normalizedInput = input.toLowerCase().trim()
  const normalizedTarget = target.toLowerCase().trim()

  // 完全匹配
  if (normalizedInput === normalizedTarget) {
    return 1.0
  }

  // 包含匹配
  if (normalizedTarget.includes(normalizedInput)) {
    return 0.9
  }
  if (normalizedInput.includes(normalizedTarget)) {
    return 0.85
  }

  // 编辑距离
  const distance = levenshteinDistance(normalizedInput, normalizedTarget)
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length)
  const similarity = 1 - distance / maxLength

  return Math.max(0, similarity)
}

// ============================================
// 资源查询
// ============================================

/**
 * 搜索提示词
 */
async function searchPrompts(query: string, limit: number): Promise<ResourceCandidate[]> {
  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit * 2, // 获取更多以便排序
    orderBy: { updatedAt: 'desc' },
  })

  return prompts
    .map(p => ({
      id: p.id,
      name: p.name,
      score: calculateMatchScore(query, p.name),
      metadata: { description: p.description },
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 搜索数据集
 */
async function searchDatasets(query: string, limit: number): Promise<ResourceCandidate[]> {
  const datasets = await prisma.dataset.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit * 2,
    orderBy: { updatedAt: 'desc' },
  })

  return datasets
    .map(d => ({
      id: d.id,
      name: d.name,
      score: calculateMatchScore(query, d.name),
      metadata: { rowCount: d.rowCount, description: d.description },
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 搜索模型
 */
async function searchModels(query: string, limit: number): Promise<ResourceCandidate[]> {
  // 优先搜索本地模型
  const localModels = await prisma.model.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { modelId: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { provider: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  // 搜索同步的 FastGPT 模型
  const syncedModels = await prisma.syncedModel.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { modelId: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  const candidates: ResourceCandidate[] = [
    ...localModels.map(m => ({
      id: m.id,
      name: m.name,
      score: calculateMatchScore(query, m.name),
      metadata: { provider: m.provider.name, modelId: m.modelId, source: 'local' },
    })),
    ...syncedModels.map(m => ({
      id: m.id,
      name: m.name,
      score: calculateMatchScore(query, m.name),
      metadata: { provider: m.provider, modelId: m.modelId, source: 'fastgpt' },
    })),
  ]

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 搜索任务
 */
async function searchTasks(query: string, limit: number): Promise<ResourceCandidate[]> {
  const tasks = await prisma.task.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' },
    },
    take: limit * 2,
    orderBy: { updatedAt: 'desc' },
  })

  return tasks
    .map(t => ({
      id: t.id,
      name: t.name,
      score: calculateMatchScore(query, t.name),
      metadata: { status: t.status },
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 搜索评估器
 */
async function searchEvaluators(query: string, limit: number): Promise<ResourceCandidate[]> {
  const evaluators = await prisma.evaluator.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: limit * 2,
    orderBy: { updatedAt: 'desc' },
  })

  return evaluators
    .map(e => ({
      id: e.id,
      name: e.name,
      score: calculateMatchScore(query, e.name),
      metadata: { type: e.type, description: e.description },
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 根据资源类型搜索
 */
async function searchResourcesByType(
  type: ResourceType,
  query: string,
  limit: number
): Promise<ResourceCandidate[]> {
  switch (type) {
    case 'prompt':
    case 'prompt_version':
    case 'prompt_branch':
      return searchPrompts(query, limit)

    case 'dataset':
    case 'dataset_version':
      return searchDatasets(query, limit)

    case 'model':
    case 'provider':
      return searchModels(query, limit)

    case 'task':
    case 'task_result':
      return searchTasks(query, limit)

    case 'evaluator':
      return searchEvaluators(query, limit)

    default:
      return []
  }
}

// ============================================
// 资源解析
// ============================================

/**
 * 解析单个资源
 */
export async function resolveResource(
  type: ResourceType,
  inputName: string,
  config: ResolverConfig = {}
): Promise<ResolvedResource> {
  const {
    maxCandidates = 5,
    minScore = 0.3,
    autoSelectThreshold = 0.8,
  } = config

  // 如果没有输入名称，返回空结果
  if (!inputName || inputName.trim() === '') {
    return {
      type,
      inputName: '',
      candidates: [],
      needsClarification: true,
    }
  }

  // 搜索候选项
  const candidates = await searchResourcesByType(type, inputName, maxCandidates)

  // 过滤低分候选项
  const filteredCandidates = candidates.filter(c => c.score >= minScore)

  // 构建结果
  const result: ResolvedResource = {
    type,
    inputName,
    candidates: filteredCandidates,
    needsClarification: filteredCandidates.length !== 1 || filteredCandidates[0]?.score < autoSelectThreshold,
  }

  // 如果有高置信度匹配，设置 bestMatch
  if (filteredCandidates.length > 0 && filteredCandidates[0].score >= autoSelectThreshold) {
    result.bestMatch = {
      id: filteredCandidates[0].id,
      name: filteredCandidates[0].name,
      confidence: filteredCandidates[0].score,
    }
    result.needsClarification = false
  }

  return result
}

/**
 * 解析计划中需要的所有资源
 */
export async function resolveResources(
  requirements: ResourceRequirement[],
  config: ResolverConfig = {}
): Promise<Map<string, ResolvedResource>> {
  const results = new Map<string, ResolvedResource>()

  for (const req of requirements) {
    const key = `${req.type}:${req.name || 'default'}`
    const resolved = await resolveResource(req.type, req.name || '', config)
    results.set(key, resolved)
  }

  return results
}

/**
 * 更新计划中的资源引用
 */
export function updatePlanWithResolvedResources(
  plan: TaskPlan,
  resolved: Map<string, ResolvedResource>
): TaskPlan {
  // 更新步骤中的资源引用
  const updatedSteps = plan.steps.map(step => {
    if (step.operation.type === 'access' && step.operation.action === 'select') {
      const resourceType = step.operation.target.resourceType
      const resolvedKey = `${resourceType}:${step.operation.target.resourceId || 'default'}`
      const resolvedResource = resolved.get(resolvedKey)

      if (resolvedResource?.bestMatch) {
        return {
          ...step,
          operation: {
            ...step.operation,
            target: {
              ...step.operation.target,
              resourceId: resolvedResource.bestMatch.id,
            },
          },
          userLabel: `${step.userLabel} → ${resolvedResource.bestMatch.name}`,
        }
      }
    }
    return step
  })

  // 更新资源需求
  const updatedRequirements = plan.requiredResources.map(req => {
    const key = `${req.type}:${req.name || 'default'}`
    const resolvedResource = resolved.get(key)

    if (resolvedResource?.bestMatch) {
      return {
        ...req,
        resolved: resolvedResource.bestMatch,
      }
    }
    return req
  })

  return {
    ...plan,
    steps: updatedSteps,
    requiredResources: updatedRequirements,
    updatedAt: new Date(),
  }
}

// ============================================
// 资源统计
// ============================================

/**
 * 获取可用资源统计
 */
export async function getAvailableResourceStats(): Promise<{
  prompts: number
  datasets: number
  models: number
  evaluators: number
  tasks: number
}> {
  const [prompts, datasets, localModels, syncedModels, evaluators, tasks] = await Promise.all([
    prisma.prompt.count(),
    prisma.dataset.count(),
    prisma.model.count(),
    prisma.syncedModel.count(),
    prisma.evaluator.count(),
    prisma.task.count(),
  ])

  return {
    prompts,
    datasets,
    models: localModels + syncedModels,
    evaluators,
    tasks,
  }
}

/**
 * 获取最近使用的资源
 */
export async function getRecentResources(
  type: ResourceType,
  limit: number = 5
): Promise<ResourceCandidate[]> {
  switch (type) {
    case 'prompt': {
      const prompts = await prisma.prompt.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })
      return prompts.map(p => ({
        id: p.id,
        name: p.name,
        score: 1,
      }))
    }

    case 'dataset': {
      const datasets = await prisma.dataset.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })
      return datasets.map(d => ({
        id: d.id,
        name: d.name,
        score: 1,
      }))
    }

    case 'model': {
      const models = await prisma.model.findMany({
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: { provider: true },
      })
      return models.map(m => ({
        id: m.id,
        name: m.name,
        score: 1,
        metadata: { provider: m.provider.name },
      }))
    }

    default:
      return []
  }
}

// ============================================
// 默认资源选择
// ============================================

/**
 * 获取默认模型
 */
export async function getDefaultModel(): Promise<ResourceCandidate | null> {
  // 优先查找活跃的模型，按更新时间排序
  const defaultModel = await prisma.model.findFirst({
    where: { isActive: true },
    include: { provider: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (defaultModel) {
    return {
      id: defaultModel.id,
      name: defaultModel.name,
      score: 1,
      metadata: { provider: defaultModel.provider.name },
    }
  }

  // 没有本地模型，尝试获取 FastGPT 同步模型
  const syncedModel = await prisma.syncedModel.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (syncedModel) {
    return {
      id: syncedModel.id,
      name: syncedModel.name,
      score: 1,
      metadata: { provider: syncedModel.provider, source: 'fastgpt' },
    }
  }

  return null
}
