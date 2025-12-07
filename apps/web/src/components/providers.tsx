'use client'

import React, { useEffect } from 'react'
import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queryClient'
import StyledComponentsRegistry from '@/lib/antdRegistry'
import { setMessageApi } from '@/lib/message'
import { antdTheme } from '@/theme/antdTheme'
import { ErrorBoundary } from '@/components/common'

function MessageApiSetter({ children }: { children: React.ReactNode }) {
  const { message } = App.useApp()

  useEffect(() => {
    setMessageApi(message)
  }, [message])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <StyledComponentsRegistry>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN} theme={antdTheme}>
          <App>
            <ErrorBoundary>
              <MessageApiSetter>{children}</MessageApiSetter>
            </ErrorBoundary>
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    </StyledComponentsRegistry>
  )
}
