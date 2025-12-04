/**
 * API 接口集成测试
 */

const API_BASE = 'http://localhost:3000/api/v1'
let authCookie = ''

// 颜色输出
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

async function request(method, path, body = null, needAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (needAuth && authCookie) {
    headers['Cookie'] = authCookie
  }

  const options = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, options)

  // 保存认证 cookie
  if (response.headers.get('set-cookie')) {
    authCookie = response.headers.get('set-cookie')
  }

  const data = await response.json()
  return { status: response.status, data }
}

// 1. 认证模块测试
async function testAuth() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '1. 用户认证模块测试')
  console.log('='.repeat(50))

  try {
    // 登录测试
    log('blue', '🔍', '测试登录...')
    const loginRes = await request('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    })

    if (loginRes.data.code === 200) {
      log('green', '✅', '登录成功')
      log('green', '  ', `用户: ${loginRes.data.data.user.name}`)
    } else {
      log('red', '❌', `登录失败: ${loginRes.data.message}`)
      return false
    }

    // 获取当前用户
    log('blue', '🔍', '测试获取当前用户信息...')
    const meRes = await request('GET', '/auth/me', null, true)

    if (meRes.data.code === 200) {
      log('green', '✅', '获取用户信息成功')
      log('green', '  ', `角色: ${meRes.data.data.role}`)
    } else {
      log('red', '❌', `获取用户信息失败: ${meRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `认证测试失败: ${error.message}`)
    return false
  }
}

// 2. 提示词模块测试
async function testPrompts() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '2. 提示词模块测试')
  console.log('='.repeat(50))

  try {
    // 获取提示词列表
    log('blue', '🔍', '测试获取提示词列表...')
    const listRes = await request('GET', '/prompts?page=1&pageSize=10', null, true)

    if (listRes.data.code === 200) {
      log('green', '✅', `获取提示词列表成功 (共 ${listRes.data.data.total} 条)`)
      if (listRes.data.data.list.length > 0) {
        const prompt = listRes.data.data.list[0]
        log('green', '  ', `示例: ${prompt.name}`)

        // 测试获取单个提示词
        log('blue', '🔍', '测试获取单个提示词详情...')
        const detailRes = await request('GET', `/prompts/${prompt.id}`, null, true)
        if (detailRes.data.code === 200) {
          log('green', '✅', '获取提示词详情成功')
        }
      }
    } else {
      log('red', '❌', `获取提示词列表失败: ${listRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `提示词测试失败: ${error.message}`)
    return false
  }
}

// 3. 数据集模块测试
async function testDatasets() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '3. 数据集模块测试')
  console.log('='.repeat(50))

  try {
    // 获取数据集列表
    log('blue', '🔍', '测试获取数据集列表...')
    const listRes = await request('GET', '/datasets?page=1&pageSize=10', null, true)

    if (listRes.data.code === 200) {
      log('green', '✅', `获取数据集列表成功 (共 ${listRes.data.data.total} 条)`)
      if (listRes.data.data.list.length > 0) {
        const dataset = listRes.data.data.list[0]
        log('green', '  ', `示例: ${dataset.name} (${dataset.rowCount} 行)`)
      }
    } else {
      log('red', '❌', `获取数据集列表失败: ${listRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `数据集测试失败: ${error.message}`)
    return false
  }
}

// 4. 模型配置测试
async function testModels() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '4. 模型配置模块测试')
  console.log('='.repeat(50))

  try {
    // 获取模型供应商
    log('blue', '🔍', '测试获取模型供应商...')
    const providersRes = await request('GET', '/providers', null, true)

    if (providersRes.data.code === 200) {
      log('green', '✅', `获取供应商成功 (共 ${providersRes.data.data.total} 个)`)
    }

    // 获取模型列表
    log('blue', '🔍', '测试获取模型列表...')
    const modelsRes = await request('GET', '/models', null, true)

    if (modelsRes.data.code === 200) {
      log('green', '✅', `获取模型列表成功 (共 ${modelsRes.data.data.total} 个)`)
      if (modelsRes.data.data.list.length > 0) {
        const model = modelsRes.data.data.list[0]
        log('green', '  ', `示例: ${model.name}`)
      }
    } else {
      log('red', '❌', `获取模型列表失败: ${modelsRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `模型配置测试失败: ${error.message}`)
    return false
  }
}

// 5. 评估器测试
async function testEvaluators() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '5. 评估器模块测试')
  console.log('='.repeat(50))

  try {
    // 获取预置评估器
    log('blue', '🔍', '测试获取预置评估器...')
    const presetsRes = await request('GET', '/evaluators/presets', null, true)

    if (presetsRes.data.code === 200) {
      log('green', '✅', `获取预置评估器成功 (共 ${presetsRes.data.data.length} 个)`)
      presetsRes.data.data.forEach(preset => {
        log('green', '  ', `- ${preset.name}: ${preset.description}`)
      })
    }

    // 获取自定义评估器列表
    log('blue', '🔍', '测试获取自定义评估器列表...')
    const listRes = await request('GET', '/evaluators?page=1&pageSize=10', null, true)

    if (listRes.data.code === 200) {
      log('green', '✅', `获取评估器列表成功 (共 ${listRes.data.data.total} 条)`)
    }

    return true
  } catch (error) {
    log('red', '❌', `评估器测试失败: ${error.message}`)
    return false
  }
}

// 6. 任务模块测试
async function testTasks() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '6. 任务模块测试')
  console.log('='.repeat(50))

  try {
    // 获取任务列表
    log('blue', '🔍', '测试获取任务列表...')
    const listRes = await request('GET', '/tasks?page=1&pageSize=10', null, true)

    if (listRes.data.code === 200) {
      log('green', '✅', `获取任务列表成功 (共 ${listRes.data.data.total} 条)`)
      if (listRes.data.data.list.length > 0) {
        const task = listRes.data.data.list[0]
        log('green', '  ', `示例: ${task.name} [${task.status}]`)
      }
    } else {
      log('red', '❌', `获取任务列表失败: ${listRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `任务测试失败: ${error.message}`)
    return false
  }
}

// 7. 统计数据测试
async function testStats() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '📋', '7. 统计数据模块测试')
  console.log('='.repeat(50))

  try {
    // 获取概览统计
    log('blue', '🔍', '测试获取概览统计...')
    const overviewRes = await request('GET', '/stats/overview', null, true)

    if (overviewRes.data.code === 200) {
      log('green', '✅', '获取概览统计成功')
      const stats = overviewRes.data.data
      log('green', '  ', `提示词: ${stats.promptCount}`)
      log('green', '  ', `数据集: ${stats.datasetCount}`)
      log('green', '  ', `任务: ${stats.taskCount}`)
      log('green', '  ', `评估器: ${stats.evaluatorCount}`)
    } else {
      log('red', '❌', `获取统计失败: ${overviewRes.data.message}`)
      return false
    }

    return true
  } catch (error) {
    log('red', '❌', `统计数据测试失败: ${error.message}`)
    return false
  }
}

// 主函数
async function main() {
  console.log('\n' + '='.repeat(50))
  log('cyan', '🚀', 'AI 模型测试平台 - API 集成测试')
  console.log('='.repeat(50))

  const results = {
    '用户认证': await testAuth(),
    '提示词管理': await testPrompts(),
    '数据集管理': await testDatasets(),
    '模型配置': await testModels(),
    '评估器': await testEvaluators(),
    '任务管理': await testTasks(),
    '统计数据': await testStats(),
  }

  // 输出汇总
  console.log('\n' + '='.repeat(50))
  log('cyan', '📊', '测试结果汇总')
  console.log('='.repeat(50))

  let passCount = 0
  let totalCount = 0

  for (const [module, passed] of Object.entries(results)) {
    totalCount++
    if (passed) {
      passCount++
      log('green', '✅', `${module}: 通过`)
    } else {
      log('red', '❌', `${module}: 失败`)
    }
  }

  console.log('='.repeat(50))
  log('cyan', '📈', `通过率: ${passCount}/${totalCount} (${Math.round(passCount / totalCount * 100)}%)`)
  console.log('='.repeat(50) + '\n')

  process.exit(passCount === totalCount ? 0 : 1)
}

main()
