/**
 * GOI 置信度评估器
 *
 * 根据意图解析结果评估置信度，决定后续行为：
 * - auto_execute: 自动执行
 * - confirm: 确认后执行
 * - clarify: 需要澄清
 * - reject: 无法理解
 */

import type {
  ParsedIntent,
  EntityMatch,
  IntentCategory,
  ResourceType,
  ConfidenceAction,
} from '@platform/shared'
import {
  CONFIDENCE_THRESHOLDS,
  decideActionByConfidence,
} from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 置信度评估上下文
 */
export type ConfidenceContext = {
  /** 当前页面 */
  currentPage?: string
  /** 是否有选中的资源 */
  hasSelectedResource?: boolean
  /** 最近是否有相同类型的操作 */
  recentSimilarAction?: boolean
  /** 用户历史操作模式 */
  userPatterns?: {
    commonIntents?: IntentCategory[]
    commonResources?: ResourceType[]
  }
}

/**
 * 置信度评估结果
 */
export type ConfidenceEvaluation = {
  /** 最终置信度 (0-1) */
  confidence: number
  /** 决定的动作 */
  action: ConfidenceAction
  /** 各项评估详情 */
  breakdown: {
    /** 意图置信度 */
    intentConfidence: number
    /** 实体置信度 */
    entityConfidence: number
    /** 完整性得分 */
    completenessScore: number
    /** 上下文加成 */
    contextBonus: number
  }
  /** 需要确认的原因 */
  confirmReasons?: string[]
  /** 需要澄清的原因 */
  clarifyReasons?: string[]
}

// ============================================
// 意图类型的风险等级
// ============================================

/**
 * 意图类型的风险等级
 * 高风险操作需要更高的置信度
 */
const INTENT_RISK_LEVELS: Record<IntentCategory, number> = {
  navigation: 0.1,     // 低风险
  query: 0.1,          // 低风险
  export: 0.2,         // 低风险
  comparison: 0.2,     // 低风险
  creation: 0.3,       // 中等风险
  modification: 0.4,   // 中等风险
  execution: 0.5,      // 中等风险
  deletion: 0.8,       // 高风险
  clarification: 0.0,  // 需要澄清
  unknown: 0.0,        // 无法识别
}

/**
 * 获取意图的风险等级
 */
export function getIntentRiskLevel(category: IntentCategory): number {
  return INTENT_RISK_LEVELS[category] ?? 0.5
}

// ============================================
// 完整性检查
// ============================================

/**
 * 意图所需的字段
 */
const REQUIRED_FIELDS: Record<IntentCategory, string[]> = {
  navigation: ['resourceType'],
  creation: ['resourceType'],
  modification: ['resourceType', 'resourceId'],
  deletion: ['resourceType', 'resourceId'],
  query: ['resourceType'],
  execution: ['resourceType'],
  comparison: ['resourceType'],
  export: ['resourceType'],
  clarification: [],
  unknown: [],
}

/**
 * 检查意图的完整性
 */
export function checkIntentCompleteness(intent: ParsedIntent): {
  score: number
  missingFields: string[]
} {
  const requiredFields = REQUIRED_FIELDS[intent.category] || []
  const missingFields: string[] = []

  for (const field of requiredFields) {
    const value = intent[field as keyof ParsedIntent]
    if (value === undefined || value === null || value === '') {
      // resourceId 对于创建操作不是必须的
      if (field === 'resourceId' && intent.category === 'creation') {
        continue
      }
      // 如果有 resourceName，resourceId 可以后续解析
      if (field === 'resourceId' && intent.resourceName) {
        continue
      }
      missingFields.push(field)
    }
  }

  const totalFields = requiredFields.length
  const presentFields = totalFields - missingFields.length
  const score = totalFields > 0 ? presentFields / totalFields : 1

  return { score, missingFields }
}

// ============================================
// 实体置信度计算
// ============================================

/**
 * 计算实体的综合置信度
 */
export function calculateEntityConfidence(entities: EntityMatch[]): number {
  if (entities.length === 0) return 0.5 // 没有实体时给中等分数

  // 计算加权平均
  let totalWeight = 0
  let weightedSum = 0

  for (const entity of entities) {
    // 不同类型的实体有不同权重
    const weight = getEntityWeight(entity.type)
    totalWeight += weight
    weightedSum += entity.confidence * weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5
}

/**
 * 获取实体类型的权重
 */
function getEntityWeight(type: string): number {
  const weights: Record<string, number> = {
    resource_type: 1.0,
    resource_name: 0.8,
    action: 0.6,
    parameter: 0.4,
  }
  return weights[type] ?? 0.5
}

/**
 * 检查是否有歧义（多个候选）
 */
export function hasAmbiguity(entities: EntityMatch[]): boolean {
  return entities.some((e) => e.candidates && e.candidates.length > 1)
}

// ============================================
// 上下文加成
// ============================================

/**
 * 计算上下文加成
 */
export function calculateContextBonus(
  intent: ParsedIntent,
  context?: ConfidenceContext
): number {
  if (!context) return 0

  let bonus = 0

  // 1. 当前页面匹配
  if (context.currentPage && intent.resourceType) {
    const pageToResource: Record<string, ResourceType[]> = {
      '/prompts': ['prompt', 'prompt_version', 'prompt_branch'],
      '/datasets': ['dataset', 'dataset_version'],
      '/models': ['model', 'provider'],
      '/tasks': ['task', 'task_result'],
      '/evaluators': ['evaluator'],
      '/scheduled': ['scheduled_task'],
      '/monitor': ['alert_rule', 'notify_channel', 'monitor'],
      '/settings': ['settings'],
      '/dashboard': ['dashboard'],
    }

    const relevantResources = pageToResource[context.currentPage] || []
    if (relevantResources.includes(intent.resourceType)) {
      bonus += 0.1 // 页面匹配加成
    }
  }

  // 2. 有选中资源
  if (context.hasSelectedResource && intent.category !== 'creation') {
    bonus += 0.05
  }

  // 3. 与用户历史模式匹配
  if (context.userPatterns) {
    if (context.userPatterns.commonIntents?.includes(intent.category)) {
      bonus += 0.05
    }
    if (intent.resourceType && context.userPatterns.commonResources?.includes(intent.resourceType)) {
      bonus += 0.05
    }
  }

  // 4. 最近有相似操作
  if (context.recentSimilarAction) {
    bonus += 0.05
  }

  return Math.min(bonus, 0.2) // 最大加成 0.2
}

// ============================================
// 综合评估
// ============================================

/**
 * 评估意图置信度
 */
export function evaluateConfidence(
  intent: ParsedIntent,
  entities: EntityMatch[],
  context?: ConfidenceContext
): ConfidenceEvaluation {
  const confirmReasons: string[] = []
  const clarifyReasons: string[] = []

  // 1. 基础意图置信度
  let intentConfidence = intent.confidence

  // 2. 完整性检查
  const completeness = checkIntentCompleteness(intent)
  const completenessScore = completeness.score

  if (completeness.missingFields.length > 0) {
    clarifyReasons.push(`缺少必要信息: ${completeness.missingFields.join(', ')}`)
    intentConfidence *= completenessScore
  }

  // 3. 实体置信度
  const entityConfidence = calculateEntityConfidence(entities)

  if (hasAmbiguity(entities)) {
    confirmReasons.push('检测到多个可能的匹配项')
    intentConfidence *= 0.8
  }

  // 4. 上下文加成
  const contextBonus = calculateContextBonus(intent, context)

  // 5. 风险调整
  const riskLevel = getIntentRiskLevel(intent.category)
  const riskAdjustedThreshold = CONFIDENCE_THRESHOLDS.AUTO_EXECUTE + riskLevel * 0.1

  // 高风险操作需要更高置信度
  if (intent.category === 'deletion') {
    confirmReasons.push('删除操作需要确认')
  }

  // 6. 综合计算
  let finalConfidence = Math.min(
    intentConfidence,
    entityConfidence,
    completenessScore
  ) + contextBonus

  // 确保在 0-1 范围内
  finalConfidence = Math.max(0, Math.min(1, finalConfidence))

  // 7. 决定动作
  let action = decideActionByConfidence(finalConfidence)

  // 高风险操作强制确认
  if (action === 'auto_execute' && riskLevel > 0.5) {
    action = 'confirm'
    confirmReasons.push('高风险操作需要确认')
  }

  return {
    confidence: finalConfidence,
    action,
    breakdown: {
      intentConfidence: intent.confidence,
      entityConfidence,
      completenessScore,
      contextBonus,
    },
    confirmReasons: confirmReasons.length > 0 ? confirmReasons : undefined,
    clarifyReasons: clarifyReasons.length > 0 ? clarifyReasons : undefined,
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 快速评估（仅基于意图）
 */
export function quickEvaluate(intent: ParsedIntent): ConfidenceAction {
  const completeness = checkIntentCompleteness(intent)

  // 不完整时需要澄清
  if (completeness.score < 0.5) {
    return 'clarify'
  }

  // 删除操作需要确认
  if (intent.category === 'deletion') {
    return 'confirm'
  }

  return decideActionByConfidence(intent.confidence * completeness.score)
}

/**
 * 检查是否可以自动执行
 */
export function canAutoExecute(
  intent: ParsedIntent,
  entities: EntityMatch[],
  context?: ConfidenceContext
): boolean {
  const evaluation = evaluateConfidence(intent, entities, context)
  return evaluation.action === 'auto_execute'
}

/**
 * 检查是否需要确认
 */
export function needsConfirmation(
  intent: ParsedIntent,
  entities: EntityMatch[],
  context?: ConfidenceContext
): boolean {
  const evaluation = evaluateConfidence(intent, entities, context)
  return evaluation.action === 'confirm'
}

/**
 * 检查是否需要澄清
 */
export function needsClarification(
  intent: ParsedIntent,
  entities: EntityMatch[],
  context?: ConfidenceContext
): boolean {
  const evaluation = evaluateConfidence(intent, entities, context)
  return evaluation.action === 'clarify' || evaluation.action === 'reject'
}

// ============================================
// 置信度调整
// ============================================

/**
 * 根据用户反馈调整置信度
 */
export function adjustConfidenceByFeedback(
  baseConfidence: number,
  feedback: 'positive' | 'negative' | 'neutral'
): number {
  switch (feedback) {
    case 'positive':
      return Math.min(1, baseConfidence * 1.1)
    case 'negative':
      return Math.max(0, baseConfidence * 0.8)
    default:
      return baseConfidence
  }
}

/**
 * 根据历史准确率调整置信度
 */
export function adjustConfidenceByHistory(
  baseConfidence: number,
  accuracy: number // 0-1
): number {
  // accuracy 低于 0.5 时降低置信度，高于 0.5 时提高置信度
  const adjustment = (accuracy - 0.5) * 0.2
  return Math.max(0, Math.min(1, baseConfidence + adjustment))
}

// ============================================
// 阈值管理
// ============================================

/**
 * 自定义置信度阈值
 */
export type CustomThresholds = Partial<typeof CONFIDENCE_THRESHOLDS>

/**
 * 使用自定义阈值决定动作
 */
export function decideActionWithCustomThresholds(
  confidence: number,
  thresholds: CustomThresholds
): ConfidenceAction {
  const merged = { ...CONFIDENCE_THRESHOLDS, ...thresholds }

  if (confidence >= merged.AUTO_EXECUTE) return 'auto_execute'
  if (confidence >= merged.CONFIRM_ONCE) return 'confirm'
  if (confidence >= merged.CLARIFY) return 'clarify'
  return 'reject'
}

// 重新导出 shared 中的类型和常量
export { CONFIDENCE_THRESHOLDS, decideActionByConfidence }
