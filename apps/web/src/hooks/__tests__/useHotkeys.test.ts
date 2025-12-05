import { describe, it, expect } from 'vitest'
import { formatHotkey, getModifierKey } from '../useHotkeys'

// 注意：useHotkeys hook 本身需要 React 测试环境，这里我们测试导出的工具函数
// formatHotkey 的完整测试需要在浏览器环境（jsdom）中进行

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
})
