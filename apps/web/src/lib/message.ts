import type { MessageInstance } from 'antd/es/message/interface'

// 全局 message 实例
let messageApi: MessageInstance | null = null

export function setMessageApi(api: MessageInstance) {
  messageApi = api
}

export function getMessageApi(): MessageInstance | null {
  return messageApi
}

// 便捷方法
export const appMessage = {
  success: (content: string) => {
    if (messageApi) {
      messageApi.success(content)
    } else {
      console.warn('Message API not initialized')
    }
  },
  error: (content: string) => {
    if (messageApi) {
      messageApi.error(content)
    } else {
      console.warn('Message API not initialized')
    }
  },
  info: (content: string) => {
    if (messageApi) {
      messageApi.info(content)
    } else {
      console.warn('Message API not initialized')
    }
  },
  warning: (content: string) => {
    if (messageApi) {
      messageApi.warning(content)
    } else {
      console.warn('Message API not initialized')
    }
  },
  loading: (content: string) => {
    if (messageApi) {
      return messageApi.loading(content)
    } else {
      console.warn('Message API not initialized')
      return () => {}
    }
  },
}
