/**
 * 测试失败端点的详细错误信息
 */

const API_BASE = 'http://localhost:3000/api/v1'
let authCookie = ''

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`)
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (authCookie) headers['Cookie'] = authCookie

  const options = { method, headers }
  if (body) options.body = JSON.stringify(body)

  try {
    const response = await fetch(`${API_BASE}${path}`, options)
    if (response.headers.get('set-cookie')) {
      authCookie = response.headers.get('set-cookie')
    }
    const data = await response.json()
    return { status: response.status, data, ok: response.ok }
  } catch (error) {
    return { status: 0, error: error.message, ok: false }
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  log('cyan', '🔍', '详细测试失败的 API 端点')
  console.log('='.repeat(70))

  // 登录
  log('blue', '🔐', '步骤 1: 登录')
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin123',
  })

  if (!loginRes.ok) {
    log('red', '❌', '登录失败')
    return
  }
  log('green', '✅', '登录成功\n')

  // 获取测试数据 ID
  log('blue', 'ℹ️', '步骤 2: 获取测试数据')

  const promptsRes = await request('GET', '/prompts')
  const promptId = promptsRes.data?.data?.list?.[0]?.id
  log('cyan', '  →', `提示词 ID: ${promptId}`)

  const providersRes = await request('GET', '/providers')
  const providerId = providersRes.data?.data?.list?.[0]?.id
  log('cyan', '  →', `Provider ID: ${providerId}\n`)

  // 测试 1: POST /prompts/:id/test
  console.log('='.repeat(70))
  log('yellow', '🧪', '测试 1: POST /prompts/:id/test')
  console.log('='.repeat(70))

  if (promptId) {
    const testData = {
      modelId: 'test-model',
      variables: { name: '张三', date: '2025-12-04' },
    }
    log('blue', '📤', `请求体: ${JSON.stringify(testData, null, 2)}`)

    const res1 = await request('POST', `/prompts/${promptId}/test`, testData)
    log('cyan', '📥', `状态码: ${res1.status}`)
    log('cyan', '📥', `响应体: ${JSON.stringify(res1.data, null, 2)}`)

    if (res1.ok) {
      log('green', '✅', '测试通过')
    } else {
      log('red', '❌', `测试失败: ${res1.data?.message || res1.error}`)
    }
  } else {
    log('red', '⚠️', '无法获取提示词 ID')
  }

  // 测试 2: POST /prompts/:id/branches
  console.log('\n' + '='.repeat(70))
  log('yellow', '🧪', '测试 2: POST /prompts/:id/branches')
  console.log('='.repeat(70))

  if (promptId) {
    // 首先获取提示词的版本
    const versionsRes = await request('GET', `/prompts/${promptId}/versions`)
    const sourceVersionId = versionsRes.data?.data?.list?.[0]?.id
    log('cyan', '  →', `源版本 ID: ${sourceVersionId}`)

    if (!sourceVersionId) {
      log('red', '⚠️', '无法获取源版本 ID，跳过分支创建测试')
    } else {
      const branchData = {
        name: 'experiment-branch-' + Date.now(),
        description: '实验分支',
        sourceVersionId: sourceVersionId,
      }
      log('blue', '📤', `请求体: ${JSON.stringify(branchData, null, 2)}`)

      const res2 = await request('POST', `/prompts/${promptId}/branches`, branchData)
      log('cyan', '📥', `状态码: ${res2.status}`)
      log('cyan', '📥', `响应体: ${JSON.stringify(res2.data, null, 2)}`)

      if (res2.ok) {
        log('green', '✅', '测试通过')
      } else {
        log('red', '❌', `测试失败: ${res2.data?.message || res2.error}`)
      }
    }
  } else {
    log('red', '⚠️', '无法获取提示词 ID')
  }

  // 测试 3: POST /prompts/batch
  console.log('\n' + '='.repeat(70))
  log('yellow', '🧪', '测试 3: POST /prompts/batch')
  console.log('='.repeat(70))

  const batchData = {
    prompts: [
      {
        name: '批量提示词1',
        content: '这是批量创建的提示词1',
        description: '批量测试1',
      },
      {
        name: '批量提示词2',
        content: '这是批量创建的提示词2',
        description: '批量测试2',
      },
    ],
  }
  log('blue', '📤', `请求体: ${JSON.stringify(batchData, null, 2)}`)

  const res3 = await request('POST', '/prompts/batch', batchData)
  log('cyan', '📥', `状态码: ${res3.status}`)
  log('cyan', '📥', `响应体: ${JSON.stringify(res3.data, null, 2)}`)

  if (res3.ok) {
    log('green', '✅', '测试通过')
  } else {
    log('red', '❌', `测试失败: ${res3.data?.message || res3.error}`)
  }

  // 测试 4: GET /providers/:id/models
  console.log('\n' + '='.repeat(70))
  log('yellow', '🧪', '测试 4: GET /providers/:id/models')
  console.log('='.repeat(70))

  if (providerId) {
    log('blue', '📤', `请求路径: /providers/${providerId}/models`)

    const res4 = await request('GET', `/providers/${providerId}/models`)
    log('cyan', '📥', `状态码: ${res4.status}`)
    log('cyan', '📥', `响应体: ${JSON.stringify(res4.data, null, 2)}`)

    if (res4.ok) {
      log('green', '✅', '测试通过')
    } else {
      log('red', '❌', `测试失败: ${res4.data?.message || res4.error}`)
    }
  } else {
    log('red', '⚠️', '无法获取 Provider ID')
  }

  console.log('\n' + '='.repeat(70))
  log('cyan', '📊', '测试完成')
  console.log('='.repeat(70) + '\n')
}

main()
