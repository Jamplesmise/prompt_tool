import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCommandStore } from '../commandStore'

/**
 * 命令面板状态管理单元测试
 */

describe('commandStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCommandStore())
    act(() => {
      result.current.close()
      result.current.clearRecentItems()
      result.current.setSearchQuery('')
    })
  })

  describe('命令面板开关', () => {
    it('初始状态应该是关闭的', () => {
      const { result } = renderHook(() => useCommandStore())
      expect(result.current.isOpen).toBe(false)
    })

    it('open() 应该打开面板并清空搜索', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.setSearchQuery('test')
        result.current.open()
      })
      expect(result.current.isOpen).toBe(true)
      expect(result.current.searchQuery).toBe('')
    })

    it('close() 应该关闭面板并清空搜索', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.open()
        result.current.setSearchQuery('test')
        result.current.close()
      })
      expect(result.current.isOpen).toBe(false)
      expect(result.current.searchQuery).toBe('')
    })

    it('toggle() 应该切换面板状态', () => {
      const { result } = renderHook(() => useCommandStore())
      expect(result.current.isOpen).toBe(false)

      act(() => result.current.toggle())
      expect(result.current.isOpen).toBe(true)

      act(() => result.current.toggle())
      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('搜索查询', () => {
    it('setSearchQuery() 应该更新搜索内容', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => result.current.setSearchQuery('测试查询'))
      expect(result.current.searchQuery).toBe('测试查询')
    })
  })

  describe('最近项目管理', () => {
    it('addRecentItem() 应该添加新项目', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.addRecentItem({
          id: 'item-1',
          type: 'prompt',
          title: '测试提示词',
          href: '/prompts/1',
        })
      })
      expect(result.current.recentItems).toHaveLength(1)
      expect(result.current.recentItems[0].id).toBe('item-1')
    })

    it('新项目应该添加到开头', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.addRecentItem({ id: 'item-1', type: 'prompt', title: '第一个', href: '/1' })
        result.current.addRecentItem({ id: 'item-2', type: 'task', title: '第二个', href: '/2' })
      })
      expect(result.current.recentItems[0].id).toBe('item-2')
      expect(result.current.recentItems[1].id).toBe('item-1')
    })

    it('添加重复项目应该移除旧项并更新到开头', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.addRecentItem({ id: 'item-1', type: 'prompt', title: '第一个', href: '/1' })
        result.current.addRecentItem({ id: 'item-2', type: 'task', title: '第二个', href: '/2' })
        result.current.addRecentItem({ id: 'item-1', type: 'prompt', title: '第一个（更新）', href: '/1' })
      })
      expect(result.current.recentItems).toHaveLength(2)
      expect(result.current.recentItems[0].id).toBe('item-1')
      expect(result.current.recentItems[0].title).toBe('第一个（更新）')
    })

    it('最多保留 10 个最近项目', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        for (let i = 1; i <= 12; i++) {
          result.current.addRecentItem({ id: `item-${i}`, type: 'prompt', title: `项目 ${i}`, href: `/${i}` })
        }
      })
      expect(result.current.recentItems).toHaveLength(10)
      expect(result.current.recentItems[0].id).toBe('item-12')
      expect(result.current.recentItems.find(r => r.id === 'item-1')).toBeUndefined()
    })

    it('clearRecentItems() 应该清空所有项目', () => {
      const { result } = renderHook(() => useCommandStore())
      act(() => {
        result.current.addRecentItem({ id: 'item-1', type: 'prompt', title: '测试', href: '/1' })
        result.current.clearRecentItems()
      })
      expect(result.current.recentItems).toHaveLength(0)
    })
  })
})
