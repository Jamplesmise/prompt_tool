'use client'

/**
 * 资源创建完成检测 Hook
 *
 * 监听 URL 变化，当检测到从创建页面跳转到详情页时，
 * 自动确认 GOI 中等待的任务。
 *
 * 检测模式：
 * 1. 从 /xxx/new 跳转到 /xxx/{id}
 * 2. 从 /xxx 跳转到 /xxx/{id}（弹窗创建后跳转）
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useCopilotStore } from './useCopilot'

// 创建页面 URL 模式匹配
const CREATE_PAGE_PATTERNS = [
  { pattern: /^\/prompts\/new$/, resourceType: 'prompt', detailPattern: /^\/prompts\/([^/]+)$/ },
  { pattern: /^\/evaluators\/new$/, resourceType: 'evaluator', detailPattern: /^\/evaluators\/([^/]+)$/ },
  { pattern: /^\/tasks\/new$/, resourceType: 'task', detailPattern: /^\/tasks\/([^/]+)$/ },
  { pattern: /^\/schemas\/input\/new$/, resourceType: 'input_schema', detailPattern: /^\/schemas\/input\/([^/]+)$/ },
  { pattern: /^\/schemas\/output\/new$/, resourceType: 'output_schema', detailPattern: /^\/schemas\/output\/([^/]+)$/ },
  { pattern: /^\/schemas\/new$/, resourceType: 'schema', detailPattern: /^\/schemas\/([^/]+)$/ },
]

// 列表页 URL 模式匹配（用于检测弹窗创建）
const LIST_PAGE_PATTERNS = [
  { pattern: /^\/datasets$/, resourceType: 'dataset', detailPattern: /^\/datasets\/([^/]+)$/ },
  { pattern: /^\/models$/, resourceType: 'model', detailPattern: /^\/models\/([^/]+)$/ },
]

/**
 * 检测是否是创建页面
 */
function isCreatePage(pathname: string): { isCreate: boolean; resourceType?: string; detailPattern?: RegExp } {
  for (const { pattern, resourceType, detailPattern } of CREATE_PAGE_PATTERNS) {
    if (pattern.test(pathname)) {
      return { isCreate: true, resourceType, detailPattern }
    }
  }
  return { isCreate: false }
}

/**
 * 检测是否是列表页面（可能有弹窗创建）
 */
function isListPage(pathname: string): { isList: boolean; resourceType?: string; detailPattern?: RegExp } {
  for (const { pattern, resourceType, detailPattern } of LIST_PAGE_PATTERNS) {
    if (pattern.test(pathname)) {
      return { isList: true, resourceType, detailPattern }
    }
  }
  return { isList: false }
}

/**
 * 检测是否是详情页面，返回资源 ID
 */
function isDetailPage(pathname: string, detailPattern: RegExp): string | null {
  const match = pathname.match(detailPattern)
  if (match && match[1] && match[1] !== 'new' && match[1] !== 'edit') {
    return match[1]
  }
  return null
}

export function useResourceCreationDetector() {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)
  const previousCreateInfoRef = useRef<{ resourceType: string; detailPattern: RegExp } | null>(null)

  useEffect(() => {
    const previousPath = previousPathRef.current

    // 如果是第一次渲染，只记录路径
    if (previousPath === null) {
      previousPathRef.current = pathname

      // 检查当前是否是创建页面，记录信息
      const createInfo = isCreatePage(pathname)
      if (createInfo.isCreate && createInfo.resourceType && createInfo.detailPattern) {
        previousCreateInfoRef.current = {
          resourceType: createInfo.resourceType,
          detailPattern: createInfo.detailPattern,
        }
      }

      // 检查当前是否是列表页面
      const listInfo = isListPage(pathname)
      if (listInfo.isList && listInfo.resourceType && listInfo.detailPattern) {
        previousCreateInfoRef.current = {
          resourceType: listInfo.resourceType,
          detailPattern: listInfo.detailPattern,
        }
      }

      return
    }

    // 路径没变，不处理
    if (previousPath === pathname) {
      return
    }

    // 检测资源创建完成
    const detectResourceCreation = async () => {
      const { todoList, sessionId } = useCopilotStore.getState()

      // 如果没有活跃的 GOI 会话或 todoList，不处理
      if (!sessionId || !todoList) {
        previousPathRef.current = pathname
        previousCreateInfoRef.current = null
        return
      }

      // 检查是否有 waiting 状态的任务
      const waitingItem = todoList.items.find(i => i.status === 'waiting')
      if (!waitingItem) {
        previousPathRef.current = pathname
        previousCreateInfoRef.current = null
        return
      }

      // 检查之前是否在创建页面或列表页面
      const createInfo = previousCreateInfoRef.current
      if (!createInfo) {
        // 检查前一个页面是否是创建/列表页面
        const prevCreateInfo = isCreatePage(previousPath)
        if (prevCreateInfo.isCreate && prevCreateInfo.detailPattern) {
          previousCreateInfoRef.current = {
            resourceType: prevCreateInfo.resourceType!,
            detailPattern: prevCreateInfo.detailPattern,
          }
        } else {
          const prevListInfo = isListPage(previousPath)
          if (prevListInfo.isList && prevListInfo.detailPattern) {
            previousCreateInfoRef.current = {
              resourceType: prevListInfo.resourceType!,
              detailPattern: prevListInfo.detailPattern,
            }
          }
        }
      }

      // 使用更新后的 createInfo
      const currentCreateInfo = previousCreateInfoRef.current
      if (!currentCreateInfo) {
        previousPathRef.current = pathname
        return
      }

      // 检查当前是否是详情页面
      const resourceId = isDetailPage(pathname, currentCreateInfo.detailPattern)
      if (resourceId) {
        console.log('[ResourceCreationDetector] Resource created:', {
          resourceType: currentCreateInfo.resourceType,
          resourceId,
          previousPath,
          currentPath: pathname,
        })

        // 调用 approveAndContinue
        try {
          const response = await fetch('/api/goi/agent/checkpoint', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              itemId: waitingItem.id,
              action: 'approve',
              feedback: `Resource created: ${currentCreateInfo.resourceType}/${resourceId}`,
            }),
          })

          const data = await response.json()

          if (response.ok) {
            console.log('[ResourceCreationDetector] Checkpoint approved:', data)

            // 更新 todoList
            if (data.data?.status?.todoList) {
              useCopilotStore.getState().setTodoList(data.data.status.todoList)
            }

            // 检查是否还有待执行的任务，如果有则继续执行
            const updatedTodoList = data.data?.status?.todoList
            if (updatedTodoList) {
              const hasPendingItems = updatedTodoList.items.some((i: { status: string }) => i.status === 'pending')
              const { mode } = useCopilotStore.getState()

              if (hasPendingItems && (mode === 'auto' || mode === 'assisted')) {
                console.log('[ResourceCreationDetector] Continuing execution...')
                // 触发继续执行的事件
                window.dispatchEvent(new CustomEvent('goi:continueExecution'))
              }
            }
          } else {
            console.error('[ResourceCreationDetector] Failed to approve:', data.message)
          }
        } catch (err) {
          console.error('[ResourceCreationDetector] Error approving checkpoint:', err)
        }

        // 重置状态
        previousCreateInfoRef.current = null
      }

      previousPathRef.current = pathname
    }

    detectResourceCreation()
  }, [pathname])
}

export default useResourceCreationDetector
