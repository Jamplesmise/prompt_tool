'use client'

import { useEffect, useCallback, useRef } from 'react'

// 修饰键类型
type Modifier = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta'

// 解析后的快捷键
type ParsedHotkey = {
  modifiers: Set<Modifier>
  key: string
}

// 快捷键配置
export type HotkeyConfig = {
  key: string           // 'ctrl+k', 'cmd+n', 'escape', '?'
  callback: () => void
  description?: string
  enabled?: boolean
  preventDefault?: boolean
}

// Hook 选项
export type UseHotkeysOptions = {
  enabled?: boolean
  // 在输入框中是否禁用快捷键
  enableOnInput?: boolean
}

// 解析快捷键字符串
function parseHotkey(hotkeyStr: string): ParsedHotkey {
  const parts = hotkeyStr.toLowerCase().split('+')
  const modifiers = new Set<Modifier>()
  let key = ''

  for (const part of parts) {
    const trimmed = part.trim()
    if (['ctrl', 'cmd', 'alt', 'shift', 'meta'].includes(trimmed)) {
      modifiers.add(trimmed as Modifier)
    } else {
      key = trimmed
    }
  }

  return { modifiers, key }
}

// 检查键盘事件是否匹配快捷键
function matchHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  const { modifiers, key } = parsed

  // 检查修饰键
  const ctrlOrCmd = modifiers.has('ctrl') || modifiers.has('cmd') || modifiers.has('meta')
  const eventCtrlOrCmd = event.ctrlKey || event.metaKey

  if (ctrlOrCmd !== eventCtrlOrCmd) return false
  if (modifiers.has('alt') !== event.altKey) return false
  if (modifiers.has('shift') !== event.shiftKey) return false

  // 检查主键
  const eventKey = event.key.toLowerCase()

  // 特殊键映射
  const keyMap: Record<string, string[]> = {
    'escape': ['escape', 'esc'],
    'enter': ['enter', 'return'],
    'space': [' ', 'space', 'spacebar'],
    'arrowup': ['arrowup', 'up'],
    'arrowdown': ['arrowdown', 'down'],
    'arrowleft': ['arrowleft', 'left'],
    'arrowright': ['arrowright', 'right'],
    ',': [','],
    '.': ['.'],
    '/': ['/'],
    '?': ['?'],
  }

  // 检查是否匹配
  if (key === eventKey) return true

  // 检查特殊键映射
  for (const [normalizedKey, aliases] of Object.entries(keyMap)) {
    if (aliases.includes(key) && aliases.includes(eventKey)) {
      return true
    }
  }

  return false
}

// 检查是否在可编辑元素中
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  if (['input', 'textarea', 'select'].includes(tagName)) return true
  if (target.isContentEditable) return true

  return false
}

/**
 * 快捷键 Hook
 *
 * @example
 * useHotkeys([
 *   { key: 'ctrl+k', callback: openSearch, description: '打开搜索' },
 *   { key: 'cmd+k', callback: openSearch, description: '打开搜索' },
 *   { key: 'escape', callback: closeModal, description: '关闭弹窗' },
 * ])
 */
export function useHotkeys(
  hotkeys: HotkeyConfig[],
  options: UseHotkeysOptions = {}
): void {
  const { enabled = true, enableOnInput = false } = options

  // 使用 ref 存储最新的 hotkeys，避免重复绑定
  const hotkeysRef = useRef(hotkeys)
  hotkeysRef.current = hotkeys

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 全局禁用
      if (!enabled) return

      // 在输入框中禁用（除非明确开启）
      if (!enableOnInput && isEditableElement(event.target)) {
        // 但 Escape 键总是生效
        if (event.key.toLowerCase() !== 'escape') {
          return
        }
      }

      for (const hotkey of hotkeysRef.current) {
        // 单个快捷键禁用
        if (hotkey.enabled === false) continue

        const parsed = parseHotkey(hotkey.key)
        if (matchHotkey(event, parsed)) {
          // 阻止默认行为
          if (hotkey.preventDefault !== false) {
            event.preventDefault()
            event.stopPropagation()
          }
          hotkey.callback()
          return
        }
      }
    },
    [enabled, enableOnInput]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * 获取当前操作系统的修饰键显示名称
 */
export function getModifierKey(): 'Cmd' | 'Ctrl' {
  if (typeof window === 'undefined') return 'Ctrl'
  return navigator.platform.toLowerCase().includes('mac') ? 'Cmd' : 'Ctrl'
}

/**
 * 格式化快捷键显示
 * @example formatHotkey('ctrl+k') => 'Ctrl+K' 或 'Cmd+K'
 */
export function formatHotkey(hotkeyStr: string): string {
  const modKey = getModifierKey()
  return hotkeyStr
    .split('+')
    .map(part => {
      const p = part.trim().toLowerCase()
      if (p === 'ctrl' || p === 'cmd' || p === 'meta') return modKey
      if (p === 'alt') return 'Alt'
      if (p === 'shift') return 'Shift'
      if (p === 'escape') return 'Esc'
      if (p === 'enter') return 'Enter'
      return p.toUpperCase()
    })
    .join('+')
}
