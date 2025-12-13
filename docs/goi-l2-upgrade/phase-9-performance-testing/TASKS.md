# Phase 9: 性能测试 - 任务清单

## 任务总览

| 任务 | 状态 | 优先级 |
|------|------|--------|
| 9.1 响应时间基准测试 | ⬜ 待开始 | P0 |
| 9.2 API 性能测试 | ⬜ 待开始 | P1 |
| 9.3 并发压力测试 | ⬜ 待开始 | P1 |
| 9.4 长会话稳定性测试 | ⬜ 待开始 | P2 |
| 9.5 性能报告生成 | ⬜ 待开始 | P1 |

---

## 9.1 响应时间基准测试

### 任务描述
测试关键操作的响应时间，确保达到 L2 标准。

### 测试用例

- [ ] **PERF-001**: 计划生成时间 < 500ms（模板匹配）

  ```typescript
  test('PERF-001: 模板匹配计划生成 < 500ms', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 简单任务应该命中模板
    const startTime = Date.now()
    await goiPage.startWithGoal('查看任务列表')
    await goiPage.waitForTodoList()
    const planTime = Date.now() - startTime

    expect(planTime).toBeLessThan(500)
    console.log(`[PERF-001] Template plan time: ${planTime}ms`)
  })
  ```

- [ ] **PERF-002**: 计划生成时间 < 5s（LLM 规划）

  ```typescript
  test('PERF-002: LLM 规划 < 5s', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 复杂任务需要 LLM 规划
    const startTime = Date.now()
    await goiPage.startWithGoal('帮我分析最近一周的任务执行情况，找出失败率最高的提示词')
    await goiPage.waitForTodoList()
    const planTime = Date.now() - startTime

    expect(planTime).toBeLessThan(5000)
    console.log(`[PERF-002] LLM plan time: ${planTime}ms`)
  })
  ```

- [ ] **PERF-003**: 暂停响应时间 < 500ms

  ```typescript
  test('PERF-003: 暂停响应 < 500ms', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('auto')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    const startTime = Date.now()
    await goiPage.switchMode('manual')
    const pauseTime = Date.now() - startTime

    expect(pauseTime).toBeLessThan(500)
    console.log(`[PERF-003] Pause response time: ${pauseTime}ms`)
  })
  ```

- [ ] **PERF-004**: 检查点渲染时间 < 200ms

  ```typescript
  test('PERF-004: 检查点渲染 < 200ms', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    // 监听检查点出现
    const startTime = Date.now()
    await goiPage.waitForCheckpoint()
    const renderTime = Date.now() - startTime

    // 减去网络等待时间，验证渲染性能
    expect(renderTime).toBeLessThan(3000) // 包含网络
    console.log(`[PERF-004] Checkpoint render time: ${renderTime}ms`)
  })
  ```

- [ ] **PERF-005**: 模式切换时间 < 100ms

  ```typescript
  test('PERF-005: 模式切换 < 100ms', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()

    const times: number[] = []

    for (const mode of ['manual', 'assisted', 'auto', 'manual'] as const) {
      const startTime = Date.now()
      await goiPage.switchMode(mode)
      times.push(Date.now() - startTime)
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(100)
    console.log(`[PERF-005] Mode switch avg: ${avgTime}ms`)
  })
  ```

### 结果记录表

| 指标 | 目标 | 实测 | 状态 |
|------|------|------|------|
| 计划生成（模板） | < 500ms | - | ⬜ |
| 计划生成（LLM） | < 5s | - | ⬜ |
| 暂停响应 | < 500ms | - | ⬜ |
| 检查点渲染 | < 200ms | - | ⬜ |
| 模式切换 | < 100ms | - | ⬜ |

### 验收标准
- [ ] 所有 P0 指标达标
- [ ] 测试结果已记录

---

## 9.2 API 性能测试

### 任务描述
测试各 API 端点的响应时间。

### 测试用例

- [ ] **PERF-API-001**: `/api/goi/agent/start` 响应时间

  ```typescript
  test('PERF-API-001: /agent/start 性能', async () => {
    const times: number[] = []

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      await fetch('/api/goi/agent/start', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: `perf-test-${Date.now()}-${i}`,
          goal: '创建任务',
          modelId: 'gpt-4'
        })
      })
      times.push(Date.now() - startTime)
    }

    const avg = times.reduce((a, b) => a + b) / times.length
    expect(avg).toBeLessThan(3000)
    console.log(`[PERF-API-001] /agent/start avg: ${avg}ms`)
  })
  ```

- [ ] **PERF-API-002**: `/api/goi/agent/step` 响应时间

  | 测试项 | 样本数 | 目标 |
  |--------|--------|------|
  | 单步执行 | 3 | < 2s |

- [ ] **PERF-API-003**: `/api/goi/agent/pause` 响应时间

  | 测试项 | 样本数 | 目标 |
  |--------|--------|------|
  | 暂停操作 | 5 | < 500ms |

- [ ] **PERF-API-004**: `/api/goi/agent/status` 响应时间

  | 测试项 | 样本数 | 目标 |
  |--------|--------|------|
  | 状态查询 | 10 | < 100ms |

- [ ] **PERF-API-005**: `/api/goi/collaboration/mode` 响应时间

  | 测试项 | 样本数 | 目标 |
  |--------|--------|------|
  | 模式切换 | 5 | < 200ms |

### 结果记录表

| API | 目标 | 平均 | 最大 | P95 | 状态 |
|-----|------|------|------|-----|------|
| /agent/start | < 3s | - | - | - | ⬜ |
| /agent/step | < 2s | - | - | - | ⬜ |
| /agent/pause | < 500ms | - | - | - | ⬜ |
| /agent/status | < 100ms | - | - | - | ⬜ |
| /collaboration/mode | < 200ms | - | - | - | ⬜ |

### 验收标准
- [ ] 所有 API 平均响应时间达标
- [ ] P95 响应时间合理

---

## 9.3 并发压力测试

### 任务描述
测试系统在并发负载下的表现。

### 测试用例

- [ ] **STRESS-001**: 并发 10 个会话

  ```typescript
  test('STRESS-001: 10 并发会话', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => `stress-${Date.now()}-${i}`)

    const startTime = Date.now()

    // 并发启动
    const results = await Promise.all(
      sessions.map(sessionId =>
        fetch('/api/goi/agent/start', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            goal: '创建任务',
            modelId: 'gpt-4'
          })
        }).then(res => res.json())
      )
    )

    const totalTime = Date.now() - startTime
    const successCount = results.filter(r => r.code === 200).length

    expect(successCount).toBeGreaterThanOrEqual(8) // 至少 80% 成功
    console.log(`[STRESS-001] 10 concurrent: ${totalTime}ms, ${successCount}/10 success`)
  })
  ```

- [ ] **STRESS-002**: 连续 50 个请求

  ```typescript
  test('STRESS-002: 50 连续请求', async () => {
    const results: number[] = []

    for (let i = 0; i < 50; i++) {
      const startTime = Date.now()
      await fetch('/api/goi/agent/status?sessionId=test')
      results.push(Date.now() - startTime)
    }

    const avg = results.reduce((a, b) => a + b) / results.length
    const max = Math.max(...results)

    expect(avg).toBeLessThan(100)
    expect(max).toBeLessThan(500)
    console.log(`[STRESS-002] 50 requests: avg=${avg}ms, max=${max}ms`)
  })
  ```

- [ ] **STRESS-003**: 快速模式切换

  ```typescript
  test('STRESS-003: 快速模式切换', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()

    const modes: Array<'manual' | 'assisted' | 'auto'> = []
    for (let i = 0; i < 20; i++) {
      modes.push(['manual', 'assisted', 'auto'][i % 3] as any)
    }

    const startTime = Date.now()
    for (const mode of modes) {
      await goiPage.switchMode(mode)
    }
    const totalTime = Date.now() - startTime

    expect(totalTime).toBeLessThan(5000) // 20 次切换 < 5s
    console.log(`[STRESS-003] 20 mode switches: ${totalTime}ms`)
  })
  ```

### 结果记录表

| 测试 | 指标 | 结果 | 状态 |
|------|------|------|------|
| 10 并发 | >= 80% 成功 | - | ⬜ |
| 50 连续 | avg < 100ms | - | ⬜ |
| 20 切换 | < 5s | - | ⬜ |

### 验收标准
- [ ] 并发测试无崩溃
- [ ] 响应时间稳定

---

## 9.4 长会话稳定性测试

### 任务描述
测试长时间运行的会话稳定性。

### 测试用例

- [ ] **STABILITY-001**: 20 步骤长会话

  ```typescript
  test('STABILITY-001: 20 步骤会话', async () => {
    const sessionId = `long-session-${Date.now()}`
    await startAgent(sessionId, '创建一个复杂的评估任务')

    let stepCount = 0
    let errorCount = 0

    while (stepCount < 20) {
      try {
        const response = await fetch('/api/goi/agent/step', {
          method: 'POST',
          body: JSON.stringify({ sessionId })
        })

        const data = await response.json()

        if (data.data.status.status === 'completed') break
        if (data.data.status.status === 'checkpoint') {
          await approveCheckpoint(sessionId, data.data.checkpoint?.id)
        }

        stepCount++
      } catch (error) {
        errorCount++
        if (errorCount > 3) break
      }
    }

    expect(errorCount).toBeLessThan(3)
    console.log(`[STABILITY-001] Long session: ${stepCount} steps, ${errorCount} errors`)
  })
  ```

- [ ] **STABILITY-002**: 内存使用监控

  ```typescript
  test('STABILITY-002: 内存使用', async ({ page }) => {
    // 记录初始内存
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // 执行多次操作
    for (let i = 0; i < 10; i++) {
      await page.goto('/')
      await page.click('[data-testid="copilot-toggle"]')
      await page.waitForTimeout(500)
    }

    // 记录最终内存
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    const memoryIncrease = finalMemory - initialMemory
    const increasePercent = (memoryIncrease / initialMemory) * 100

    // 内存增长不应超过 50%
    expect(increasePercent).toBeLessThan(50)
    console.log(`[STABILITY-002] Memory increase: ${increasePercent.toFixed(2)}%`)
  })
  ```

- [ ] **STABILITY-003**: 连续执行多个任务

  ```typescript
  test('STABILITY-003: 连续多任务', async ({ page, goiPage }) => {
    await goiPage.login()
    await goiPage.openCopilot()

    for (let i = 0; i < 5; i++) {
      await goiPage.switchMode('assisted')
      await goiPage.startWithGoal(`测试任务 ${i + 1}: 查看列表`)

      try {
        await goiPage.waitForTodoList()
      } catch {
        // 超时继续
      }

      // 取消当前任务
      await goiPage.switchMode('manual')
      await page.waitForTimeout(500)

      // 验证系统状态正常
      const input = page.locator('[data-testid="goal-input"]')
      await expect(input).toBeVisible()
    }

    console.log(`[STABILITY-003] Completed 5 consecutive tasks`)
  })
  ```

### 结果记录表

| 测试 | 指标 | 结果 | 状态 |
|------|------|------|------|
| 20 步骤 | < 3 错误 | - | ⬜ |
| 内存使用 | 增长 < 50% | - | ⬜ |
| 连续任务 | 5 次无崩溃 | - | ⬜ |

### 验收标准
- [ ] 长会话稳定执行
- [ ] 无明显内存泄漏

---

## 9.5 性能报告生成

### 任务描述
汇总所有性能测试结果，生成报告。

### 子任务

- [ ] **9.5.1** 运行所有性能测试
  ```bash
  pnpm test -- --testPathPattern="performance|stress"
  pnpm test:e2e -- e2e/goi/performance.spec.ts
  ```

- [ ] **9.5.2** 收集测试结果

- [ ] **9.5.3** 生成性能报告

### 性能报告模板

```markdown
# GOI 性能测试报告

**测试日期**: YYYY-MM-DD
**测试版本**: v2.x.x
**测试环境**: Development

## 一、响应时间基准

| 指标 | 目标 | 实测 | P95 | 状态 |
|------|------|------|-----|------|
| 计划生成（模板） | < 500ms | XXXms | XXXms | ✅/❌ |
| 计划生成（LLM） | < 5s | XXXms | XXXms | ✅/❌ |
| 暂停响应 | < 500ms | XXXms | XXXms | ✅/❌ |
| 检查点渲染 | < 200ms | XXXms | XXXms | ✅/❌ |
| 模式切换 | < 100ms | XXXms | XXXms | ✅/❌ |

## 二、API 性能

| API | 目标 | 平均 | 最大 | P95 | 状态 |
|-----|------|------|------|-----|------|
| /agent/start | < 3s | XXXms | XXXms | XXXms | ✅/❌ |
| /agent/step | < 2s | XXXms | XXXms | XXXms | ✅/❌ |
| /agent/pause | < 500ms | XXXms | XXXms | XXXms | ✅/❌ |
| /agent/status | < 100ms | XXXms | XXXms | XXXms | ✅/❌ |

## 三、压力测试

| 测试 | 指标 | 结果 | 状态 |
|------|------|------|------|
| 10 并发 | >= 80% 成功 | X/10 | ✅/❌ |
| 50 连续 | avg < 100ms | XXXms | ✅/❌ |
| 20 切换 | < 5s | XXXms | ✅/❌ |

## 四、稳定性

| 测试 | 指标 | 结果 | 状态 |
|------|------|------|------|
| 20 步骤 | < 3 错误 | X 错误 | ✅/❌ |
| 内存使用 | 增长 < 50% | X% | ✅/❌ |
| 连续任务 | 无崩溃 | X 次 | ✅/❌ |

## 五、总结

- **达标率**: X/X (XX%)
- **主要瓶颈**: ...
- **优化建议**: ...
```

### 验收标准
- [ ] 性能报告生成完成
- [ ] 所有指标已记录
- [ ] 优化建议已提出

---

## 运行命令

```bash
# 运行性能测试
pnpm test -- --testPathPattern="performance"

# 运行压力测试
pnpm test -- --testPathPattern="stress"

# 运行 E2E 性能测试
pnpm test:e2e -- e2e/goi/performance.spec.ts

# 完整测试并生成报告
pnpm test -- --testPathPattern="performance|stress" --reporter=json --outputFile=perf-results.json
```

---

## 开发日志

| 日期 | 任务 | 完成内容 | 负责人 |
|------|------|---------|--------|
| - | - | - | - |
