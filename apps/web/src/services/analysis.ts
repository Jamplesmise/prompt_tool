/**
 * 智能分析服务
 */

import type { ApiResponse } from '@platform/shared'
import type { DetectionResult, Suggestion, ClusterSummary } from '@/lib/analysis'

const API_BASE = '/api/v1/analysis'

/**
 * 失败模式分析结果
 */
export type PatternAnalysisResult = {
  taskId: string
  totalFailed: number
  patterns: DetectionResult['patterns']
  dominantPattern: DetectionResult['dominantPattern']
  clusters: ClusterSummary | null
}

/**
 * 优化建议结果
 */
export type SuggestionResult = {
  taskId: string
  promptId: string
  promptName: string
  suggestions: Suggestion[]
  patternsAnalyzed: number
  totalFailed: number
}

/**
 * 分析失败模式
 */
export async function analyzePatterns(taskId: string): Promise<PatternAnalysisResult> {
  const response = await fetch(`${API_BASE}/patterns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskId }),
  })

  const result: ApiResponse<PatternAnalysisResult> = await response.json()

  if (result.code !== 200) {
    throw new Error(result.message || '分析失败模式失败')
  }

  return result.data
}

/**
 * 生成优化建议
 */
export async function generateSuggestions(
  taskId: string,
  promptId?: string
): Promise<SuggestionResult> {
  const response = await fetch(`${API_BASE}/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskId, promptId }),
  })

  const result: ApiResponse<SuggestionResult> = await response.json()

  if (result.code !== 200) {
    throw new Error(result.message || '生成优化建议失败')
  }

  return result.data
}

/**
 * 分析服务
 */
export const analysisService = {
  analyzePatterns,
  generateSuggestions,
}
