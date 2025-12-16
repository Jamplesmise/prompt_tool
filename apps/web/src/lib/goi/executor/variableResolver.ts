/**
 * GOI 变量解析器 - 处理 TODO List 中步骤间的结果引用
 *
 * 支持以下变量引用语法：
 * - $1.result.id         - 引用步骤1的结果中的id字段
 * - $2.result[0].name    - 引用步骤2结果数组的第一个元素的name字段
 * - $prev.result.id      - 引用上一步的结果中的id字段
 * - $1.result.data.items[0].id - 嵌套路径引用
 *
 * 示例：
 * ```typescript
 * const todoList = [
 *   { id: "1", goiOperation: { type: "state", action: "create", ... } },
 *   { id: "2", goiOperation: { type: "observation", ... } },
 *   { id: "3", goiOperation: {
 *       type: "state",
 *       action: "create",
 *       expectedState: {
 *         promptId: "$1.result.resourceId",   // ← 引用步骤1
 *         datasetId: "$2.result.results[0].id" // ← 引用步骤2
 *       }
 *     }
 *   }
 * ]
 * ```
 */

// ============================================
// 类型定义
// ============================================

/**
 * 步骤执行结果存储（用于变量解析）
 */
export type VariableStepResult = {
  /** 操作返回的结果 */
  result: unknown
  /** 执行状态 */
  status: 'success' | 'failed'
}

/**
 * 步骤结果映射（stepId -> VariableStepResult）
 */
export type VariableStepResults = Map<string, VariableStepResult>

/**
 * 变量解析上下文
 */
export type VariableResolverContext = {
  /** 当前步骤索引（从1开始） */
  currentStepIndex: number
  /** 当前步骤ID */
  currentStepId?: string
  /** 步骤ID列表（用于 $prev 引用） */
  stepIdOrder?: string[]
}

// ============================================
// 变量引用正则表达式
// ============================================

/**
 * 变量引用模式
 * 匹配: $1.result.id, $2.result[0].name, $prev.result.data
 *
 * 格式: $<步骤引用>.result<路径>
 * - 步骤引用: 数字（步骤ID）或 "prev"（上一步）
 * - 路径: .field 或 [index] 的组合
 */
const VARIABLE_PATTERN = /\$(\d+|prev)\.result(\.[a-zA-Z_][\w]*|\[\d+\])*/g

/**
 * 完整变量匹配模式（用于判断整个字符串是否为单个变量引用）
 */
const FULL_VARIABLE_PATTERN = /^\$(\d+|prev)\.result(\.[a-zA-Z_][\w]*|\[\d+\])*$/

// ============================================
// 主要解析函数
// ============================================

/**
 * 解析数据中的所有变量引用
 *
 * 递归处理对象、数组和字符串中的变量引用，
 * 将其替换为实际的步骤执行结果。
 *
 * @param data - 要解析的数据（可以是任意类型）
 * @param stepResults - 已执行步骤的结果映射
 * @param context - 解析上下文
 * @returns 解析后的数据
 *
 * @example
 * ```typescript
 * const stepResults = new Map([
 *   ['1', { result: { resourceId: 'prompt-123' }, status: 'success' }]
 * ])
 *
 * const resolved = resolveVariables(
 *   { promptId: '$1.result.resourceId' },
 *   stepResults,
 *   { currentStepIndex: 2 }
 * )
 * // => { promptId: 'prompt-123' }
 * ```
 */
export function resolveVariables(
  data: unknown,
  stepResults: VariableStepResults,
  context: VariableResolverContext
): unknown {
  // 字符串：检查并解析变量引用
  if (typeof data === 'string') {
    return resolveStringVariables(data, stepResults, context)
  }

  // 数组：递归解析每个元素
  if (Array.isArray(data)) {
    return data.map((item) => resolveVariables(item, stepResults, context))
  }

  // 对象：递归解析每个属性值
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = resolveVariables(value, stepResults, context)
    }
    return result
  }

  // 其他类型（数字、布尔、null、undefined）：直接返回
  return data
}

/**
 * 解析字符串中的变量引用
 *
 * 如果整个字符串就是一个变量引用，返回原始值（可能是对象/数组）。
 * 如果包含多个变量或混合文本，替换为字符串值。
 *
 * @param str - 包含变量引用的字符串
 * @param stepResults - 已执行步骤的结果映射
 * @param context - 解析上下文
 * @returns 解析后的值
 */
export function resolveStringVariables(
  str: string,
  stepResults: VariableStepResults,
  context: VariableResolverContext
): unknown {
  // 如果整个字符串就是一个变量引用，返回原始值（保持类型）
  if (FULL_VARIABLE_PATTERN.test(str)) {
    return resolveVariable(str, stepResults, context)
  }

  // 如果包含多个变量或混合文本，替换为字符串值
  return str.replace(VARIABLE_PATTERN, (match) => {
    const resolved = resolveVariable(match, stepResults, context)
    // 将解析结果转换为字符串
    if (resolved === undefined || resolved === null) {
      return ''
    }
    if (typeof resolved === 'object') {
      return JSON.stringify(resolved)
    }
    return String(resolved)
  })
}

/**
 * 解析单个变量引用
 *
 * @param variable - 变量引用字符串（如 "$1.result.id"）
 * @param stepResults - 已执行步骤的结果映射
 * @param context - 解析上下文
 * @returns 解析后的值，如果找不到则返回 undefined
 */
export function resolveVariable(
  variable: string,
  stepResults: VariableStepResults,
  context: VariableResolverContext
): unknown {
  // 解析变量路径
  const pathMatch = variable.match(/^\$(\d+|prev)\.result(.*)$/)
  if (!pathMatch) {
    console.warn(`[VariableResolver] Invalid variable format: ${variable}`)
    return undefined
  }

  const [, stepRef, path] = pathMatch

  // 确定步骤ID
  let stepId: string
  if (stepRef === 'prev') {
    // $prev 引用上一步
    if (context.stepIdOrder && context.stepIdOrder.length > 0) {
      // 如果有步骤ID列表，找到当前步骤的前一个
      const currentIdx = context.currentStepId
        ? context.stepIdOrder.indexOf(context.currentStepId)
        : context.stepIdOrder.length
      stepId = currentIdx > 0 ? context.stepIdOrder[currentIdx - 1] : context.stepIdOrder[0]
    } else {
      // 否则使用索引减1
      stepId = String(context.currentStepIndex - 1)
    }
  } else {
    stepId = stepRef
  }

  // 获取步骤结果
  const stepResult = stepResults.get(stepId)
  if (!stepResult) {
    console.warn(`[VariableResolver] Step ${stepId} result not found`)
    return undefined
  }

  if (stepResult.status !== 'success') {
    console.warn(`[VariableResolver] Step ${stepId} did not succeed, status: ${stepResult.status}`)
    return undefined
  }

  // 如果没有路径，返回整个结果
  if (!path) {
    return stepResult.result
  }

  // 解析嵌套路径
  return getNestedValue(stepResult.result, path)
}

/**
 * 获取嵌套对象中的值
 *
 * 支持的路径格式：
 * - .field - 对象属性访问
 * - [0] - 数组索引访问
 * - .field[0].nested - 组合路径
 *
 * @param obj - 源对象
 * @param path - 访问路径（如 ".data.items[0].id"）
 * @returns 嵌套值，如果路径无效则返回 undefined
 *
 * @example
 * ```typescript
 * const obj = { data: { items: [{ id: '123' }] } }
 * getNestedValue(obj, '.data.items[0].id') // => '123'
 * ```
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  // 解析路径段：.field 或 [index]
  const segments = path.match(/\.([a-zA-Z_][\w]*)|\[(\d+)\]/g)
  if (!segments) {
    return obj
  }

  let current: unknown = obj
  for (const segment of segments) {
    // 检查当前值是否可以继续访问
    if (current === null || current === undefined) {
      return undefined
    }

    if (segment.startsWith('.')) {
      // 对象属性访问
      const key = segment.slice(1)
      if (typeof current !== 'object') {
        console.warn(`[VariableResolver] Cannot access property "${key}" on non-object`)
        return undefined
      }
      current = (current as Record<string, unknown>)[key]
    } else if (segment.startsWith('[')) {
      // 数组索引访问
      const index = parseInt(segment.slice(1, -1), 10)
      if (!Array.isArray(current)) {
        console.warn(`[VariableResolver] Cannot access index ${index} on non-array`)
        return undefined
      }
      current = current[index]
    }
  }

  return current
}

// ============================================
// 辅助函数
// ============================================

/**
 * 检查值是否包含变量引用
 *
 * @param value - 要检查的值
 * @returns 是否包含变量引用
 */
export function hasVariableReference(value: unknown): boolean {
  if (typeof value === 'string') {
    return VARIABLE_PATTERN.test(value)
  }

  if (Array.isArray(value)) {
    return value.some(hasVariableReference)
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasVariableReference)
  }

  return false
}

/**
 * 提取值中的所有变量引用
 *
 * @param value - 要检查的值
 * @returns 变量引用列表
 */
export function extractVariableReferences(value: unknown): string[] {
  const references: string[] = []

  function extract(v: unknown): void {
    if (typeof v === 'string') {
      const matches = v.match(VARIABLE_PATTERN)
      if (matches) {
        references.push(...matches)
      }
    } else if (Array.isArray(v)) {
      v.forEach(extract)
    } else if (v !== null && typeof v === 'object') {
      Object.values(v).forEach(extract)
    }
  }

  extract(value)
  return [...new Set(references)] // 去重
}

/**
 * 获取变量引用所依赖的步骤ID列表
 *
 * @param value - 包含变量引用的值
 * @returns 依赖的步骤ID列表
 */
export function getReferencedStepIds(value: unknown): string[] {
  const references = extractVariableReferences(value)
  const stepIds: string[] = []

  for (const ref of references) {
    const match = ref.match(/^\$(\d+|prev)\.result/)
    if (match && match[1] !== 'prev') {
      stepIds.push(match[1])
    }
  }

  return [...new Set(stepIds)]
}

/**
 * 创建空的步骤结果存储
 */
export function createStepResults(): VariableStepResults {
  return new Map()
}

/**
 * 添加步骤结果
 *
 * @param stepResults - 步骤结果映射
 * @param stepId - 步骤ID
 * @param result - 执行结果
 * @param status - 执行状态
 */
export function addStepResult(
  stepResults: VariableStepResults,
  stepId: string,
  result: unknown,
  status: 'success' | 'failed'
): void {
  stepResults.set(stepId, { result, status })
}

/**
 * 清除步骤结果存储
 *
 * @param stepResults - 步骤结果映射
 */
export function clearStepResults(stepResults: VariableStepResults): void {
  stepResults.clear()
}

// 类型别名（向后兼容）
export type StepResult = VariableStepResult
export type StepResults = VariableStepResults
