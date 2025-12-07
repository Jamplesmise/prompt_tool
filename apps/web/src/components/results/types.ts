/**
 * 测试结果分析相关类型定义
 */

/**
 * 单个测试结果数据
 */
export type TaskResultData = {
  id: string
  /** 输入数据 */
  input: Record<string, unknown>
  /** 实际输出 */
  output: string | null
  /** 期望输出 */
  expected: string | null
  /** 是否通过 */
  passed: boolean
  /** 状态 */
  status: 'SUCCESS' | 'FAILED' | 'ERROR' | 'TIMEOUT'
  /** 错误信息 */
  error?: string | null
  /** 延迟（毫秒） */
  latency?: number | null
  /** 输入 Token 数 */
  inputTokens?: number | null
  /** 输出 Token 数 */
  outputTokens?: number | null
  /** 成本（美元） */
  cost?: number | null
  /** 创建时间 */
  createdAt?: string
  /** 评估结果 */
  evaluations: Array<{
    evaluatorId: string
    evaluatorName: string
    passed: boolean
    score: number | null
    reason: string | null
  }>
  /** 数据集行数据 - 用于维度分析 */
  datasetRow?: Record<string, unknown> | null
}

/**
 * 统计数据
 */
export type ResultStats = {
  total: number
  passed: number
  failed: number
  passRate: number
  avgLatency: number
  p50Latency: number
  p90Latency: number
  p99Latency: number
  latencies: number[]
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  avgCost: number
}

/**
 * 失败分布数据
 */
export type FailureDistribution = {
  category: string
  categoryName: string
  count: number
  percentage: number
  color: string
}

/**
 * 维度分析配置
 */
export type Dimension =
  | 'evaluator'      // 按评估器
  | 'status'         // 按状态
  | 'failure_type'   // 按失败类型
  | 'input_length'   // 按输入长度区间
  | 'output_length'  // 按输出长度区间
  | 'latency_range'  // 按延迟区间
  | 'custom'         // 自定义维度（从数据集行）

/**
 * 维度分析结果
 */
export type DimensionAnalysis = {
  dimension: Dimension
  dimensionLabel: string
  groups: Array<{
    label: string
    total: number
    passed: number
    failed: number
    passRate: number
    trend?: 'up' | 'down' | 'stable'
  }>
}

/**
 * 聚类配置
 */
export type ClusterConfig = {
  similarityThreshold: number
  minClusterSize: number
  maxClusters: number
}

/**
 * 失败样本聚类
 */
export type FailureCluster = {
  id: string
  label: string
  samples: TaskResultData[]
  centroid: TaskResultData
  commonFeatures: string[]
  suggestedFix: string
  similarity: number
}

/**
 * 版本指标快照
 */
export type VersionSnapshot = {
  promptId: string
  version: number
  taskId: string
  createdAt: Date
  metrics: {
    passRate: number
    avgLatency: number
    avgCost: number
    totalTests: number
    failedTests: number
  }
  changeDescription: string
}

/**
 * 回归问题
 */
export type Regression = {
  type: 'passRate_drop' | 'latency_increase' | 'cost_increase'
  severity: 'high' | 'medium' | 'low'
  fromVersion: number
  toVersion: number
  oldValue: number
  newValue: number
  changePercent: number
  affectedTests: string[]
}
