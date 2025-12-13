/**
 * 测试辅助函数 - 提供 Provider 包装的渲染
 */

import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

// Mock matchMedia for Ant Design responsive components
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const mediaQueryList = {
        matches: false,
        media: query,
        onchange: null as ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null,
        addListener: function(listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) {
          // Deprecated but required for older implementations
        },
        removeListener: function(listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) {
          // Deprecated but required for older implementations
        },
        addEventListener: function<K extends keyof MediaQueryListEventMap>(
          type: K,
          listener: (this: MediaQueryList, ev: MediaQueryListEventMap[K]) => void,
          options?: boolean | AddEventListenerOptions
        ) {
          // No-op for tests
        },
        removeEventListener: function<K extends keyof MediaQueryListEventMap>(
          type: K,
          listener: (this: MediaQueryList, ev: MediaQueryListEventMap[K]) => void,
          options?: boolean | EventListenerOptions
        ) {
          // No-op for tests
        },
        dispatchEvent: function(event: Event) {
          return false
        },
      }
      return mediaQueryList
    },
  })
}

// 创建测试用 QueryClient
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// 所有 Providers 包装
function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN}>
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  )
}

// 自定义渲染函数
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// 重新导出 testing-library 的所有内容
export * from '@testing-library/react'
export { renderWithProviders as render }
