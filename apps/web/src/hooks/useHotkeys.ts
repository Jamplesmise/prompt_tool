'use client'

import { useEffect, useCallback, useRef } from 'react'

// 修饰键类型
type Modifier = 'ctrl' | 'cmd' | 'alt' | 'shift' | 'meta'

// 解析后的快捷键
type ParsedHotkey = {
  modifiers: Set<Modifier>
  key: string
  isSequence: boolean
  sequence?: string[]
}

// 快捷键配置
export type HotkeyConfig = {
  key: string           // 'ctrl+k', 'cmd+n', 'escape', '?', 'g h' (sequence)
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

// 序列快捷键超时时间（毫秒）
const SEQUENCE_TIMEOUT = 800

// 全局序列状态
let sequenceBuffer: string[] = []
let sequenceTimer: NodeJS.Timeout | null = null

function resetSequence() {
  sequenceBuffer = []
  if (sequenceTimer) {
    clearTimeout(sequenceTimer)
    sequenceTimer = null
  }
}

function addToSequence(key: string) {
  sequenceBuffer.push(key.toLowerCase())

  // 重置计时器
  if (sequenceTimer) {
    clearTimeout(sequenceTimer)
  }
  sequenceTimer = setTimeout(resetSequence, SEQUENCE_TIMEOUT)
}

// 解析快捷键字符串
function parseHotkey(hotkeyStr: string): ParsedHotkey {
  // 检查是否为序列快捷键（用空格分隔，如 "g h"）
  if (hotkeyStr.includes(' ') && !hotkeyStr.includes('+')) {
    const sequence = hotkeyStr.toLowerCase().split(' ').map(s => s.trim()).filter(Boolean)
    return {
      modifiers: new Set(),
      key: '',
      isSequence: true,
      sequence,
    }
  }

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

  return { modifiers, key, isSequence: false }
}

// 检查序列是否匹配
function matchSequence(buffer: string[], sequence: string[]): boolean {
  if (buffer.length < sequence.length) return false

  // 检查最后 N 个按键是否匹配
  const startIdx = buffer.length - sequence.length
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[startIdx + i] !== sequence[i]) return false
  }
  return true
}

// 检查键盘事件是否匹配快捷键
function matchHotkey(event: KeyboardEvent, parsed: ParsedHotkey): boolean {
  if (parsed.isSequence) {
    return parsed.sequence ? matchSequence(sequenceBuffer, parsed.sequence) : false
  }

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
 * 支持:
 * - 单键: 'escape', '?'
 * - 修饰键组合: 'ctrl+k', 'cmd+n'
 * - 序列快捷键: 'g h', 'g p' (用空格分隔)
 *
 * @example
 * useHotkeys([
 *   { key: 'ctrl+k', callback: openSearch, description: '打开搜索' },
 *   { key: 'g h', callback: () => router.push('/'), description: '前往工作台' },
 *   { key: 'g p', callback: () => router.push('/prompts'), description: '前往提示词' },
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
          // 重置序列缓存
          resetSequence()
          return
        }
      }

      // 忽略修饰键单独按下
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
        return
      }

      // 添加到序列缓存（仅普通按键，无修饰键时）
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        addToSequence(event.key)
      }

      // 检查所有快捷键
      for (const hotkey of hotkeysRef.current) {
        // 单个快捷键禁用
        if (hotkey.enabled === false) continue

        const parsed = parseHotkey(hotkey.key)

        if (parsed.isSequence) {
          // 序列快捷键匹配
          if (matchSequence(sequenceBuffer, parsed.sequence!)) {
            if (hotkey.preventDefault !== false) {
              event.preventDefault()
              event.stopPropagation()
            }
            hotkey.callback()
            resetSequence()
            return
          }
        } else {
          // 普通快捷键匹配
          if (matchHotkey(event, parsed)) {
            if (hotkey.preventDefault !== false) {
              event.preventDefault()
              event.stopPropagation()
            }
            hotkey.callback()
            // 带修饰键的快捷键触发后重置序列
            if (event.ctrlKey || event.metaKey || event.altKey) {
              resetSequence()
            }
            return
          }
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
 * @example formatHotkey('g h') => 'G H'
 */
export function formatHotkey(hotkeyStr: string): string {
  // 序列快捷键
  if (hotkeyStr.includes(' ') && !hotkeyStr.includes('+')) {
    return hotkeyStr.toUpperCase()
  }

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
