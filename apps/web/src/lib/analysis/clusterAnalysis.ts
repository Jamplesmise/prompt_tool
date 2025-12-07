/**
 * 失败样本聚类分析
 * 将相似的失败样本归为一组
 */

import { cachedSimilarity, computeSimilarityMatrix } from './textSimilarity'
import type { FailedResult, FailureType } from './failurePatternDetector'

/**
 * 聚类结果
 */
export type Cluster = {
  id: string
  label: string
  samples: FailedResult[]
  commonPattern: string
  representativeSample: FailedResult
  avgSimilarity: number
}

/**
 * 聚类配置
 */
export type ClusterConfig = {
  /** 相似度阈值 (0-1)，默认 0.7 */
  threshold?: number
  /** 最大聚类数，默认 10 */
  maxClusters?: number
  /** 最小聚类大小，默认 2 */
  minClusterSize?: number
  /** 相似度计算方法 */
  similarityMethod?: 'jaccard' | 'editDistance' | 'cosine' | 'combined'
}

/**
 * 生成聚类 ID
 */
function generateClusterId(): string {
  return `cluster_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * 提取样本用于相似度比较的文本
 */
function extractComparisonText(sample: FailedResult): string {
  const parts: string[] = []

  // 输出内容
  if (sample.output) {
    parts.push(sample.output)
  }

  // 评估器失败原因
  const failedReasons = sample.evaluations
    .filter(e => !e.passed && e.reason)
    .map(e => e.reason!)
  if (failedReasons.length > 0) {
    parts.push(failedReasons.join(' '))
  }

  // 错误信息
  if (sample.error) {
    parts.push(sample.error)
  }

  return parts.join(' ')
}

/**
 * 生成聚类标签
 */
function generateClusterLabel(samples: FailedResult[], index: number): string {
  if (samples.length === 0) return `聚类 ${index + 1}`

  // 尝试从评估器原因中提取共同特征
  const allReasons = samples
    .flatMap(s => s.evaluations.filter(e => !e.passed).map(e => e.reason || ''))
    .filter(r => r.length > 0)

  if (allReasons.length > 0) {
    // 找出最常见的关键词
    const wordCount = new Map<string, number>()
    for (const reason of allReasons) {
      const words = reason.split(/[\s,，.。!！?？;；:：]+/).filter(w => w.length >= 2)
      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1)
      }
    }

    // 找出出现频率最高的词
    let maxWord = ''
    let maxCount = 0
    for (const [word, count] of wordCount) {
      if (count > maxCount && word.length >= 2) {
        maxWord = word
        maxCount = count
      }
    }

    if (maxWord) {
      return `${maxWord}相关问题`
    }
  }

  // 基于样本状态生成标签
  const statuses = samples.map(s => s.status)
  if (statuses.every(s => s === 'TIMEOUT')) {
    return '超时问题'
  }
  if (statuses.every(s => s === 'ERROR')) {
    return '执行错误'
  }

  return `聚类 ${index + 1}`
}

/**
 * 提取共同模式描述
 */
function extractCommonPattern(samples: FailedResult[]): string {
  if (samples.length === 0) return '无共同模式'
  if (samples.length === 1) return '单一样本'

  const patterns: string[] = []

  // 检查输出长度模式
  const outputLengths = samples.map(s => s.output?.length || 0)
  const avgLength = outputLengths.reduce((a, b) => a + b, 0) / outputLengths.length
  if (avgLength < 50) {
    patterns.push('输出普遍过短')
  } else if (avgLength > 1000) {
    patterns.push('输出普遍过长')
  }

  // 检查是否都有相同类型的评估器失败
  const evaluatorFailures = new Map<string, number>()
  for (const sample of samples) {
    for (const evaluation of sample.evaluations) {
      if (!evaluation.passed) {
        const key = evaluation.evaluatorName
        evaluatorFailures.set(key, (evaluatorFailures.get(key) || 0) + 1)
      }
    }
  }

  for (const [evaluator, count] of evaluatorFailures) {
    if (count >= samples.length * 0.8) {
      patterns.push(`${evaluator} 评估失败`)
    }
  }

  // 检查状态模式
  const statusCount = new Map<string, number>()
  for (const sample of samples) {
    statusCount.set(sample.status, (statusCount.get(sample.status) || 0) + 1)
  }
  for (const [status, count] of statusCount) {
    if (count >= samples.length * 0.8 && status !== 'SUCCESS') {
      patterns.push(`状态: ${status}`)
    }
  }

  return patterns.length > 0 ? patterns.join('；') : '相似的失败模式'
}

/**
 * 选择代表性样本
 */
function selectRepresentativeSample(samples: FailedResult[]): FailedResult {
  if (samples.length === 0) {
    throw new Error('Cannot select representative from empty samples')
  }
  if (samples.length === 1) {
    return samples[0]
  }

  // 计算每个样本与其他样本的平均相似度
  const texts = samples.map(extractComparisonText)
  const avgSimilarities: number[] = []

  for (let i = 0; i < samples.length; i++) {
    let totalSimilarity = 0
    for (let j = 0; j < samples.length; j++) {
      if (i !== j) {
        totalSimilarity += cachedSimilarity(texts[i], texts[j])
      }
    }
    avgSimilarities.push(totalSimilarity / (samples.length - 1))
  }

  // 选择平均相似度最高的样本作为代表
  let maxIndex = 0
  let maxSimilarity = avgSimilarities[0]
  for (let i = 1; i < avgSimilarities.length; i++) {
    if (avgSimilarities[i] > maxSimilarity) {
      maxSimilarity = avgSimilarities[i]
      maxIndex = i
    }
  }

  return samples[maxIndex]
}

/**
 * 计算聚类的平均相似度
 */
function calculateClusterSimilarity(samples: FailedResult[]): number {
  if (samples.length <= 1) return 1

  const texts = samples.map(extractComparisonText)
  let totalSimilarity = 0
  let count = 0

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      totalSimilarity += cachedSimilarity(texts[i], texts[j])
      count++
    }
  }

  return count > 0 ? totalSimilarity / count : 1
}

/**
 * 层次聚类算法 (Agglomerative Clustering)
 */
function hierarchicalClustering(
  samples: FailedResult[],
  config: ClusterConfig
): Cluster[] {
  const { threshold = 0.7, maxClusters = 10, minClusterSize = 2 } = config

  if (samples.length === 0) return []
  if (samples.length === 1) {
    return [{
      id: generateClusterId(),
      label: generateClusterLabel(samples, 0),
      samples,
      commonPattern: extractCommonPattern(samples),
      representativeSample: samples[0],
      avgSimilarity: 1,
    }]
  }

  // 提取比较文本
  const texts = samples.map(extractComparisonText)

  // 初始化：每个样本一个聚类
  let clusters: number[][] = samples.map((_, i) => [i])

  // 计算相似度矩阵
  const similarityMatrix = computeSimilarityMatrix(texts, config.similarityMethod || 'combined')

  // 聚类距离矩阵（初始为相似度矩阵的相反数）
  const clusterDistances = new Map<string, number>()
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      clusterDistances.set(`${i}-${j}`, similarityMatrix[i][j])
    }
  }

  // 迭代合并
  while (clusters.length > 1) {
    // 找到最相似的两个聚类
    let maxSimilarity = -1
    let mergeI = -1
    let mergeJ = -1

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        // 计算聚类间的平均链接相似度
        let totalSim = 0
        let count = 0
        for (const sampleI of clusters[i]) {
          for (const sampleJ of clusters[j]) {
            totalSim += similarityMatrix[sampleI][sampleJ]
            count++
          }
        }
        const avgSim = count > 0 ? totalSim / count : 0

        if (avgSim > maxSimilarity) {
          maxSimilarity = avgSim
          mergeI = i
          mergeJ = j
        }
      }
    }

    // 如果最大相似度低于阈值，停止合并
    if (maxSimilarity < threshold) {
      break
    }

    // 合并聚类
    const mergedCluster = [...clusters[mergeI], ...clusters[mergeJ]]
    clusters = clusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ)
    clusters.push(mergedCluster)

    // 如果达到最大聚类数限制
    if (clusters.length <= maxClusters) {
      // 可以继续合并
    }
  }

  // 转换为 Cluster 对象
  const result: Cluster[] = []
  let clusterIndex = 0

  for (const clusterIndices of clusters) {
    const clusterSamples = clusterIndices.map(i => samples[i])

    // 过滤掉太小的聚类
    if (clusterSamples.length < minClusterSize) {
      continue
    }

    result.push({
      id: generateClusterId(),
      label: generateClusterLabel(clusterSamples, clusterIndex),
      samples: clusterSamples,
      commonPattern: extractCommonPattern(clusterSamples),
      representativeSample: selectRepresentativeSample(clusterSamples),
      avgSimilarity: calculateClusterSimilarity(clusterSamples),
    })
    clusterIndex++
  }

  // 按样本数量排序
  result.sort((a, b) => b.samples.length - a.samples.length)

  return result
}

/**
 * 对失败样本进行聚类
 * @param results 失败结果列表
 * @param threshold 相似度阈值，默认 0.7
 * @returns 聚类结果
 */
export function clusterFailures(
  results: FailedResult[],
  threshold: number = 0.7
): Cluster[] {
  return hierarchicalClustering(results, { threshold })
}

/**
 * 带配置的聚类分析
 */
export function clusterFailuresWithConfig(
  results: FailedResult[],
  config: ClusterConfig
): Cluster[] {
  return hierarchicalClustering(results, config)
}

/**
 * 聚类分析结果摘要
 */
export type ClusterSummary = {
  totalSamples: number
  clusterCount: number
  largestClusterSize: number
  avgClusterSize: number
  avgSimilarity: number
  clusters: Array<{
    id: string
    label: string
    size: number
    percentage: number
  }>
}

/**
 * 生成聚类摘要
 */
export function generateClusterSummary(clusters: Cluster[]): ClusterSummary {
  const totalSamples = clusters.reduce((sum, c) => sum + c.samples.length, 0)
  const avgSimilarity = clusters.length > 0
    ? clusters.reduce((sum, c) => sum + c.avgSimilarity, 0) / clusters.length
    : 0

  return {
    totalSamples,
    clusterCount: clusters.length,
    largestClusterSize: clusters.length > 0 ? clusters[0].samples.length : 0,
    avgClusterSize: clusters.length > 0 ? totalSamples / clusters.length : 0,
    avgSimilarity,
    clusters: clusters.map(c => ({
      id: c.id,
      label: c.label,
      size: c.samples.length,
      percentage: totalSamples > 0 ? Math.round((c.samples.length / totalSamples) * 100) : 0,
    })),
  }
}
