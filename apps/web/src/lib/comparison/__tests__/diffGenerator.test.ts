import { describe, it, expect } from 'vitest'
import {
  generateDiff,
  generateUnifiedDiff,
  generateInlineDiff,
  getDiffSummary,
  hasSubstantialChanges,
} from '../diffGenerator'

describe('diffGenerator', () => {
  describe('generateDiff', () => {
    it('两个空文本应返回空结果', () => {
      const result = generateDiff('', '')

      expect(result.segments).toHaveLength(0)
      expect(result.stats.additions).toBe(0)
      expect(result.stats.deletions).toBe(0)
      expect(result.stats.unchanged).toBe(0)
    })

    it('相同文本应全部标记为 unchanged', () => {
      const text = '第一行\n第二行\n第三行'
      const result = generateDiff(text, text)

      expect(result.stats.additions).toBe(0)
      expect(result.stats.deletions).toBe(0)
      expect(result.stats.unchanged).toBe(3)
      expect(result.segments.every(s => s.type === 'unchanged')).toBe(true)
    })

    it('原文为空时全部标记为 add', () => {
      const newText = '新增行1\n新增行2'
      const result = generateDiff('', newText)

      expect(result.stats.additions).toBe(2)
      expect(result.stats.deletions).toBe(0)
      expect(result.segments.every(s => s.type === 'add')).toBe(true)
    })

    it('新文为空时全部标记为 remove', () => {
      const oldText = '删除行1\n删除行2'
      const result = generateDiff(oldText, '')

      expect(result.stats.additions).toBe(0)
      expect(result.stats.deletions).toBe(2)
      expect(result.segments.every(s => s.type === 'remove')).toBe(true)
    })

    it('应正确识别新增的行', () => {
      const oldText = '行1\n行2'
      const newText = '行1\n新增行\n行2'
      const result = generateDiff(oldText, newText)

      expect(result.stats.additions).toBe(1)
      expect(result.stats.deletions).toBe(0)
      expect(result.stats.unchanged).toBe(2)

      const addedSegment = result.segments.find(s => s.type === 'add')
      expect(addedSegment?.content).toBe('新增行')
    })

    it('应正确识别删除的行', () => {
      const oldText = '行1\n被删除行\n行2'
      const newText = '行1\n行2'
      const result = generateDiff(oldText, newText)

      expect(result.stats.additions).toBe(0)
      expect(result.stats.deletions).toBe(1)
      expect(result.stats.unchanged).toBe(2)

      const removedSegment = result.segments.find(s => s.type === 'remove')
      expect(removedSegment?.content).toBe('被删除行')
    })

    it('应正确处理修改的行（删除+新增）', () => {
      const oldText = '行1\n原始内容\n行2'
      const newText = '行1\n修改后内容\n行2'
      const result = generateDiff(oldText, newText)

      // 修改实际上是删除 + 新增
      expect(result.stats.deletions).toBe(1)
      expect(result.stats.additions).toBe(1)
      expect(result.stats.unchanged).toBe(2)
    })

    it('应正确处理多行变化', () => {
      const oldText = '保持不变1\n删除行1\n删除行2\n保持不变2'
      const newText = '保持不变1\n新增行1\n新增行2\n新增行3\n保持不变2'
      const result = generateDiff(oldText, newText)

      expect(result.stats.deletions).toBe(2)
      expect(result.stats.additions).toBe(3)
      expect(result.stats.unchanged).toBe(2)
    })

    it('应保留原始行数组', () => {
      const oldText = '行1\n行2'
      const newText = '行1\n行3'
      const result = generateDiff(oldText, newText)

      expect(result.oldLines).toEqual(['行1', '行2'])
      expect(result.newLines).toEqual(['行1', '行3'])
    })

    it('应正确设置行号', () => {
      const oldText = '行1\n行2'
      const newText = '行1\n行2\n行3'
      const result = generateDiff(oldText, newText)

      result.segments.forEach((segment, index) => {
        expect(segment.lineNumber).toBe(index + 1)
      })
    })
  })

  describe('generateUnifiedDiff', () => {
    it('应生成统一格式的 diff', () => {
      const oldText = '行1\n行2'
      const newText = '行1\n行3'
      const diff = generateUnifiedDiff(oldText, newText)

      expect(diff).toContain('--- old')
      expect(diff).toContain('+++ new')
      expect(diff).toContain(' 行1')  // 未变更行前有空格
      expect(diff).toContain('-行2')  // 删除行前有减号
      expect(diff).toContain('+行3')  // 新增行前有加号
    })

    it('应支持自定义标签', () => {
      const diff = generateUnifiedDiff('a', 'b', {
        oldLabel: 'version1',
        newLabel: 'version2',
      })

      expect(diff).toContain('--- version1')
      expect(diff).toContain('+++ version2')
    })

    it('空差异应返回空字符串', () => {
      const diff = generateUnifiedDiff('', '')
      expect(diff).toBe('')
    })
  })

  describe('generateInlineDiff', () => {
    it('相同行应返回 unchanged', () => {
      const result = generateInlineDiff('hello world', 'hello world')

      expect(result.old).toHaveLength(1)
      expect(result.old[0].type).toBe('unchanged')
      expect(result.new).toHaveLength(1)
      expect(result.new[0].type).toBe('unchanged')
    })

    it('应识别公共前缀', () => {
      const result = generateInlineDiff('hello world', 'hello test')

      expect(result.old[0].type).toBe('unchanged')
      expect(result.old[0].text).toBe('hello ')
      expect(result.new[0].type).toBe('unchanged')
      expect(result.new[0].text).toBe('hello ')
    })

    it('应识别公共后缀', () => {
      const result = generateInlineDiff('first text here', 'second text here')

      // 应有公共后缀 ' text here'
      const oldLast = result.old[result.old.length - 1]
      expect(oldLast.type).toBe('unchanged')
      expect(oldLast.text).toContain('text here')
    })

    it('应标记删除和新增部分', () => {
      const result = generateInlineDiff('old', 'new')

      expect(result.old.some(s => s.type === 'remove' && s.text === 'old')).toBe(true)
      expect(result.new.some(s => s.type === 'add' && s.text === 'new')).toBe(true)
    })

    it('应处理中间变化', () => {
      const result = generateInlineDiff('prefix_old_suffix', 'prefix_new_suffix')

      // 前缀 unchanged
      expect(result.old.find(s => s.text === 'prefix_')?.type).toBe('unchanged')
      // 中间变化
      expect(result.old.find(s => s.text === 'old')?.type).toBe('remove')
      expect(result.new.find(s => s.text === 'new')?.type).toBe('add')
      // 后缀 unchanged
      expect(result.old.find(s => s.text === '_suffix')?.type).toBe('unchanged')
    })
  })

  describe('getDiffSummary', () => {
    it('应返回正确的变更摘要', () => {
      const diff = generateDiff('行1', '行1\n行2\n行3')
      const summary = getDiffSummary(diff)

      expect(summary).toContain('+2 行')
    })

    it('只有删除时应返回删除摘要', () => {
      const diff = generateDiff('行1\n行2', '行1')
      const summary = getDiffSummary(diff)

      expect(summary).toContain('-1 行')
    })

    it('无变更时应返回无变更', () => {
      const diff = generateDiff('行1', '行1')
      const summary = getDiffSummary(diff)

      expect(summary).toBe('无变更')
    })

    it('有新增和删除时应都显示', () => {
      const diff = generateDiff('删除行', '新增行')
      const summary = getDiffSummary(diff)

      expect(summary).toContain('+1 行')
      expect(summary).toContain('-1 行')
    })
  })

  describe('hasSubstantialChanges', () => {
    it('相同文本应返回 false', () => {
      expect(hasSubstantialChanges('hello', 'hello')).toBe(false)
    })

    it('只有空白差异应返回 false', () => {
      expect(hasSubstantialChanges('hello  world', 'hello world')).toBe(false)
      expect(hasSubstantialChanges('hello\n\nworld', 'hello world')).toBe(false)
      expect(hasSubstantialChanges('  hello  ', 'hello')).toBe(false)
    })

    it('有实质内容差异应返回 true', () => {
      expect(hasSubstantialChanges('hello', 'world')).toBe(true)
      expect(hasSubstantialChanges('test 1', 'test 2')).toBe(true)
    })

    it('空文本对比非空应返回 true', () => {
      expect(hasSubstantialChanges('', 'content')).toBe(true)
      expect(hasSubstantialChanges('content', '')).toBe(true)
    })
  })
})
