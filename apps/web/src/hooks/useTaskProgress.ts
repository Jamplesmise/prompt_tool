'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TaskProgress, TaskStats, TaskStatus } from '@platform/shared'

type ProgressState = {
  progress: TaskProgress
  status: TaskStatus
  stats?: TaskStats
  error?: string
  isConnected: boolean
}

type UseTaskProgressOptions = {
  enabled?: boolean
  onCompleted?: (stats: TaskStats) => void
  onFailed?: (error: string) => void
  onStopped?: () => void
}

/**
 * 任务进度 SSE 订阅 Hook
 */
export function useTaskProgress(
  taskId: string | undefined,
  initialStatus?: TaskStatus,
  options: UseTaskProgressOptions = {}
): ProgressState {
  const { enabled = true, onCompleted, onFailed, onStopped } = options

  const [state, setState] = useState<ProgressState>({
    progress: { total: 0, completed: 0, failed: 0 },
    status: initialStatus ?? 'PENDING',
    isConnected: false,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusRef = useRef(state.status)

  // 使用 ref 追踪回调，避免依赖变化导致 connect 重新创建
  const callbacksRef = useRef({ onCompleted, onFailed, onStopped })
  callbacksRef.current = { onCompleted, onFailed, onStopped }

  // 更新 statusRef
  useEffect(() => {
    statusRef.current = state.status
  }, [state.status])

  const connect = useCallback(() => {
    if (!taskId || !enabled) return

    // 使用 ref 检查状态，避免闭包问题
    const currentStatus = statusRef.current

    // 如果任务已完成，不再连接
    if (['COMPLETED', 'FAILED', 'STOPPED'].includes(currentStatus)) {
      return
    }

    // 关闭已有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource(`/api/v1/tasks/${taskId}/progress`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }))
    }

    eventSource.onerror = () => {
      setState((prev) => ({ ...prev, isConnected: false }))
      eventSource.close()

      // 仅在任务运行中时重连
      if (statusRef.current === 'RUNNING') {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data) as TaskProgress
      setState((prev) => ({
        ...prev,
        progress: data,
        status: 'RUNNING',
      }))
    })

    eventSource.addEventListener('completed', (event) => {
      const data = JSON.parse(event.data) as { status: TaskStatus; stats: TaskStats }
      setState((prev) => ({
        ...prev,
        status: 'COMPLETED',
        stats: data.stats,
        isConnected: false,
      }))
      eventSource.close()
      callbacksRef.current.onCompleted?.(data.stats)
    })

    eventSource.addEventListener('failed', (event) => {
      const data = JSON.parse(event.data) as { status: TaskStatus; error: string }
      setState((prev) => ({
        ...prev,
        status: 'FAILED',
        error: data.error,
        isConnected: false,
      }))
      eventSource.close()
      callbacksRef.current.onFailed?.(data.error)
    })

    eventSource.addEventListener('stopped', () => {
      setState((prev) => ({
        ...prev,
        status: 'STOPPED',
        isConnected: false,
      }))
      eventSource.close()
      callbacksRef.current.onStopped?.()
    })
  }, [taskId, enabled]) // 移除 state.status 和回调依赖，使用 ref 代替

  // 初始连接 - 仅在 taskId、enabled 变化时执行
  useEffect(() => {
    // 只有当状态是 RUNNING 时才连接
    if (taskId && enabled && statusRef.current === 'RUNNING') {
      connect()
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [taskId, enabled, connect])

  // 当 initialStatus 变化时更新状态
  useEffect(() => {
    if (initialStatus && initialStatus !== statusRef.current) {
      setState((prev) => ({ ...prev, status: initialStatus }))
      statusRef.current = initialStatus

      // 如果任务开始运行，自动连接
      if (initialStatus === 'RUNNING') {
        connect()
      }
    }
  }, [initialStatus, connect])

  return state
}

/**
 * 手动触发进度订阅
 */
export function useStartProgressSubscription() {
  const [taskId, setTaskId] = useState<string | undefined>()
  const progressState = useTaskProgress(taskId, 'RUNNING', { enabled: !!taskId })

  const startSubscription = useCallback((id: string) => {
    setTaskId(id)
  }, [])

  const stopSubscription = useCallback(() => {
    setTaskId(undefined)
  }, [])

  return {
    ...progressState,
    startSubscription,
    stopSubscription,
  }
}
