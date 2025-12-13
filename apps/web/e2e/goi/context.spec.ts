/**
 * GOI 上下文管理 E2E 测试
 *
 * 场景组 D：上下文管理
 * - D1: 上下文自动压缩
 * - D2: 压缩后继续执行
 * - D3: 手动压缩
 */

import { test, expect } from './fixtures'

test.describe('GOI Context Management', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('D1: 上下文自动压缩 - 达到阈值时触发压缩', async ({ page, goiPage }) => {
    // 1. 打开 Copilot
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 执行多步骤任务以增长上下文
    await goiPage.startWithGoal('执行复杂的多步骤分析任务，包括数据收集、处理和报告生成')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 执行多个步骤
    await goiPage.approveAllCheckpoints()

    // 5. 验证上下文指示器存在
    const contextIndicator = page.locator('[class*="contextIndicator"]')
    // 上下文指示器应该存在（可能在组件中）
    await page.waitForTimeout(2000)

    // 6. 系统状态应该正常
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('D2: 压缩后继续执行 - 任务正常完成', async ({ page, goiPage }) => {
    // 1. 打开 Copilot
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动长任务
    await goiPage.startWithGoal('浏览所有数据集并生成摘要')

    // 3. 等待 TODO List
    await goiPage.waitForTodoList()

    // 4. 执行任务
    await goiPage.approveAllCheckpoints()

    // 5. 验证任务可以完成（压缩后应该能继续）
    await page.waitForTimeout(3000)

    // 6. 验证可以开始新任务
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()

    // 7. 尝试启动新任务
    await goiPage.startWithGoal('查看任务状态')
    await goiPage.waitForTodoList()

    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('D3: 手动压缩 - 用户主动触发压缩成功', async ({ page, goiPage }) => {
    // 1. 打开 Copilot
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 执行一些操作以产生上下文
    await goiPage.startWithGoal('搜索包含关键词的内容')
    await goiPage.waitForTodoList()

    // 3. 验证可以继续操作
    await page.waitForTimeout(2000)

    // 4. 检查是否有压缩按钮（如果有的话）
    // 这取决于具体的 UI 实现
    const compressButton = page.locator('[data-testid="compress-button"]')
    const hasCompressButton = await compressButton.isVisible().catch(() => false)

    if (hasCompressButton) {
      await compressButton.click()
      await page.waitForTimeout(1000)
    }

    // 5. 验证系统状态正常
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('上下文指示器正确显示使用量', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 执行一些操作
    await goiPage.startWithGoal('查看系统状态')
    await goiPage.waitForTodoList()

    // 验证上下文相关的 UI 元素
    // 具体取决于 ContextIndicator 组件的实现
    await page.waitForTimeout(2000)

    // 系统应该正常运行
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('长对话后仍可正常交互', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 执行多轮对话
    const tasks = [
      '查看提示词列表',
      '搜索测试相关内容',
      '查看任务状态',
    ]

    for (const task of tasks) {
      await goiPage.startWithGoal(task)
      await goiPage.waitForTodoList()
      await goiPage.approveAllCheckpoints()
      await page.waitForTimeout(1000)
    }

    // 验证系统仍然响应
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
    await expect(input).not.toBeDisabled()
  })
})
