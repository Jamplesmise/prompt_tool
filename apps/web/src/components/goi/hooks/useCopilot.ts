'use client'

/**
 * Copilot 状态管理 Hook
 *
 * 管理 Copilot 面板的所有状态：
 * - 运行模式
 * - AI 理解状态
 * - TODO 列表
 * - 待处理检查点
 * - 上下文使用量
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CollaborationMode,
  AIUnderstanding,
  CopilotState,
  PendingCheckpointState,
  Controller,
} from '@platform/shared'
import type { TodoList, CheckpointResponseAction } from '@platform/shared'
import { createInitialUnderstanding } from '@platform/shared'

// ============================================
// Zustand Store
// ============================================

type CopilotStore = CopilotState & {
  // Model config
  complexModelId: string | null
  simpleModelId: string | null
  // Actions
  setSessionId: (sessionId: string | null) => void
  setMode: (mode: CollaborationMode) => void
  setController: (controller: Controller) => void
  setUnderstanding: (understanding: AIUnderstanding) => void
  setTodoList: (todoList: TodoList | null) => void
  setPendingCheckpoint: (checkpoint: PendingCheckpointState | null) => void
  setContextUsage: (usage: number) => void
  setIsConnected: (connected: boolean) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setComplexModelId: (modelId: string | null) => void
  setSimpleModelId: (modelId: string | null) => void
  togglePanel: () => void
  setPanelOpen: (open: boolean) => void
  reset: () => void
}

const initialState: CopilotState = {
  sessionId: null,
  mode: 'assisted',
  controller: 'user',
  understanding: createInitialUnderstanding(),
  todoList: null,
  currentTodoItem: null,
  pendingCheckpoint: null,
  contextUsage: 0,
  isConnected: false,
  isLoading: false,
  error: null,
  panelState: {
    isOpen: false,
    width: 360,
    isPinned: false,
    activeTab: 'todo',
  },
}

export const useCopilotStore = create<CopilotStore>()(
  persist(
    (set) => ({
      ...initialState,
      complexModelId: null,
      simpleModelId: null,

      setSessionId: (sessionId) => set({ sessionId }),

      setMode: (mode) => set({ mode }),

      setController: (controller) => set({ controller }),

      setUnderstanding: (understanding) => set({ understanding }),

      setTodoList: (todoList) =>
        set({
          todoList,
          currentTodoItem:
            todoList && todoList.currentItemIndex >= 0
              ? todoList.items[todoList.currentItemIndex]
              : null,
        }),

      setPendingCheckpoint: (pendingCheckpoint) => set({ pendingCheckpoint }),

      setContextUsage: (contextUsage) => set({ contextUsage }),

      setIsConnected: (isConnected) => set({ isConnected }),

      setIsLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setComplexModelId: (complexModelId) => set({ complexModelId }),

      setSimpleModelId: (simpleModelId) => set({ simpleModelId }),

      togglePanel: () =>
        set((state) => ({
          panelState: {
            ...state.panelState,
            isOpen: !state.panelState.isOpen,
          },
        })),

      setPanelOpen: (open) =>
        set((state) => ({
          panelState: {
            ...state.panelState,
            isOpen: open,
          },
        })),

      reset: () => set({ ...initialState, complexModelId: null, simpleModelId: null }),
    }),
    {
      name: 'copilot-storage',
      partialize: (state) => ({
        mode: state.mode,
        panelState: state.panelState,
        complexModelId: state.complexModelId,
        simpleModelId: state.simpleModelId,
      }),
    }
  )
)

// ============================================
// Custom Hook
// ============================================

export function useCopilot() {
  const store = useCopilotStore()
  const router = useRouter()
  const {
    sessionId,
    mode,
    controller,
    understanding,
    todoList,
    currentTodoItem,
    pendingCheckpoint,
    contextUsage,
    isConnected,
    isLoading,
    error,
    panelState,
    complexModelId,
    simpleModelId,
    setMode,
    setIsLoading,
    setError,
    setPendingCheckpoint,
    setComplexModelId,
    setSimpleModelId,
  } = store

  // 标记是否正在响应检查点
  const isResponding = isLoading && pendingCheckpoint !== null

  /**
   * 切换运行模式
   */
  const switchMode = useCallback(
    async (newMode: CollaborationMode) => {
      if (!sessionId) {
        setMode(newMode)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/goi/checkpoint/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            mode: newMode === 'manual' ? 'step' : newMode === 'auto' ? 'auto' : 'smart',
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to switch mode')
        }

        setMode(newMode)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setMode, setIsLoading, setError]
  )

  /**
   * 响应检查点
   */
  const respondCheckpoint = useCallback(
    async (
      action: CheckpointResponseAction,
      options?: { modifications?: Record<string, unknown>; reason?: string }
    ) => {
      if (!pendingCheckpoint) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/goi/checkpoint/${pendingCheckpoint.id}/respond`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action,
              modifications: options?.modifications,
              reason: options?.reason,
            }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || 'Failed to respond')
        }

        // 清除待处理检查点
        setPendingCheckpoint(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [pendingCheckpoint, setIsLoading, setError, setPendingCheckpoint]
  )

  /**
   * 发送命令 - 启动 Agent 执行目标
   */
  const sendCommand = useCallback(
    async (command: string) => {
      const { complexModelId, setSessionId, setTodoList, setIsConnected, mode } = useCopilotStore.getState()

      // 检查是否选择了模型
      if (!complexModelId) {
        setError('请先在"模型配置"中选择复杂任务模型')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // 每次新命令都生成新的 session ID（避免复用已完成的 session）
        const currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

        // 获取当前页面路径作为上下文
        const currentPage = window.location.pathname

        // 调用 agent/start API 启动 Agent（只做规划）
        const response = await fetch('/api/goi/agent/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            goal: command,
            modelId: complexModelId,
            autoRun: false, // 不自动执行，由前端控制
            context: {
              currentPage,
            },
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '启动 Agent 失败')
        }

        // 更新 store
        setSessionId(currentSessionId)
        setIsConnected(true)

        if (data.data?.todoList) {
          setTodoList(data.data.todoList)
        }

        console.log('[Copilot] Agent started:', data)
        console.log('[Copilot] Current mode:', mode, '- auto execution:', mode === 'auto')

        // 计划生成后，只有 auto 模式才自动执行
        // assisted/manual 模式等待用户点击"开始执行"按钮
        if (mode === 'auto') {
          console.log('[Copilot] Mode is auto, starting automatic execution loop')
          setTimeout(async () => {
            try {
              let done = false
              let lastNavigatedTo: string | undefined
              let maxSteps = 20 // 安全限制，防止无限循环
              let stepCount = 0

              // 循环执行直到完成
              while (!done && stepCount < maxSteps) {
                stepCount++

                const stepResponse = await fetch('/api/goi/agent/step', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId: currentSessionId }),
                })

                const stepData = await stepResponse.json()
                console.log('[Copilot] Step result:', stepData)

                // 更新 todoList 状态
                const todoList = stepData.data?.todoList
                if (todoList) {
                  useCopilotStore.getState().setTodoList(todoList)
                  console.log('[Copilot] TodoList stats:', {
                    total: todoList.totalItems,
                    completed: todoList.completedItems,
                    items: todoList.items?.map((i: { id: string; title: string; status: string }) => ({
                      id: i.id,
                      title: i.title,
                      status: i.status,
                    })),
                  })
                }

                // 收集导航结果
                const executionResult = stepData.data?.executionResult?.result
                if (executionResult?.navigatedTo) {
                  lastNavigatedTo = executionResult.navigatedTo
                }

                // 立即处理弹窗打开（不等待循环结束）
                if (executionResult?.openedDialog) {
                  console.log('[Copilot] Opening dialog:', executionResult.openedDialog)
                  window.dispatchEvent(new CustomEvent('goi:openDialog', {
                    detail: { dialogId: executionResult.openedDialog }
                  }))
                }

                // 检查是否完成或等待用户
                const status = stepData.data?.status?.status
                const stepDone = stepData.data?.done
                const stepWaiting = stepData.data?.waiting
                const stepError = stepData.data?.error

                console.log('[Copilot] Step status check:', {
                  stepDone,
                  stepWaiting,
                  agentStatus: status,
                  stepError,
                })

                done = stepDone ||
                       stepWaiting ||
                       status === 'completed' ||
                       status === 'failed' ||
                       false

                // 如果还没完成，短暂延迟后继续
                if (!done) {
                  await new Promise(resolve => setTimeout(resolve, 200))
                }
              }

              // 执行最后的导航
              if (lastNavigatedTo) {
                console.log('[Copilot] Navigating to:', lastNavigatedTo)
                router.push(lastNavigatedTo)
              }

              console.log('[Copilot] Execution finished, steps:', stepCount)
            } catch (runErr) {
              console.error('[Copilot] Failed to run agent:', runErr)
            }
          }, 100)
        }
      } catch (err) {
        console.error('[Copilot] Failed to start agent:', err)
        setError(err instanceof Error ? err.message : '启动失败')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setIsLoading, setError, router]
  )

  /**
   * 执行下一步
   */
  const executeStep = useCallback(
    async () => {
      if (!sessionId) {
        setError('没有活跃的会话')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/goi/agent/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '执行步骤失败')
        }

        // 更新 TODO List 状态
        if (data.data?.todoList) {
          useCopilotStore.getState().setTodoList(data.data.todoList)
        }

        // 处理导航结果
        const executionResult = data.data?.executionResult?.result
        if (executionResult?.navigatedTo) {
          console.log('[Copilot] Navigating to:', executionResult.navigatedTo)
          router.push(executionResult.navigatedTo)
        }

        // 处理打开弹窗
        if (executionResult?.openedDialog) {
          console.log('[Copilot] Opening dialog:', executionResult.openedDialog)
          // 触发自定义事件，让页面组件处理弹窗
          window.dispatchEvent(new CustomEvent('goi:openDialog', {
            detail: { dialogId: executionResult.openedDialog }
          }))
        }

        return data.data
      } catch (err) {
        console.error('[Copilot] Failed to execute step:', err)
        setError(err instanceof Error ? err.message : '执行失败')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setIsLoading, setError, router]
  )

  /**
   * 暂停执行
   */
  const pauseExecution = useCallback(
    async () => {
      if (!sessionId) return

      try {
        await fetch('/api/goi/agent/pause', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })
      } catch (err) {
        console.error('[Copilot] Failed to pause:', err)
      }
    },
    [sessionId]
  )

  /**
   * 恢复执行
   */
  const resumeExecution = useCallback(
    async () => {
      if (!sessionId) return

      setIsLoading(true)
      try {
        const response = await fetch('/api/goi/agent/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()
        if (data.data?.status?.todoList) {
          useCopilotStore.getState().setTodoList(data.data.status.todoList)
        }
      } catch (err) {
        console.error('[Copilot] Failed to resume:', err)
        setError(err instanceof Error ? err.message : '恢复失败')
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setIsLoading, setError]
  )

  /**
   * 开始运行（执行所有步骤）
   */
  const runExecution = useCallback(
    async () => {
      if (!sessionId) {
        setError('没有活跃的会话')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/goi/agent/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || '开始执行失败')
        }

        // 更新 TODO List 状态
        if (data.data?.todoList) {
          useCopilotStore.getState().setTodoList(data.data.todoList)
        }

        // 处理导航结果（最后一步的结果）
        const lastResult = data.data?.lastExecutionResult?.result
        if (lastResult?.navigatedTo) {
          console.log('[Copilot] Navigating to:', lastResult.navigatedTo)
          router.push(lastResult.navigatedTo)
        }

        return data.data
      } catch (err) {
        console.error('[Copilot] Failed to run:', err)
        setError(err instanceof Error ? err.message : '执行失败')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setIsLoading, setError, router]
  )

  return {
    // State
    sessionId,
    mode,
    controller,
    understanding,
    todoList,
    currentTodoItem,
    pendingCheckpoint,
    contextUsage,
    isConnected,
    isLoading,
    isResponding,
    error,
    panelState,
    complexModelId,
    simpleModelId,

    // Actions
    switchMode,
    respondCheckpoint,
    sendCommand,
    executeStep,
    pauseExecution,
    resumeExecution,
    runExecution,
    setComplexModelId,
    setSimpleModelId,
    clearError: () => setError(null),
    togglePanel: store.togglePanel,
    setPanelOpen: store.setPanelOpen,
  }
}

export default useCopilot
