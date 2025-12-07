'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analysisService } from '@/services/analysis'
import type { PatternAnalysisResult, SuggestionResult } from '@/services/analysis'

/**
 * 分析失败模式
 */
export function usePatternAnalysis(taskId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['analysis', 'patterns', taskId],
    queryFn: () => analysisService.analyzePatterns(taskId!),
    enabled: enabled && !!taskId,
    staleTime: 5 * 60 * 1000, // 5 分钟内使用缓存
    gcTime: 30 * 60 * 1000, // 30 分钟后清除缓存
  })
}

/**
 * 生成优化建议
 */
export function useSuggestions(
  taskId: string | undefined,
  promptId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ['analysis', 'suggestions', taskId, promptId],
    queryFn: () => analysisService.generateSuggestions(taskId!, promptId),
    enabled: enabled && !!taskId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * 手动触发分析
 */
export function useAnalyzeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, promptId }: { taskId: string; promptId?: string }) => {
      const [patterns, suggestions] = await Promise.all([
        analysisService.analyzePatterns(taskId),
        analysisService.generateSuggestions(taskId, promptId),
      ])
      return { patterns, suggestions }
    },
    onSuccess: (data, variables) => {
      // 更新缓存
      queryClient.setQueryData(
        ['analysis', 'patterns', variables.taskId],
        data.patterns
      )
      queryClient.setQueryData(
        ['analysis', 'suggestions', variables.taskId, variables.promptId],
        data.suggestions
      )
    },
  })
}

/**
 * 组合使用分析结果
 */
export function useSmartAnalysis(
  taskId: string | undefined,
  promptId?: string,
  enabled = true
) {
  const patternsQuery = usePatternAnalysis(taskId, enabled)
  const suggestionsQuery = useSuggestions(taskId, promptId, enabled)
  const analyzeMutation = useAnalyzeMutation()

  const isLoading = patternsQuery.isLoading || suggestionsQuery.isLoading
  const isError = patternsQuery.isError || suggestionsQuery.isError
  const error = patternsQuery.error || suggestionsQuery.error

  const reanalyze = () => {
    if (taskId) {
      analyzeMutation.mutate({ taskId, promptId })
    }
  }

  return {
    patterns: patternsQuery.data,
    suggestions: suggestionsQuery.data,
    isLoading,
    isError,
    error,
    isReanalyzing: analyzeMutation.isPending,
    reanalyze,
  }
}
