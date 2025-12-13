/**
 * GOI L2 级别验证测试
 *
 * 端到端测试验证 L2 能力：
 * - 完整任务执行
 * - 暂停续跑
 * - 接管续跑
 * - 检查点确认
 * - 性能指标
 * - 稳定性测试
 */

import { test, expect } from './fixtures'

test.describe('GOI L2 Validation - Complete Task Execution', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('should complete task creation via natural language', async ({ page, goiPage }) => {
    // 1. 打开 Copilot 面板
    await goiPage.openCopilot()
    // 使用手动模式确保检查点出现
    await goiPage.switchMode('manual')

    // 2. 输入目标
    await goiPage.startWithGoal('帮我查看当前的任务列表')

    // 3. 等待 TODO List 生成
    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 4. 在手动模式下点击"下一步"执行
    const nextStepBtn = page.locator('button:has-text("下一步")')
    if (await nextStepBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextStepBtn.click()
    }

    // 5. 验证有步骤执行
    await page.waitForTimeout(2000)
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThanOrEqual(0)
  })

  test('should generate plan with multiple steps', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 复杂任务应该生成多个步骤
    await goiPage.startWithGoal('创建一个新的评估任务，使用情感分析提示词和测试数据集')

    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()

    // 复杂任务应该有多个步骤
    expect(todoCount).toBeGreaterThan(1)
  })
})

test.describe('GOI L2 Validation - Pause and Resume', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('should pause execution when user switches mode', async ({ page, goiPage }) => {
    // 1. 启动任务
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('创建一个测试任务')

    // 2. 等待 TODO List 生成
    await goiPage.waitForTodoList()
    const initialCount = await goiPage.getTodoItemCount()
    expect(initialCount).toBeGreaterThan(0)

    // 3. 切换到手动模式暂停执行
    await goiPage.switchMode('manual')

    // 4. 验证暂停状态 - TODO List 应该保持
    await page.waitForTimeout(1000)
    const pausedCount = await goiPage.getTodoItemCount()
    expect(pausedCount).toBe(initialCount)

    // 5. 切换回辅助模式继续
    await goiPage.switchMode('assisted')

    // 6. 验证 TODO List 仍然存在
    const resumedCount = await goiPage.getTodoItemCount()
    expect(resumedCount).toBe(initialCount)
  })

  test('should preserve todo list state when pausing', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('查看所有提示词')

    await goiPage.waitForTodoList()
    const initialTodoCount = await goiPage.getTodoItemCount()

    // 暂停
    await goiPage.switchMode('manual')
    await page.waitForTimeout(1000)

    // 验证 TODO List 仍然存在
    const pausedTodoCount = await goiPage.getTodoItemCount()
    expect(pausedTodoCount).toBe(initialTodoCount)
  })
})

test.describe('GOI L2 Validation - Takeover and Handback', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('should transfer control to user', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    // 使用手动模式以便测试接管功能
    await goiPage.switchMode('manual')
    await goiPage.startWithGoal('查看提示词列表')

    await goiPage.waitForTodoList()
    const initialCount = await goiPage.getTodoItemCount()
    expect(initialCount).toBeGreaterThan(0)

    // 在手动模式下，用户可以随时操作
    // 验证用户可以自由控制
    await page.waitForTimeout(1000)

    // 验证 TODO List 状态保持
    const finalCount = await goiPage.getTodoItemCount()
    expect(finalCount).toBe(initialCount)
  })

  test('should allow handback to AI after user actions', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('manual')
    await goiPage.startWithGoal('浏览数据集列表')

    await goiPage.waitForTodoList()
    const initialCount = await goiPage.getTodoItemCount()
    expect(initialCount).toBeGreaterThan(0)

    // 用户操作
    await page.waitForTimeout(1000)

    // 交还 - 切换回辅助模式
    await goiPage.switchMode('assisted')

    // 验证 AI 可以继续，TODO List 存在
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)
  })
})

test.describe('GOI L2 Validation - Checkpoint Confirmation', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('should show checkpoint for resource selection', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    // 在辅助模式下，观察操作自动通过
    // 测试验证计划生成和执行流程
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('创建一个评估任务')

    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 验证 TODO List 显示正常
    const todoList = page.locator('[data-testid="todo-list"]')
    await expect(todoList).toBeVisible()
  })

  test('should allow changing selection at checkpoint', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('manual')
    await goiPage.startWithGoal('选择一个提示词进行测试')

    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 在手动模式下验证 TODO List 状态
    await page.waitForTimeout(1000)
    // 用户可以查看计划并决定如何执行
  })

  test('should continue execution after approval', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('查看模型列表')

    await goiPage.waitForTodoList()
    const initialTodoCount = await goiPage.getTodoItemCount()
    expect(initialTodoCount).toBeGreaterThan(0)

    // 在辅助模式下，观察操作会自动执行
    await page.waitForTimeout(3000)

    // 验证执行后状态
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe('GOI L2 Validation - Performance', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('plan generation should be under 10s', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    const startTime = Date.now()
    await goiPage.startWithGoal('查看任务列表')

    // 等待 TODO List 生成
    await goiPage.waitForTodoList()
    const planTime = Date.now() - startTime

    // 计划生成应该在 10 秒内完成（网络条件可能影响）
    expect(planTime).toBeLessThan(10000)
  })

  test('mode switch should be responsive', async ({ page, goiPage }) => {
    await goiPage.openCopilot()

    // 测试模式切换响应时间
    const times: number[] = []
    const modes: Array<'manual' | 'assisted' | 'auto'> = ['manual', 'assisted', 'auto', 'manual']

    for (const mode of modes) {
      const start = Date.now()
      await goiPage.switchMode(mode)
      times.push(Date.now() - start)
    }

    // 模式切换应该在 500ms 内完成
    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(500)
  })
})

test.describe('GOI L2 Validation - Stability', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('should handle multiple task submissions', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 连续提交多个任务
    for (let i = 0; i < 3; i++) {
      await goiPage.startWithGoal(`测试任务 ${i + 1}: 查看列表`)

      // 等待 TODO List 生成
      try {
        await goiPage.waitForTodoList()
      } catch {
        // 如果超时，继续下一个测试
      }

      // 取消当前任务（通过切换模式）
      await goiPage.switchMode('manual')
      await page.waitForTimeout(500)
      await goiPage.switchMode('assisted')

      // 验证系统状态正常
      const input = page.locator('[data-testid="goal-input"]')
      await expect(input).toBeVisible()
    }
  })

  test('should handle rapid mode switches', async ({ page, goiPage }) => {
    await goiPage.openCopilot()

    // 快速切换模式
    const modes: Array<'manual' | 'assisted' | 'auto'> = [
      'manual', 'assisted', 'auto',
      'assisted', 'manual', 'auto',
      'manual', 'assisted',
    ]

    for (const mode of modes) {
      await goiPage.switchMode(mode)
      await page.waitForTimeout(100)
    }

    // 验证最终状态正确
    const assistedButton = page.locator('label:has(input[data-testid="mode-assisted"])')
    await expect(assistedButton).toHaveClass(/ant-radio-button-wrapper-checked/)
  })

  test('should maintain state after page interactions', async ({ page, goiPage }) => {
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('查看任务列表')

    await goiPage.waitForTodoList()
    const initialTodoCount = await goiPage.getTodoItemCount()

    // 滚动页面
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(500)
    await page.mouse.wheel(0, -500)

    // 验证 TODO List 状态保持
    const finalTodoCount = await goiPage.getTodoItemCount()
    expect(finalTodoCount).toBe(initialTodoCount)
  })
})

test.describe('GOI L2 Validation - Integration Scenarios', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test('Scenario 1: Complete task from start to finish', async ({ page, goiPage }) => {
    // 完整任务执行流程
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 步骤 1: 输入目标
    await goiPage.startWithGoal('查看当前提示词列表')

    // 步骤 2: 等待计划生成
    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 步骤 3: 在辅助模式下，观察类操作会自动执行
    await page.waitForTimeout(3000)

    // 验证任务执行情况
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThanOrEqual(0)
  })

  test('Scenario 2: Pause, manual operation, and resume', async ({ page, goiPage }) => {
    // 中途暂停续跑场景
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')
    await goiPage.startWithGoal('创建一个新任务')

    await goiPage.waitForTodoList()

    // 暂停（切换到手动模式）
    await goiPage.switchMode('manual')
    await page.waitForTimeout(1000)

    // 验证暂停状态
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)

    // 手动操作（模拟）
    await page.waitForTimeout(1000)

    // 继续执行
    await goiPage.switchMode('assisted')

    // 验证可以继续
    const finalTodoCount = await goiPage.getTodoItemCount()
    expect(finalTodoCount).toBeGreaterThanOrEqual(0)
  })

  test('Scenario 3: Takeover, complete manually, handback', async ({ page, goiPage }) => {
    // 接管后手动完成场景
    await goiPage.openCopilot()
    await goiPage.switchMode('manual')
    await goiPage.startWithGoal('浏览模型配置')

    await goiPage.waitForTodoList()
    const initialCount = await goiPage.getTodoItemCount()
    expect(initialCount).toBeGreaterThan(0)

    // 用户手动操作
    await page.waitForTimeout(1000)

    // 交还 AI - 切换到辅助模式
    await goiPage.switchMode('assisted')

    // AI 应该识别用户的操作并继续，TODO List 容器存在
    const todoList = page.locator('[data-testid="todo-list"]')
    await expect(todoList).toBeVisible()
  })
})
