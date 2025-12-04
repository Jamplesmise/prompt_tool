'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { HotkeyConfig } from '@/hooks/useHotkeys'

// Context 值类型
type HotkeysContextValue = {
  // 全局启用/禁用状态
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  // 已注册的快捷键列表（用于帮助面板显示）
  registeredHotkeys: HotkeyConfig[]
  // 注册快捷键，返回注销函数
  registerHotkey: (config: HotkeyConfig) => () => void
  // 批量注册
  registerHotkeys: (configs: HotkeyConfig[]) => () => void
}

const HotkeysContext = createContext<HotkeysContextValue | null>(null)

type HotkeysProviderProps = {
  children: ReactNode
  // 初始启用状态
  initialEnabled?: boolean
}

export function HotkeysProvider({
  children,
  initialEnabled = true
}: HotkeysProviderProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [registeredHotkeys, setRegisteredHotkeys] = useState<HotkeyConfig[]>([])

  // 注册单个快捷键
  const registerHotkey = useCallback((config: HotkeyConfig) => {
    setRegisteredHotkeys(prev => {
      // 避免重复注册
      if (prev.some(h => h.key === config.key && h.description === config.description)) {
        return prev
      }
      return [...prev, config]
    })

    // 返回注销函数
    return () => {
      setRegisteredHotkeys(prev =>
        prev.filter(h => !(h.key === config.key && h.description === config.description))
      )
    }
  }, [])

  // 批量注册快捷键
  const registerHotkeys = useCallback((configs: HotkeyConfig[]) => {
    const unregisters = configs.map(config => registerHotkey(config))

    // 返回批量注销函数
    return () => {
      unregisters.forEach(unregister => unregister())
    }
  }, [registerHotkey])

  const value = useMemo<HotkeysContextValue>(() => ({
    enabled,
    setEnabled,
    registeredHotkeys,
    registerHotkey,
    registerHotkeys,
  }), [enabled, registeredHotkeys, registerHotkey, registerHotkeys])

  return (
    <HotkeysContext.Provider value={value}>
      {children}
    </HotkeysContext.Provider>
  )
}

/**
 * 获取快捷键上下文
 * @throws 如果不在 HotkeysProvider 内使用会抛出错误
 */
export function useHotkeysContext(): HotkeysContextValue {
  const context = useContext(HotkeysContext)
  if (!context) {
    throw new Error('useHotkeysContext must be used within a HotkeysProvider')
  }
  return context
}

/**
 * 安全获取快捷键上下文（可能为 null）
 */
export function useHotkeysContextSafe(): HotkeysContextValue | null {
  return useContext(HotkeysContext)
}
