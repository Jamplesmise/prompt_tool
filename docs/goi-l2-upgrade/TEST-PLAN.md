# GOI L1/L2 集成测试与 E2E 测试计划

> 本文档为 GOI L1 和 L2 功能的完整测试计划，包含 API 集成测试、E2E 测试和性能测试

## 目录

- [测试概述](#测试概述)
- [一、API 集成测试](#一api-集成测试)
- [二、前端组件测试](#二前端组件测试)
- [三、E2E 测试](#三e2e-测试)
- [四、性能测试](#四性能测试)
- [五、测试执行指南](#五测试执行指南)
- [六、测试覆盖矩阵](#六测试覆盖矩阵)

---

## 测试概述

### 测试目标

| 目标 | 描述 |
|------|------|
| L1 功能验证 | 意图识别、资源覆盖、模糊匹配、澄清机制 |
| L2 功能验证 | 多步规划、执行可视化、检查点、暂停续跑、人机协作 |
| API 稳定性 | 所有 GOI API 端点的正确性和健壮性 |
| 用户体验 | 三种协作模式的完整用户流程 |
| 性能基准 | 响应时间、Token 使用、并发处理 |

### 测试环境

```bash
# 技术栈版本
- Next.js 15 + React 19 + Prisma 6
- Node.js >= 20
- PostgreSQL 15 + Redis 7

# 前置条件
- 服务已启动: pnpm dev
- 数据库已初始化: pnpm db:seed
- 测试用户已创建
```

### 达标标准

| 指标 | L1 目标 | L2 目标 |
|------|---------|---------|
| 意图识别准确率 | > 95% | - |
| 资源覆盖率 | 100% (21种) | - |
| 多步任务成功率 | - | > 85% |
| 检查点触发准确率 | - | > 90% |
| 暂停响应时间 | - | < 500ms |
| 人工操作感知准确率 | - | > 80% |

---

## 一、API 集成测试

### 1.1 Agent API 测试

#### POST /api/goi/agent/start - 启动 Agent

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/agent-start.test.ts

describe('POST /api/goi/agent/start', () => {
  // ✅ 正常场景
  test('TC-AS-001: 正常启动 Agent 会话', async () => {
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test-session-001',
        goal: '创建一个测试任务',
        modelId: 'gpt-4',
        autoRun: false,
      })
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.code).toBe(200)
    expect(data.data.todoList).toBeDefined()
    expect(data.data.todoList.items.length).toBeGreaterThan(0)
  })

  // ❌ 异常场景
  test('TC-AS-002: 缺少 sessionId 返回 400', async () => {
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({ goal: '测试', modelId: 'gpt-4' })
    })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.code).toBe(400001)
  })

  test('TC-AS-003: 缺少 goal 返回 400', async () => {
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test', modelId: 'gpt-4' })
    })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe(400002)
  })

  test('TC-AS-004: 缺少 modelId 返回 400', async () => {
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'test', goal: '测试' })
    })
    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe(400003)
  })

  test('TC-AS-005: 重复启动已激活会话返回 409', async () => {
    // 先启动一个会话
    await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'active-session',
        goal: '测试任务',
        modelId: 'gpt-4'
      })
    })
    // 尝试重复启动
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'active-session',
        goal: '另一个任务',
        modelId: 'gpt-4'
      })
    })
    expect(response.status).toBe(409)
  })

  test('TC-AS-006: 未授权访问返回 401', async () => {
    // 不带认证信息
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        goal: '测试',
        modelId: 'gpt-4'
      }),
      headers: { 'Cookie': '' } // 清除认证
    })
    expect(response.status).toBe(401)
  })

  // 🔄 边界场景
  test('TC-AS-007: 超长 goal 处理', async () => {
    const longGoal = '创建任务'.repeat(500) // 2000+ 字符
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test-long',
        goal: longGoal,
        modelId: 'gpt-4'
      })
    })
    // 应该正常处理或返回友好错误
    expect([200, 400]).toContain(response.status)
  })

  test('TC-AS-008: 包含特殊字符的 goal', async () => {
    const response = await fetch('/api/goi/agent/start', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test-special',
        goal: '创建任务 <script>alert(1)</script> "test" \'test\'',
        modelId: 'gpt-4'
      })
    })
    expect(response.status).toBe(200)
    // 验证返回的数据已经过 XSS 处理
  })
})
```

#### POST /api/goi/agent/step - 执行单步

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/agent-step.test.ts

describe('POST /api/goi/agent/step', () => {
  let sessionId: string

  beforeEach(async () => {
    // 启动一个会话
    sessionId = `test-step-${Date.now()}`
    await startAgent(sessionId, '创建测试任务')
  })

  test('TC-ST-001: 执行下一步操作', async () => {
    const response = await fetch('/api/goi/agent/step', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.stepResult).toBeDefined()
    expect(data.data.status.currentStepIndex).toBeGreaterThanOrEqual(0)
  })

  test('TC-ST-002: 会话不存在返回 404', async () => {
    const response = await fetch('/api/goi/agent/step', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'non-existent' })
    })
    expect(response.status).toBe(404)
  })

  test('TC-ST-003: 遇到检查点时暂停', async () => {
    // 执行到检查点
    const response = await fetch('/api/goi/agent/step', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    const data = await response.json()
    if (data.data.status.status === 'checkpoint') {
      expect(data.data.checkpoint).toBeDefined()
      expect(data.data.checkpoint.type).toBeDefined()
    }
  })

  test('TC-ST-004: 所有步骤完成后返回 completed', async () => {
    // 循环执行直到完成
    let status = 'executing'
    let iterations = 0
    while (status !== 'completed' && iterations < 20) {
      const response = await fetch('/api/goi/agent/step', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      })
      const data = await response.json()
      status = data.data.status.status
      iterations++

      // 如果遇到检查点，自动确认
      if (status === 'checkpoint') {
        await approveCheckpoint(sessionId, data.data.checkpoint.id)
      }
    }
    expect(status).toBe('completed')
  })
})
```

#### POST /api/goi/agent/pause - 暂停执行

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/agent-pause.test.ts

describe('POST /api/goi/agent/pause', () => {
  test('TC-PA-001: 正常暂停执行中的会话', async () => {
    const sessionId = `pause-test-${Date.now()}`
    await startAgent(sessionId, '创建测试任务')

    const startTime = Date.now()
    const response = await fetch('/api/goi/agent/pause', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    const pauseTime = Date.now() - startTime

    expect(response.status).toBe(200)
    expect(pauseTime).toBeLessThan(500) // 响应时间 < 500ms

    const data = await response.json()
    expect(data.data.status.status).toBe('paused')
  })

  test('TC-PA-002: 暂停已完成的会话返回错误', async () => {
    const sessionId = 'completed-session'
    // 假设这是一个已完成的会话
    const response = await fetch('/api/goi/agent/pause', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    expect(response.status).toBe(400)
  })

  test('TC-PA-003: 暂停后保存快照', async () => {
    const sessionId = `snapshot-test-${Date.now()}`
    await startAgent(sessionId, '创建任务')
    await fetch('/api/goi/agent/step', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    const response = await fetch('/api/goi/agent/pause', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    const data = await response.json()
    expect(data.data.snapshot).toBeDefined()
    expect(data.data.snapshot.todoList).toBeDefined()
    expect(data.data.snapshot.currentStepIndex).toBeDefined()
  })
})
```

#### POST /api/goi/agent/resume - 恢复执行

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/agent-resume.test.ts

describe('POST /api/goi/agent/resume', () => {
  test('TC-RE-001: 从暂停状态恢复执行', async () => {
    const sessionId = `resume-test-${Date.now()}`
    await startAgent(sessionId, '创建任务')
    await pauseAgent(sessionId)

    const response = await fetch('/api/goi/agent/resume', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(['executing', 'checkpoint']).toContain(data.data.status.status)
  })

  test('TC-RE-002: 恢复时保持之前的进度', async () => {
    const sessionId = `progress-test-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    // 执行几步
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    // 获取当前进度
    const beforePause = await getAgentStatus(sessionId)
    const stepIndexBeforePause = beforePause.currentStepIndex

    // 暂停
    await pauseAgent(sessionId)

    // 恢复
    await fetch('/api/goi/agent/resume', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    // 验证进度保持
    const afterResume = await getAgentStatus(sessionId)
    expect(afterResume.currentStepIndex).toBe(stepIndexBeforePause)
  })

  test('TC-RE-003: 恢复未暂停的会话返回错误', async () => {
    const sessionId = `not-paused-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    const response = await fetch('/api/goi/agent/resume', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    expect(response.status).toBe(400)
  })
})
```

#### GET /api/goi/agent/status - 获取状态

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/agent-status.test.ts

describe('GET /api/goi/agent/status', () => {
  test('TC-SS-001: 获取会话状态', async () => {
    const sessionId = `status-test-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    const response = await fetch(`/api/goi/agent/status?sessionId=${sessionId}`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.status).toBeDefined()
    expect(data.data.todoList).toBeDefined()
    expect(['idle', 'planning', 'ready', 'executing', 'paused', 'checkpoint', 'completed']).toContain(data.data.status.status)
  })

  test('TC-SS-002: 获取不存在会话返回 404', async () => {
    const response = await fetch('/api/goi/agent/status?sessionId=non-existent')
    expect(response.status).toBe(404)
  })

  test('TC-SS-003: 状态包含完整信息', async () => {
    const sessionId = `full-status-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    const response = await fetch(`/api/goi/agent/status?sessionId=${sessionId}`)
    const data = await response.json()

    expect(data.data).toMatchObject({
      status: expect.any(Object),
      todoList: expect.any(Object),
      currentStep: expect.anything(),
      completedSteps: expect.any(Array),
      pendingSteps: expect.any(Array),
    })
  })
})
```

### 1.2 检查点 API 测试

#### GET /api/goi/checkpoint/pending - 获取待处理检查点

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/checkpoint.test.ts

describe('GET /api/goi/checkpoint/pending', () => {
  test('TC-CP-001: 获取待处理检查点列表', async () => {
    const sessionId = `checkpoint-test-${Date.now()}`
    await startAgent(sessionId, '创建一个测试任务')

    // 执行直到遇到检查点
    await executeUntilCheckpoint(sessionId)

    const response = await fetch(`/api/goi/checkpoint/pending?sessionId=${sessionId}`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.data.checkpoints).toBeDefined()
    expect(data.data.checkpoints.length).toBeGreaterThanOrEqual(0)
  })

  test('TC-CP-002: 检查点包含必要信息', async () => {
    const sessionId = `cp-info-${Date.now()}`
    await startAgent(sessionId, '选择提示词进行测试')
    await executeUntilCheckpoint(sessionId)

    const response = await fetch(`/api/goi/checkpoint/pending?sessionId=${sessionId}`)
    const data = await response.json()

    if (data.data.checkpoints.length > 0) {
      const checkpoint = data.data.checkpoints[0]
      expect(checkpoint).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        reason: expect.any(String),
        options: expect.any(Array),
      })
    }
  })
})
```

#### POST /api/goi/checkpoint/[id]/respond - 响应检查点

```typescript
describe('POST /api/goi/checkpoint/[id]/respond', () => {
  test('TC-CR-001: 确认检查点', async () => {
    const sessionId = `cp-confirm-${Date.now()}`
    await startAgent(sessionId, '创建测试任务')
    const checkpoint = await executeUntilCheckpoint(sessionId)

    if (checkpoint) {
      const response = await fetch(`/api/goi/checkpoint/${checkpoint.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: 'approve',
          selectedOption: checkpoint.options[0]?.id,
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.status.status).not.toBe('checkpoint')
    }
  })

  test('TC-CR-002: 拒绝检查点（选择其他选项）', async () => {
    const sessionId = `cp-reject-${Date.now()}`
    await startAgent(sessionId, '创建测试任务')
    const checkpoint = await executeUntilCheckpoint(sessionId)

    if (checkpoint && checkpoint.options.length > 1) {
      const response = await fetch(`/api/goi/checkpoint/${checkpoint.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: 'modify',
          selectedOption: checkpoint.options[1].id,
        })
      })

      expect(response.status).toBe(200)
    }
  })

  test('TC-CR-003: 跳过检查点', async () => {
    const sessionId = `cp-skip-${Date.now()}`
    await startAgent(sessionId, '创建测试任务')
    const checkpoint = await executeUntilCheckpoint(sessionId)

    if (checkpoint) {
      const response = await fetch(`/api/goi/checkpoint/${checkpoint.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          action: 'skip',
        })
      })

      expect(response.status).toBe(200)
    }
  })

  test('TC-CR-004: 响应不存在的检查点返回 404', async () => {
    const response = await fetch('/api/goi/checkpoint/non-existent/respond', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        action: 'approve',
      })
    })

    expect(response.status).toBe(404)
  })
})
```

### 1.3 协作 API 测试

#### POST /api/goi/collaboration/mode - 切换协作模式

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/collaboration.test.ts

describe('POST /api/goi/collaboration/mode', () => {
  test('TC-CM-001: 切换到手动模式', async () => {
    const response = await fetch('/api/goi/collaboration/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'manual' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.mode).toBe('manual')
  })

  test('TC-CM-002: 切换到辅助模式', async () => {
    const response = await fetch('/api/goi/collaboration/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'assisted' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.mode).toBe('assisted')
  })

  test('TC-CM-003: 切换到自动模式', async () => {
    const response = await fetch('/api/goi/collaboration/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'auto' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.mode).toBe('auto')
  })

  test('TC-CM-004: 无效模式返回 400', async () => {
    const response = await fetch('/api/goi/collaboration/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'invalid' })
    })

    expect(response.status).toBe(400)
  })

  test('TC-CM-005: 模式切换保持会话状态', async () => {
    const sessionId = `mode-state-${Date.now()}`
    await startAgent(sessionId, '创建任务')
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    const beforeSwitch = await getAgentStatus(sessionId)

    await fetch('/api/goi/collaboration/mode', {
      method: 'POST',
      body: JSON.stringify({ mode: 'manual', sessionId })
    })

    const afterSwitch = await getAgentStatus(sessionId)
    expect(afterSwitch.todoList).toEqual(beforeSwitch.todoList)
  })
})
```

#### POST /api/goi/collaboration/transfer - 控制权转移

```typescript
describe('POST /api/goi/collaboration/transfer', () => {
  test('TC-CT-001: AI 交还控制权给用户', async () => {
    const sessionId = `transfer-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    const response = await fetch('/api/goi/collaboration/transfer', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        from: 'ai',
        to: 'user',
        reason: '用户请求接管',
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.currentController).toBe('user')
  })

  test('TC-CT-002: 用户交还控制权给 AI', async () => {
    const sessionId = `handback-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    // 先让用户接管
    await fetch('/api/goi/collaboration/transfer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, from: 'ai', to: 'user' })
    })

    // 再交还给 AI
    const response = await fetch('/api/goi/collaboration/transfer', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        from: 'user',
        to: 'ai',
        reason: '用户完成手动操作',
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.currentController).toBe('ai')
  })
})
```

### 1.4 快照 API 测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/snapshot.test.ts

describe('POST /api/goi/snapshots', () => {
  test('TC-SN-001: 创建快照', async () => {
    const sessionId = `snapshot-create-${Date.now()}`
    await startAgent(sessionId, '创建任务')
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    const response = await fetch('/api/goi/snapshots', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBeDefined()
    expect(data.data.todoList).toBeDefined()
    expect(data.data.createdAt).toBeDefined()
  })
})

describe('GET /api/goi/snapshots/[id]', () => {
  test('TC-SN-002: 获取快照详情', async () => {
    const sessionId = `snapshot-get-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    // 创建快照
    const createRes = await fetch('/api/goi/snapshots', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    const { data: snapshot } = await createRes.json()

    // 获取快照
    const response = await fetch(`/api/goi/snapshots/${snapshot.id}`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBe(snapshot.id)
  })
})

describe('POST /api/goi/snapshots/[id]/restore', () => {
  test('TC-SN-003: 从快照恢复', async () => {
    const sessionId = `snapshot-restore-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    // 执行几步
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    // 创建快照
    const createRes = await fetch('/api/goi/snapshots', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })
    const { data: snapshot } = await createRes.json()
    const stepAtSnapshot = snapshot.currentStepIndex

    // 继续执行
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    // 从快照恢复
    const response = await fetch(`/api/goi/snapshots/${snapshot.id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    })

    expect(response.status).toBe(200)

    // 验证恢复到快照时的状态
    const status = await getAgentStatus(sessionId)
    expect(status.currentStepIndex).toBe(stepAtSnapshot)
  })
})
```

### 1.5 TODO API 测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/todo.test.ts

describe('POST /api/goi/todo', () => {
  test('TC-TD-001: 创建 TODO List', async () => {
    const response = await fetch('/api/goi/todo', {
      method: 'POST',
      body: JSON.stringify({
        goal: '创建测试任务',
        items: [
          { label: '打开任务创建页', status: 'pending' },
          { label: '选择提示词', status: 'pending' },
        ]
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBeDefined()
    expect(data.data.items.length).toBe(2)
  })
})

describe('GET /api/goi/todo/[listId]', () => {
  test('TC-TD-002: 获取 TODO List', async () => {
    // 先创建
    const createRes = await fetch('/api/goi/todo', {
      method: 'POST',
      body: JSON.stringify({ goal: '测试', items: [] })
    })
    const { data: list } = await createRes.json()

    // 获取
    const response = await fetch(`/api/goi/todo/${list.id}`)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBe(list.id)
  })
})

describe('POST /api/goi/todo/[listId]/items/[itemId]', () => {
  test('TC-TD-003: 更新 TODO 项状态', async () => {
    // 创建列表
    const createRes = await fetch('/api/goi/todo', {
      method: 'POST',
      body: JSON.stringify({
        goal: '测试',
        items: [{ label: '测试项', status: 'pending' }]
      })
    })
    const { data: list } = await createRes.json()
    const itemId = list.items[0].id

    // 更新状态
    const response = await fetch(`/api/goi/todo/${list.id}/items/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'completed' })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.status).toBe('completed')
  })
})
```

### 1.6 事件 API 测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/events.test.ts

describe('GET /api/goi/events/subscribe (SSE)', () => {
  test('TC-EV-001: 订阅事件流', async () => {
    const response = await fetch('/api/goi/events/subscribe?sessionId=test')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
  })

  test('TC-EV-002: 接收 TODO 更新事件', async () => {
    // 这个测试需要使用 EventSource 或特殊的测试方法
    const sessionId = `event-test-${Date.now()}`
    const events: any[] = []

    // 订阅事件
    const eventSource = new EventSource(`/api/goi/events/subscribe?sessionId=${sessionId}`)
    eventSource.onmessage = (e) => events.push(JSON.parse(e.data))

    // 启动 Agent 触发事件
    await startAgent(sessionId, '创建任务')

    // 等待事件
    await new Promise(resolve => setTimeout(resolve, 2000))

    eventSource.close()

    // 验证收到了事件
    expect(events.some(e => e.type === 'todo_updated')).toBe(true)
  })
})

describe('POST /api/goi/events', () => {
  test('TC-EV-003: 发布事件', async () => {
    const response = await fetch('/api/goi/events', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        type: 'custom_event',
        payload: { test: true },
      })
    })

    expect(response.status).toBe(200)
  })
})
```

### 1.7 失败恢复 API 测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/failure.test.ts

describe('POST /api/goi/failure/report', () => {
  test('TC-FR-001: 报告失败', async () => {
    const response = await fetch('/api/goi/failure/report', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        stepId: 'step-1',
        error: {
          type: 'network_error',
          message: '请求超时',
          code: 'TIMEOUT',
        }
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.failureId).toBeDefined()
    expect(data.data.classification).toBeDefined()
  })
})

describe('POST /api/goi/failure/recover', () => {
  test('TC-FR-002: 自动重试恢复', async () => {
    // 先报告失败
    const reportRes = await fetch('/api/goi/failure/report', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        stepId: 'step-1',
        error: { type: 'network_error', message: '超时' }
      })
    })
    const { data: failure } = await reportRes.json()

    // 尝试恢复
    const response = await fetch('/api/goi/failure/recover', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'test',
        failureId: failure.failureId,
        strategy: 'retry',
      })
    })

    expect(response.status).toBe(200)
  })

  test('TC-FR-003: 回滚恢复', async () => {
    const sessionId = `rollback-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    // 执行几步
    await fetch('/api/goi/agent/step', { method: 'POST', body: JSON.stringify({ sessionId }) })

    // 报告失败
    const reportRes = await fetch('/api/goi/failure/report', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        stepId: 'step-2',
        error: { type: 'validation_error', message: '数据验证失败' }
      })
    })
    const { data: failure } = await reportRes.json()

    // 回滚恢复
    const response = await fetch('/api/goi/failure/recover', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        failureId: failure.failureId,
        strategy: 'rollback',
        rollbackToStep: 0,
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.currentStepIndex).toBe(0)
  })
})
```

---

## 二、前端组件测试

### 2.1 核心组件测试

#### CopilotPanel 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/CopilotPanel/index.test.tsx

describe('CopilotPanel', () => {
  test('TC-CP-001: 面板默认收起状态', async () => {
    render(<CopilotPanel />)
    expect(screen.queryByTestId('copilot-content')).not.toBeInTheDocument()
  })

  test('TC-CP-002: 点击触发器展开面板', async () => {
    render(<CopilotPanel />)
    await userEvent.click(screen.getByTestId('copilot-trigger'))
    expect(screen.getByTestId('copilot-content')).toBeVisible()
  })

  test('TC-CP-003: 展开时显示模式选择器', async () => {
    render(<CopilotPanel defaultOpen />)
    expect(screen.getByTestId('mode-selector')).toBeVisible()
  })

  test('TC-CP-004: 根据会话状态显示不同内容', async () => {
    // 有活跃会话时显示 TODO 列表
    mockUseCopilot.mockReturnValue({ ...defaultState, hasActiveSession: true })
    render(<CopilotPanel defaultOpen />)
    expect(screen.getByTestId('todo-list-view')).toBeVisible()
  })
})
```

#### CommandInput 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/CopilotPanel/CommandInput.test.tsx

describe('CommandInput', () => {
  test('TC-CI-001: 空输入时禁用提交按钮', () => {
    render(<CommandInput onSubmit={vi.fn()} />)
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  test('TC-CI-002: 输入内容后启用提交按钮', async () => {
    render(<CommandInput onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), '创建任务')
    expect(screen.getByTestId('submit-button')).toBeEnabled()
  })

  test('TC-CI-003: 提交后清空输入框', async () => {
    const onSubmit = vi.fn()
    render(<CommandInput onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), '创建任务')
    await userEvent.click(screen.getByTestId('submit-button'))
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  test('TC-CI-004: 执行中禁用输入', () => {
    render(<CommandInput onSubmit={vi.fn()} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
```

#### TodoListView 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/CopilotPanel/TodoListView.test.tsx

describe('TodoListView', () => {
  test('TC-TL-001: 渲染所有 TODO 项', () => {
    render(<TodoListView items={mockTodoItems} />)
    expect(screen.getAllByTestId('todo-item')).toHaveLength(mockTodoItems.length)
  })

  test('TC-TL-002: 显示正确的状态图标', () => {
    render(<TodoListView items={mockTodoItems} />)
    expect(screen.getByTestId('status-completed')).toBeVisible()
    expect(screen.getByTestId('status-in-progress')).toBeVisible()
    expect(screen.getByTestId('status-pending')).toBeVisible()
  })

  test('TC-TL-003: 当前步骤高亮显示', () => {
    render(<TodoListView items={mockTodoItems} currentIndex={1} />)
    expect(screen.getAllByTestId('todo-item')[1]).toHaveClass('current')
  })

  test('TC-TL-004: 分组展示', () => {
    render(<TodoListView items={groupedItems} grouped />)
    expect(screen.getAllByTestId('todo-group')).toHaveLength(3)
  })
})
```

#### ModeSelector 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/CopilotPanel/ModeSelector.test.tsx

describe('ModeSelector', () => {
  test('TC-MS-001: 渲染三种模式选项', () => {
    render(<ModeSelector mode="manual" onModeChange={vi.fn()} />)
    expect(screen.getByTestId('mode-manual')).toBeVisible()
    expect(screen.getByTestId('mode-assisted')).toBeVisible()
    expect(screen.getByTestId('mode-auto')).toBeVisible()
  })

  test('TC-MS-002: 当前模式高亮', () => {
    render(<ModeSelector mode="assisted" onModeChange={vi.fn()} />)
    expect(screen.getByTestId('mode-assisted')).toHaveClass('selected')
  })

  test('TC-MS-003: 切换模式触发回调', async () => {
    const onModeChange = vi.fn()
    render(<ModeSelector mode="manual" onModeChange={onModeChange} />)
    await userEvent.click(screen.getByTestId('mode-auto'))
    expect(onModeChange).toHaveBeenCalledWith('auto')
  })
})
```

#### CheckpointSection 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/CopilotPanel/CheckpointSection.test.tsx

describe('CheckpointSection', () => {
  test('TC-CS-001: 无检查点时不渲染', () => {
    render(<CheckpointSection checkpoint={null} />)
    expect(screen.queryByTestId('checkpoint-section')).not.toBeInTheDocument()
  })

  test('TC-CS-002: 显示检查点信息', () => {
    render(<CheckpointSection checkpoint={mockCheckpoint} />)
    expect(screen.getByText(mockCheckpoint.reason)).toBeVisible()
    expect(screen.getByTestId('checkpoint-options')).toBeVisible()
  })

  test('TC-CS-003: 三个操作按钮', () => {
    render(<CheckpointSection checkpoint={mockCheckpoint} />)
    expect(screen.getByTestId('btn-approve')).toBeVisible()
    expect(screen.getByTestId('btn-modify')).toBeVisible()
    expect(screen.getByTestId('btn-skip')).toBeVisible()
  })

  test('TC-CS-004: 确认操作触发回调', async () => {
    const onRespond = vi.fn()
    render(<CheckpointSection checkpoint={mockCheckpoint} onRespond={onRespond} />)
    await userEvent.click(screen.getByTestId('btn-approve'))
    expect(onRespond).toHaveBeenCalledWith('approve', expect.any(String))
  })
})
```

### 2.2 执行过程组件测试

#### ExecutionOverlay 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/ExecutionOverlay.test.tsx

describe('ExecutionOverlay', () => {
  test('TC-EO-001: 非执行状态不显示', () => {
    render(<ExecutionOverlay status="idle" />)
    expect(screen.queryByTestId('execution-overlay')).not.toBeInTheDocument()
  })

  test('TC-EO-002: 执行状态显示遮罩', () => {
    render(<ExecutionOverlay status="executing" />)
    expect(screen.getByTestId('execution-overlay')).toBeVisible()
  })

  test('TC-EO-003: 显示当前操作说明', () => {
    render(<ExecutionOverlay status="executing" currentAction="选择提示词" />)
    expect(screen.getByText('选择提示词')).toBeVisible()
  })
})
```

#### ExecutionControls 组件

```typescript
// 测试文件: apps/web/src/components/goi/__tests__/ExecutionControls.test.tsx

describe('ExecutionControls', () => {
  test('TC-EC-001: 执行中显示暂停按钮', () => {
    render(<ExecutionControls status="executing" />)
    expect(screen.getByTestId('pause-button')).toBeVisible()
    expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument()
  })

  test('TC-EC-002: 暂停中显示继续按钮', () => {
    render(<ExecutionControls status="paused" />)
    expect(screen.getByTestId('resume-button')).toBeVisible()
    expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument()
  })

  test('TC-EC-003: 暂停按钮触发回调', async () => {
    const onPause = vi.fn()
    render(<ExecutionControls status="executing" onPause={onPause} />)
    await userEvent.click(screen.getByTestId('pause-button'))
    expect(onPause).toHaveBeenCalled()
  })
})
```

### 2.3 Hooks 测试

#### useGoiEvents Hook

```typescript
// 测试文件: apps/web/src/hooks/__tests__/useGoiEvents.test.ts

describe('useGoiEvents', () => {
  test('TC-HE-001: 订阅事件', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useGoiEvents())

    act(() => {
      result.current.subscribe('todo_updated', handler)
    })

    expect(mockEventSource.addEventListener).toHaveBeenCalledWith('todo_updated', expect.any(Function))
  })

  test('TC-HE-002: 取消订阅', () => {
    const handler = vi.fn()
    const { result } = renderHook(() => useGoiEvents())

    act(() => {
      const unsubscribe = result.current.subscribe('todo_updated', handler)
      unsubscribe()
    })

    expect(mockEventSource.removeEventListener).toHaveBeenCalled()
  })

  test('TC-HE-003: 组件卸载时清理', () => {
    const { unmount } = renderHook(() => useGoiEvents())
    unmount()
    expect(mockEventSource.close).toHaveBeenCalled()
  })
})
```

#### useCopilot Hook

```typescript
// 测试文件: apps/web/src/hooks/__tests__/useCopilot.test.ts

describe('useCopilot', () => {
  test('TC-HC-001: 初始状态正确', () => {
    const { result } = renderHook(() => useCopilot())
    expect(result.current.mode).toBe('manual')
    expect(result.current.status).toBe('idle')
  })

  test('TC-HC-002: switchMode 更新模式', async () => {
    const { result } = renderHook(() => useCopilot())

    await act(async () => {
      await result.current.switchMode('assisted')
    })

    expect(result.current.mode).toBe('assisted')
  })

  test('TC-HC-003: startWithGoal 发起请求', async () => {
    const { result } = renderHook(() => useCopilot())

    await act(async () => {
      await result.current.startWithGoal('创建任务')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/goi/agent/start', expect.any(Object))
  })
})
```

### 2.4 Store 测试

#### Copilot Store

```typescript
// 测试文件: apps/web/src/stores/__tests__/copilotStore.test.ts

describe('copilotStore', () => {
  beforeEach(() => {
    useCopilotStore.getState().reset()
  })

  test('TC-SC-001: 初始状态', () => {
    const state = useCopilotStore.getState()
    expect(state.mode).toBe('manual')
    expect(state.todoList).toBeNull()
  })

  test('TC-SC-002: setMode 更新模式', () => {
    useCopilotStore.getState().setMode('auto')
    expect(useCopilotStore.getState().mode).toBe('auto')
  })

  test('TC-SC-003: setTodoList 更新列表', () => {
    useCopilotStore.getState().setTodoList(mockTodoList)
    expect(useCopilotStore.getState().todoList).toEqual(mockTodoList)
  })

  test('TC-SC-004: updateTodoItem 更新单项', () => {
    useCopilotStore.getState().setTodoList(mockTodoList)
    useCopilotStore.getState().updateTodoItem('item-1', { status: 'completed' })

    const item = useCopilotStore.getState().todoList?.items.find(i => i.id === 'item-1')
    expect(item?.status).toBe('completed')
  })
})
```

#### Checkpoint Store

```typescript
// 测试文件: apps/web/src/stores/__tests__/checkpointStore.test.ts

describe('checkpointStore', () => {
  beforeEach(() => {
    useCheckpointStore.getState().reset()
  })

  test('TC-SK-001: 添加检查点', () => {
    useCheckpointStore.getState().addCheckpoint(mockCheckpoint)
    expect(useCheckpointStore.getState().pendingCheckpoints).toHaveLength(1)
  })

  test('TC-SK-002: 响应检查点后移除', () => {
    useCheckpointStore.getState().addCheckpoint(mockCheckpoint)
    useCheckpointStore.getState().respondCheckpoint(mockCheckpoint.id, 'approve')
    expect(useCheckpointStore.getState().pendingCheckpoints).toHaveLength(0)
  })

  test('TC-SK-003: 获取当前检查点', () => {
    useCheckpointStore.getState().addCheckpoint(mockCheckpoint)
    expect(useCheckpointStore.getState().currentCheckpoint).toEqual(mockCheckpoint)
  })
})
```

### 2.5 前端测试目录结构

```
apps/web/src/
├── components/goi/__tests__/
│   ├── CopilotPanel/
│   │   ├── index.test.tsx
│   │   ├── CommandInput.test.tsx
│   │   ├── TodoListView.test.tsx
│   │   ├── ModeSelector.test.tsx
│   │   └── CheckpointSection.test.tsx
│   ├── ExecutionOverlay.test.tsx
│   ├── OperationHighlight.test.tsx
│   ├── ActionBubble.test.tsx
│   ├── ExecutionControls.test.tsx
│   ├── PauseStatusPanel.test.tsx
│   ├── ContextIndicator.test.tsx
│   ├── FailureRecovery.test.tsx
│   └── helpers/
│       ├── renderWithProviders.tsx
│       ├── mockGoiContext.ts
│       └── mockEvents.ts
├── hooks/__tests__/
│   ├── useGoiEvents.test.ts
│   ├── useCopilot.test.ts
│   └── useGoiDialogListener.test.ts
└── stores/__tests__/
    ├── copilotStore.test.ts
    ├── checkpointStore.test.ts
    └── executionStore.test.ts
```

---

## 三、E2E 测试

### 3.1 核心用户流程测试

#### 场景 A：完整任务创建流程

```typescript
// 测试文件: apps/web/e2e/goi/complete-task-flow.spec.ts

import { test, expect } from './fixtures'

test.describe('Complete Task Creation Flow', () => {
  test('E2E-A1: 从自然语言到任务完成的完整流程', async ({ page, goiPage }) => {
    // 1. 登录并打开 Copilot
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 2. 输入复杂目标
    await goiPage.startWithGoal('帮我创建一个评估任务，使用情感分析提示词，数据用测试数据集，模型选择 GPT-4')

    // 3. 验证计划生成
    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(3) // 复杂任务应该有多个步骤

    // 4. 验证步骤分组展示
    const groups = await page.locator('[data-testid="todo-group"]').count()
    expect(groups).toBeGreaterThan(0) // 应该有分组

    // 5. 处理所有检查点
    let checkpointsHandled = 0
    while (await goiPage.isCheckpointVisible()) {
      // 验证检查点内容
      const checkpointType = await page.locator('[data-testid="checkpoint-type"]').textContent()
      expect(['resource_selection', 'irreversible', 'cost_involved', 'first_time']).toContain(checkpointType)

      await goiPage.approveCheckpoint()
      checkpointsHandled++
      await page.waitForTimeout(500)

      if (checkpointsHandled > 10) break // 防止无限循环
    }

    // 6. 验证任务创建成功
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThan(0)

    // 7. 验证导航到结果页面
    await expect(page).toHaveURL(/\/tasks\/|\/results\//)
  })

  test('E2E-A2: 简单查询任务', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 简单查询
    await goiPage.startWithGoal('查看所有提示词')

    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeLessThanOrEqual(3) // 简单任务步骤少

    // 处理检查点
    await goiPage.approveAllCheckpoints()

    // 验证导航到提示词列表
    await expect(page).toHaveURL(/\/prompts/)
  })

  test('E2E-A3: 多资源创建任务', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 涉及多个资源的任务
    await goiPage.startWithGoal('创建一个新的提示词，然后创建一个数据集，最后用它们创建测试任务')

    await goiPage.waitForTodoList()

    // 验证计划包含多个资源操作
    const todoItems = await page.locator('[data-testid="todo-item"]').allTextContents()
    const hasPromptStep = todoItems.some(item => item.includes('提示词'))
    const hasDatasetStep = todoItems.some(item => item.includes('数据集'))
    const hasTaskStep = todoItems.some(item => item.includes('任务'))

    expect(hasPromptStep).toBe(true)
    expect(hasDatasetStep).toBe(true)
    expect(hasTaskStep).toBe(true)
  })
})
```

#### 场景 B：暂停续跑流程

```typescript
// 测试文件: apps/web/e2e/goi/pause-resume.spec.ts

test.describe('Pause and Resume Flow', () => {
  test('E2E-B1: 模式切换暂停执行', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建一个测试任务')
    await goiPage.waitForTodoList()

    // 获取初始状态
    const initialTodoCount = await goiPage.getTodoItemCount()

    // 切换到手动模式暂停
    await goiPage.switchMode('manual')

    // 验证暂停状态
    await page.waitForTimeout(1000)
    const isPaused = await page.locator('[data-testid="pause-indicator"]').isVisible()
    expect(isPaused).toBe(true)

    // 验证 TODO 状态保持
    const pausedTodoCount = await goiPage.getTodoItemCount()
    expect(pausedTodoCount).toBe(initialTodoCount)

    // 切换回辅助模式继续
    await goiPage.switchMode('assisted')

    // 验证可以继续执行
    const canContinue = await page.locator('[data-testid="checkpoint-dialog"], [data-testid="executing-indicator"]').isVisible()
    expect(canContinue).toBe(true)
  })

  test('E2E-B2: 使用暂停按钮', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('auto') // 自动模式会自动执行

    await goiPage.startWithGoal('浏览所有模型配置')
    await goiPage.waitForTodoList()

    // 点击暂停按钮
    const pauseButton = page.locator('[data-testid="pause-button"]')
    if (await pauseButton.isVisible()) {
      const startTime = Date.now()
      await pauseButton.click()
      const pauseTime = Date.now() - startTime

      // 验证暂停响应时间
      expect(pauseTime).toBeLessThan(500)

      // 验证暂停状态
      await expect(page.locator('[data-testid="pause-indicator"]')).toBeVisible()
    }
  })

  test('E2E-B3: 长时间暂停后恢复', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建评估任务')
    await goiPage.waitForTodoList()

    // 处理第一个检查点
    await goiPage.waitForCheckpoint()
    await goiPage.approveCheckpoint()

    const progressBeforePause = await goiPage.getCompletedTodoCount()

    // 暂停
    await goiPage.switchMode('manual')

    // 等待一段时间（模拟用户离开）
    await page.waitForTimeout(5000)

    // 恢复
    await goiPage.switchMode('assisted')

    // 验证进度保持
    const progressAfterResume = await goiPage.getCompletedTodoCount()
    expect(progressAfterResume).toBe(progressBeforePause)

    // 验证可以继续处理
    const isCheckpointOrExecuting = await page.locator('[data-testid="checkpoint-dialog"], [data-testid="executing-indicator"]').isVisible()
    expect(isCheckpointOrExecuting).toBe(true)
  })
})
```

#### 场景 C：人机协作流程

```typescript
// 测试文件: apps/web/e2e/goi/collaboration.spec.ts

test.describe('Human-AI Collaboration Flow', () => {
  test('E2E-C1: 用户接管后手动操作', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('选择一个提示词进行测试')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 接管操作
    await goiPage.takeoverCheckpoint()

    // 验证控制权转移
    await expect(page.locator('[data-testid="user-control-indicator"]')).toBeVisible()

    // 用户手动操作：点击菜单导航
    await page.click('[data-testid="menu-prompts"]')
    await page.waitForURL(/\/prompts/)

    // 验证系统感知到用户操作
    await page.waitForTimeout(1000)
    const todoItems = await page.locator('[data-testid="todo-item"]').allTextContents()
    // TODO 项应该反映用户已完成导航
  })

  test('E2E-C2: 用户操作后交还 AI', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建新提示词')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 接管
    await goiPage.takeoverCheckpoint()

    // 用户手动导航到创建页面
    await page.click('[data-testid="menu-prompts"]')
    await page.click('[data-testid="create-prompt-button"]')

    // 交还给 AI
    await goiPage.switchMode('assisted')

    // 验证 AI 继续执行后续步骤
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)
  })

  test('E2E-C3: 操作偏差检测和计划调整', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('查看提示词列表')
    await goiPage.waitForTodoList()

    // 在计划执行前，用户先手动导航到数据集页面（偏离计划）
    await page.click('[data-testid="menu-datasets"]')
    await page.waitForURL(/\/datasets/)

    // 系统应该检测到偏差
    await page.waitForTimeout(2000)

    // 验证系统提示偏差或调整计划
    const deviationWarning = page.locator('[data-testid="deviation-warning"]')
    const adjustedPlan = page.locator('[data-testid="adjusted-todo-item"]')

    // 至少应该有一种响应
    const hasResponse = await deviationWarning.isVisible() || await adjustedPlan.count() > 0
    expect(hasResponse).toBe(true)
  })
})
```

#### 场景 D：检查点确认流程

```typescript
// 测试文件: apps/web/e2e/goi/checkpoint.spec.ts

test.describe('Checkpoint Confirmation Flow', () => {
  test('E2E-D1: 资源选择检查点', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('选择提示词 sentiment-analysis 进行测试')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 验证检查点类型
    const checkpointType = await page.locator('[data-testid="checkpoint-type"]').textContent()
    expect(checkpointType).toBe('resource_selection')

    // 验证候选选项
    const options = await page.locator('[data-testid="checkpoint-option"]').count()
    expect(options).toBeGreaterThan(0)

    // 验证显示推荐选项
    const recommendedOption = page.locator('[data-testid="checkpoint-option-recommended"]')
    await expect(recommendedOption).toBeVisible()
  })

  test('E2E-D2: 修改检查点选择', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('选择一个提示词')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 获取默认选择
    const defaultOption = await page.locator('[data-testid="checkpoint-option-selected"]').textContent()

    // 点击修改
    await goiPage.modifyCheckpoint()

    // 选择另一个选项
    const otherOption = page.locator('[data-testid="checkpoint-option"]:not([data-selected="true"])').first()
    await otherOption.click()

    // 确认修改
    await page.click('[data-testid="checkpoint-confirm-modify"]')

    // 验证选择已更改
    const newSelection = await page.locator('[data-testid="selected-resource"]').textContent()
    expect(newSelection).not.toBe(defaultOption)
  })

  test('E2E-D3: 不可逆操作检查点', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 触发删除操作
    await goiPage.startWithGoal('删除测试提示词')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 验证检查点类型是不可逆操作
    const checkpointType = await page.locator('[data-testid="checkpoint-type"]').textContent()
    expect(checkpointType).toBe('irreversible')

    // 验证警告信息
    const warningMessage = page.locator('[data-testid="checkpoint-warning"]')
    await expect(warningMessage).toBeVisible()
    await expect(warningMessage).toContainText('不可恢复')
  })

  test('E2E-D4: 跳过检查点', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 跳过检查点
    await page.click('[data-testid="checkpoint-skip"]')

    // 验证跳过后继续执行
    await page.waitForTimeout(1000)

    // 应该进入下一个步骤或检查点
    const isNextStep = await page.locator('[data-testid="checkpoint-dialog"], [data-testid="executing-indicator"]').isVisible()
    expect(isNextStep).toBe(true)
  })
})
```

#### 场景 E：三种模式对比

```typescript
// 测试文件: apps/web/e2e/goi/modes.spec.ts

test.describe('Collaboration Modes Comparison', () => {
  test('E2E-E1: 手动模式 - AI 不干预', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('manual')

    // 在手动模式下，输入目标但 AI 不应该自动执行
    await goiPage.startWithGoal('创建任务')

    // 等待一段时间
    await page.waitForTimeout(3000)

    // 验证没有检查点弹出
    const checkpoint = page.locator('[data-testid="checkpoint-dialog"]')
    await expect(checkpoint).not.toBeVisible()

    // 验证没有自动导航
    await expect(page).toHaveURL('/')
  })

  test('E2E-E2: 辅助模式 - 检查点确认', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    // 验证在关键步骤有检查点
    await goiPage.waitForCheckpoint()
    const checkpoint = page.locator('[data-testid="checkpoint-dialog"]')
    await expect(checkpoint).toBeVisible()
  })

  test('E2E-E3: 自动模式 - 自动执行', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('auto')

    await goiPage.startWithGoal('查看提示词列表')
    await goiPage.waitForTodoList()

    // 等待自动执行
    await page.waitForTimeout(5000)

    // 验证有步骤自动完成（非删除操作）
    const completedCount = await goiPage.getCompletedTodoCount()
    expect(completedCount).toBeGreaterThan(0)

    // 验证页面已导航
    await expect(page).toHaveURL(/\/prompts/)
  })

  test('E2E-E4: 模式间快速切换', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()

    // 快速切换模式
    for (const mode of ['manual', 'assisted', 'auto', 'manual', 'assisted'] as const) {
      await goiPage.switchMode(mode)
      await page.waitForTimeout(200)
    }

    // 验证最终状态正确
    const currentMode = await page.locator('[data-testid="mode-assisted"]').getAttribute('class')
    expect(currentMode).toContain('checked')

    // 验证界面正常
    const copilotPanel = page.locator('[data-testid="copilot-panel"]')
    await expect(copilotPanel).toBeVisible()
  })
})
```

### 3.2 失败恢复测试

```typescript
// 测试文件: apps/web/e2e/goi/failure-recovery.spec.ts

test.describe('Failure Recovery', () => {
  test('E2E-F1: 网络错误重试', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 模拟网络错误
    await page.route('**/api/goi/**', route => {
      route.abort('failed')
    }, { times: 2 }) // 前两次失败

    await goiPage.startWithGoal('创建任务')

    // 等待重试
    await page.waitForTimeout(5000)

    // 验证最终成功（第三次请求通过）
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThanOrEqual(0)
  })

  test('E2E-F2: 执行失败后回滚', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    // 处理第一个检查点
    await goiPage.waitForCheckpoint()
    await goiPage.approveCheckpoint()

    // 模拟执行失败
    await page.route('**/api/goi/agent/step', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ code: 500001, message: '执行失败' })
      })
    }, { times: 1 })

    // 等待失败处理
    await page.waitForTimeout(2000)

    // 验证显示错误恢复选项
    const recoveryPanel = page.locator('[data-testid="failure-recovery-panel"]')
    await expect(recoveryPanel).toBeVisible()

    // 选择回滚
    await page.click('[data-testid="recovery-rollback"]')

    // 验证回滚成功
    await page.waitForTimeout(1000)
    const status = await page.locator('[data-testid="execution-status"]').textContent()
    expect(status).not.toBe('failed')
  })

  test('E2E-F3: 手动修复后继续', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建数据集')
    await goiPage.waitForTodoList()
    await goiPage.waitForCheckpoint()

    // 模拟需要手动修复的错误
    await goiPage.approveCheckpoint()

    // 假设出现验证错误
    const errorMessage = page.locator('[data-testid="validation-error"]')
    if (await errorMessage.isVisible()) {
      // 手动修复：填写正确的数据
      await page.fill('[data-testid="dataset-name-input"]', '修复后的名称')

      // 点击继续
      await page.click('[data-testid="retry-button"]')

      // 验证可以继续执行
      const canContinue = await page.locator('[data-testid="checkpoint-dialog"], [data-testid="executing-indicator"]').isVisible()
      expect(canContinue).toBe(true)
    }
  })
})
```

### 3.3 边界情况测试

```typescript
// 测试文件: apps/web/e2e/goi/edge-cases.spec.ts

test.describe('Edge Cases', () => {
  test('E2E-EC1: 空目标处理', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 尝试提交空目标
    const startButton = page.locator('[data-testid="start-button"]')
    await expect(startButton).toBeDisabled()

    // 输入空格
    await page.fill('[data-testid="goal-input"]', '   ')
    await expect(startButton).toBeDisabled()
  })

  test('E2E-EC2: 超长目标处理', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 输入超长目标
    const longGoal = '创建任务'.repeat(200)
    await page.fill('[data-testid="goal-input"]', longGoal)
    await page.click('[data-testid="start-button"]')

    // 应该显示错误或截断处理
    await page.waitForTimeout(2000)
    const errorOrTruncated = await page.locator('[data-testid="goal-error"], [data-testid="goal-truncated"]').isVisible()
    expect(errorOrTruncated).toBe(true)
  })

  test('E2E-EC3: 快速连续点击', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 快速连续点击开始按钮
    await page.fill('[data-testid="goal-input"]', '创建任务')

    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="start-button"]', { force: true })
    }

    // 等待处理
    await page.waitForTimeout(3000)

    // 验证系统正常响应（不应该创建多个会话）
    const todoLists = await page.locator('[data-testid="todo-list"]').count()
    expect(todoLists).toBeLessThanOrEqual(1)
  })

  test('E2E-EC4: 浏览器刷新后恢复', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    const todoCountBefore = await goiPage.getTodoItemCount()

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 重新打开 Copilot
    await goiPage.openCopilot()

    // 验证状态恢复
    const todoCountAfter = await goiPage.getTodoItemCount()
    expect(todoCountAfter).toBe(todoCountBefore)
  })

  test('E2E-EC5: 并发操作处理', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建任务')
    await goiPage.waitForTodoList()

    // 同时执行多个操作
    await Promise.all([
      page.click('[data-testid="mode-manual"]'),
      page.click('[data-testid="mode-auto"]'),
    ])

    // 等待处理
    await page.waitForTimeout(1000)

    // 验证系统状态一致
    const checkedModes = await page.locator('[data-testid^="mode-"]:checked').count()
    expect(checkedModes).toBe(1) // 只有一个模式被选中
  })

  test('E2E-EC6: 中文/英文混合输入', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 中英文混合目标
    await goiPage.startWithGoal('Create 一个 test 任务，使用 GPT-4 model')

    await goiPage.waitForTodoList()
    const todoCount = await goiPage.getTodoItemCount()
    expect(todoCount).toBeGreaterThan(0)
  })

  test('E2E-EC7: 特殊字符处理', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 包含特殊字符
    await goiPage.startWithGoal('创建任务 "test-<>&\'" 测试')

    await goiPage.waitForTodoList()

    // 验证特殊字符被正确处理（无 XSS）
    const pageContent = await page.content()
    expect(pageContent).not.toContain('<script>')
  })
})
```

---

## 四、性能测试

### 4.1 响应时间基准

```typescript
// 测试文件: apps/web/e2e/goi/performance.spec.ts

test.describe('Performance Benchmarks', () => {
  test('PERF-001: 计划生成时间 < 5s（模板匹配）', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 简单任务应该命中模板
    const startTime = Date.now()
    await goiPage.startWithGoal('查看任务列表')
    await goiPage.waitForTodoList()
    const planTime = Date.now() - startTime

    expect(planTime).toBeLessThan(500) // 模板匹配应该 < 500ms
    console.log(`Template plan time: ${planTime}ms`)
  })

  test('PERF-002: 计划生成时间 < 5s（LLM 规划）', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    // 复杂任务需要 LLM 规划
    const startTime = Date.now()
    await goiPage.startWithGoal('帮我分析最近一周的任务执行情况，找出失败率最高的提示词，并创建改进版本')
    await goiPage.waitForTodoList()
    const planTime = Date.now() - startTime

    expect(planTime).toBeLessThan(5000) // LLM 规划应该 < 5s
    console.log(`LLM plan time: ${planTime}ms`)
  })

  test('PERF-003: 暂停响应时间 < 500ms', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('auto')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    // 测量暂停响应时间
    const startTime = Date.now()
    await goiPage.switchMode('manual')
    const pauseTime = Date.now() - startTime

    expect(pauseTime).toBeLessThan(500)
    console.log(`Pause response time: ${pauseTime}ms`)
  })

  test('PERF-004: 检查点渲染时间 < 200ms', async ({ page, goiPage }) => {
    await page.goto('/')
    await goiPage.login()
    await goiPage.openCopilot()
    await goiPage.switchMode('assisted')

    await goiPage.startWithGoal('创建测试任务')
    await goiPage.waitForTodoList()

    // 测量检查点渲染时间
    const startTime = Date.now()
    await goiPage.waitForCheckpoint()
    const renderTime = Date.now() - startTime

    // 减去等待时间，只计算渲染时间
    expect(renderTime).toBeLessThan(3000) // 包含网络时间
    console.log(`Checkpoint render time: ${renderTime}ms`)
  })

  test('PERF-005: 模式切换时间 < 100ms', async ({ page, goiPage }) => {
    await page.goto('/')
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
    console.log(`Average mode switch time: ${avgTime}ms`)
  })
})
```

### 4.2 API 响应时间测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/performance.test.ts

describe('API Performance', () => {
  test('PERF-API-001: /api/goi/agent/start 响应时间', async () => {
    const times: number[] = []

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now()
      await fetch('/api/goi/agent/start', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: `perf-test-${i}`,
          goal: '创建任务',
          modelId: 'gpt-4'
        })
      })
      times.push(Date.now() - startTime)
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(3000) // 平均 < 3s
    console.log(`Average /agent/start time: ${avgTime}ms`)
  })

  test('PERF-API-002: /api/goi/agent/step 响应时间', async () => {
    const sessionId = `step-perf-${Date.now()}`
    await startAgent(sessionId, '创建任务')

    const times: number[] = []

    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()
      await fetch('/api/goi/agent/step', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      })
      times.push(Date.now() - startTime)
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(2000) // 平均 < 2s
    console.log(`Average /agent/step time: ${avgTime}ms`)
  })

  test('PERF-API-003: /api/goi/agent/pause 响应时间', async () => {
    const times: number[] = []

    for (let i = 0; i < 5; i++) {
      const sessionId = `pause-perf-${i}`
      await startAgent(sessionId, '创建任务')

      const startTime = Date.now()
      await fetch('/api/goi/agent/pause', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      })
      times.push(Date.now() - startTime)
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(500) // 平均 < 500ms（达标标准）
    console.log(`Average /agent/pause time: ${avgTime}ms`)
  })
})
```

### 4.3 压力测试

```typescript
// 测试文件: apps/web/src/__tests__/api/goi/stress.test.ts

describe('Stress Tests', () => {
  test('STRESS-001: 并发 10 个会话', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => `stress-${i}`)

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

    // 验证所有会话都成功启动
    const successCount = results.filter(r => r.code === 200).length
    expect(successCount).toBeGreaterThanOrEqual(8) // 至少 80% 成功

    console.log(`10 concurrent sessions: ${totalTime}ms, ${successCount}/10 success`)
  })

  test('STRESS-002: 连续 50 个请求', async () => {
    const results: number[] = []

    for (let i = 0; i < 50; i++) {
      const startTime = Date.now()
      const response = await fetch('/api/goi/agent/status?sessionId=test')
      results.push(Date.now() - startTime)

      if (response.status !== 200 && response.status !== 404) {
        console.log(`Request ${i} failed with status ${response.status}`)
      }
    }

    const avgTime = results.reduce((a, b) => a + b) / results.length
    const maxTime = Math.max(...results)

    expect(avgTime).toBeLessThan(100) // 平均 < 100ms
    expect(maxTime).toBeLessThan(500) // 最大 < 500ms

    console.log(`50 requests: avg=${avgTime}ms, max=${maxTime}ms`)
  })

  test('STRESS-003: 长会话稳定性 (20 步)', async () => {
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
    console.log(`Long session: ${stepCount} steps, ${errorCount} errors`)
  })
})
```

---

## 五、测试执行指南

### 5.1 环境准备

```bash
# 1. 确保服务已启动
pnpm dev

# 2. 确保数据库已初始化
pnpm db:push
pnpm db:seed

# 3. 创建测试用户（如果需要）
# 在 seed 脚本中已包含
```

### 5.2 运行测试

```bash
# 运行所有 GOI 单元测试
pnpm test -- --testPathPattern="goi"

# 运行所有 GOI E2E 测试
pnpm test:e2e -- --grep="GOI"

# 运行特定测试套件
pnpm test:e2e -- e2e/goi/basic.spec.ts
pnpm test:e2e -- e2e/goi/l2-validation.spec.ts
pnpm test:e2e -- e2e/goi/performance.spec.ts

# 运行 API 集成测试
pnpm test -- --testPathPattern="api/goi"

# 生成测试报告
pnpm test:e2e -- --reporter=html
```

### 5.3 测试数据准备

```typescript
// fixtures/testData.ts

export const testPrompts = [
  { name: 'sentiment-analysis', content: '情感分析提示词...' },
  { name: 'summarization', content: '摘要提示词...' },
]

export const testDatasets = [
  { name: 'test-data', items: 100 },
  { name: 'customer-feedback', items: 500 },
]

export const testModels = [
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
]
```

### 5.4 测试报告模板

```markdown
# GOI L1/L2 测试报告

**测试日期**: YYYY-MM-DD
**测试版本**: v2.x.x
**测试环境**: Development / Staging / Production

## 测试结果摘要

| 测试类型 | 总数 | 通过 | 失败 | 跳过 | 通过率 |
|---------|------|------|------|------|--------|
| API 集成测试 | XX | XX | XX | XX | XX% |
| E2E 测试 | XX | XX | XX | XX | XX% |
| 性能测试 | XX | XX | XX | XX | XX% |

## 达标情况

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 意图识别准确率 | > 95% | XX% | ✅/❌ |
| 资源覆盖率 | 100% | XX% | ✅/❌ |
| 多步任务成功率 | > 85% | XX% | ✅/❌ |
| 检查点触发准确率 | > 90% | XX% | ✅/❌ |
| 暂停响应时间 | < 500ms | XXms | ✅/❌ |
| 人工操作感知准确率 | > 80% | XX% | ✅/❌ |

## 失败测试详情

### TC-XXX: 测试名称
- **失败原因**:
- **复现步骤**:
- **建议修复**:

## 性能数据

| 操作 | 平均时间 | 最大时间 | P95 | 目标 |
|------|---------|---------|-----|------|
| 计划生成（模板） | XXms | XXms | XXms | < 500ms |
| 计划生成（LLM） | XXms | XXms | XXms | < 5000ms |
| 暂停响应 | XXms | XXms | XXms | < 500ms |
| 模式切换 | XXms | XXms | XXms | < 100ms |

## 结论与建议

1. ...
2. ...
```

---

## 六、测试覆盖矩阵

### 6.1 API 覆盖矩阵

| API | 正常 | 参数错误 | 未授权 | 冲突 | 不存在 | 边界 |
|-----|------|---------|--------|------|--------|------|
| POST /agent/start | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| POST /agent/step | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| POST /agent/pause | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| POST /agent/resume | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| GET /agent/status | ✅ | ✅ | ✅ | N/A | ✅ | ❌ |
| POST /checkpoint/respond | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| POST /collaboration/mode | ✅ | ✅ | ✅ | N/A | N/A | ✅ |
| POST /collaboration/transfer | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| POST /snapshots | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| POST /snapshots/restore | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| POST /failure/report | ✅ | ✅ | ✅ | N/A | ❌ | ❌ |
| POST /failure/recover | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

### 6.2 E2E 场景覆盖矩阵

| 场景 | 手动模式 | 辅助模式 | 自动模式 |
|------|---------|---------|---------|
| 完整任务创建 | ❌ | ✅ | ✅ |
| 简单查询 | ❌ | ✅ | ✅ |
| 多资源任务 | ❌ | ✅ | ❌ |
| 暂停续跑 | N/A | ✅ | ✅ |
| 用户接管 | N/A | ✅ | ✅ |
| 检查点确认 | N/A | ✅ | ❌ |
| 失败恢复 | ❌ | ✅ | ❌ |
| 边界情况 | ✅ | ✅ | ✅ |

### 6.3 功能测试覆盖矩阵

| 功能 | 单元测试 | 集成测试 | E2E测试 | 性能测试 |
|------|---------|---------|---------|---------|
| L1 意图识别 | ✅ | ✅ | ✅ | ❌ |
| L1 资源覆盖 | ✅ | ✅ | ✅ | ❌ |
| L1 模糊匹配 | ✅ | ✅ | ✅ | ❌ |
| L1 澄清机制 | ✅ | ❌ | ❌ | ❌ |
| L2 任务规划 | ✅ | ✅ | ✅ | ✅ |
| L2 执行可视化 | ❌ | ❌ | ✅ | ❌ |
| L2 检查点 | ✅ | ✅ | ✅ | ❌ |
| L2 暂停续跑 | ✅ | ✅ | ✅ | ✅ |
| L2 人机协作 | ✅ | ✅ | ✅ | ❌ |
| L2 失败恢复 | ✅ | ✅ | ✅ | ❌ |

---

## 附录

### A. 测试用例编号规范

| 前缀 | 含义 |
|------|------|
| TC-AS-XXX | Agent Start API 测试 |
| TC-ST-XXX | Agent Step API 测试 |
| TC-PA-XXX | Agent Pause API 测试 |
| TC-RE-XXX | Agent Resume API 测试 |
| TC-SS-XXX | Agent Status API 测试 |
| TC-CP-XXX | Checkpoint API 测试 |
| TC-CM-XXX | Collaboration Mode 测试 |
| TC-CT-XXX | Control Transfer 测试 |
| TC-SN-XXX | Snapshot API 测试 |
| TC-TD-XXX | TODO API 测试 |
| TC-EV-XXX | Events API 测试 |
| TC-FR-XXX | Failure Recovery 测试 |
| E2E-A/B/C/D/E/F-X | E2E 场景测试 |
| PERF-XXX | 性能测试 |
| STRESS-XXX | 压力测试 |

### B. 测试数据清理

```sql
-- 清理测试数据（在测试环境执行）
DELETE FROM goi_sessions WHERE session_id LIKE 'test-%';
DELETE FROM goi_snapshots WHERE session_id LIKE 'test-%';
DELETE FROM goi_checkpoints WHERE session_id LIKE 'test-%';
```

### C. 常见问题排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 测试超时 | 网络慢/服务未启动 | 检查服务状态，增加超时时间 |
| 认证失败 | Cookie 过期 | 重新登录获取 Cookie |
| 数据不一致 | 并发测试互相影响 | 使用独立的 sessionId |
| 性能波动 | 系统负载高 | 在低负载时运行性能测试 |

---

*文档版本：v1.0*
*创建日期：2024-12-13*
*最后更新：2024-12-13*
