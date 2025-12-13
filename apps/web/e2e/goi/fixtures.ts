/**
 * GOI E2E 测试公共 fixtures
 */

import { test as base, expect, type Page } from '@playwright/test'

// 测试账号
const TEST_EMAIL = 'admin@example.com'
const TEST_PASSWORD = 'admin123'

/** GOI 测试页面辅助对象 */
export class GoiPage {
  constructor(private page: Page) {}

  /** 登录 */
  async login(email = TEST_EMAIL, password = TEST_PASSWORD) {
    // 等待页面加载
    await this.page.waitForLoadState('networkidle')

    // 尝试等待登录表单出现（最多 5 秒）
    const loginText = this.page.locator('text=登录以继续')

    try {
      await loginText.waitFor({ state: 'visible', timeout: 5000 })

      // 找到输入框并填写
      const emailInput = this.page.getByRole('textbox', { name: '邮箱' })
      const passwordInput = this.page.getByRole('textbox', { name: '密码' })

      await emailInput.fill(email)
      await passwordInput.fill(password)
      await this.page.getByRole('button', { name: '登 录' }).click()

      // 等待登录完成 - 等待登录文本消失
      await loginText.waitFor({ state: 'hidden', timeout: 15000 })
      await this.page.waitForLoadState('networkidle')
    } catch {
      // 如果没有登录页面，说明已经登录了
    }

    // 关闭欢迎引导弹窗（如果存在）
    await this.dismissWelcomeModal()
  }

  /** 关闭欢迎引导弹窗 */
  async dismissWelcomeModal() {
    try {
      const skipButton = this.page.locator('text=跳过引导')
      await skipButton.waitFor({ state: 'visible', timeout: 3000 })
      await skipButton.click()
      await this.page.waitForTimeout(500)
    } catch {
      // 没有引导弹窗，忽略
    }
  }

  /** 打开 Copilot 面板 */
  async openCopilot() {
    const toggle = this.page.locator('[data-testid="copilot-toggle"]')
    try {
      await toggle.waitFor({ state: 'visible', timeout: 5000 })
      await toggle.click()
      // 等待输入框出现，表示面板已打开
      await this.page.waitForSelector('[data-testid="goal-input"]', { state: 'visible', timeout: 5000 })
    } catch {
      // 如果 toggle 不可见，面板可能已经打开或组件结构不同
      // 检查是否已经能看到输入框
      const input = this.page.locator('[data-testid="goal-input"]')
      if (!(await input.isVisible())) {
        throw new Error('无法打开 Copilot 面板')
      }
    }

    // 等待模型配置加载完成并选择模型
    await this.ensureModelSelected()
  }

  /** 确保已选择模型 */
  async ensureModelSelected() {
    // 等待模型配置加载（等待错误提示消失或发送按钮可用）
    const maxWait = 10000
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      // 检查是否有"请先选择模型"的错误提示
      const errorAlert = this.page.locator('text=请先在"模型配置"中选择复杂任务模型')
      const hasError = await errorAlert.isVisible()

      if (hasError) {
        // 展开模型配置面板
        const modelConfigButton = this.page.locator('button:has-text("模型配置")')
        const isCollapsed = await modelConfigButton.locator('[class*="collapsed"]').isVisible().catch(() => false)

        if (isCollapsed) {
          await modelConfigButton.click()
          await this.page.waitForTimeout(500)
        }

        // 等待模型选择器出现并选择第一个模型
        const modelSelector = this.page.locator('.ant-select').first()
        if (await modelSelector.isVisible()) {
          await modelSelector.click()
          await this.page.waitForTimeout(300)

          // 选择第一个可用选项
          const firstOption = this.page.locator('.ant-select-item-option').first()
          if (await firstOption.isVisible()) {
            await firstOption.click()
            await this.page.waitForTimeout(500)
          }
        }
      }

      // 检查发送按钮是否可用
      const sendButton = this.page.locator('[data-testid="start-button"]')
      const isDisabled = await sendButton.isDisabled().catch(() => true)

      if (!isDisabled) {
        return // 模型已选择，可以继续
      }

      await this.page.waitForTimeout(500)
    }

    // 如果超时，检查是否仍有错误
    const stillHasError = await this.page.locator('text=请先在"模型配置"中选择').isVisible()
    if (stillHasError) {
      console.warn('警告: 无法自动选择模型，测试可能失败')
    }
  }

  /** 切换模式 */
  async switchMode(mode: 'manual' | 'assisted' | 'auto') {
    // Ant Design Radio.Button 的 data-testid 在隐藏的 input 上
    // 需要点击包含该 input 的 label 元素
    const modeLabels: Record<string, string> = {
      manual: '手动',
      assisted: '智能',
      auto: '自动',
    }
    const modeButton = this.page.locator(`label:has(input[data-testid="mode-${mode}"])`)
    await modeButton.click()
    // 验证选中状态
    await expect(modeButton).toHaveClass(/ant-radio-button-wrapper-checked/)
  }

  /** 输入目标并开始执行 */
  async startWithGoal(goal: string) {
    const input = this.page.locator('[data-testid="goal-input"]')
    await input.fill(goal)
    const button = this.page.locator('[data-testid="start-button"]')
    await button.click()

    // 等待计划生成并确认执行
    await this.confirmPlanExecution()
  }

  /** 确认计划执行 */
  async confirmPlanExecution(timeout = 30000) {
    // 等待"执行 (Enter)"按钮出现
    const confirmButton = this.page.locator('button:has-text("执行 (Enter)")')

    try {
      await confirmButton.waitFor({ state: 'visible', timeout })
      await confirmButton.click()
      // 等待确认界面消失
      await confirmButton.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    } catch {
      // 如果没有确认按钮，可能是自动模式或其他情况
      console.log('未找到计划确认按钮，继续执行')
    }
  }

  /** 等待 TODO List 出现 */
  async waitForTodoList(timeout = 30000) {
    await this.page.waitForSelector('[data-testid="todo-list"]', { timeout })
  }

  /** 等待检查点出现 */
  async waitForCheckpoint(timeout = 30000) {
    await this.page.waitForSelector('[data-testid="checkpoint-dialog"]', { timeout })
  }

  /** 确认检查点 */
  async approveCheckpoint() {
    await this.page.locator('[data-testid="checkpoint-approve"]').click()
  }

  /** 修改检查点 */
  async modifyCheckpoint() {
    await this.page.locator('[data-testid="checkpoint-modify"]').click()
  }

  /** 接管控制 */
  async takeoverCheckpoint() {
    await this.page.locator('[data-testid="checkpoint-takeover"]').click()
  }

  /** 拒绝检查点 */
  async rejectCheckpoint() {
    await this.page.locator('[data-testid="checkpoint-reject"]').click()
  }

  /** 获取 TODO 项数量 */
  async getTodoItemCount() {
    return await this.page.locator('[data-testid="todo-item"]').count()
  }

  /** 获取已完成的 TODO 项数量 */
  async getCompletedTodoCount() {
    return await this.page.locator('[data-testid="todo-item"][data-status="completed"]').count()
  }

  /** 等待所有 TODO 完成 */
  async waitForAllTodosCompleted(timeout = 60000) {
    await this.page.waitForSelector('[data-testid="todo-status-completed"]', { timeout })
  }

  /** 检查检查点是否可见 */
  async isCheckpointVisible() {
    return await this.page.locator('[data-testid="checkpoint-dialog"]').isVisible()
  }

  /** 处理所有检查点直到完成 */
  async approveAllCheckpoints(maxCheckpoints = 10) {
    for (let i = 0; i < maxCheckpoints; i++) {
      const isVisible = await this.isCheckpointVisible()
      if (!isVisible) {
        // 等待一下，可能正在处理中
        await this.page.waitForTimeout(1000)
        const stillNotVisible = !(await this.isCheckpointVisible())
        if (stillNotVisible) break
      }
      await this.approveCheckpoint()
      await this.page.waitForTimeout(500)
    }
  }
}

/** 扩展测试 fixture */
export const test = base.extend<{ goiPage: GoiPage }>({
  goiPage: async ({ page }, use) => {
    const goiPage = new GoiPage(page)
    await use(goiPage)
  },
})

export { expect }
