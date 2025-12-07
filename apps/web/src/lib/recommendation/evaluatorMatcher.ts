/**
 * 评估器匹配引擎
 * 根据提示词和数据集特征推荐最佳评估器组合
 */

import type { PromptFeatures } from './promptFeatureExtractor'
import type { DatasetFeatures } from './datasetFeatureExtractor'

/**
 * 评估器类型
 */
export type EvaluatorTypeId =
  | 'exact_match'        // 精确匹配
  | 'contains'           // 包含匹配
  | 'json_valid'         // JSON 有效性
  | 'json_schema'        // JSON Schema 校验
  | 'length_range'       // 长度范围
  | 'keyword_include'    // 关键词包含
  | 'keyword_exclude'    // 关键词排除
  | 'regex_match'        // 正则匹配
  | 'similarity'         // 相似度匹配
  | 'llm'                // LLM 评估
  | 'code'               // 代码评估器

/**
 * 评估器推荐
 */
export type EvaluatorRecommendation = {
  evaluatorId: EvaluatorTypeId
  evaluatorName: string
  matchScore: number  // 0-100
  reason: string
  required: boolean   // 是否必选
  suggestedConfig?: Record<string, unknown>
}

/**
 * 推荐结果
 */
export type MatchResult = {
  recommendations: EvaluatorRecommendation[]
  overallConfidence: number
  summary: string
}

/**
 * 评估器信息
 */
const EVALUATOR_INFO: Record<EvaluatorTypeId, { name: string; description: string }> = {
  exact_match: { name: '精确匹配', description: '检查输出是否与期望完全一致' },
  contains: { name: '包含匹配', description: '检查输出是否包含指定内容' },
  json_valid: { name: 'JSON 有效性', description: '检查输出是否为有效的 JSON 格式' },
  json_schema: { name: 'JSON Schema', description: '检查 JSON 是否符合指定的 Schema' },
  length_range: { name: '长度范围', description: '检查输出长度是否在指定范围内' },
  keyword_include: { name: '关键词包含', description: '检查输出是否包含指定关键词' },
  keyword_exclude: { name: '关键词排除', description: '检查输出是否不包含指定关键词' },
  regex_match: { name: '正则匹配', description: '使用正则表达式匹配输出' },
  similarity: { name: '相似度匹配', description: '计算输出与期望的文本相似度' },
  llm: { name: 'LLM 评估', description: '使用 LLM 进行语义评估' },
  code: { name: '代码评估器', description: '使用自定义代码进行评估' },
}

/**
 * 计算 JSON 相关评估器的匹配度
 */
function matchJsonEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[] {
  const recommendations: EvaluatorRecommendation[] = []

  if (promptFeatures.hasJsonOutput) {
    recommendations.push({
      evaluatorId: 'json_valid',
      evaluatorName: EVALUATOR_INFO.json_valid.name,
      matchScore: 95,
      reason: '提示词要求 JSON 格式输出',
      required: true,
    })

    // 如果有明确的格式示例，推荐 JSON Schema
    if (promptFeatures.hasFormatExample) {
      recommendations.push({
        evaluatorId: 'json_schema',
        evaluatorName: EVALUATOR_INFO.json_schema.name,
        matchScore: 80,
        reason: '提示词包含格式示例，可定义 Schema 进行严格校验',
        required: false,
      })
    }
  }

  return recommendations
}

/**
 * 计算关键词相关评估器的匹配度
 */
function matchKeywordEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[] {
  const recommendations: EvaluatorRecommendation[] = []

  if (promptFeatures.hasKeywordRequirement || datasetFeatures.hasKeywords) {
    const score = promptFeatures.hasKeywordRequirement && datasetFeatures.hasKeywords ? 95 : 80

    recommendations.push({
      evaluatorId: 'keyword_include',
      evaluatorName: EVALUATOR_INFO.keyword_include.name,
      matchScore: score,
      reason: promptFeatures.hasKeywordRequirement
        ? '提示词有关键词要求'
        : '数据集包含关键词字段',
      required: promptFeatures.hasKeywordRequirement,
      suggestedConfig: promptFeatures.detectedKeywords.length > 0
        ? { keywords: promptFeatures.detectedKeywords }
        : undefined,
    })
  }

  return recommendations
}

/**
 * 计算长度相关评估器的匹配度
 */
function matchLengthEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[] {
  const recommendations: EvaluatorRecommendation[] = []

  if (promptFeatures.hasLengthConstraint) {
    recommendations.push({
      evaluatorId: 'length_range',
      evaluatorName: EVALUATOR_INFO.length_range.name,
      matchScore: 85,
      reason: '提示词包含长度约束',
      required: true,
    })
  }

  return recommendations
}

/**
 * 计算相似度/匹配相关评估器的匹配度
 */
function matchSimilarityEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[] {
  const recommendations: EvaluatorRecommendation[] = []

  if (datasetFeatures.hasExpectedOutput) {
    // 根据任务类型推荐不同的评估器
    switch (promptFeatures.taskType) {
      case 'classification':
        recommendations.push({
          evaluatorId: 'exact_match',
          evaluatorName: EVALUATOR_INFO.exact_match.name,
          matchScore: 90,
          reason: '分类任务适合使用精确匹配',
          required: true,
        })
        break

      case 'translation':
      case 'summarization':
        recommendations.push({
          evaluatorId: 'similarity',
          evaluatorName: EVALUATOR_INFO.similarity.name,
          matchScore: 85,
          reason: `${promptFeatures.taskType === 'translation' ? '翻译' : '摘要'}任务适合使用相似度评估`,
          required: true,
          suggestedConfig: { threshold: 0.7 },
        })
        break

      case 'qa':
        recommendations.push({
          evaluatorId: 'contains',
          evaluatorName: EVALUATOR_INFO.contains.name,
          matchScore: 75,
          reason: '问答任务可检查答案是否包含关键信息',
          required: false,
        })
        recommendations.push({
          evaluatorId: 'similarity',
          evaluatorName: EVALUATOR_INFO.similarity.name,
          matchScore: 80,
          reason: '问答任务可使用相似度评估答案质量',
          required: false,
          suggestedConfig: { threshold: 0.6 },
        })
        break

      case 'generation':
      case 'code':
      default:
        // 生成任务更适合 LLM 评估
        if (datasetFeatures.avgOutputLength > 100) {
          recommendations.push({
            evaluatorId: 'llm',
            evaluatorName: EVALUATOR_INFO.llm.name,
            matchScore: 85,
            reason: '长文本生成适合使用 LLM 进行语义评估',
            required: false,
          })
        }
        recommendations.push({
          evaluatorId: 'similarity',
          evaluatorName: EVALUATOR_INFO.similarity.name,
          matchScore: 70,
          reason: '有期望输出时可使用相似度评估',
          required: false,
          suggestedConfig: { threshold: 0.5 },
        })
    }
  } else {
    // 没有期望输出时，推荐 LLM 评估
    recommendations.push({
      evaluatorId: 'llm',
      evaluatorName: EVALUATOR_INFO.llm.name,
      matchScore: 75,
      reason: '无期望输出时可使用 LLM 评估输出质量',
      required: false,
    })
  }

  return recommendations
}

/**
 * 计算评分相关评估器的匹配度
 */
function matchScoreEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[] {
  const recommendations: EvaluatorRecommendation[] = []

  if (promptFeatures.hasScoreRequirement || datasetFeatures.hasScore) {
    recommendations.push({
      evaluatorId: 'llm',
      evaluatorName: EVALUATOR_INFO.llm.name,
      matchScore: 85,
      reason: '评分任务适合使用 LLM 评估',
      required: false,
    })
    recommendations.push({
      evaluatorId: 'code',
      evaluatorName: EVALUATOR_INFO.code.name,
      matchScore: 70,
      reason: '可使用代码评估器实现自定义评分逻辑',
      required: false,
    })
  }

  return recommendations
}

/**
 * 根据特征推荐评估器
 * @param promptFeatures 提示词特征
 * @param datasetFeatures 数据集特征
 * @returns 推荐结果
 */
export function matchEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): MatchResult {
  const allRecommendations: EvaluatorRecommendation[] = []

  // 收集所有推荐
  allRecommendations.push(...matchJsonEvaluators(promptFeatures, datasetFeatures))
  allRecommendations.push(...matchKeywordEvaluators(promptFeatures, datasetFeatures))
  allRecommendations.push(...matchLengthEvaluators(promptFeatures, datasetFeatures))
  allRecommendations.push(...matchSimilarityEvaluators(promptFeatures, datasetFeatures))
  allRecommendations.push(...matchScoreEvaluators(promptFeatures, datasetFeatures))

  // 去重并合并（保留最高分）
  const evaluatorMap = new Map<EvaluatorTypeId, EvaluatorRecommendation>()
  for (const rec of allRecommendations) {
    const existing = evaluatorMap.get(rec.evaluatorId)
    if (!existing || rec.matchScore > existing.matchScore) {
      evaluatorMap.set(rec.evaluatorId, rec)
    }
  }

  // 排序
  const recommendations = Array.from(evaluatorMap.values())
    .sort((a, b) => {
      // 必选的排在前面
      if (a.required !== b.required) return a.required ? -1 : 1
      // 否则按分数排序
      return b.matchScore - a.matchScore
    })

  // 计算整体置信度
  const overallConfidence = Math.min(
    (promptFeatures.confidence + datasetFeatures.confidence) / 2 +
    (recommendations.length > 0 ? 0.1 : 0),
    1
  )

  // 生成摘要
  const requiredCount = recommendations.filter(r => r.required).length
  const summary = requiredCount > 0
    ? `推荐 ${recommendations.length} 个评估器，其中 ${requiredCount} 个为必选`
    : `推荐 ${recommendations.length} 个评估器，可根据需要选择`

  return {
    recommendations,
    overallConfidence,
    summary,
  }
}

/**
 * 获取评估器信息
 */
export function getEvaluatorInfo(evaluatorId: EvaluatorTypeId) {
  return EVALUATOR_INFO[evaluatorId]
}

/**
 * 获取所有评估器信息
 */
export function getAllEvaluatorInfo() {
  return EVALUATOR_INFO
}
