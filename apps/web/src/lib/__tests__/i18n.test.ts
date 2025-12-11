/**
 * i18n 国际化模块测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { t, tPlural, setLocale, getLocale } from '../i18n'

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {}
  }),
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

describe('i18n', () => {
  beforeEach(() => {
    localStorageMock.clear()
    setLocale('zh-CN')
  })

  describe('t()', () => {
    it('应返回中文翻译', () => {
      setLocale('zh-CN')
      expect(t('common.save')).toBe('保存')
      expect(t('common.cancel')).toBe('取消')
      expect(t('common.delete')).toBe('删除')
    })

    it('应返回英文翻译', () => {
      setLocale('en-US')
      expect(t('common.save')).toBe('Save')
      expect(t('common.cancel')).toBe('Cancel')
      expect(t('common.delete')).toBe('Delete')
    })

    it('缺少翻译时返回 key', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('支持参数插值', () => {
      setLocale('zh-CN')
      expect(t('validation.required', { field: '用户名' })).toBe('用户名不能为空')
      expect(t('validation.minLength', { field: '密码', min: 6 })).toBe('密码至少需要6个字符')
    })

    it('支持多个参数', () => {
      setLocale('en-US')
      expect(t('validation.minLength', { field: 'Password', min: 8 })).toBe('Password must be at least 8 characters')
    })
  })

  describe('setLocale() / getLocale()', () => {
    it('应保存语言设置到 localStorage', () => {
      setLocale('en-US')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('locale', 'en-US')
    })

    it('应从 localStorage 读取语言设置', () => {
      localStorageMock.store['locale'] = 'en-US'
      expect(getLocale()).toBe('en-US')
    })

    it('默认语言为中文', () => {
      localStorageMock.store = {}
      expect(getLocale()).toBe('zh-CN')
    })
  })

  describe('tPlural()', () => {
    it('应根据数量返回正确的复数形式', () => {
      // 由于当前语言包没有复数形式，会回退到基础 key
      expect(tPlural('common.item', 0)).toBe('common.item')
      expect(tPlural('common.item', 1)).toBe('common.item')
      expect(tPlural('common.item', 5)).toBe('common.item')
    })
  })
})
