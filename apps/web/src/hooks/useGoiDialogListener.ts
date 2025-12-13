/**
 * GOI 弹窗事件监听 Hook
 *
 * 用于在页面组件中监听 GOI 系统触发的弹窗打开事件
 *
 * @example
 * ```tsx
 * import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
 * import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'
 *
 * function ModelsPage() {
 *   const [addProviderOpen, setAddProviderOpen] = useState(false)
 *   const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null)
 *
 *   useGoiDialogListener({
 *     [GOI_DIALOG_IDS.ADD_PROVIDER]: () => setAddProviderOpen(true),
 *     [GOI_DIALOG_IDS.ADD_MODEL]: () => {
 *       // 需要选择默认供应商
 *       setAddModelProviderId('default')
 *     },
 *   })
 *
 *   return (...)
 * }
 * ```
 */

import { useEffect, useCallback, useRef } from 'react'
import type { GoiDialogId } from '@/lib/goi/dialogIds'

/**
 * 弹窗处理器映射
 */
export type DialogHandlers = {
  [K in GoiDialogId | string]?: () => void
}

/**
 * GOI 弹窗事件详情
 */
export type GoiDialogEventDetail = {
  dialogId: string
  /** 可选的上下文数据 */
  context?: {
    resourceId?: string
    resourceType?: string
    [key: string]: unknown
  }
}

/**
 * GOI 弹窗事件监听 Hook
 *
 * @param handlers - 弹窗 ID 到处理函数的映射对象
 */
export function useGoiDialogListener(handlers: DialogHandlers): void {
  // 使用 ref 存储 handlers，避免 useEffect 依赖变化导致重复绑定
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const handleGoiDialog = useCallback((event: CustomEvent<GoiDialogEventDetail>) => {
    const { dialogId, context } = event.detail
    const handler = handlersRef.current[dialogId]

    if (handler) {
      console.log('[useGoiDialogListener] Handling dialog:', dialogId, context)
      handler()
    } else {
      console.log('[useGoiDialogListener] No handler for dialog:', dialogId)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('goi:openDialog', handleGoiDialog as EventListener)

    return () => {
      window.removeEventListener('goi:openDialog', handleGoiDialog as EventListener)
    }
  }, [handleGoiDialog])
}

/**
 * 手动触发 GOI 弹窗事件（用于测试或非 GOI 场景）
 *
 * @param dialogId - 弹窗 ID
 * @param context - 可选的上下文数据
 */
export function triggerGoiDialog(dialogId: string, context?: GoiDialogEventDetail['context']): void {
  window.dispatchEvent(
    new CustomEvent<GoiDialogEventDetail>('goi:openDialog', {
      detail: { dialogId, context },
    })
  )
}

/**
 * GOI 导航事件详情
 */
export type GoiNavigateEventDetail = {
  url: string
  /** 是否替换当前历史记录 */
  replace?: boolean
}

/**
 * GOI 导航事件监听 Hook
 *
 * @param onNavigate - 导航处理函数
 */
export function useGoiNavigateListener(onNavigate: (url: string, replace?: boolean) => void): void {
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  const handleGoiNavigate = useCallback((event: CustomEvent<GoiNavigateEventDetail>) => {
    const { url, replace } = event.detail
    console.log('[useGoiNavigateListener] Navigating to:', url)
    onNavigateRef.current(url, replace)
  }, [])

  useEffect(() => {
    window.addEventListener('goi:navigate', handleGoiNavigate as EventListener)

    return () => {
      window.removeEventListener('goi:navigate', handleGoiNavigate as EventListener)
    }
  }, [handleGoiNavigate])
}

/**
 * 手动触发 GOI 导航事件
 *
 * @param url - 目标 URL
 * @param replace - 是否替换当前历史记录
 */
export function triggerGoiNavigate(url: string, replace?: boolean): void {
  window.dispatchEvent(
    new CustomEvent<GoiNavigateEventDetail>('goi:navigate', {
      detail: { url, replace },
    })
  )
}
