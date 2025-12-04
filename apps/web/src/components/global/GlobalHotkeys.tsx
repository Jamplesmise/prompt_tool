'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useHotkeys } from '@/hooks/useHotkeys'
import { GlobalSearch } from './GlobalSearch'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'

/**
 * 全局快捷键组件
 * 管理全局搜索、快捷键帮助等弹窗
 */
export function GlobalHotkeys() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setHelpOpen(false)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
  }, [])

  const openHelp = useCallback(() => {
    setHelpOpen(true)
    setSearchOpen(false)
  }, [])

  const closeHelp = useCallback(() => {
    setHelpOpen(false)
  }, [])

  const openSettings = useCallback(() => {
    router.push('/settings/general')
  }, [router])

  const createTask = useCallback(() => {
    router.push('/tasks/new')
  }, [router])

  // 注册全局快捷键
  useHotkeys([
    // 打开全局搜索 - Ctrl/Cmd + K
    { key: 'ctrl+k', callback: openSearch, description: '打开全局搜索' },
    { key: 'cmd+k', callback: openSearch, description: '打开全局搜索' },
    // 新建任务 - Ctrl/Cmd + N
    { key: 'ctrl+n', callback: createTask, description: '新建任务' },
    { key: 'cmd+n', callback: createTask, description: '新建任务' },
    // 打开设置 - Ctrl/Cmd + ,
    { key: 'ctrl+,', callback: openSettings, description: '打开设置' },
    { key: 'cmd+,', callback: openSettings, description: '打开设置' },
    // 显示帮助 - ?
    { key: '?', callback: openHelp, description: '显示快捷键帮助' },
  ])

  return (
    <>
      <GlobalSearch
        open={searchOpen}
        onClose={closeSearch}
      />
      <KeyboardShortcutsHelp
        open={helpOpen}
        onClose={closeHelp}
      />
    </>
  )
}
