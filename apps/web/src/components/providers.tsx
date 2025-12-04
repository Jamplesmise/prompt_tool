'use client'

import React, { useEffect } from 'react'
import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/queryClient'
import StyledComponentsRegistry from '@/lib/antdRegistry'
import { setMessageApi } from '@/lib/message'

const theme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
  },
  components: {
    Table: {
      fontSize: 14,
      fontSizeSM: 13,
    },
    Button: {
      fontSize: 14,
    },
    Input: {
      fontSize: 14,
    },
    Select: {
      fontSize: 14,
    },
    Menu: {
      fontSize: 14,
    },
    Typography: {
      fontSize: 14,
    },
  },
}

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
        <ConfigProvider locale={zhCN} theme={theme}>
          <App>
            <MessageApiSetter>{children}</MessageApiSetter>
          </App>
        </ConfigProvider>
      </QueryClientProvider>
    </StyledComponentsRegistry>
  )
}
