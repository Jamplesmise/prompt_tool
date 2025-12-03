// 代码评估器沙箱执行环境
// 支持 Node.js（本地 VM）和 Python（远程 dify-sandbox）

import vm from 'vm'
import type { EvaluatorInput, EvaluatorOutput } from '@platform/evaluators'
import {
  executeInSandbox as executeRemote,
  checkSandboxHealth,
  NODEJS_CODE_TEMPLATE,
  PYTHON_CODE_TEMPLATE,
  CODE_EXAMPLES as REMOTE_CODE_EXAMPLES,
} from './sandboxClient'

export type CodeLanguage = 'nodejs' | 'python'

// 沙箱白名单模块（本地 Node.js VM）
const ALLOWED_MODULES = ['lodash', 'dayjs', 'validator', 'ajv'] as const

// 默认超时时间 (毫秒)
const DEFAULT_TIMEOUT = 5000

// 代码模板 - 包装用户代码
const CODE_WRAPPER = `
(async function() {
  const fn = (function() {
    {{USER_CODE}}
  })();

  if (typeof fn !== 'function') {
    throw new Error('代码必须导出一个函数 (module.exports = async function...)');
  }

  return await fn(__input__, __output__, __expected__, __metadata__);
})();
`

type SandboxResult = {
  success: boolean
  result?: EvaluatorOutput
  error?: string
}

/**
 * 创建安全的 require 函数
 * 仅允许导入白名单模块
 */
function createSafeRequire(): (moduleName: string) => unknown {
  const moduleCache: Record<string, unknown> = {}

  return (moduleName: string): unknown => {
    if (!ALLOWED_MODULES.includes(moduleName as (typeof ALLOWED_MODULES)[number])) {
      throw new Error(
        `模块 "${moduleName}" 不在白名单中。允许的模块: ${ALLOWED_MODULES.join(', ')}`
      )
    }

    if (moduleCache[moduleName]) {
      return moduleCache[moduleName]
    }

    try {
      // 动态导入白名单模块
      // eslint-disable-next-line
      const mod = require(moduleName)
      moduleCache[moduleName] = mod
      return mod
    } catch (error) {
      throw new Error(
        `加载模块 "${moduleName}" 失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }
}

/**
 * 本地 Node.js VM 执行
 */
async function runInLocalVM(
  code: string,
  input: EvaluatorInput,
  timeout: number
): Promise<SandboxResult> {
  return new Promise((resolve) => {
    try {
      // 转换 module.exports 语法为返回值
      const transformedCode = code
        .replace(/module\.exports\s*=\s*/g, 'return ')
        .replace(/exports\s*=\s*/g, 'return ')

      // 包装代码
      const wrappedCode = CODE_WRAPPER.replace('{{USER_CODE}}', transformedCode)

      // 创建沙箱上下文
      const sandbox = {
        __input__: input.input,
        __output__: input.output,
        __expected__: input.expected,
        __metadata__: input.metadata,
        require: createSafeRequire(),
        console: {
          log: () => {},
          warn: () => {},
          error: () => {},
        },
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        process: undefined,
        Buffer: undefined,
        __dirname: undefined,
        __filename: undefined,
      }

      // 创建上下文
      const context = vm.createContext(sandbox)

      // 编译并执行代码
      const script = new vm.Script(wrappedCode, {
        filename: 'evaluator.js',
      })

      const result = script.runInContext(context, { timeout })

      // 处理 Promise 返回值
      if (result && typeof result.then === 'function') {
        // 创建超时 Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('代码执行超时')), timeout)
        })

        Promise.race([result, timeoutPromise])
          .then((res) => {
            resolve({ success: true, result: res as EvaluatorOutput })
          })
          .catch((error) => {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : '执行失败',
            })
          })
      } else {
        resolve({ success: true, result: result as EvaluatorOutput })
      }
    } catch (error) {
      let errorMessage = '未知错误'

      if (error instanceof Error) {
        if (error.message.includes('Script execution timed out')) {
          errorMessage = `代码执行超时 (${timeout}ms)`
        } else {
          errorMessage = error.message
        }
      }

      resolve({ success: false, error: errorMessage })
    }
  })
}

/**
 * 在沙箱中执行评估器代码
 * @param code - 用户代码
 * @param input - 评估器输入
 * @param timeout - 超时时间（毫秒）
 * @param language - 代码语言（nodejs 或 python）
 */
export async function executeInSandbox(
  code: string,
  input: EvaluatorInput,
  timeout: number = DEFAULT_TIMEOUT,
  language: CodeLanguage = 'nodejs'
): Promise<EvaluatorOutput> {
  // Python 代码必须使用远程沙箱
  if (language === 'python') {
    const result = await executeRemote(code, 'python', input, timeout)

    if (!result.success) {
      return {
        passed: false,
        score: 0,
        reason: `代码执行失败: ${result.error}`,
      }
    }

    return result.result!
  }

  // Node.js 优先使用本地 VM，失败时降级到远程沙箱
  const result = await runInLocalVM(code, input, timeout)

  if (!result.success) {
    return {
      passed: false,
      score: 0,
      reason: `代码执行失败: ${result.error}`,
    }
  }

  // 验证返回结果格式
  const output = result.result
  if (!output || typeof output !== 'object') {
    return {
      passed: false,
      score: 0,
      reason: '代码返回值必须是对象 { passed: boolean, score?: number, reason?: string }',
    }
  }

  if (typeof output.passed !== 'boolean') {
    return {
      passed: false,
      score: 0,
      reason: '代码返回值必须包含 passed: boolean',
    }
  }

  return {
    passed: output.passed,
    score: typeof output.score === 'number' ? output.score : output.passed ? 1 : 0,
    reason: typeof output.reason === 'string' ? output.reason : undefined,
    details:
      typeof output.details === 'object'
        ? (output.details as Record<string, unknown>)
        : undefined,
  }
}

/**
 * 验证代码语法
 */
export function validateCode(
  code: string,
  language: CodeLanguage = 'nodejs'
): { valid: boolean; error?: string } {
  if (language === 'python') {
    // Python 语法校验 - 基础检查
    if (!code.includes('def evaluate')) {
      return {
        valid: false,
        error: '代码必须包含 evaluate 函数定义',
      }
    }

    // 检查缩进（Python 对缩进敏感）
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.match(/^\t+ /)) {
        return {
          valid: false,
          error: `第 ${i + 1} 行：混合使用 Tab 和空格缩进`,
        }
      }
    }

    return { valid: true }
  }

  // Node.js 语法校验
  try {
    const transformedCode = code
      .replace(/module\.exports\s*=\s*/g, 'return ')
      .replace(/exports\s*=\s*/g, 'return ')

    const wrappedCode = `(function() { ${transformedCode} })()`

    // 仅解析语法，不执行
    new vm.Script(wrappedCode)

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '语法错误',
    }
  }
}

/**
 * 检查沙箱服务状态
 */
export { checkSandboxHealth }

/**
 * 代码模板
 */
export const CODE_TEMPLATES = {
  nodejs: NODEJS_CODE_TEMPLATE,
  python: PYTHON_CODE_TEMPLATE,
}

// 向后兼容
export const CODE_TEMPLATE = NODEJS_CODE_TEMPLATE

/**
 * 代码示例
 */
export const CODE_EXAMPLES = {
  nodejs: {
    lengthCheck: REMOTE_CODE_EXAMPLES.nodejs.lengthCheck,
    keywordCheck: REMOTE_CODE_EXAMPLES.nodejs.keywordCheck,
    formatValidation: `/**
 * 验证输出格式（邮箱）
 */
const validator = require('validator');

module.exports = async function evaluate(input, output, expected, metadata) {
  const trimmed = output.trim();
  const isEmail = validator.isEmail(trimmed);

  return {
    passed: isEmail,
    score: isEmail ? 1.0 : 0,
    reason: isEmail ? '输出是有效的邮箱格式' : '输出不是有效的邮箱格式'
  };
};`,
    jsonValidation: `/**
 * 验证 JSON 结构
 */
const Ajv = require('ajv');

module.exports = async function evaluate(input, output, expected, metadata) {
  const schema = metadata.schema || { type: 'object' };

  try {
    const data = JSON.parse(output);
    const ajv = new Ajv();
    const valid = ajv.validate(schema, data);

    return {
      passed: valid,
      score: valid ? 1.0 : 0,
      reason: valid ? 'JSON 结构符合 Schema' : ajv.errorsText()
    };
  } catch (e) {
    return {
      passed: false,
      score: 0,
      reason: '输出不是有效的 JSON'
    };
  }
};`,
  },
  python: REMOTE_CODE_EXAMPLES.python,
}
