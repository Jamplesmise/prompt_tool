/**
 * 统一反馈工具函数
 * 封装 Ant Design message 和 notification 组件，提供一致的反馈体验
 */

import { message, notification, Modal } from 'antd'
import type { ModalFuncProps } from 'antd/es/modal'

// 反馈选项类型
type FeedbackOptions = {
  description?: string
  duration?: number
  action?: {
    text: string
    onClick: () => void
  }
}

// 确认弹窗选项类型
type ConfirmOptions = {
  title: string
  content?: string
  danger?: boolean
  okText?: string
  cancelText?: string
  onOk?: () => void | Promise<void>
  onCancel?: () => void
}

// 加载状态控制类型
type LoadingControl = {
  close: () => void
}

/**
 * 显示成功消息
 */
export function showSuccess(text: string, options?: FeedbackOptions): void {
  if (options?.description || options?.action) {
    notification.success({
      message: text,
      description: options.description,
      duration: options.duration ?? 4,
      btn: options.action ? (
        <a onClick={options.action.onClick} style={{ color: '#10B981' }}>
          {options.action.text}
        </a>
      ) : undefined,
    })
  } else {
    message.success({
      content: text,
      duration: options?.duration ?? 3,
    })
  }
}

/**
 * 显示错误消息
 */
export function showError(text: string, options?: FeedbackOptions): void {
  if (options?.description || options?.action) {
    notification.error({
      message: text,
      description: options.description,
      duration: options.duration ?? 5,
      btn: options.action ? (
        <a onClick={options.action.onClick} style={{ color: '#EF4444' }}>
          {options.action.text}
        </a>
      ) : undefined,
    })
  } else {
    message.error({
      content: text,
      duration: options?.duration ?? 4,
    })
  }
}

/**
 * 显示警告消息
 */
export function showWarning(text: string, options?: FeedbackOptions): void {
  if (options?.description || options?.action) {
    notification.warning({
      message: text,
      description: options.description,
      duration: options.duration ?? 4,
      btn: options.action ? (
        <a onClick={options.action.onClick} style={{ color: '#F59E0B' }}>
          {options.action.text}
        </a>
      ) : undefined,
    })
  } else {
    message.warning({
      content: text,
      duration: options?.duration ?? 3,
    })
  }
}

/**
 * 显示信息消息
 */
export function showInfo(text: string, options?: FeedbackOptions): void {
  if (options?.description || options?.action) {
    notification.info({
      message: text,
      description: options.description,
      duration: options.duration ?? 4,
      btn: options.action ? (
        <a onClick={options.action.onClick} style={{ color: '#3B82F6' }}>
          {options.action.text}
        </a>
      ) : undefined,
    })
  } else {
    message.info({
      content: text,
      duration: options?.duration ?? 3,
    })
  }
}

/**
 * 显示确认弹窗
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const modalConfig: ModalFuncProps = {
      title: options.title,
      content: options.content,
      okText: options.okText ?? '确定',
      cancelText: options.cancelText ?? '取消',
      okButtonProps: options.danger ? { danger: true } : undefined,
      onOk: async () => {
        if (options.onOk) {
          await options.onOk()
        }
        resolve(true)
      },
      onCancel: () => {
        options.onCancel?.()
        resolve(false)
      },
    }

    Modal.confirm(modalConfig)
  })
}

/**
 * 显示全局加载状态
 */
export function showLoading(text: string = '加载中...'): LoadingControl {
  const hide = message.loading({
    content: text,
    duration: 0,
  })

  return {
    close: () => hide(),
  }
}

/**
 * 显示操作成功通知（带详细信息）
 */
export function showOperationSuccess(
  title: string,
  details: { label: string; value: string }[],
  action?: { text: string; onClick: () => void }
): void {
  const description = details.map((d) => `${d.label}: ${d.value}`).join('\n')

  notification.success({
    message: title,
    description: (
      <div style={{ whiteSpace: 'pre-line' }}>
        {description}
      </div>
    ),
    duration: 5,
    btn: action ? (
      <a onClick={action.onClick} style={{ color: '#10B981' }}>
        {action.text}
      </a>
    ) : undefined,
  })
}

/**
 * 显示操作失败通知（带重试）
 */
export function showOperationError(
  title: string,
  error: string,
  onRetry?: () => void
): void {
  notification.error({
    message: title,
    description: error,
    duration: 0,
    btn: onRetry ? (
      <a onClick={onRetry} style={{ color: '#EF4444' }}>
        重试
      </a>
    ) : undefined,
  })
}

/**
 * 复制到剪贴板并提示
 */
export async function copyToClipboard(text: string, successText?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    showSuccess(successText ?? '已复制到剪贴板')
    return true
  } catch {
    showError('复制失败，请手动复制')
    return false
  }
}
