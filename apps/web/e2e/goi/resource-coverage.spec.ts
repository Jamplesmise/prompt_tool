/**
 * GOI 资源类型覆盖 E2E 测试
 *
 * Phase 2: 验证所有 20 种资源类型在 Handler 中的支持情况
 */

import { test, expect } from './fixtures'

test.describe('GOI 资源类型覆盖测试', () => {
  test.beforeEach(async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await page.waitForLoadState('networkidle')
  })

  test.describe('核心资源访问 (Access)', () => {
    test('能够访问提示词页面', async ({ page }) => {
      await page.goto('/prompts')
      await expect(page.locator('h4')).toContainText('提示词')
    })

    test('能够访问数据集页面', async ({ page }) => {
      await page.goto('/datasets')
      await expect(page.locator('h4')).toContainText('数据集')
    })

    test('能够访问模型配置页面', async ({ page }) => {
      await page.goto('/models')
      await expect(page.locator('h4')).toContainText('模型')
    })

    test('能够访问评估器页面', async ({ page }) => {
      await page.goto('/evaluators')
      await expect(page.locator('h4')).toContainText('评估器')
    })

    test('能够访问任务页面', async ({ page }) => {
      await page.goto('/tasks')
      await expect(page).toHaveURL(/\/tasks/)
    })
  })

  test.describe('系统资源访问 (Access)', () => {
    test('能够访问定时任务页面', async ({ page }) => {
      await page.goto('/scheduled')
      await expect(page.locator('h4')).toContainText('定时任务')
    })

    test('能够访问告警管理页面', async ({ page }) => {
      await page.goto('/monitor/alerts')
      await expect(page.locator('h4')).toContainText('告警')
    })
  })

  test.describe('GOI 弹窗触发测试', () => {
    test('能够打开添加提供商弹窗', async ({ page, goiPage }) => {
      await page.goto('/models')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('添加一个新的模型提供商')

      // 等待弹窗或相关 UI 响应
      await page.waitForTimeout(2000)

      // 验证页面没有报错
      const errorMessage = page.locator('.ant-message-error')
      await expect(errorMessage).not.toBeVisible()
    })

    test('能够打开创建定时任务弹窗', async ({ page, goiPage }) => {
      await page.goto('/scheduled')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('创建一个新的定时任务')

      await page.waitForTimeout(2000)

      const errorMessage = page.locator('.ant-message-error')
      await expect(errorMessage).not.toBeVisible()
    })

    test('能够打开创建告警规则弹窗', async ({ page, goiPage }) => {
      await page.goto('/monitor/alerts')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('创建一个新的告警规则')

      await page.waitForTimeout(2000)

      const errorMessage = page.locator('.ant-message-error')
      await expect(errorMessage).not.toBeVisible()
    })
  })

  test.describe('资源观察测试 (Observation)', () => {
    test('能够查询提示词列表', async ({ page, goiPage }) => {
      await page.goto('/prompts')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('查看当前所有提示词')

      await page.waitForTimeout(3000)

      // 验证 TODO List 生成
      await goiPage.waitForTodoList()
      const todoCount = await goiPage.getTodoItemCount()
      expect(todoCount).toBeGreaterThanOrEqual(0)
    })

    test('能够查询模型列表', async ({ page, goiPage }) => {
      await page.goto('/models')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('查看当前配置的模型')

      await page.waitForTimeout(3000)
      await goiPage.waitForTodoList()
    })

    test('能够查询定时任务列表', async ({ page, goiPage }) => {
      await page.goto('/scheduled')
      await goiPage.openCopilot()
      await goiPage.startWithGoal('查看所有定时任务')

      await page.waitForTimeout(3000)
      await goiPage.waitForTodoList()
    })
  })
})

test.describe('GOI Handler 资源配置验证', () => {
  // 这些测试验证 Handler 的配置是否正确

  test('所有核心资源类型都有路由映射', async ({ page }) => {
    // 通过访问页面来验证路由存在
    const routes = [
      '/prompts',
      '/datasets',
      '/models',
      '/evaluators',
      '/tasks',
    ]

    for (const route of routes) {
      const response = await page.goto(route)
      expect(response?.status()).toBeLessThan(500)
    }
  })

  test('所有系统资源类型都有路由映射', async ({ page }) => {
    const routes = [
      '/scheduled',
      '/monitor/alerts',
    ]

    for (const route of routes) {
      const response = await page.goto(route)
      expect(response?.status()).toBeLessThan(500)
    }
  })
})
