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
import { dispatchResourceChange } from '@/hooks/useGoiResourceListener'

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
   *
   * 统一使用 agent checkpoint API，因为检查点是在 step() 中动态创建的，
   * 不会添加到 CheckpointQueue 中
   */
  const respondCheckpoint = useCallback(
    async (
      action: CheckpointResponseAction,
      options?: { modifications?: Record<string, unknown>; reason?: string }
    ) => {
      if (!pendingCheckpoint) return

      const { sessionId, mode } = useCopilotStore.getState()
      const todoItem = pendingCheckpoint.todoItem as { id: string; checkpoint?: { type?: string } }
      const checkpointType = todoItem?.checkpoint?.type

      setIsLoading(true)
      setError(null)

      try {
        // 对于资源选择类型，提取选中的资源 ID
        const selectedResourceId = checkpointType === 'resource_selection'
          ? (options?.modifications?.selectedOptionId as string | undefined)
          : undefined

        // 统一使用 agent checkpoint API
        const agentResponse = await fetch('/api/goi/agent/checkpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            itemId: todoItem.id,
            action: action === 'modify' ? 'approve' : action,
            feedback: options?.reason,
            selectedResourceId,
          }),
        })

        if (!agentResponse.ok) {
          const data = await agentResponse.json()
          throw new Error(data.message || 'Failed to respond to checkpoint')
        }

        const data = await agentResponse.json()
        console.log('[Copilot] Checkpoint response:', data)

        // 更新 todoList（现在从 data.data.todoList 获取）
        if (data.data?.todoList) {
          useCopilotStore.getState().setTodoList(data.data.todoList)
        }

        // 处理执行结果（导航、弹窗等）
        const executionResult = data.data?.executionResult?.result
        if (executionResult?.navigatedTo) {
          console.log('[Copilot] Navigating to:', executionResult.navigatedTo)
          router.push(executionResult.navigatedTo)
        }

        if (executionResult?.openedDialog) {
          console.log('[Copilot] Opening dialog:', executionResult.openedDialog)
          window.dispatchEvent(new CustomEvent('goi:openDialog', {
            detail: { dialogId: executionResult.openedDialog }
          }))
        }

        if (executionResult?.formPrefill) {
          console.log('[Copilot] Prefilling form:', executionResult.formPrefill)
          window.dispatchEvent(new CustomEvent('goi:prefillForm', {
            detail: executionResult.formPrefill
          }))
        }

        if (executionResult?.action && executionResult?.resourceType) {
          console.log('[Copilot] Resource changed:', {
            action: executionResult.action,
            resourceType: executionResult.resourceType,
            resourceId: executionResult.resourceId,
          })
          dispatchResourceChange(
            executionResult.action,
            executionResult.resourceType,
            executionResult.resourceId,
            executionResult.currentState
          )
        }

        // 检查是否有新的检查点
        if (data.data?.pendingCheckpoint) {
          console.log('[Copilot] Setting new pending checkpoint:', data.data.pendingCheckpoint)
          setPendingCheckpoint(data.data.pendingCheckpoint)
        } else {
          // 清除待处理检查点
          setPendingCheckpoint(null)

          // 如果没有新检查点且未完成，继续执行（assisted/auto 模式）
          const stepDone = data.data?.done
          const stepWaiting = data.data?.waiting
          const status = data.data?.status?.status

          if (!stepDone && !stepWaiting && status !== 'completed' && status !== 'failed') {
            // 还有更多步骤，触发继续执行
            if (mode === 'auto' || mode === 'assisted') {
              console.log('[Copilot] Triggering continue execution after checkpoint approval')
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('goi:continueExecution'))
              }, 300)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [pendingCheckpoint, setIsLoading, setError, setPendingCheckpoint, router]
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
            mode, // 传递运行模式，用于后端判断是否自动批准检查点
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

                // 处理表单预填
                if (executionResult?.formPrefill) {
                  console.log('[Copilot] Prefilling form:', executionResult.formPrefill)
                  window.dispatchEvent(new CustomEvent('goi:prefillForm', {
                    detail: executionResult.formPrefill
                  }))
                }

                // 处理资源变更（State 操作结果）
                if (executionResult?.action && executionResult?.resourceType) {
                  console.log('[Copilot] Resource changed:', {
                    action: executionResult.action,
                    resourceType: executionResult.resourceType,
                    resourceId: executionResult.resourceId,
                  })
                  dispatchResourceChange(
                    executionResult.action,
                    executionResult.resourceType,
                    executionResult.resourceId,
                    executionResult.currentState
                  )
                }

                // 处理检查点
                if (stepData.data?.pendingCheckpoint) {
                  console.log('[Copilot] Setting pending checkpoint:', stepData.data.pendingCheckpoint)
                  useCopilotStore.getState().setPendingCheckpoint(stepData.data.pendingCheckpoint)
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

        // 处理表单预填
        if (executionResult?.formPrefill) {
          console.log('[Copilot] Prefilling form:', executionResult.formPrefill)
          window.dispatchEvent(new CustomEvent('goi:prefillForm', {
            detail: executionResult.formPrefill
          }))
        }

        // 处理资源变更（State 操作结果）
        if (executionResult?.action && executionResult?.resourceType) {
          console.log('[Copilot] Resource changed:', {
            action: executionResult.action,
            resourceType: executionResult.resourceType,
            resourceId: executionResult.resourceId,
          })
          dispatchResourceChange(
            executionResult.action,
            executionResult.resourceType,
            executionResult.resourceId,
            executionResult.currentState
          )
        }

        // 处理检查点
        if (data.data?.pendingCheckpoint) {
          console.log('[Copilot] Setting pending checkpoint:', data.data.pendingCheckpoint)
          useCopilotStore.getState().setPendingCheckpoint(data.data.pendingCheckpoint)
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
   * 确认 waiting 状态的任务已完成
   * 当用户完成资源创建后调用此方法
   */
  const approveWaitingItem = useCallback(
    async (itemId?: string) => {
      const { sessionId, todoList } = useCopilotStore.getState()

      if (!sessionId || !todoList) {
        console.log('[Copilot] approveWaitingItem: no session or todoList')
        return null
      }

      // 如果没有指定 itemId，找到第一个 waiting 状态的任务
      const targetItemId = itemId || todoList.items.find(i => i.status === 'waiting')?.id

      if (!targetItemId) {
        console.log('[Copilot] approveWaitingItem: no waiting item found')
        return null
      }

      console.log('[Copilot] Approving waiting item:', targetItemId)

      try {
        // 调用 checkpoint API 确认任务
        const response = await fetch('/api/goi/agent/checkpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            itemId: targetItemId,
            action: 'approve',
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('[Copilot] Failed to approve item:', data.message)
          return null
        }

        console.log('[Copilot] Item approved, result:', data)

        // 更新 todoList
        if (data.data?.status?.todoList) {
          useCopilotStore.getState().setTodoList(data.data.status.todoList)
        }

        return data.data
      } catch (err) {
        console.error('[Copilot] Failed to approve waiting item:', err)
        return null
      }
    },
    []
  )

  /**
   * 确认后继续执行
   * 用于确认 waiting 任务后继续执行后续任务
   * 使用事件机制避免循环依赖
   */
  const approveAndContinue = useCallback(
    async (itemId?: string) => {
      // 先确认
      const result = await approveWaitingItem(itemId)
      if (!result) return null

      // 检查是否还有待执行的任务
      const { todoList, mode } = useCopilotStore.getState()
      if (!todoList) return result

      const hasPendingItems = todoList.items.some(i => i.status === 'pending')

      // 如果还有待执行的任务，且是 auto 或 assisted 模式，继续执行
      if (hasPendingItems && (mode === 'auto' || mode === 'assisted')) {
        console.log('[Copilot] Triggering continue execution after approval')
        // 使用事件触发继续执行，避免循环依赖
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('goi:continueExecution'))
        }, 300)
      }

      return result
    },
    [approveWaitingItem]
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
   *
   * 注意：这个函数在客户端循环调用 step API，而不是依赖服务端的 run API
   * 因为导航操作需要在客户端执行 router.push()
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
        let done = false
        let lastNavigatedTo: string | undefined
        let maxSteps = 20 // 安全限制，防止无限循环
        let stepCount = 0
        let lastResult: unknown = null

        console.log('[Copilot] runExecution starting, sessionId:', sessionId)

        // 循环执行直到完成
        while (!done && stepCount < maxSteps) {
          stepCount++
          console.log('[Copilot] Executing step', stepCount)

          const stepResponse = await fetch('/api/goi/agent/step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })

          const stepData = await stepResponse.json()
          console.log('[Copilot] Step result:', stepData)

          if (!stepResponse.ok) {
            throw new Error(stepData.message || '执行步骤失败')
          }

          // 更新 todoList 状态
          const todoList = stepData.data?.todoList
          if (todoList) {
            useCopilotStore.getState().setTodoList(todoList)
            console.log('[Copilot] TodoList updated:', {
              status: todoList.status,
              total: todoList.totalItems,
              completed: todoList.completedItems,
            })
          }

          // 收集导航结果
          const executionResult = stepData.data?.executionResult?.result
          if (executionResult?.navigatedTo) {
            lastNavigatedTo = executionResult.navigatedTo
            console.log('[Copilot] Navigation pending:', lastNavigatedTo)
          }

          // 立即处理弹窗打开（不等待循环结束）
          if (executionResult?.openedDialog) {
            console.log('[Copilot] Opening dialog:', executionResult.openedDialog)
            window.dispatchEvent(new CustomEvent('goi:openDialog', {
              detail: { dialogId: executionResult.openedDialog }
            }))
          }

          // 处理表单预填
          if (executionResult?.formPrefill) {
            console.log('[Copilot] Prefilling form:', executionResult.formPrefill)
            window.dispatchEvent(new CustomEvent('goi:prefillForm', {
              detail: executionResult.formPrefill
            }))
          }

          // 处理资源变更（State 操作结果）
          if (executionResult?.action && executionResult?.resourceType) {
            console.log('[Copilot] Resource changed:', {
              action: executionResult.action,
              resourceType: executionResult.resourceType,
              resourceId: executionResult.resourceId,
            })
            dispatchResourceChange(
              executionResult.action,
              executionResult.resourceType,
              executionResult.resourceId,
              executionResult.currentState
            )
          }

          // 处理检查点
          if (stepData.data?.pendingCheckpoint) {
            console.log('[Copilot] Setting pending checkpoint:', stepData.data.pendingCheckpoint)
            useCopilotStore.getState().setPendingCheckpoint(stepData.data.pendingCheckpoint)
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

          lastResult = stepData.data

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

        console.log('[Copilot] runExecution finished, steps:', stepCount, 'navigatedTo:', lastNavigatedTo)
        return lastResult
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
    approveWaitingItem,
    approveAndContinue,
    setComplexModelId,
    setSimpleModelId,
    clearError: () => setError(null),
    togglePanel: store.togglePanel,
    setPanelOpen: store.setPanelOpen,
  }
}

export default useCopilot
