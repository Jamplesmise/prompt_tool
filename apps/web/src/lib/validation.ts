/**
 * API 输入验证工具
 */

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 验证并规范化分页参数
 */
export function validatePagination(params: URLSearchParams): { page: number; pageSize: number } {
  const pageRaw = parseInt(params.get('page') || '1', 10)
  const pageSizeRaw = parseInt(params.get('pageSize') || '20', 10)

  return {
    page: Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw),
    pageSize: Number.isNaN(pageSizeRaw) ? 20 : Math.min(100, Math.max(1, pageSizeRaw)),
  }
}

/**
 * 验证搜索关键词
 */
export function validateKeyword(value: string | null, maxLength = 100): string | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new ValidationError(`搜索词最多 ${maxLength} 个字符`)
  }

  return trimmed || undefined
}

/**
 * 验证 UUID 格式
 */
export function validateUUID(value: string | null, fieldName = 'ID'): string {
  if (!value) {
    throw new ValidationError(`${fieldName} 不能为空`)
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} 格式无效`)
  }

  return value
}

/**
 * 验证字符串长度
 */
export function validateStringLength(
  value: string | null | undefined,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): string | undefined {
  const { min = 0, max = 1000, required = false } = options

  if (!value || value.trim() === '') {
    if (required) {
      throw new ValidationError(`${fieldName} 不能为空`)
    }
    return undefined
  }

  const trimmed = value.trim()

  if (trimmed.length < min) {
    throw new ValidationError(`${fieldName} 至少需要 ${min} 个字符`)
  }

  if (trimmed.length > max) {
    throw new ValidationError(`${fieldName} 最多 ${max} 个字符`)
  }

  return trimmed
}

/**
 * 验证邮箱格式
 */
export function validateEmail(value: string | null, fieldName = '邮箱'): string {
  if (!value || value.trim() === '') {
    throw new ValidationError(`${fieldName} 不能为空`)
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    throw new ValidationError(`请输入有效的${fieldName}地址`)
  }

  return value.trim().toLowerCase()
}

/**
 * 验证数字范围
 */
export function validateNumber(
  value: number | string | null,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const { min = -Infinity, max = Infinity, integer = false } = options

  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} 不能为空`)
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (Number.isNaN(num)) {
    throw new ValidationError(`${fieldName} 必须是数字`)
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} 必须是整数`)
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} 不能小于 ${min}`)
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} 不能大于 ${max}`)
  }

  return num
}

/**
 * 验证枚举值
 */
export function validateEnum<T extends string>(
  value: string | null,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!value) {
    throw new ValidationError(`${fieldName} 不能为空`)
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(`${fieldName} 的值无效，允许的值: ${allowedValues.join(', ')}`)
  }

  return value as T
}

/**
 * 验证数组
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): T[] {
  const { minLength = 0, maxLength = 1000 } = options

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} 必须是数组`)
  }

  if (value.length < minLength) {
    throw new ValidationError(`${fieldName} 至少需要 ${minLength} 项`)
  }

  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} 最多 ${maxLength} 项`)
  }

  return value as T[]
}
