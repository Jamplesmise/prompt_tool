/**
 * 对比分析服务
 * 提供模型对比和版本对比的数据获取服务
 */

import { prisma } from '@/lib/prisma'

export type ModelMetrics = {
  passRate: number
  avgLatency: number
  avgCost: number
  formatAccuracy: number
  complexQuestionScore: number
  totalTests: number
}

export type ModelComparisonData = {
  modelId: string
  modelName: string
  providerName: string
  metrics: ModelMetrics
  sampleResults: Array<{
    input: string
    output: string
    passed: boolean
    latency?: number
  }>
}

export type ModelComparisonResult = {
  models: ModelComparisonData[]
  winner: {
    overall: string | null
    byMetric: {
      passRate: string | null
      latency: string | null
      cost: string | null
    }
  }
  recommendations: ModelRecommendation[]
}

export type ModelRecommendation = {
  scenario: string
  recommendedModel: string
  modelName: string
  reason: string
  tradeoff: string
}

/**
 * 获取模型对比数据
 * @param promptId 提示词 ID
 * @param promptVersionId 提示词版本 ID
 * @param datasetId 数据集 ID
 * @param modelIds 要对比的模型 ID 列表
 */
export async function getModelComparison(
  promptId: string,
  promptVersionId: string,
  datasetId: string,
  modelIds: string[]
): Promise<ModelComparisonResult> {
  // 获取模型信息
  const models = await prisma.model.findMany({
    where: { id: { in: modelIds } },
    include: { provider: true },
  })

  const modelMap = new Map(models.map(m => [m.id, m]))

  // 获取测试结果
  const results = await prisma.taskResult.findMany({
    where: {
      promptVersionId,
      modelId: { in: modelIds },
      task: { datasetId },
      status: { in: ['SUCCESS', 'FAILED'] },
    },
    include: {
      evaluations: true,
      datasetRow: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // 按模型分组计算指标
  const modelData: ModelComparisonData[] = []

  for (const modelId of modelIds) {
    const model = modelMap.get(modelId)
    if (!model) continue

    const modelResults = results.filter(r => r.modelId === modelId)

    // 计算指标
    let passedCount = 0
    let totalLatency = 0
    let totalCost = 0
    let formatPassedCount = 0

    for (const result of modelResults) {
      const allPassed = result.evaluations.length > 0 &&
        result.evaluations.every(e => e.passed)
      if (allPassed) passedCount++

      if (result.latencyMs) {
        totalLatency += result.latencyMs / 1000
      }
      if (result.cost) {
        totalCost += Number(result.cost)
      }
      if (result.status === 'SUCCESS') {
        formatPassedCount++
      }
    }

    const totalTests = modelResults.length

    const metrics: ModelMetrics = {
      passRate: totalTests > 0 ? passedCount / totalTests : 0,
      avgLatency: totalTests > 0 ? totalLatency / totalTests : 0,
      avgCost: totalTests > 0 ? totalCost / totalTests : 0,
      formatAccuracy: totalTests > 0 ? formatPassedCount / totalTests : 0,
      complexQuestionScore: 0.7 + Math.random() * 0.25, // 模拟数据
      totalTests,
    }

    // 获取样本结果
    const sampleResults = modelResults.slice(0, 5).map(r => ({
      input: JSON.stringify(r.input).substring(0, 200),
      output: (r.output || '').substring(0, 200),
      passed: r.evaluations.length > 0 && r.evaluations.every(e => e.passed),
      latency: r.latencyMs ? r.latencyMs / 1000 : undefined,
    }))

    modelData.push({
      modelId,
      modelName: model.name,
      providerName: model.provider.name,
      metrics,
      sampleResults,
    })
  }

  // 计算胜出者
  const winner = calculateWinner(modelData)

  // 生成推荐建议
  const recommendations = generateRecommendations(modelData)

  return {
    models: modelData,
    winner,
    recommendations,
  }
}

/**
 * 计算各项指标的胜出者
 */
function calculateWinner(models: ModelComparisonData[]): ModelComparisonResult['winner'] {
  if (models.length === 0) {
    return { overall: null, byMetric: { passRate: null, latency: null, cost: null } }
  }

  // 通过率最高
  const passRateWinner = models.reduce((a, b) =>
    a.metrics.passRate > b.metrics.passRate ? a : b
  )

  // 延迟最低
  const latencyWinner = models.reduce((a, b) =>
    a.metrics.avgLatency < b.metrics.avgLatency ? a : b
  )

  // 成本最低
  const costWinner = models.reduce((a, b) =>
    a.metrics.avgCost < b.metrics.avgCost ? a : b
  )

  // 综合胜出：通过率 50%，延迟 25%，成本 25%
  const scores = models.map(m => {
    const maxPassRate = Math.max(...models.map(x => x.metrics.passRate))
    const minLatency = Math.min(...models.map(x => x.metrics.avgLatency))
    const minCost = Math.min(...models.map(x => x.metrics.avgCost))

    const passRateScore = maxPassRate > 0 ? m.metrics.passRate / maxPassRate : 0
    const latencyScore = m.metrics.avgLatency > 0 ? minLatency / m.metrics.avgLatency : 1
    const costScore = m.metrics.avgCost > 0 ? minCost / m.metrics.avgCost : 1

    return {
      modelId: m.modelId,
      score: passRateScore * 0.5 + latencyScore * 0.25 + costScore * 0.25,
    }
  })

  const overallWinner = scores.reduce((a, b) => a.score > b.score ? a : b)

  return {
    overall: overallWinner.modelId,
    byMetric: {
      passRate: passRateWinner.modelId,
      latency: latencyWinner.modelId,
      cost: costWinner.modelId,
    },
  }
}

/**
 * 生成模型使用建议
 */
function generateRecommendations(models: ModelComparisonData[]): ModelRecommendation[] {
  if (models.length === 0) return []

  const recommendations: ModelRecommendation[] = []

  // 按通过率排序
  const byPassRate = [...models].sort((a, b) => b.metrics.passRate - a.metrics.passRate)

  // 按成本排序
  const byCost = [...models].sort((a, b) => a.metrics.avgCost - b.metrics.avgCost)

  // 按延迟排序
  const byLatency = [...models].sort((a, b) => a.metrics.avgLatency - b.metrics.avgLatency)

  // 质量优先场景
  if (byPassRate[0]) {
    recommendations.push({
      scenario: '质量优先',
      recommendedModel: byPassRate[0].modelId,
      modelName: byPassRate[0].modelName,
      reason: `通过率最高 (${(byPassRate[0].metrics.passRate * 100).toFixed(1)}%)，适合对输出质量要求高的场景`,
      tradeoff: byPassRate[0].metrics.avgCost > byCost[0].metrics.avgCost
        ? '成本相对较高'
        : '无明显缺点',
    })
  }

  // 成本敏感场景
  if (byCost[0] && byCost[0].modelId !== byPassRate[0]?.modelId) {
    recommendations.push({
      scenario: '成本敏感',
      recommendedModel: byCost[0].modelId,
      modelName: byCost[0].modelName,
      reason: `成本最低 ($${byCost[0].metrics.avgCost.toFixed(6)}/次)，适合大批量处理`,
      tradeoff: byCost[0].metrics.passRate < byPassRate[0].metrics.passRate
        ? `通过率较低 (${(byCost[0].metrics.passRate * 100).toFixed(1)}%)`
        : '无明显缺点',
    })
  }

  // 速度优先场景
  if (byLatency[0] && byLatency[0].modelId !== byPassRate[0]?.modelId) {
    recommendations.push({
      scenario: '速度优先',
      recommendedModel: byLatency[0].modelId,
      modelName: byLatency[0].modelName,
      reason: `响应最快 (${byLatency[0].metrics.avgLatency.toFixed(2)}s)，适合实时交互场景`,
      tradeoff: byLatency[0].metrics.passRate < byPassRate[0].metrics.passRate
        ? `通过率较低 (${(byLatency[0].metrics.passRate * 100).toFixed(1)}%)`
        : '无明显缺点',
    })
  }

  // 均衡场景
  const balanced = models.reduce((best, current) => {
    const currentScore = current.metrics.passRate * 0.4 +
      (1 / (current.metrics.avgLatency + 0.1)) * 0.3 +
      (1 / (current.metrics.avgCost + 0.0001)) * 0.3
    const bestScore = best.metrics.passRate * 0.4 +
      (1 / (best.metrics.avgLatency + 0.1)) * 0.3 +
      (1 / (best.metrics.avgCost + 0.0001)) * 0.3
    return currentScore > bestScore ? current : best
  })

  if (balanced && !recommendations.some(r => r.recommendedModel === balanced.modelId)) {
    recommendations.push({
      scenario: '综合均衡',
      recommendedModel: balanced.modelId,
      modelName: balanced.modelName,
      reason: '在质量、速度、成本之间取得较好平衡',
      tradeoff: '各方面表现中等，无突出优势',
    })
  }

  return recommendations
}

/**
 * 运行模型对比测试
 * 创建一个新任务来对比多个模型
 */
export async function runModelComparisonTest(params: {
  promptId: string
  promptVersionId: string
  datasetId: string
  modelIds: string[]
  userId: string
  teamId?: string
}): Promise<{ taskId: string }> {
  const { promptId, promptVersionId, datasetId, modelIds, userId, teamId } = params

  // 创建对比任务
  const task = await prisma.task.create({
    data: {
      name: `模型对比测试 - ${new Date().toISOString()}`,
      description: `对比 ${modelIds.length} 个模型的表现`,
      type: 'PROMPT',
      status: 'PENDING',
      config: {
        comparison: true,
        modelIds,
      },
      datasetId,
      createdById: userId,
      teamId,
      prompts: {
        create: {
          promptId,
          promptVersionId,
        },
      },
      models: {
        create: modelIds.map(modelId => ({ modelId })),
      },
    },
  })

  return { taskId: task.id }
}
