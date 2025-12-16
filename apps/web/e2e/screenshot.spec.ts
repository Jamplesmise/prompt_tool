import { test } from './goi/fixtures'

test('screenshot GOI panel', async ({ page, goiPage }) => {
  await page.goto('/')
  await goiPage.login()
  await page.waitForLoadState('networkidle')
  
  // 打开 Copilot
  await goiPage.openCopilot()
  await goiPage.switchMode('assisted')
  
  // 输入一个目标
  await goiPage.startWithGoal('帮我查看当前的任务列表')
  
  // 等待一会儿看看状态
  await page.waitForTimeout(10000)
  
  // 截图
  await page.screenshot({ path: '/tmp/goi-state.png', fullPage: true })
  console.log('Screenshot saved')
})
