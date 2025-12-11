/**
 * 轻量级模板引擎
 *
 * 支持的语法：
 * - {{var}} 简单变量
 * - {{obj.prop}} 嵌套属性访问
 * - {{#each items}}...{{/each}} 循环
 * - {{#if condition}}...{{else}}...{{/if}} 条件
 * - {{#with obj}}...{{/with}} 上下文切换
 * - {{json var}} 将变量转为 JSON 字符串
 */

export type TemplateContext = Record<string, unknown>

type CompiledTemplate = (context: TemplateContext) => string

// 缓存编译后的模板
const templateCache = new Map<string, CompiledTemplate>()

/**
 * 从对象中获取嵌套属性值
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path) return obj

  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * 检查值是否为真
 */
function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return Boolean(value)
}

/**
 * 处理 helper 函数
 */
function processHelper(
  helperName: string,
  args: string[],
  context: TemplateContext
): string {
  switch (helperName) {
    case 'json':
      const value = getNestedValue(context, args[0])
      return JSON.stringify(value, null, 2)

    case 'eq':
      const val1 = getNestedValue(context, args[0])
      const val2 = args[1]?.startsWith('"')
        ? args[1].slice(1, -1)
        : getNestedValue(context, args[1])
      return String(val1 === val2)

    case 'gt':
      const num1 = Number(getNestedValue(context, args[0]))
      const num2 = Number(args[1])
      return String(num1 > num2)

    case 'lt':
      const n1 = Number(getNestedValue(context, args[0]))
      const n2 = Number(args[1])
      return String(n1 < n2)

    case 'includes':
      const arr = getNestedValue(context, args[0])
      const item = args[1]?.startsWith('"')
        ? args[1].slice(1, -1)
        : getNestedValue(context, args[1])
      return String(Array.isArray(arr) && arr.includes(item))

    case 'length':
      const arrOrStr = getNestedValue(context, args[0])
      if (Array.isArray(arrOrStr) || typeof arrOrStr === 'string') {
        return String(arrOrStr.length)
      }
      return '0'

    default:
      return `{{${helperName} ${args.join(' ')}}}`
  }
}

/**
 * 找到匹配的闭合标签位置（处理嵌套）
 */
function findMatchingClose(
  template: string,
  openTag: string,
  closeTag: string,
  startPos: number
): number {
  let depth = 1
  let pos = startPos

  while (depth > 0 && pos < template.length) {
    const nextOpen = template.indexOf(openTag, pos)
    const nextClose = template.indexOf(closeTag, pos)

    if (nextClose === -1) {
      return -1 // 没有找到闭合标签
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      pos = nextOpen + openTag.length
    } else {
      depth--
      if (depth === 0) {
        return nextClose
      }
      pos = nextClose + closeTag.length
    }
  }

  return -1
}

/**
 * 处理块级标签
 */
function processBlock(
  template: string,
  tagName: string,
  processor: (arg: string, content: string, elseContent?: string) => string
): string {
  const openTagPrefix = `{{#${tagName}`
  const closeTag = `{{/${tagName}}}`
  let result = template

  while (true) {
    const openStart = result.indexOf(openTagPrefix)
    if (openStart === -1) break

    // 找到开标签的结束位置
    const openEnd = result.indexOf('}}', openStart)
    if (openEnd === -1) break

    // 提取参数
    const argStart = openStart + openTagPrefix.length
    const arg = result.slice(argStart, openEnd).trim()

    // 找到匹配的闭合标签
    const contentStart = openEnd + 2
    const closeStart = findMatchingClose(result, openTagPrefix, closeTag, contentStart)
    if (closeStart === -1) break

    // 提取内容
    let content = result.slice(contentStart, closeStart)
    let elseContent: string | undefined

    // 处理 else（仅对 if 块）
    if (tagName === 'if') {
      // 找到顶层的 {{else}}
      let elsePos = -1
      let searchPos = 0
      while (searchPos < content.length) {
        const nextElse = content.indexOf('{{else}}', searchPos)
        if (nextElse === -1) break

        // 检查是否在嵌套块内
        const beforeElse = content.slice(0, nextElse)
        const ifCount = (beforeElse.match(/\{\{#if\s/g) || []).length
        const ifCloseCount = (beforeElse.match(/\{\{\/if\}\}/g) || []).length

        if (ifCount === ifCloseCount) {
          elsePos = nextElse
          break
        }
        searchPos = nextElse + 8
      }

      if (elsePos !== -1) {
        elseContent = content.slice(elsePos + 8)
        content = content.slice(0, elsePos)
      }
    }

    // 调用处理器
    const replacement = processor(arg, content, elseContent)

    // 替换
    result =
      result.slice(0, openStart) + replacement + result.slice(closeStart + closeTag.length)
  }

  return result
}

/**
 * 渲染模板
 */
function renderTemplate(template: string, context: TemplateContext): string {
  let result = template

  // 处理 {{#with ...}}...{{/with}}
  result = processBlock(result, 'with', (path, content) => {
    const newContext = getNestedValue(context, path)
    if (newContext && typeof newContext === 'object') {
      return renderTemplate(content, {
        ...context,
        ...(newContext as Record<string, unknown>),
        '@root': context,
      })
    }
    return ''
  })

  // 处理 {{#each ...}}...{{/each}}
  result = processBlock(result, 'each', (path, content) => {
    const items = getNestedValue(context, path)
    if (!Array.isArray(items)) return ''

    return items
      .map((item, index) => {
        const itemContext: TemplateContext = {
          ...context,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === items.length - 1,
        }
        // 如果 item 是对象，展开到上下文
        if (typeof item === 'object' && item !== null) {
          Object.assign(itemContext, item)
        }
        return renderTemplate(content, itemContext)
      })
      .join('')
  })

  // 处理 {{#if ...}}...{{else}}...{{/if}}
  result = processBlock(result, 'if', (condition, content, elseContent) => {
    const value = getNestedValue(context, condition)
    if (isTruthy(value)) {
      return renderTemplate(content, context)
    }
    return elseContent ? renderTemplate(elseContent, context) : ''
  })

  // 处理 {{#unless ...}}...{{/unless}}
  result = processBlock(result, 'unless', (condition, content) => {
    const value = getNestedValue(context, condition)
    if (!isTruthy(value)) {
      return renderTemplate(content, context)
    }
    return ''
  })

  // 处理 helper: {{helperName arg1 arg2}}
  result = result.replace(
    /\{\{(\w+)\s+([^}]+)\}\}/g,
    (match, helperName, argsStr) => {
      // 检查是否是 helper（不是变量）
      const knownHelpers = ['json', 'eq', 'gt', 'lt', 'includes', 'length']
      if (knownHelpers.includes(helperName)) {
        const args = argsStr.trim().split(/\s+/)
        return processHelper(helperName, args, context)
      }
      return match // 不是已知 helper，保持原样
    }
  )

  // 处理简单变量 {{var}} 和 {{obj.prop}}
  result = result.replace(/\{\{([^#/}][^}]*?)\}\}/g, (_, path) => {
    const trimmedPath = path.trim()

    // 跳过 helper 调用（已处理）
    if (trimmedPath.includes(' ')) {
      return `{{${path}}}`
    }

    const value = getNestedValue(context, trimmedPath)

    if (value === undefined || value === null) {
      return ''
    }

    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return String(value)
  })

  return result
}

/**
 * 编译模板（带缓存）
 */
export function compile(template: string): CompiledTemplate {
  const cached = templateCache.get(template)
  if (cached) {
    return cached
  }

  const compiled: CompiledTemplate = (context: TemplateContext) => {
    return renderTemplate(template, context)
  }

  templateCache.set(template, compiled)
  return compiled
}

/**
 * 直接渲染模板
 */
export function render(template: string, context: TemplateContext): string {
  return compile(template)(context)
}

/**
 * 清除模板缓存
 */
export function clearCache(): void {
  templateCache.clear()
}

/**
 * 从模板中提取变量名
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>()

  // 匹配简单变量 {{var}}
  const simpleVarRegex = /\{\{([^#/}][^}\s]*)\}\}/g
  let match: RegExpExecArray | null

  while ((match = simpleVarRegex.exec(template)) !== null) {
    const varPath = match[1].trim()
    // 获取根变量名
    const rootVar = varPath.split('.')[0]
    // 排除特殊变量
    if (!rootVar.startsWith('@') && rootVar !== 'this') {
      variables.add(rootVar)
    }
  }

  // 匹配块级语法中的变量
  const blockVarRegex = /\{\{#(?:each|if|unless|with)\s+([^}]+)\}\}/g
  while ((match = blockVarRegex.exec(template)) !== null) {
    const varPath = match[1].trim()
    const rootVar = varPath.split('.')[0]
    if (!rootVar.startsWith('@') && rootVar !== 'this') {
      variables.add(rootVar)
    }
  }

  return Array.from(variables)
}

/**
 * 验证模板语法
 */
export function validateTemplate(template: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 检查块级语法是否配对
  const blockTags = ['if', 'each', 'with', 'unless']
  for (const tag of blockTags) {
    const openRegex = new RegExp(`\\{\\{#${tag}`, 'g')
    const closeRegex = new RegExp(`\\{\\{\\/${tag}\\}\\}`, 'g')

    const openCount = (template.match(openRegex) || []).length
    const closeCount = (template.match(closeRegex) || []).length

    if (openCount !== closeCount) {
      errors.push(
        `{{#${tag}}} 和 {{/${tag}}} 不配对：打开 ${openCount} 次，关闭 ${closeCount} 次`
      )
    }
  }

  // 检查 else 是否在 if 块内
  const elseRegex = /\{\{else\}\}/g
  const ifRegex = /\{\{#if\s+[^}]+\}\}/g
  const elseCount = (template.match(elseRegex) || []).length
  const ifCount = (template.match(ifRegex) || []).length

  if (elseCount > ifCount) {
    errors.push('{{else}} 必须在 {{#if}} 块内使用')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// 导出 TemplateEngine 类（兼容面向对象使用）
export class TemplateEngine {
  private cache = new Map<string, CompiledTemplate>()

  compile(template: string): CompiledTemplate {
    const cached = this.cache.get(template)
    if (cached) {
      return cached
    }

    const compiled: CompiledTemplate = (context: TemplateContext) => {
      return renderTemplate(template, context)
    }

    this.cache.set(template, compiled)
    return compiled
  }

  render(template: string, context: TemplateContext): string {
    return this.compile(template)(context)
  }

  extractVariables(template: string): string[] {
    return extractVariables(template)
  }

  validate(template: string): { valid: boolean; errors: string[] } {
    return validateTemplate(template)
  }

  clearCache(): void {
    this.cache.clear()
  }
}
