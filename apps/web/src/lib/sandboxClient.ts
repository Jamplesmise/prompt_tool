// Dify-Sandbox 客户端
// 通过 HTTP API 调用远程沙箱服务执行代码

type SandboxLanguage = 'python3' | 'nodejs'

type SandboxRequest = {
  language: SandboxLanguage
  code: string
  preload?: string
  enable_network?: boolean
}

type SandboxResponse = {
  code: number
  message: string
  data: {
    stdout: string
    error: string
  } | null
}

type EvaluatorInput = {
  input: string
  output: string
  expected: string | null
  metadata: Record<string, unknown>
}

type EvaluatorResult = {
  passed: boolean
  score?: number
  reason?: string
  details?: Record<string, unknown>
}

type SandboxExecuteResult = {
  success: boolean
  result?: EvaluatorResult
  error?: string
  executionTime: number
}

// 环境变量
const SANDBOX_URL = process.env.SANDBOX_URL || 'http://localhost:8194'
const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY || 'dify-sandbox'
const DEFAULT_TIMEOUT = 10000 // 10 秒

// Node.js 代码包装模板
const NODEJS_WRAPPER = `
const __input = {{INPUT}};
const __output = {{OUTPUT}};
const __expected = {{EXPECTED}};
const __metadata = {{METADATA}};

async function __run() {
  {{USER_CODE}}
}

(async () => {
  try {
    const fn = await __run();
    if (typeof fn !== 'function') {
      console.log(JSON.stringify({ passed: false, reason: '代码必须返回一个函数' }));
      return;
    }
    const result = await fn(__input, __output, __expected, __metadata);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({ passed: false, reason: e.message || '执行错误' }));
  }
})();
`

// Python 代码包装模板
const PYTHON_WRAPPER = `
import json

__input = {{INPUT}}
__output = {{OUTPUT}}
__expected = {{EXPECTED}}
__metadata = {{METADATA}}

{{USER_CODE}}

try:
    result = evaluate(__input, __output, __expected, __metadata)
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"passed": False, "reason": str(e)}, ensure_ascii=False))
`

/**
 * 包装用户代码
 */
function wrapCode(
  code: string,
  language: SandboxLanguage,
  input: EvaluatorInput
): string {
  const inputJson = JSON.stringify(input.input)
  const outputJson = JSON.stringify(input.output)
  const expectedJson = JSON.stringify(input.expected)
  const metadataJson = JSON.stringify(input.metadata)

  if (language === 'nodejs') {
    // 转换 module.exports 语法
    const transformedCode = code
      .replace(/module\.exports\s*=\s*/g, 'return ')
      .replace(/exports\s*=\s*/g, 'return ')

    return NODEJS_WRAPPER
      .replace('{{INPUT}}', inputJson)
      .replace('{{OUTPUT}}', outputJson)
      .replace('{{EXPECTED}}', expectedJson)
      .replace('{{METADATA}}', metadataJson)
      .replace('{{USER_CODE}}', transformedCode)
  }

  // Python
  return PYTHON_WRAPPER
    .replace('{{INPUT}}', inputJson)
    .replace('{{OUTPUT}}', outputJson)
    .replace('{{EXPECTED}}', expectedJson)
    .replace('{{METADATA}}', metadataJson)
    .replace('{{USER_CODE}}', code)
}

/**
 * 解析沙箱输出
 */
function parseOutput(stdout: string): EvaluatorResult {
  const trimmed = stdout.trim()

  if (!trimmed) {
    return {
      passed: false,
      score: 0,
      reason: '代码没有输出结果',
    }
  }

  // 取最后一行作为结果（防止用户代码有额外打印）
  const lines = trimmed.split('\n')
  const lastLine = lines[lines.length - 1]

  try {
    const result = JSON.parse(lastLine)

    if (typeof result !== 'object' || result === null) {
      return {
        passed: false,
        score: 0,
        reason: '返回值必须是对象',
      }
    }

    if (typeof result.passed !== 'boolean') {
      return {
        passed: false,
        score: 0,
        reason: '返回值必须包含 passed: boolean',
      }
    }

    return {
      passed: result.passed,
      score: typeof result.score === 'number' ? result.score : (result.passed ? 1 : 0),
      reason: typeof result.reason === 'string' ? result.reason : undefined,
      details: typeof result.details === 'object' ? result.details : undefined,
    }
  } catch {
    return {
      passed: false,
      score: 0,
      reason: `无法解析返回结果: ${lastLine.slice(0, 100)}`,
    }
  }
}

/**
 * 调用沙箱服务执行代码
 */
export async function executeInSandbox(
  code: string,
  language: 'nodejs' | 'python',
  input: EvaluatorInput,
  timeout: number = DEFAULT_TIMEOUT
): Promise<SandboxExecuteResult> {
  const startTime = Date.now()

  // 转换语言标识
  const sandboxLanguage: SandboxLanguage = language === 'python' ? 'python3' : 'nodejs'

  // 包装代码
  const wrappedCode = wrapCode(code, sandboxLanguage, input)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${SANDBOX_URL}/v1/sandbox/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': SANDBOX_API_KEY,
      },
      body: JSON.stringify({
        language: sandboxLanguage,
        code: wrappedCode,
        enable_network: false,
      } satisfies SandboxRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const executionTime = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        error: `沙箱服务错误: HTTP ${response.status}`,
        executionTime,
      }
    }

    const data: SandboxResponse = await response.json()

    // 检查沙箱返回码
    if (data.code !== 0) {
      return {
        success: false,
        error: data.message || '沙箱执行失败',
        executionTime,
      }
    }

    // 检查是否有错误输出
    if (data.data?.error) {
      return {
        success: false,
        error: data.data.error,
        executionTime,
      }
    }

    // 解析标准输出
    const result = parseOutput(data.data?.stdout || '')

    return {
      success: true,
      result,
      executionTime,
    }
  } catch (error) {
    const executionTime = Date.now() - startTime

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `执行超时 (${timeout}ms)`,
          executionTime,
        }
      }

      return {
        success: false,
        error: error.message,
        executionTime,
      }
    }

    return {
      success: false,
      error: '未知错误',
      executionTime,
    }
  }
}

/**
 * 检查沙箱服务健康状态
 */
export async function checkSandboxHealth(): Promise<{
  available: boolean
  error?: string
}> {
  try {
    const response = await fetch(`${SANDBOX_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      return { available: true }
    }

    return {
      available: false,
      error: `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : '连接失败',
    }
  }
}

/**
 * 代码模板 - Node.js
 */
export const NODEJS_CODE_TEMPLATE = `/**
 * 评估函数
 * @param {string} input - 原始输入
 * @param {string} output - 模型输出
 * @param {string|null} expected - 期望输出
 * @param {object} metadata - 额外元数据
 * @returns {Promise<{passed: boolean, score?: number, reason?: string}>}
 */
module.exports = async function evaluate(input, output, expected, metadata) {
  // 在此编写评估逻辑

  return {
    passed: true,
    score: 1.0,
    reason: '评估通过'
  };
};`

/**
 * 代码模板 - Python
 */
export const PYTHON_CODE_TEMPLATE = `def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """
    评估函数

    Args:
        input: 原始输入
        output: 模型输出
        expected: 期望输出
        metadata: 额外元数据

    Returns:
        {"passed": bool, "score": float | None, "reason": str | None}
    """
    # 在此编写评估逻辑
    # 可用模块: json, re, math, collections, difflib

    return {
        "passed": True,
        "score": 1.0,
        "reason": "评估通过"
    }`

/**
 * 代码示例
 */
export const CODE_EXAMPLES = {
  nodejs: {
    lengthCheck: `/**
 * 检查输出长度
 */
module.exports = async function evaluate(input, output, expected, metadata) {
  const minLength = metadata.minLength || 100;

  if (output.length < minLength) {
    return {
      passed: false,
      score: output.length / minLength,
      reason: \`输出长度 \${output.length} 小于要求的 \${minLength}\`
    };
  }

  return { passed: true, score: 1.0, reason: '长度符合要求' };
};`,

    keywordCheck: `/**
 * 检查关键词覆盖
 */
module.exports = async function evaluate(input, output, expected, metadata) {
  const keywords = metadata.keywords || [];
  const foundKeywords = keywords.filter(kw => output.includes(kw));
  const coverage = keywords.length > 0 ? foundKeywords.length / keywords.length : 1;

  return {
    passed: coverage >= 0.8,
    score: coverage,
    reason: \`包含关键词 \${foundKeywords.length}/\${keywords.length}\`,
    details: { foundKeywords }
  };
};`,
  },

  python: {
    lengthCheck: `def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """检查输出长度"""
    min_length = metadata.get("minLength", 100)

    if len(output) < min_length:
        return {
            "passed": False,
            "score": len(output) / min_length,
            "reason": f"输出长度 {len(output)} 小于要求的 {min_length}"
        }

    return {"passed": True, "score": 1.0, "reason": "长度符合要求"}`,

    keywordCheck: `def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """检查关键词覆盖"""
    keywords = metadata.get("keywords", [])
    found = [kw for kw in keywords if kw in output]
    coverage = len(found) / len(keywords) if keywords else 1.0

    return {
        "passed": coverage >= 0.8,
        "score": coverage,
        "reason": f"包含关键词 {len(found)}/{len(keywords)}",
        "details": {"foundKeywords": found}
    }`,

    similarityCheck: `import difflib

def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """相似度检查"""
    if expected is None:
        return {"passed": False, "reason": "缺少期望输出"}

    threshold = metadata.get("threshold", 0.8)
    ratio = difflib.SequenceMatcher(None, output, expected).ratio()

    return {
        "passed": ratio >= threshold,
        "score": ratio,
        "reason": f"相似度 {ratio:.2%}"
    }`,

    jsonValidation: `import json
import re

def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """验证 JSON 格式"""
    try:
        data = json.loads(output)

        # 检查必需字段
        required_fields = metadata.get("requiredFields", [])
        missing = [f for f in required_fields if f not in data]

        if missing:
            return {
                "passed": False,
                "score": 1 - len(missing) / len(required_fields),
                "reason": f"缺少字段: {', '.join(missing)}"
            }

        return {"passed": True, "score": 1.0, "reason": "JSON 格式正确"}

    except json.JSONDecodeError as e:
        return {"passed": False, "score": 0, "reason": f"JSON 解析失败: {e}"}`,
  },
}
