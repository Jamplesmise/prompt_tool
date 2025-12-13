/**
 * GOI 调试测试
 */

import { test, expect } from './fixtures'

test.describe('GOI Debug', () => {
  test('页面加载和 Copilot 按钮可见性', async ({ page, goiPage }) => {
    // 1. 导航到工作台
    console.log('正在导航到 /')
    await page.goto('/')

    // 2. 等待页面加载
    console.log('等待页面加载...')
    await page.waitForLoadState('networkidle')

    // 3. 登录
    console.log('正在登录...')
    await goiPage.login()

    // 4. 等待页面稳定
    console.log('等待页面稳定...')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 5. 截图以调试
    await page.screenshot({ path: 'test-results/debug-after-login.png' })

    // 6. 检查 Copilot 按钮
    console.log('检查 Copilot 按钮...')
    const toggle = page.locator('[data-testid="copilot-toggle"]')
    const isVisible = await toggle.isVisible()
    console.log(`Copilot 按钮可见: ${isVisible}`)

    // 7. 如果不可见，打印页面上所有 button
    if (!isVisible) {
      const buttons = await page.locator('button').all()
      console.log(`页面上有 ${buttons.length} 个按钮`)

      // 查找带有 robot 图标的按钮
      const robotButton = page.locator('button:has([class*="robot"])')
      const robotVisible = await robotButton.isVisible().catch(() => false)
      console.log(`Robot 按钮可见: ${robotVisible}`)
    }

    // 8. 验证按钮存在
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })
})
