'use client'

import { useState, useCallback, useRef } from 'react'

// 搜索结果类型
type PromptSearchResult = {
  id: string
  name: string
  description?: string
  currentVersion?: number
}

type DatasetSearchResult = {
  id: string
  name: string
  description?: string
  rowCount?: number
}

type TaskSearchResult = {
  id: string
  name: string
  status?: string
}

type SearchResults = {
  prompts: PromptSearchResult[]
  datasets: DatasetSearchResult[]
  tasks: TaskSearchResult[]
}

type UseGlobalSearchOptions = {
  // 搜索类型过滤
  types?: ('prompt' | 'dataset' | 'task')[]
  // 每种类型的结果数量限制
  limit?: number
  // 防抖延迟（毫秒）
  debounceMs?: number
}

type UseGlobalSearchReturn = {
  results: SearchResults | null
  loading: boolean
  error: string | null
  search: (query: string) => void
  clear: () => void
}

export function useGlobalSearch(
  options: UseGlobalSearchOptions = {}
): UseGlobalSearchReturn {
  const { types, limit = 5, debounceMs = 300 } = options

  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const search = useCallback(async (query: string) => {
    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 如果查询为空，清除结果
    if (!query.trim()) {
      setResults(null)
      setLoading(false)
      setError(null)
      return
    }

    // 设置防抖
    debounceTimeoutRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController()

      try {
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
        })

        if (types && types.length > 0) {
          params.set('types', types.join(','))
        }

        const response = await fetch(`/api/v1/search?${params}`, {
          signal: abortControllerRef.current.signal,
        })

        const data = await response.json()

        if (data.code === 200) {
          setResults(data.data)
        } else {
          setError(data.message || '搜索失败')
          setResults(null)
        }
      } catch (err) {
        // 忽略取消请求的错误
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        console.error('Search error:', err)
        setError('搜索请求失败')
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  }, [types, limit, debounceMs])

  const clear = useCallback(() => {
    // 清除定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    // 取消请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // 重置状态
    setResults(null)
    setLoading(false)
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clear,
  }
}
