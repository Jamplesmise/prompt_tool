/**
 * 异常原因分析器
 * 根据异常类型和上下文分析可能的原因
 */

import type { Anomaly, AnomalyType } from './anomalyDetector'

/**
 * 可能的原因
 */
export type PossibleCause = {
  cause: string
  likelihood: 'high' | 'medium' | 'low'
  evidence: string
  category: 'prompt' | 'model' | 'dataset' | 'evaluator' | 'system'
  action: {
    label: string
    href: string
  }
}

/**
 * 分析上下文
 */
export type AnalysisContext = {
  promptId: string
  modelId: string
  taskId: string
  // 可选的额外上下文信息
  promptLastModified?: Date
  modelConfigChanged?: boolean
  datasetRowCountChanged?: boolean
  recentFailurePatterns?: string[]
  otherModelsPerformance?: Array<{ modelId: string; passRate: number }>
}

/**
 * 变更检测结果
 */
export type ChangeDetectionResult = {
  promptChanged: boolean
  promptChangeDate?: string
  modelConfigChanged: boolean
  datasetChanged: boolean
  newDatasetRows?: number
}

/**
 * 分析结果
 */
export type CauseAnalysisResult = {
  anomaly: Anomaly
  causes: PossibleCause[]
  changeDetection: ChangeDetectionResult
  recommendation: string
}

/**
 * 根据异常类型获取基础原因模板
 */
function getBaseCauses(anomalyType: AnomalyType): Array<Omit<PossibleCause, 'action'>> {
  const causesMap: Record<AnomalyType, Array<Omit<PossibleCause, 'action'>>> = {
    sudden_drop: [
      {
        cause: '提示词内容被修改',
        likelihood: 'high',
        evidence: '通过率突然下降通常与提示词变更相关',
        category: 'prompt',
      },
      {
        cause: '模型配置变更',
        likelihood: 'medium',
        evidence: '模型参数如温度、最大输出长度等变更可能影响输出质量',
        category: 'model',
      },
      {
        cause: '新增测试数据包含边缘用例',
        likelihood: 'medium',
        evidence: '数据集变更可能引入更难的测试用例',
        category: 'dataset',
      },
      {
        cause: '模型服务不稳定',
        likelihood: 'low',
        evidence: 'API 调用失败或超时会导致通过率下降',
        category: 'system',
      },
    ],
    sudden_rise: [
      {
        cause: '提示词优化生效',
        likelihood: 'high',
        evidence: '近期的提示词修改可能提升了模型表现',
        category: 'prompt',
      },
      {
        cause: '评估标准放宽',
        likelihood: 'medium',
        evidence: '评估器配置变更可能导致更多用例通过',
        category: 'evaluator',
      },
      {
        cause: '数据集移除了困难用例',
        likelihood: 'low',
        evidence: '数据集变更可能移除了难以通过的测试用例',
        category: 'dataset',
      },
    ],
    trend_deviation: [
      {
        cause: '存在系统性问题',
        likelihood: 'high',
        evidence: '持续偏离历史趋势表明可能存在未解决的问题',
        category: 'system',
      },
      {
        cause: '提示词需要针对性优化',
        likelihood: 'medium',
        evidence: '特定类型的失败模式可能需要提示词调整',
        category: 'prompt',
      },
      {
        cause: '模型能力边界',
        likelihood: 'medium',
        evidence: '当前模型可能不适合处理某类任务',
        category: 'model',
      },
    ],
    unusual_pattern: [
      {
        cause: '通过率异常低',
        likelihood: 'high',
        evidence: '通过率显著低于阈值需要立即关注',
        category: 'system',
      },
      {
        cause: '提示词与任务不匹配',
        likelihood: 'medium',
        evidence: '提示词设计可能不适合当前任务类型',
        category: 'prompt',
      },
      {
        cause: '评估器配置过于严格',
        likelihood: 'medium',
        evidence: '评估标准可能需要重新审视',
        category: 'evaluator',
      },
    ],
    sustained_low: [
      {
        cause: '长期存在未解决的问题',
        likelihood: 'high',
        evidence: '持续低迷表明问题需要根本性解决',
        category: 'system',
      },
      {
        cause: '提示词整体设计需要重构',
        likelihood: 'medium',
        evidence: '局部优化可能无法解决根本问题',
        category: 'prompt',
      },
      {
        cause: '需要更换更强能力的模型',
        likelihood: 'medium',
        evidence: '当前模型可能能力不足',
        category: 'model',
      },
      {
        cause: '数据集质量问题',
        likelihood: 'low',
        evidence: '测试数据可能存在标注问题',
        category: 'dataset',
      },
    ],
  }

  return causesMap[anomalyType] || []
}

/**
 * 生成操作链接
 */
function generateAction(
  category: PossibleCause['category'],
  context: AnalysisContext
): PossibleCause['action'] {
  const actions: Record<PossibleCause['category'], PossibleCause['action']> = {
    prompt: {
      label: '查看提示词历史',
      href: `/prompts/${context.promptId}?tab=versions`,
    },
    model: {
      label: '查看模型配置',
      href: '/models',
    },
    dataset: {
      label: '查看数据集',
      href: '/datasets',
    },
    evaluator: {
      label: '查看评估器配置',
      href: '/evaluators',
    },
    system: {
      label: '查看任务详情',
      href: `/tasks/${context.taskId}`,
    },
  }

  return actions[category]
}

/**
 * 调整原因的可能性
 */
function adjustLikelihood(
  baseCauses: Array<Omit<PossibleCause, 'action'>>,
  context: AnalysisContext,
  changeDetection: ChangeDetectionResult
): Array<Omit<PossibleCause, 'action'>> {
  return baseCauses.map(cause => {
    let adjustedLikelihood = cause.likelihood
    let adjustedEvidence = cause.evidence

    // 根据变更检测结果调整
    if (cause.category === 'prompt' && changeDetection.promptChanged) {
      adjustedLikelihood = 'high'
      adjustedEvidence = `${cause.evidence}。检测到提示词于 ${changeDetection.promptChangeDate} 有修改`
    }

    if (cause.category === 'model' && changeDetection.modelConfigChanged) {
      adjustedLikelihood = 'high'
      adjustedEvidence = `${cause.evidence}。检测到模型配置有变更`
    }

    if (cause.category === 'dataset' && changeDetection.datasetChanged) {
      adjustedLikelihood = 'high'
      if (changeDetection.newDatasetRows) {
        adjustedEvidence = `${cause.evidence}。数据集新增了 ${changeDetection.newDatasetRows} 条数据`
      }
    }

    // 根据其他模型表现调整
    if (cause.category === 'model' && context.otherModelsPerformance) {
      const otherModelsBetter = context.otherModelsPerformance.some(
        m => m.passRate > 80
      )
      if (otherModelsBetter) {
        adjustedLikelihood = cause.likelihood === 'low' ? 'medium' : 'high'
        adjustedEvidence = `${cause.evidence}。其他模型表现更好，当前模型可能不适合此任务`
      }
    }

    // 根据失败模式调整
    if (context.recentFailurePatterns && context.recentFailurePatterns.length > 0) {
      if (cause.category === 'prompt') {
        const hasFormatErrors = context.recentFailurePatterns.includes('format_error')
        const hasKeywordErrors = context.recentFailurePatterns.includes('keyword_missing')

        if (hasFormatErrors || hasKeywordErrors) {
          adjustedLikelihood = 'high'
          adjustedEvidence = `${cause.evidence}。检测到 ${hasFormatErrors ? '格式错误' : '关键词缺失'} 等失败模式`
        }
      }
    }

    return {
      ...cause,
      likelihood: adjustedLikelihood,
      evidence: adjustedEvidence,
    }
  })
}

/**
 * 生成推荐操作
 */
function generateRecommendation(
  anomaly: Anomaly,
  causes: PossibleCause[]
): string {
  const highLikelihoodCauses = causes.filter(c => c.likelihood === 'high')

  if (highLikelihoodCauses.length === 0) {
    return '建议检查系统日志并查看最近的配置变更'
  }

  const primaryCause = highLikelihoodCauses[0]

  const recommendations: Record<PossibleCause['category'], string> = {
    prompt: '建议查看提示词最近的修改记录，考虑回滚到之前的版本进行对比测试',
    model: '建议检查模型配置参数，或尝试使用其他模型进行对比',
    dataset: '建议检查最近新增的测试数据，分析失败用例的特征',
    evaluator: '建议审查评估器配置，确认评估标准是否合理',
    system: '建议查看任务执行日志，检查是否有系统级别的错误',
  }

  return recommendations[primaryCause.category]
}

/**
 * 分析异常原因（同步版本，用于本地数据）
 */
export function analyzeCausesSync(
  anomaly: Anomaly,
  context: AnalysisContext,
  changeDetection?: ChangeDetectionResult
): CauseAnalysisResult {
  // 默认的变更检测结果
  const changes: ChangeDetectionResult = changeDetection || {
    promptChanged: false,
    modelConfigChanged: false,
    datasetChanged: false,
  }

  // 获取基础原因
  const baseCauses = getBaseCauses(anomaly.type)

  // 调整原因可能性
  const adjustedCauses = adjustLikelihood(baseCauses, context, changes)

  // 添加操作链接
  const causesWithActions: PossibleCause[] = adjustedCauses.map(cause => ({
    ...cause,
    action: generateAction(cause.category, context),
  }))

  // 按可能性排序
  const sortedCauses = causesWithActions.sort((a, b) => {
    const likelihoodOrder = { high: 0, medium: 1, low: 2 }
    return likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]
  })

  // 生成推荐
  const recommendation = generateRecommendation(anomaly, sortedCauses)

  return {
    anomaly,
    causes: sortedCauses,
    changeDetection: changes,
    recommendation,
  }
}

/**
 * 分析异常原因（异步版本，可以从 API 获取额外数据）
 */
export async function analyzeCauses(
  anomaly: Anomaly,
  context: AnalysisContext
): Promise<CauseAnalysisResult> {
  // 尝试从 API 获取变更检测信息
  const changeDetection: ChangeDetectionResult = {
    promptChanged: false,
    modelConfigChanged: false,
    datasetChanged: false,
  }

  try {
    // 检查提示词是否有近期修改
    const promptResponse = await fetch(`/api/v1/prompts/${context.promptId}/versions?limit=2`)
    if (promptResponse.ok) {
      const promptData = await promptResponse.json()
      if (promptData.code === 200 && promptData.data && promptData.data.length > 1) {
        const latestVersion = promptData.data[0]

        // 如果最新版本是最近 7 天内创建的
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        if (new Date(latestVersion.createdAt) > sevenDaysAgo) {
          changeDetection.promptChanged = true
          changeDetection.promptChangeDate = new Date(latestVersion.createdAt).toLocaleDateString('zh-CN')
        }
      }
    }
  } catch {
    // 获取失败时继续，使用默认值
  }

  return analyzeCausesSync(anomaly, context, changeDetection)
}

/**
 * 获取原因类别的显示名称
 */
export function getCauseCategoryName(category: PossibleCause['category']): string {
  const names: Record<PossibleCause['category'], string> = {
    prompt: '提示词',
    model: '模型',
    dataset: '数据集',
    evaluator: '评估器',
    system: '系统',
  }
  return names[category]
}

/**
 * 获取可能性的显示样式
 */
export function getLikelihoodStyle(likelihood: PossibleCause['likelihood']): {
  color: string
  label: string
} {
  const styles: Record<PossibleCause['likelihood'], { color: string; label: string }> = {
    high: { color: '#cf1322', label: '高' },
    medium: { color: '#d46b08', label: '中' },
    low: { color: '#8c8c8c', label: '低' },
  }
  return styles[likelihood]
}
