import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHotkeys, formatHotkey, getModifierKey } from '../useHotkeys'

// 模拟键盘事件
function createKeyboardEvent(
  key: string,
  options: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

// 触发键盘事件
function pressKey(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = createKeyboardEvent(key, options)
  document.dispatchEvent(event)
  return event
}

describe('useHotkeys Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('单键快捷键', () => {
    it('应该响应 Escape 键', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'escape', callback }]))

      pressKey('Escape')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('应该响应 ? 键', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: '?', callback }]))

      pressKey('?')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('enabled=false 时不应该触发', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'escape', callback, enabled: false }]))

      pressKey('Escape')
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('修饰键组合', () => {
    it('应该响应 Ctrl+K', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'ctrl+k', callback }]))

      pressKey('k', { ctrlKey: true })
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('应该响应 Cmd+K (Meta)', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'cmd+k', callback }]))

      pressKey('k', { metaKey: true })
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('缺少修饰键时不应该触发', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'ctrl+k', callback }]))

      pressKey('k') // 没有 Ctrl
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('序列快捷键', () => {
    it('应该响应 G H 序列', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'g h', callback }]))

      pressKey('g')
      pressKey('h')

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('应该响应 G P 序列', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'g p', callback }]))

      pressKey('g')
      pressKey('p')

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('序列超时后不应该触发', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'g h', callback }]))

      pressKey('g')

      // 等待超过 800ms
      act(() => {
        vi.advanceTimersByTime(900)
      })

      pressKey('h')

      expect(callback).not.toHaveBeenCalled()
    })

    it('错误的序列不应该触发', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'g h', callback }]))

      pressKey('g')
      pressKey('x') // 错误的第二个键

      expect(callback).not.toHaveBeenCalled()
    })

    it('多个序列快捷键应该独立工作', () => {
      const callbackGH = vi.fn()
      const callbackGP = vi.fn()

      renderHook(() =>
        useHotkeys([
          { key: 'g h', callback: callbackGH },
          { key: 'g p', callback: callbackGP },
        ])
      )

      pressKey('g')
      pressKey('h')
      expect(callbackGH).toHaveBeenCalledTimes(1)
      expect(callbackGP).not.toHaveBeenCalled()

      // 等待序列重置
      act(() => {
        vi.advanceTimersByTime(900)
      })

      pressKey('g')
      pressKey('p')
      expect(callbackGP).toHaveBeenCalledTimes(1)
    })
  })

  describe('全局禁用', () => {
    it('enabled=false 时应该禁用所有快捷键', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'escape', callback }], { enabled: false }))

      pressKey('Escape')
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('修饰键忽略', () => {
    it('应该忽略单独的修饰键', () => {
      const callback = vi.fn()
      renderHook(() => useHotkeys([{ key: 'ctrl+k', callback }]))

      pressKey('Control')
      pressKey('Shift')
      pressKey('Alt')
      pressKey('Meta')

      expect(callback).not.toHaveBeenCalled()
    })
  })
})

describe('useHotkeys 工具函数', () => {
  describe('getModifierKey', () => {
    it('应返回 Ctrl 或 Cmd', () => {
      const result = getModifierKey()
      expect(['Ctrl', 'Cmd']).toContain(result)
    })
  })

  describe('formatHotkey 基础格式化', () => {
    // 这些测试不依赖于平台检测

    it('应将键名转为大写', () => {
      const result = formatHotkey('k')
      expect(result).toBe('K')
    })

    it('应格式化 alt 修饰键', () => {
      const result = formatHotkey('alt+s')
      expect(result).toContain('Alt')
      expect(result).toContain('S')
    })

    it('应格式化 shift 修饰键', () => {
      const result = formatHotkey('shift+enter')
      expect(result).toContain('Shift')
      expect(result).toContain('Enter')
    })

    it('应将 escape 格式化为 Esc', () => {
      const result = formatHotkey('escape')
      expect(result).toBe('Esc')
    })

    it('应将 enter 格式化为 Enter', () => {
      const result = formatHotkey('enter')
      expect(result).toBe('Enter')
    })

    it('应处理多个修饰键', () => {
      const result = formatHotkey('ctrl+shift+k')
      expect(result).toContain('Shift')
      expect(result).toContain('K')
    })

    it('应处理大小写混合输入', () => {
      const result1 = formatHotkey('CTRL+K')
      const result2 = formatHotkey('Ctrl+K')

      // 两者的最终格式应该相同
      expect(result1).toBe(result2)
    })

    it('应处理带空格的输入', () => {
      const result = formatHotkey('ctrl + k')
      // 应该去除空格并正确格式化
      expect(result).toContain('K')
    })

    it('ctrl/cmd/meta 应使用相同的修饰键输出', () => {
      const resultCtrl = formatHotkey('ctrl+k')
      const resultCmd = formatHotkey('cmd+k')
      const resultMeta = formatHotkey('meta+k')

      // 在同一平台上，这三种写法应该产生相同的输出
      expect(resultCtrl).toBe(resultCmd)
      expect(resultCmd).toBe(resultMeta)
    })
  })

  describe('formatHotkey 序列快捷键', () => {
    it('应该格式化 G H 序列', () => {
      expect(formatHotkey('g h')).toBe('G H')
    })

    it('应该格式化 G P 序列', () => {
      expect(formatHotkey('g p')).toBe('G P')
    })

    it('应该格式化多键序列', () => {
      expect(formatHotkey('g t s')).toBe('G T S')
    })

    it('应该处理小写输入', () => {
      expect(formatHotkey('g h')).toBe('G H')
    })
  })
})
