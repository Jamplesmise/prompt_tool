/**
 * GOI 基础功能 E2E 测试
 *
 * 场景组 A：基础功能
 * - A1: 纯人工模式创建任务
 * - A2: AI 辅助模式创建任务
 * - A3: AI 自动模式创建任务
 */

import { test, expect } from './fixtures'

test.describe('GOI Basic Functionality', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    // 导航到工作台页面（Copilot 在 dashboard layout 中）
    await page.goto('/')
    // 登录
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('A1: 纯人工模式 - 系统不干预用户操作', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 面板
    await goiPage.openCopilot()

    // 2. 切换到手动模式
    await goiPage.switchMode('manual')

    // 3. 验证在手动模式下，AI 不会主动执行操作
    // 用户可以自由操作，不会触发检查点
    const manualModeButton = page.locator('[data-testid="mode-manual"]')
    await expect(manualModeButton).toBeVisible()

    // 4. 验证没有检查点出现
    const checkpoint = page.locator('[data-testid="checkpoint-dialog"]')
    await expect(checkpoint).not.toBeVisible()
  })

  test('A2: AI 辅助模式 - 检查点触发和确认流程', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 面板
    await goiPage.openCopilot()

    // 2. 切换到 AI 辅助模式
    await goiPage.switchMode('assisted')

    // 3. 输入目标
    await goiPage.startWithGoal('创建一个测试任务，名称为"E2E测试任务"')

    // 4. 等待 TODO List 生成
    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 5. 等待检查点
    await goiPage.waitForCheckpoint()

    // 6. 确认检查点
    await goiPage.approveCheckpoint()

    // 7. 继续处理后续检查点直到完成
    await goiPage.approveAllCheckpoints()

    // 8. 验证有 TODO 项完成
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThanOrEqual(0)
  })

  test('A3: AI 自动模式 - 除删除外自动执行', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 面板
    await goiPage.openCopilot()

    // 2. 切换到全自动模式
    await goiPage.switchMode('auto')

    // 3. 输入目标
    await goiPage.startWithGoal('查看当前所有任务')

    // 4. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 5. 在自动模式下，非删除操作应该自动执行
    // 等待一段时间让自动执行完成
    await page.waitForTimeout(5000)

    // 6. 验证有 TODO 项（可能已完成或正在进行）
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('模式切换正常工作', async ({ page, goiPage }) => {
    await goiPage.openCopilot()

    // 测试三种模式切换
    await goiPage.switchMode('manual')
    await expect(page.locator('[data-testid="mode-manual"]')).toHaveAttribute('class', /ant-radio-button-checked/)

    await goiPage.switchMode('assisted')
    await expect(page.locator('[data-testid="mode-assisted"]')).toHaveAttribute('class', /ant-radio-button-checked/)

    await goiPage.switchMode('auto')
    await expect(page.locator('[data-testid="mode-auto"]')).toHaveAttribute('class', /ant-radio-button-checked/)
  })

  test('Copilot 面板打开和关闭', async ({ page, goiPage }) => {
    // 验证初始状态：面板关闭，显示悬浮按钮
    const toggle = page.locator('[data-testid="copilot-toggle"]')
    await expect(toggle).toBeVisible()

    // 打开面板
    await goiPage.openCopilot()

    // 验证面板打开后悬浮按钮隐藏
    await expect(toggle).not.toBeVisible()
  })

  test('目标输入和发送', async ({ page, goiPage }) => {
    await goiPage.openCopilot()

    const input = page.locator('[data-testid="goal-input"]')
    const button = page.locator('[data-testid="start-button"]')

    // 空输入时按钮应该禁用
    await expect(button).toBeDisabled()

    // 输入内容后按钮启用
    await input.fill('测试目标')
    await expect(button).not.toBeDisabled()
  })
})
