/**
 * GOI L1 意图识别验证测试
 *
 * 测试意图解析器的准确率，目标：
 * - 导航意图准确率 > 95%
 * - 创建意图准确率 > 95%
 * - 查询意图准确率 > 90%
 */

import { quickParseIntent, parseIntentByRules } from '../intent/parser'
import type { IntentCategory, ResourceType } from '@platform/shared'

// ============================================
// 测试用例
// ============================================

type TestCase = {
  input: string
  expectedCategory?: IntentCategory
  expectedResource?: ResourceType
  description?: string
}

// A. 导航类测试（10 个）
const NAVIGATION_TESTS: TestCase[] = [
  { input: '打开模型配置', expectedCategory: 'navigation', expectedResource: 'model' },
  { input: '去提示词页面', expectedCategory: 'navigation', expectedResource: 'prompt' },
  { input: '进入设置', expectedCategory: 'navigation', expectedResource: 'settings' },
  { input: '看看数据集', expectedCategory: 'query', expectedResource: 'dataset' },
  { input: '打开定时任务', expectedCategory: 'navigation', expectedResource: 'scheduled_task' },
  { input: '查看监控', expectedCategory: 'query', expectedResource: 'monitor' },
  { input: 'open models', expectedCategory: 'navigation', expectedResource: 'model' },
  { input: 'go to tasks', expectedCategory: 'navigation', expectedResource: 'task' },
  { input: '首页', expectedCategory: 'navigation', expectedResource: 'dashboard', description: '单词导航' },
  { input: '仪表盘', expectedCategory: 'navigation', expectedResource: 'dashboard', description: '单词导航' },
]

// B. 创建类测试（10 个）
const CREATION_TESTS: TestCase[] = [
  { input: '创建一个提示词', expectedCategory: 'creation', expectedResource: 'prompt' },
  { input: '新建数据集', expectedCategory: 'creation', expectedResource: 'dataset' },
  { input: '添加一个模型', expectedCategory: 'creation', expectedResource: 'model' },
  { input: '新增供应商', expectedCategory: 'creation', expectedResource: 'provider' },
  { input: '创建测试任务', expectedCategory: 'creation', expectedResource: 'task' },
  { input: '新建评估器', expectedCategory: 'creation', expectedResource: 'evaluator' },
  { input: '添加定时任务', expectedCategory: 'creation', expectedResource: 'scheduled_task' },
  { input: '创建告警规则', expectedCategory: 'creation', expectedResource: 'alert_rule' },
  { input: '添加通知渠道', expectedCategory: 'creation', expectedResource: 'notify_channel' },
  { input: 'create a prompt', expectedCategory: 'creation', expectedResource: 'prompt' },
]

// C. 模糊匹配测试（10 个）
const FUZZY_TESTS: TestCase[] = [
  { input: '打开prompt', expectedCategory: 'navigation', expectedResource: 'prompt' },
  { input: '创建个ds', expectedCategory: 'creation', expectedResource: undefined, description: 'ds 可能无法识别' },
  { input: '添加llm', expectedCategory: 'creation', expectedResource: undefined, description: 'llm 可能无法识别' },
  { input: '查看模版', expectedCategory: 'query', expectedResource: 'prompt' },
  { input: '打开定时', expectedCategory: 'navigation', expectedResource: 'scheduled_task' },
  { input: '创建实验分支', expectedCategory: 'creation', expectedResource: undefined },
  { input: '发布版本', expectedCategory: 'creation', expectedResource: undefined },
  { input: '添加厂商', expectedCategory: 'creation', expectedResource: undefined, description: '厂商可能无法识别' },
  { input: '新建告警', expectedCategory: 'creation', expectedResource: 'alert_rule' },
  { input: '配置通知', expectedCategory: 'modification', expectedResource: 'notify_channel' },
]

// D. 查询类测试（10 个）
const QUERY_TESTS: TestCase[] = [
  { input: '查看提示词', expectedCategory: 'query', expectedResource: 'prompt' },
  { input: '显示所有模型', expectedCategory: 'query', expectedResource: 'model' },
  { input: '列出数据集', expectedCategory: 'query', expectedResource: 'dataset' },
  { input: 'show tasks', expectedCategory: 'query', expectedResource: 'task' },
  { input: 'list evaluators', expectedCategory: 'query', expectedResource: 'evaluator' },
  { input: '任务有哪些', expectedCategory: 'query', expectedResource: 'task' },
  { input: '提示词列表', expectedCategory: 'query', expectedResource: 'prompt' },
  { input: 'get prompts', expectedCategory: 'query', expectedResource: 'prompt' },
  { input: '查询告警规则', expectedCategory: 'query', expectedResource: 'alert_rule' },
  { input: '显示定时任务', expectedCategory: 'query', expectedResource: 'scheduled_task' },
]

// E. 边界情况测试（10 个）
const EDGE_TESTS: TestCase[] = [
  { input: '', expectedCategory: 'unknown', description: '空输入' },
  { input: '   ', expectedCategory: 'unknown', description: '空白输入' },
  { input: 'asdfghjkl', expectedCategory: 'unknown', description: '随机字符' },
  { input: '帮帮帮帮帮', expectedCategory: 'unknown', description: '重复无意义字符' },
  { input: '打开不存在的页面', expectedCategory: 'navigation', description: '不存在的资源' },
  { input: '删除系统', expectedCategory: 'deletion', description: '危险操作' },
  { input: 'SELECT * FROM users', expectedCategory: 'unknown', description: 'SQL 注入' },
  { input: '<script>alert(1)</script>', expectedCategory: 'unknown', description: 'XSS' },
  { input: 'a'.repeat(100), expectedCategory: 'unknown', description: '长输入' },
  { input: '创建1000个提示词', expectedCategory: 'creation', expectedResource: 'prompt', description: '批量请求' },
]

// ============================================
// 测试执行
// ============================================

describe('GOI L1 Intent Validation', () => {
  // 统计结果
  const stats = {
    navigation: { total: 0, passed: 0 },
    creation: { total: 0, passed: 0 },
    query: { total: 0, passed: 0 },
    fuzzy: { total: 0, passed: 0 },
    edge: { total: 0, passed: 0 },
  }

  describe('A. 导航意图测试', () => {
    NAVIGATION_TESTS.forEach((tc) => {
      const testName = tc.description || `"${tc.input}" → ${tc.expectedCategory}/${tc.expectedResource}`
      it(testName, () => {
        stats.navigation.total++
        const result = quickParseIntent(tc.input)

        // 检查意图分类
        if (tc.expectedCategory) {
          const categoryMatch = result.intent?.category === tc.expectedCategory
          if (categoryMatch) stats.navigation.passed++
          expect(result.intent?.category).toBe(tc.expectedCategory)
        }

        // 检查资源类型（如果指定）
        if (tc.expectedResource) {
          expect(result.intent?.resourceType).toBe(tc.expectedResource)
        }
      })
    })
  })

  describe('B. 创建意图测试', () => {
    CREATION_TESTS.forEach((tc) => {
      const testName = `"${tc.input}" → ${tc.expectedCategory}/${tc.expectedResource}`
      it(testName, () => {
        stats.creation.total++
        const result = quickParseIntent(tc.input)

        if (tc.expectedCategory) {
          const categoryMatch = result.intent?.category === tc.expectedCategory
          if (categoryMatch) stats.creation.passed++
          expect(result.intent?.category).toBe(tc.expectedCategory)
        }

        if (tc.expectedResource) {
          expect(result.intent?.resourceType).toBe(tc.expectedResource)
        }
      })
    })
  })

  describe('C. 模糊匹配测试', () => {
    FUZZY_TESTS.forEach((tc) => {
      const testName = tc.description || `"${tc.input}" → ${tc.expectedCategory}/${tc.expectedResource || '?'}`
      it(testName, () => {
        stats.fuzzy.total++
        const result = quickParseIntent(tc.input)

        if (tc.expectedCategory) {
          const categoryMatch = result.intent?.category === tc.expectedCategory
          if (categoryMatch) stats.fuzzy.passed++
          expect(result.intent?.category).toBe(tc.expectedCategory)
        }

        // 模糊测试中资源类型是可选的
        if (tc.expectedResource) {
          expect(result.intent?.resourceType).toBe(tc.expectedResource)
        }
      })
    })
  })

  describe('D. 查询意图测试', () => {
    QUERY_TESTS.forEach((tc) => {
      const testName = `"${tc.input}" → ${tc.expectedCategory}/${tc.expectedResource}`
      it(testName, () => {
        stats.query.total++
        const result = quickParseIntent(tc.input)

        if (tc.expectedCategory) {
          const categoryMatch = result.intent?.category === tc.expectedCategory
          if (categoryMatch) stats.query.passed++
          expect(result.intent?.category).toBe(tc.expectedCategory)
        }

        if (tc.expectedResource) {
          expect(result.intent?.resourceType).toBe(tc.expectedResource)
        }
      })
    })
  })

  describe('E. 边界情况测试', () => {
    EDGE_TESTS.forEach((tc) => {
      const testName = tc.description || `"${tc.input.slice(0, 20)}..." → ${tc.expectedCategory}`
      it(testName, () => {
        stats.edge.total++
        const result = quickParseIntent(tc.input)

        // 边界情况主要测试不会崩溃
        expect(result).toBeDefined()
        expect(result.intent).toBeDefined()

        if (tc.expectedCategory) {
          const categoryMatch = result.intent?.category === tc.expectedCategory
          if (categoryMatch) stats.edge.passed++
        } else {
          stats.edge.passed++ // 没有预期则算通过
        }
      })
    })
  })

  // 输出统计
  afterAll(() => {
    console.log('\n========================================')
    console.log('GOI L1 意图识别准确率统计')
    console.log('========================================')
    console.log(`导航意图: ${stats.navigation.passed}/${stats.navigation.total} (${(stats.navigation.passed / stats.navigation.total * 100).toFixed(1)}%)`)
    console.log(`创建意图: ${stats.creation.passed}/${stats.creation.total} (${(stats.creation.passed / stats.creation.total * 100).toFixed(1)}%)`)
    console.log(`查询意图: ${stats.query.passed}/${stats.query.total} (${(stats.query.passed / stats.query.total * 100).toFixed(1)}%)`)
    console.log(`模糊匹配: ${stats.fuzzy.passed}/${stats.fuzzy.total} (${(stats.fuzzy.passed / stats.fuzzy.total * 100).toFixed(1)}%)`)
    console.log(`边界情况: ${stats.edge.passed}/${stats.edge.total} (${(stats.edge.passed / stats.edge.total * 100).toFixed(1)}%)`)
    console.log('----------------------------------------')
    const total = stats.navigation.total + stats.creation.total + stats.query.total + stats.fuzzy.total + stats.edge.total
    const passed = stats.navigation.passed + stats.creation.passed + stats.query.passed + stats.fuzzy.passed + stats.edge.passed
    console.log(`总计: ${passed}/${total} (${(passed / total * 100).toFixed(1)}%)`)
    console.log('========================================\n')
  })
})
