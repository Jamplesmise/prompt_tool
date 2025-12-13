'use client'

/**
 * GOI 事件订阅 Hook
 *
 * 用于订阅 GOI 事件并更新 Copilot 状态
 */

import { useEffect, useCallback, useRef } from 'react'
import { useCopilotStore } from './useCopilot'
import type {
  GoiEvent,
  GoiEventType,
  AIUnderstanding,
  TodoList,
  PendingCheckpointState,
} from '@platform/shared'

// ============================================
// SSE 连接管理
// ============================================

class GoiEventSource {
  private eventSource: EventSource | null = null
  private sessionId: string | null = null
  private handlers: Map<string, (event: GoiEvent) => void> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10
  private reconnectDelay: number = 1000

  connect(sessionId: string): void {
    if (this.eventSource) {
      this.disconnect()
    }

    this.sessionId = sessionId
    this.createConnection()
  }

  private createConnection(): void {
    if (!this.sessionId) return

    try {
      this.eventSource = new EventSource(
        `/api/goi/events/stream?sessionId=${this.sessionId}`
      )

      this.eventSource.onopen = () => {
        console.log('[GOI Events] Connected')
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          const goiEvent: GoiEvent = JSON.parse(event.data)
          this.dispatchEvent(goiEvent)
        } catch (error) {
          console.error('[GOI Events] Failed to parse event:', error)
        }
      }

      this.eventSource.onerror = () => {
        console.error('[GOI Events] Connection error')
        this.scheduleReconnect()
      }
    } catch (error) {
      console.error('[GOI Events] Failed to create connection:', error)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[GOI Events] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.createConnection()
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }

    this.sessionId = null
    this.reconnectAttempts = 0
  }

  subscribe(
    handlerId: string,
    handler: (event: GoiEvent) => void
  ): () => void {
    this.handlers.set(handlerId, handler)
    return () => {
      this.handlers.delete(handlerId)
    }
  }

  private dispatchEvent(event: GoiEvent): void {
    this.handlers.forEach((handler) => {
      try {
        handler(event)
      } catch (error) {
        console.error('[GOI Events] Handler error:', error)
      }
    })
  }

  isConnected(): boolean {
    return (
      this.eventSource !== null &&
      this.eventSource.readyState === EventSource.OPEN
    )
  }
}

// 全局事件源实例
const eventSource = new GoiEventSource()

// ============================================
// Custom Hook
// ============================================

export function useGoiEvents(sessionId: string | null) {
  const handlerIdRef = useRef<string | null>(null)
  const store = useCopilotStore()

  // 处理事件
  const handleEvent = useCallback(
    (event: GoiEvent) => {
      switch (event.type) {
        // TODO 相关事件
        case 'TODO_PLANNED':
          // 更新 TODO 列表
          break

        case 'TODO_ITEM_STARTED':
        case 'TODO_ITEM_COMPLETED':
        case 'TODO_ITEM_FAILED':
        case 'TODO_ITEM_SKIPPED':
          // 更新 TODO 项状态
          break

        // 检查点事件
        case 'CHECKPOINT_REACHED':
          // 创建待处理检查点
          const payload = event.payload as {
            checkpointId: string
            title: string
            description?: string
            todoItemId: string
            options?: Array<{ id: string; label: string; description?: string }>
          }
          store.setPendingCheckpoint({
            id: payload.checkpointId,
            todoItem: {
              id: payload.todoItemId,
              title: payload.title,
              description: payload.description || '',
            } as any,
            reason: payload.description || '',
            options: payload.options || [],
            createdAt: new Date(),
          })
          break

        case 'CHECKPOINT_APPROVED':
        case 'CHECKPOINT_REJECTED':
        case 'CHECKPOINT_MODIFIED':
          // 清除待处理检查点
          store.setPendingCheckpoint(null)
          break

        // 控制权事件
        case 'CONTROL_TRANSFERRED':
          const transferPayload = event.payload as {
            from: string
            to: string
          }
          store.setController(transferPayload.to as 'user' | 'ai')
          break

        // Agent 事件
        case 'AGENT_STARTED':
          store.setIsLoading(true)
          break

        case 'AGENT_COMPLETED':
        case 'AGENT_FAILED':
          store.setIsLoading(false)
          break

        case 'AGENT_WAITING':
          // 可能在等待检查点
          break

        default:
          break
      }
    },
    [store]
  )

  // 连接和订阅
  useEffect(() => {
    if (!sessionId) {
      store.setIsConnected(false)
      return
    }

    // 生成唯一的 handler ID
    handlerIdRef.current = `copilot-${Date.now()}`

    // 连接事件源
    eventSource.connect(sessionId)

    // 订阅事件
    const unsubscribe = eventSource.subscribe(
      handlerIdRef.current,
      handleEvent
    )

    // 检查连接状态
    const checkConnection = setInterval(() => {
      store.setIsConnected(eventSource.isConnected())
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(checkConnection)
    }
  }, [sessionId, handleEvent, store])

  // 断开连接
  useEffect(() => {
    return () => {
      eventSource.disconnect()
    }
  }, [])

  return {
    isConnected: store.isConnected,
  }
}

export default useGoiEvents
