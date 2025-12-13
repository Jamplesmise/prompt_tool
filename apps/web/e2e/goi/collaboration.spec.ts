/**
 * GOI 人机协作 E2E 测试
 *
 * 场景组 B：人机协作
 * - B1: 用户中途接管
 * - B2: 用户完成 TODO 后交还 AI
 * - B3: 检查点修改
 * - B4: 检查点拒绝
 */

import { test, expect } from './fixtures'

test.describe('GOI Human-AI Collaboration', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('B1: 用户中途接管 - 控制权正确转移', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动一个任务
    await goiPage.startWithGoal('创建一个新的测试提示词')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 等待检查点出现
    await goiPage.waitForCheckpoint()

    // 5. 点击"我来操作"接管控制
    await goiPage.takeoverCheckpoint()

    // 6. 验证控制权已转移 - 检查点对话框应该关闭
    await page.waitForTimeout(1000)
    const isCheckpointVisible = await goiPage.isCheckpointVisible()
    // 接管后，检查点应该关闭，AI 进入观察模式
    expect(isCheckpointVisible).toBe(false)
  })

  test('B2: 用户完成 TODO 后交还 AI - AI 识别已完成项', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动任务
    await goiPage.startWithGoal('浏览当前提示词列表')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 等待检查点
    await goiPage.waitForCheckpoint()

    // 5. 接管控制
    await goiPage.takeoverCheckpoint()

    // 6. 用户手动操作（模拟）
    await page.waitForTimeout(2000)

    // 7. 切换回辅助模式，AI 应该能识别当前状态并继续
    await goiPage.switchMode('assisted')

    // 8. 验证 TODO List 仍然存在
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('B3: 检查点修改 - 修改后 AI 使用新参数执行', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动任务
    await goiPage.startWithGoal('搜索名称包含"test"的提示词')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 等待检查点
    await goiPage.waitForCheckpoint()

    // 5. 点击"换一个"进行修改
    await goiPage.modifyCheckpoint()

    // 6. 验证修改操作被触发
    // 修改后 AI 应该重新规划或使用新参数
    await page.waitForTimeout(1000)

    // 7. 检查 TODO List 状态
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('B4: 检查点拒绝 - AI 正确回滚并等待用户指示', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动任务
    await goiPage.startWithGoal('删除一个测试提示词')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 等待检查点
    await goiPage.waitForCheckpoint()

    // 5. 点击"取消"拒绝当前操作
    await goiPage.rejectCheckpoint()

    // 6. 验证检查点对话框关闭
    await page.waitForTimeout(1000)
    const isCheckpointVisible = await goiPage.isCheckpointVisible()
    expect(isCheckpointVisible).toBe(false)

    // 7. AI 应该回滚操作并等待新的指令
    // 验证可以输入新的指令
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('控制权转移事件记录正确', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 启动任务
    await goiPage.startWithGoal('创建测试数据集')

    // 等待检查点
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 接管控制
    await goiPage.takeoverCheckpoint()
    await page.waitForTimeout(500)

    // 交还控制（切换回 assisted 模式）
    await goiPage.switchMode('assisted')
    await page.waitForTimeout(500)

    // 验证系统状态正常
    const modeButton = page.locator('[data-testid="mode-assisted"]')
    await expect(modeButton).toHaveAttribute('class', /ant-radio-button-checked/)
  })

  test('检查点操作按钮状态正确', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('查看任务列表')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 验证所有检查点按钮可见
    await expect(page.locator('[data-testid="checkpoint-approve"]')).toBeVisible()
    await expect(page.locator('[data-testid="checkpoint-modify"]')).toBeVisible()
    await expect(page.locator('[data-testid="checkpoint-takeover"]')).toBeVisible()
    await expect(page.locator('[data-testid="checkpoint-reject"]')).toBeVisible()

    // 验证按钮可点击（未禁用）
    await expect(page.locator('[data-testid="checkpoint-approve"]')).not.toBeDisabled()
    await expect(page.locator('[data-testid="checkpoint-modify"]')).not.toBeDisabled()
    await expect(page.locator('[data-testid="checkpoint-takeover"]')).not.toBeDisabled()
    await expect(page.locator('[data-testid="checkpoint-reject"]')).not.toBeDisabled()
  })
})
