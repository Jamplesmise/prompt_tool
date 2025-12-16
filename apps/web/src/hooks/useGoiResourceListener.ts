/**
 * GOI 资源变更监听 Hook
 *
 * 用于列表页面监听 GOI StateHandler 的资源变更事件，自动刷新数据
 *
 * 使用方式：
 * ```typescript
 * export default function PromptsPage() {
 *   // 监听 GOI 资源变更，自动刷新列表
 *   useGoiResourceListener('prompt')
 *
 *   const { data, refetch } = useQuery({ queryKey: ['prompt'], ... })
 *   // ...
 * }
 * ```
 */

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type ResourceChangeAction = 'create' | 'update' | 'delete'

export type ResourceChangeEvent = {
  action: ResourceChangeAction
  resourceType: string
  resourceId?: string
  data?: unknown
}

export type GoiResourceListenerOptions = {
  /** 变更后的回调 */
  onChange?: (event: ResourceChangeEvent) => void
  /** 是否自动使 React Query 缓存失效（默认 true） */
  invalidateQueries?: boolean
  /** 额外的 query key 前缀（用于自定义缓存 key） */
  queryKeyPrefix?: string
}

/**
 * GOI 资源变更监听 Hook
 *
 * @param resourceType 要监听的资源类型
 * @param options 配置选项
 */
export function useGoiResourceListener(
  resourceType: string | string[],
  options?: GoiResourceListenerOptions
) {
  const queryClient = useQueryClient()
  const resourceTypes = Array.isArray(resourceType) ? resourceType : [resourceType]
  const { onChange, invalidateQueries = true, queryKeyPrefix } = options || {}

  const handleResourceChange = useCallback(
    (event: CustomEvent<ResourceChangeEvent>) => {
      const { action, resourceType: changedType, resourceId, data } = event.detail

      // 检查是否是我们关心的资源类型
      if (!resourceTypes.includes(changedType)) return

      console.log(`[GOI] Resource ${action}:`, { resourceType: changedType, resourceId, data })

      // 触发回调
      onChange?.(event.detail)

      // 使 React Query 缓存失效
      if (invalidateQueries) {
        const queryKey = queryKeyPrefix ? [queryKeyPrefix, changedType] : [changedType]
        queryClient.invalidateQueries({ queryKey })

        // 对于特定资源 ID 的变更，也使详情页缓存失效
        if (resourceId) {
          queryClient.invalidateQueries({
            queryKey: [...queryKey, resourceId],
          })
        }
      }
    },
    [resourceTypes, onChange, invalidateQueries, queryKeyPrefix, queryClient]
  )

  useEffect(() => {
    window.addEventListener(
      'goi:resourceChanged',
      handleResourceChange as EventListener
    )
    return () => {
      window.removeEventListener(
        'goi:resourceChanged',
        handleResourceChange as EventListener
      )
    }
  }, [handleResourceChange])
}

/**
 * 发送资源变更事件
 *
 * 供 StateHandler 调用，通知 UI 资源已变更
 */
export function dispatchResourceChange(
  action: ResourceChangeAction,
  resourceType: string,
  resourceId?: string,
  data?: unknown
) {
  const event: ResourceChangeEvent = {
    action,
    resourceType,
    resourceId,
    data,
  }

  window.dispatchEvent(
    new CustomEvent('goi:resourceChanged', { detail: event })
  )
}

export default useGoiResourceListener
