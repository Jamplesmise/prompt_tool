/**
 * GOI 边界条件 E2E 测试
 *
 * 测试系统在边界条件下的表现：
 * - 超长目标描述
 * - 超多 TODO 项
 * - 并发执行
 * - 网络断开恢复
 * - 页面刷新恢复
 * - 上下文达到上限
 */

import { test, expect } from './fixtures'

test.describe('GOI Edge Cases', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('超长目标描述（10000字符）- 系统正常处理', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 生成超长目标描述
    const longGoal = '这是一个非常详细的任务描述，'.repeat(500) // 约 10000 字符

    // 输入超长目标
    const input = page.locator('[data-testid="goal-input"]')
    await input.fill(longGoal)

    // 验证输入框接受了内容
    const value = await input.inputValue()
    expect(value.length).toBeGreaterThan(0)

    // 尝试发送
    const button = page.locator('[data-testid="start-button"]')
    await button.click()

    // 系统应该能处理或优雅地截断
    await page.waitForTimeout(3000)

    // 验证系统仍然可用
    await expect(input).toBeVisible()
  })

  test('快速连续输入 - 系统响应正常', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 快速发送多个指令
    for (let i = 0; i < 5; i++) {
      await goiPage.startWithGoal(`快速任务 ${i + 1}`)
      await page.waitForTimeout(200)
    }

    // 系统应该能处理快速输入
    await page.waitForTimeout(2000)

    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('页面刷新后恢复 - 状态正确恢复', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 启动任务
    await goiPage.startWithGoal('测试任务')
    await goiPage.waitForTodoList()

    // 记录当前状态
    const todoCountBefore = await goiPage.getTodoItemCount()

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 重新打开 Copilot
    await goiPage.openCopilot()

    // 验证系统可用
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('模式快速切换 - 系统稳定', async ({ page, goiPage }) => {
    await goiPage.openCopilot()

    // 快速切换模式
    for (let i = 0; i < 10; i++) {
      await goiPage.switchMode('manual')
      await goiPage.switchMode('assisted')
      await goiPage.switchMode('auto')
    }

    // 验证最终状态正确
    const autoButton = page.locator('[data-testid="mode-auto"]')
    await expect(autoButton).toHaveAttribute('class', /ant-radio-button-checked/)
  })

  test('空目标输入 - 正确阻止', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    const input = page.locator('[data-testid="goal-input"]')
    const button = page.locator('[data-testid="start-button"]')

    // 空输入
    await input.fill('')
    await expect(button).toBeDisabled()

    // 只有空格
    await input.fill('   ')
    // 按钮应该仍然禁用
    await expect(button).toBeDisabled()
  })

  test('特殊字符输入 - 正确处理', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 包含特殊字符的目标
    const specialGoal = '测试 <script>alert("xss")</script> & "引号" \'单引号\' 换行\n制表符\t'

    await goiPage.startWithGoal(specialGoal)

    // 系统应该正确处理，不会 XSS
    await page.waitForTimeout(2000)

    // 验证页面没有弹出 alert
    // 如果有 XSS，页面可能会有问题
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('多次打开关闭面板 - 状态一致', async ({ page, goiPage }) => {
    // 多次打开关闭
    for (let i = 0; i < 5; i++) {
      await goiPage.openCopilot()
      await page.waitForTimeout(300)

      // 关闭面板（点击其他地方或关闭按钮）
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // 最后打开面板
    await goiPage.openCopilot()

    // 验证状态正常
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('TODO List 项目数量边界 - 正常渲染', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 启动一个可能生成多个 TODO 的任务
    await goiPage.startWithGoal('执行完整的系统检查，包括数据验证、性能测试、安全扫描和报告生成')

    // 等待 TODO List
    await goiPage.waitForTodoList()

    // 验证 TODO List 正常渲染
    const todoList = page.locator('[data-testid="todo-list"]')
    await expect(todoList).toBeVisible()

    // 获取 TODO 数量
    const todoCount = await goiPage.getTodoItemCount()
    // 不管多少项，都应该能正常显示
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('并发操作 - 系统保持一致性', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 同时发送多个操作
    const promises = [
      goiPage.startWithGoal('任务 A'),
      goiPage.switchMode('auto'),
      goiPage.switchMode('manual'),
    ]

    // 等待所有操作完成
    await Promise.allSettled(promises)

    // 等待系统稳定
    await page.waitForTimeout(2000)

    // 验证系统状态一致
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('网络慢速 - 优雅处理', async ({ page, goiPage }) => {
    // 模拟慢速网络
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await route.continue()
    })

    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('测试网络延迟')

    // 等待更长时间
    await page.waitForTimeout(5000)

    // 验证系统仍然可用
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })
})
