/**
 * 国际化 (i18n) 基础设施
 *
 * 使用方式:
 * 1. 导入 t 函数: import { t } from '@/lib/i18n'
 * 2. 使用翻译: t('common.save') 或 t('errors.required', { field: '名称' })
 */

import { zhCN } from './locales/zh-CN'
import { enUS } from './locales/en-US'

export type Locale = 'zh-CN' | 'en-US'
export type TranslationKey = keyof typeof zhCN

// 语言包
const locales: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

// 当前语言（可从 localStorage 或 cookie 读取）
let currentLocale: Locale = 'zh-CN'

/**
 * 设置当前语言
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}

/**
 * 获取当前语言
 */
export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale') as Locale | null
    if (saved && locales[saved]) {
      currentLocale = saved
    }
  }
  return currentLocale
}

/**
 * 翻译函数
 *
 * @param key - 翻译键，如 'common.save' 或 'errors.required'
 * @param params - 插值参数，如 { field: '名称' }
 * @returns 翻译后的字符串
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale()
  const translations = locales[locale] || locales['zh-CN']

  let text = translations[key]

  // 如果找不到翻译，使用 key 本身（便于调试）
  if (!text) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation for key: ${key}`)
    }
    return key
  }

  // 参数插值
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
    })
  }

  return text
}

/**
 * 复数形式翻译
 *
 * @param key - 翻译键基础，会自动查找 key_zero, key_one, key_other
 * @param count - 数量
 * @param params - 其他插值参数
 */
export function tPlural(
  key: string,
  count: number,
  params?: Record<string, string | number>
): string {
  let suffix: string
  if (count === 0) {
    suffix = '_zero'
  } else if (count === 1) {
    suffix = '_one'
  } else {
    suffix = '_other'
  }

  const fullKey = `${key}${suffix}`
  const locale = getLocale()
  const translations = locales[locale] || locales['zh-CN']

  // 如果没有复数形式，使用基础 key
  if (!translations[fullKey]) {
    return t(key, { ...params, count })
  }

  return t(fullKey, { ...params, count })
}

export default { t, tPlural, setLocale, getLocale }
