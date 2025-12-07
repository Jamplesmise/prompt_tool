/**
 * 维度分析器
 * 按不同维度分组分析测试结果
 */

import type { TaskResultData, Dimension, DimensionAnalysis } from '@/components/results/types'
import { getFailureTypeName } from '@/lib/analysis'
import type { FailedResult, FailureType } from '@/lib/analysis'

/**
 * 维度配置
 */
type DimensionConfig = {
  label: string
  getGroupKey: (result: TaskResultData) => string
  getGroupLabel: (key: string) => string
}

/**
 * 获取输入长度区间
 */
function getInputLengthRange(result: TaskResultData): string {
  const inputStr = JSON.stringify(result.input)
  const len = inputStr.length
  if (len < 100) return 'short'
  if (len < 500) return 'medium'
  if (len < 2000) return 'long'
  return 'very_long'
}

/**
 * 获取输出长度区间
 */
function getOutputLengthRange(result: TaskResultData): string {
  const len = result.output?.length || 0
  if (len === 0) return 'empty'
  if (len < 100) return 'short'
  if (len < 500) return 'medium'
  if (len < 2000) return 'long'
  return 'very_long'
}

/**
 * 获取延迟区间
 */
function getLatencyRange(result: TaskResultData): string {
  const latency = result.latency || 0
  if (latency === 0) return 'unknown'
  if (latency < 1000) return 'fast'      // < 1s
  if (latency < 3000) return 'normal'    // 1-3s
  if (latency < 10000) return 'slow'     // 3-10s
  return 'very_slow'                      // > 10s
}

/**
 * 获取失败类型（简化版分类）
 */
function classifyFailureSimple(result: TaskResultData): FailureType {
  if (result.passed) return 'other'
  if (result.status === 'TIMEOUT') return 'timeout'
  if (result.status === 'ERROR') return 'error'

  // 检查评估器原因
  const failedEvals = result.evaluations.filter(e => !e.passed)
  const reasons = failedEvals.map(e => e.reason || '').join(' ').toLowerCase()

  if (reasons.includes('format') || reasons.includes('格式') || reasons.includes('json')) {
    return 'format_error'
  }
  if (reasons.includes('keyword') || reasons.includes('关键') || reasons.includes('缺少')) {
    return 'keyword_missing'
  }
  if (reasons.includes('length') || reasons.includes('长度') || reasons.includes('字数')) {
    return 'length_violation'
  }
  if (reasons.includes('semantic') || reasons.includes('语义') || reasons.includes('含义')) {
    return 'semantic_mismatch'
  }
  if (!result.output || result.output.trim().length < 5) {
    return 'content_missing'
  }

  return 'other'
}

/**
 * 维度配置映射
 */
const DIMENSION_CONFIGS: Record<Dimension, DimensionConfig> = {
  evaluator: {
    label: '评估器',
    getGroupKey: (result) => {
      // 返回第一个失败的评估器，或者第一个评估器
      const failedEval = result.evaluations.find(e => !e.passed)
      if (failedEval) return failedEval.evaluatorId
      return result.evaluations[0]?.evaluatorId || 'unknown'
    },
    getGroupLabel: (key) => key,
  },
  status: {
    label: '状态',
    getGroupKey: (result) => result.status,
    getGroupLabel: (key) => {
      const labels: Record<string, string> = {
        SUCCESS: '成功',
        FAILED: '失败',
        ERROR: '错误',
        TIMEOUT: '超时',
      }
      return labels[key] || key
    },
  },
  failure_type: {
    label: '失败类型',
    getGroupKey: (result) => classifyFailureSimple(result),
    getGroupLabel: (key) => getFailureTypeName(key as FailureType),
  },
  input_length: {
    label: '输入长度',
    getGroupKey: getInputLengthRange,
    getGroupLabel: (key) => {
      const labels: Record<string, string> = {
        short: '短 (<100)',
        medium: '中 (100-500)',
        long: '长 (500-2000)',
        very_long: '超长 (>2000)',
      }
      return labels[key] || key
    },
  },
  output_length: {
    label: '输出长度',
    getGroupKey: getOutputLengthRange,
    getGroupLabel: (key) => {
      const labels: Record<string, string> = {
        empty: '空',
        short: '短 (<100)',
        medium: '中 (100-500)',
        long: '长 (500-2000)',
        very_long: '超长 (>2000)',
      }
      return labels[key] || key
    },
  },
  latency_range: {
    label: '延迟区间',
    getGroupKey: getLatencyRange,
    getGroupLabel: (key) => {
      const labels: Record<string, string> = {
        unknown: '未知',
        fast: '快速 (<1s)',
        normal: '正常 (1-3s)',
        slow: '较慢 (3-10s)',
        very_slow: '很慢 (>10s)',
      }
      return labels[key] || key
    },
  },
  custom: {
    label: '自定义',
    getGroupKey: () => 'default',
    getGroupLabel: (key) => key,
  },
}

/**
 * 按维度分析结果
 */
export function analyzeDimension(
  results: TaskResultData[],
  dimension: Dimension,
  customField?: string
): DimensionAnalysis {
  const config = DIMENSION_CONFIGS[dimension]

  // 自定义维度处理
  let getGroupKey = config.getGroupKey
  let getGroupLabel = config.getGroupLabel

  if (dimension === 'custom' && customField) {
    getGroupKey = (result) => {
      const value = result.datasetRow?.[customField]
      return value != null ? String(value) : 'unknown'
    }
    getGroupLabel = (key) => key
  }

  // 分组
  const groups = new Map<string, TaskResultData[]>()

  for (const result of results) {
    const key = getGroupKey(result)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(result)
  }

  // 构建分析结果
  const analysisGroups = Array.from(groups.entries()).map(([key, groupResults]) => {
    const total = groupResults.length
    const passed = groupResults.filter(r => r.passed).length
    const failed = total - passed
    const passRate = total > 0 ? (passed / total) * 100 : 0

    return {
      label: getGroupLabel(key),
      total,
      passed,
      failed,
      passRate: Math.round(passRate * 10) / 10,
      trend: undefined as 'up' | 'down' | 'stable' | undefined,
    }
  })

  // 按失败数量排序（优先显示问题多的）
  analysisGroups.sort((a, b) => b.failed - a.failed)

  return {
    dimension,
    dimensionLabel: dimension === 'custom' ? customField || '自定义' : config.label,
    groups: analysisGroups,
  }
}

/**
 * 获取所有可用维度
 */
export function getAvailableDimensions(): Array<{ value: Dimension; label: string }> {
  return [
    { value: 'failure_type', label: '失败类型' },
    { value: 'evaluator', label: '评估器' },
    { value: 'status', label: '状态' },
    { value: 'input_length', label: '输入长度' },
    { value: 'output_length', label: '输出长度' },
    { value: 'latency_range', label: '延迟区间' },
  ]
}

/**
 * 从数据集行中提取可用的自定义维度字段
 */
export function extractCustomDimensionFields(results: TaskResultData[]): string[] {
  const fields = new Set<string>()

  for (const result of results) {
    if (result.datasetRow) {
      for (const key of Object.keys(result.datasetRow)) {
        // 排除内置字段
        if (!['input', 'expected', 'output', '__rowIndex'].includes(key)) {
          fields.add(key)
        }
      }
    }
  }

  return Array.from(fields)
}

/**
 * 多维度分析
 */
export function analyzeMultipleDimensions(
  results: TaskResultData[],
  dimensions: Dimension[]
): DimensionAnalysis[] {
  return dimensions.map(dim => analyzeDimension(results, dim))
}
