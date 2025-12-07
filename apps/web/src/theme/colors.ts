/**
 * 品牌色彩常量
 * 统一管理项目中的颜色值，便于主题切换
 */

// 品牌主色 - 红色系
export const PRIMARY = {
  50: '#FEF2F2',
  100: '#FEE2E2',
  200: '#FECACA',
  300: '#FCA5A5',
  400: '#F87171',
  500: '#EF4444',  // 主色
  600: '#DC2626',  // hover
  700: '#B91C1C',  // active
  800: '#991B1B',
  900: '#7F1D1D',
} as const

// 语义色
export const SEMANTIC = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
} as const

// 中性色
export const GRAY = {
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
} as const

// 常用颜色别名
export const COLORS = {
  primary: PRIMARY[500],
  primaryHover: PRIMARY[600],
  primaryActive: PRIMARY[700],
  primaryBg: PRIMARY[50],
  primaryBgHover: PRIMARY[100],

  success: SEMANTIC.success,
  warning: SEMANTIC.warning,
  error: SEMANTIC.error,
  info: SEMANTIC.info,

  text: GRAY[800],
  textSecondary: GRAY[500],
  textDisabled: GRAY[400],

  border: GRAY[200],
  borderLight: GRAY[100],

  bgBase: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgPage: GRAY[50],
} as const

export default COLORS
