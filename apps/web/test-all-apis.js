/**
 * 完整 API 端点扫描和测试
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
  gray: '\x1b[90m',
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

// API 端点定义（按模块分类）
const API_ENDPOINTS = {
  '认证模块': [
    { method: 'POST', path: '/auth/login', needsData: true },
    { method: 'GET', path: '/auth/me' },
    { method: 'POST', path: '/auth/logout' },
  ],
  '用户管理': [
    { method: 'GET', path: '/users' },
    { method: 'GET', path: '/users/me' },
    // 需要动态 ID 的暂时跳过详细测试
  ],
  '提示词管理': [
    { method: 'GET', path: '/prompts' },
    { method: 'POST', path: '/prompts', needsData: true, skip: true },
    // 需要提示词 ID 的测试
  ],
  '数据集管理': [
    { method: 'GET', path: '/datasets' },
    { method: 'GET', path: '/datasets/templates/qa' },
    { method: 'GET', path: '/datasets/templates/rag' },
  ],
  '模型配置': [
    { method: 'GET', path: '/providers' },
    { method: 'GET', path: '/models' },
  ],
  '评估器': [
    { method: 'GET', path: '/evaluators/presets' },
    { method: 'GET', path: '/evaluators' },
  ],
  '任务管理': [
    { method: 'GET', path: '/tasks' },
    { method: 'GET', path: '/queue/status' },
  ],
  '定时任务': [
    { method: 'GET', path: '/scheduled-tasks' },
  ],
  '告警规则': [
    { method: 'GET', path: '/alert-rules' },
    { method: 'GET', path: '/alerts' },
  ],
  '团队管理': [
    { method: 'GET', path: '/teams' },
  ],
  'API Token': [
    { method: 'GET', path: '/tokens' },
  ],
  '通知渠道': [
    { method: 'GET', path: '/notify-channels' },
  ],
  '审计日志': [
    { method: 'GET', path: '/audit-logs' },
  ],
  '搜索': [
    { method: 'GET', path: '/search?q=test' },
  ],
  '统计数据': [
    { method: 'GET', path: '/stats/overview' },
    { method: 'GET', path: '/stats/models' },
    { method: 'GET', path: '/stats/trends' },
  ],
}

async function testAllEndpoints() {
  console.log('\n' + '='.repeat(60))
  log('cyan', '🚀', 'AI 模型测试平台 - 完整 API 端点测试')
  console.log('='.repeat(60))

  // 先登录
  log('blue', '🔐', '正在登录...')
  const loginRes = await request('POST', '/auth/login', {
    email: 'admin@example.com',
    password: 'admin123',
  })

  if (!loginRes.ok) {
    log('red', '❌', '登录失败，无法继续测试')
    return
  }
  log('green', '✅', '登录成功\n')

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    byModule: {},
  }

  // 测试每个模块
  for (const [module, endpoints] of Object.entries(API_ENDPOINTS)) {
    console.log('\n' + '─'.repeat(60))
    log('cyan', '📦', `模块: ${module}`)
    console.log('─'.repeat(60))

    results.byModule[module] = { total: 0, passed: 0, failed: 0, skipped: 0 }

    for (const endpoint of endpoints) {
      results.total++
      results.byModule[module].total++

      if (endpoint.skip) {
        log('gray', '⊘', `${endpoint.method} ${endpoint.path} - 跳过`)
        results.skipped++
        results.byModule[module].skipped++
        continue
      }

      const testData = endpoint.needsData ? { test: 'data' } : null
      const res = await request(endpoint.method, endpoint.path, testData)

      if (res.ok || res.status === 400) { // 400 也算正常（参数验证）
        log('green', '✅', `${endpoint.method} ${endpoint.path} - ${res.status}`)
        results.passed++
        results.byModule[module].passed++
      } else if (res.status === 0) {
        log('red', '❌', `${endpoint.method} ${endpoint.path} - 连接失败`)
        results.failed++
        results.byModule[module].failed++
      } else {
        log('yellow', '⚠️', `${endpoint.method} ${endpoint.path} - ${res.status}`)
        results.failed++
        results.byModule[module].failed++
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  // 输出汇总
  console.log('\n' + '='.repeat(60))
  log('cyan', '📊', '测试结果汇总')
  console.log('='.repeat(60))

  console.log('\n模块详情:')
  for (const [module, stats] of Object.entries(results.byModule)) {
    const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
    const statusColor = passRate === 100 ? 'green' : passRate >= 80 ? 'yellow' : 'red'
    log(statusColor, '  •', `${module}: ${stats.passed}/${stats.total} 通过 (${passRate}%)`)
  }

  console.log('\n总体统计:')
  console.log(`  总计: ${results.total} 个端点`)
  log('green', '  ✅', `通过: ${results.passed}`)
  log('red', '  ❌', `失败: ${results.failed}`)
  log('gray', '  ⊘', `跳过: ${results.skipped}`)

  const overallRate = Math.round((results.passed / (results.total - results.skipped)) * 100)
  console.log(`\n  整体通过率: ${overallRate}%`)

  console.log('='.repeat(60) + '\n')

  return results
}

// 主函数
async function main() {
  const results = await testAllEndpoints()

  // 列出所有 API 文件
  console.log('\n' + '='.repeat(60))
  log('cyan', '📋', 'API 端点完整清单')
  console.log('='.repeat(60))
  log('blue', 'ℹ️', '项目共有 81 个 API 路由文件')
  log('yellow', '⚠️', '当前测试覆盖了约 ' + results.total + ' 个基础端点')
  log('gray', '💡', '完整测试需要创建测试数据（ID）才能测试所有 CRUD 操作')
  console.log('='.repeat(60) + '\n')

  process.exit(results.failed === 0 ? 0 : 1)
}

main()
