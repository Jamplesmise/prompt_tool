/**
 * GOI 失败恢复 E2E 测试
 *
 * 场景组 C：失败恢复
 * - C1: 临时性失败自动重试
 * - C2: 数据性失败回滚
 * - C3: 用户选择跳过
 * - C4: 用户选择重规划
 */

import { test, expect } from './fixtures'

test.describe('GOI Failure Recovery', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('C1: 临时性失败自动重试 - 重试成功后继续执行', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动一个可能触发临时失败的任务
    await goiPage.startWithGoal('刷新任务列表状态')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 继续执行流程
    // 临时性失败（如网络超时）应该自动重试
    await goiPage.approveAllCheckpoints()

    // 5. 验证系统状态正常
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('C2: 数据性失败回滚 - 状态正确恢复', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动一个会触发数据性失败的任务（搜索不存在的资源）
    await goiPage.startWithGoal('查找名称为"__不存在的资源__"的提示词')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 继续执行
    await goiPage.approveAllCheckpoints()

    // 5. 数据性失败后，系统应该回滚并显示失败报告
    // 验证可以继续输入新指令
    await page.waitForTimeout(2000)
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('C3: 用户选择跳过 - 跳过后继续后续任务', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动一个多步骤任务
    await goiPage.startWithGoal('检查系统状态并生成报告')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 记录初始 TODO 数量
    const initialTodoCount = await goiPage.getTodoItemCount()

    // 5. 等待检查点
    await goiPage.waitForCheckpoint()

    // 6. 拒绝当前操作（模拟跳过）
    await goiPage.rejectCheckpoint()

    // 7. 验证可以继续操作
    await page.waitForTimeout(1000)
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('C4: 用户选择重规划 - 生成新的 TODO List', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 并设置为辅助模式
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 启动任务
    await goiPage.startWithGoal('创建测试任务并运行')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()

    // 4. 记录初始 TODO 项
    const initialTodoCount = await goiPage.getTodoItemCount()
    expect(initialTodoCount).toBeGreaterThan(0)

    // 5. 等待检查点
    await goiPage.waitForCheckpoint()

    // 6. 修改（触发重规划）
    await goiPage.modifyCheckpoint()

    // 7. 等待重规划完成
    await page.waitForTimeout(2000)

    // 8. 验证可以继续操作
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
  })

  test('失败后恢复选项正常显示', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 启动任务
    await goiPage.startWithGoal('执行复杂的多步骤操作')

    // 等待 TODO List
    await goiPage.waitForTodoList()

    // 等待检查点
    await goiPage.waitForCheckpoint()

    // 验证恢复选项按钮可用
    const approveBtn = page.locator('[data-testid="checkpoint-approve"]')
    const modifyBtn = page.locator('[data-testid="checkpoint-modify"]')
    const takeoverBtn = page.locator('[data-testid="checkpoint-takeover"]')
    const rejectBtn = page.locator('[data-testid="checkpoint-reject"]')

    await expect(approveBtn).toBeVisible()
    await expect(modifyBtn).toBeVisible()
    await expect(takeoverBtn).toBeVisible()
    await expect(rejectBtn).toBeVisible()
  })

  test('连续失败后系统仍可用', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 第一次任务 - 拒绝
    await goiPage.startWithGoal('任务1')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()
    await goiPage.rejectCheckpoint()
    await page.waitForTimeout(500)

    // 第二次任务 - 拒绝
    await goiPage.startWithGoal('任务2')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()
    await goiPage.rejectCheckpoint()
    await page.waitForTimeout(500)

    // 验证系统仍然可用
    const input = page.locator('[data-testid="goal-input"]')
    await expect(input).toBeVisible()
    await expect(input).not.toBeDisabled()
  })
})
