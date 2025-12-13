# Phase 5: 验证与修复 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 5.1 准备测试环境 | P0 | 30min | 待开始 |
| 5.2 执行功能测试 | P0 | 2h | 待开始 |
| 5.3 执行意图识别测试 | P0 | 2h | 待开始 |
| 5.4 执行端到端测试 | P0 | 2h | 待开始 |
| 5.5 问题修复 | P0 | 根据问题数量 | 待开始 |
| 5.6 编写测试报告 | P1 | 1h | 待开始 |

---

## 5.1 准备测试环境

### 任务描述

搭建测试环境，准备测试数据。

### 具体步骤

- [ ] 启动开发服务器：
  ```bash
  cd /home/alg/alg/claude_dev/prompt_tool
  pnpm dev
  ```

- [ ] 准备测试数据：
  - [ ] 创建 3-5 个测试用 Prompt
  - [ ] 创建 2-3 个测试用 Dataset
  - [ ] 创建 2-3 个测试用 Model
  - [ ] 创建 1-2 个测试用 Task

- [ ] 确认 GOI 相关服务正常：
  - [ ] `/api/goi/execute` 可访问
  - [ ] `/api/goi/events/subscribe` 可连接
  - [ ] CopilotPanel 组件可显示

---

## 5.2 执行功能测试

### 任务描述

测试所有资源类型的基本操作是否正常。

### 测试脚本

创建文件 `apps/web/src/lib/goi/__tests__/l1-validation.test.ts`：

```typescript
import { executeAccess } from '../executor/accessHandler'
import { executeState } from '../executor/stateHandler'
import { executeObservation } from '../executor/observationHandler'

const mockContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  teamId: 'test-team',
}

// 所有资源类型
const ALL_RESOURCE_TYPES = [
  'prompt', 'prompt_version', 'prompt_branch',
  'dataset', 'dataset_version',
  'model', 'provider',
  'evaluator',
  'task', 'task_result',
  'scheduled_task',
  'alert_rule', 'notify_channel',
  'input_schema', 'output_schema', 'evaluation_schema',
  'settings', 'dashboard', 'monitor', 'schema', 'comparison',
]

// 需要 State 支持的资源
const STATE_RESOURCE_TYPES = [
  'prompt', 'dataset', 'model', 'provider', 'evaluator', 'task',
  'scheduled_task', 'alert_rule', 'notify_channel',
  'input_schema', 'output_schema',
]

describe('L1 Validation - Access Handler', () => {
  ALL_RESOURCE_TYPES.forEach(type => {
    it(`should handle ${type} navigate action`, async () => {
      const result = await executeAccess({
        action: 'navigate',
        target: { resourceType: type as any }
      }, mockContext)

      expect(result.success).toBe(true)
      expect(result.result?.navigatedTo).toBeDefined()
      console.log(`  ✓ ${type}: ${result.result?.navigatedTo}`)
    })
  })
})

describe('L1 Validation - State Handler', () => {
  // 只测试验证逻辑，不实际执行创建
  STATE_RESOURCE_TYPES.forEach(type => {
    it(`should accept ${type} in resourceModelMap`, async () => {
      // 使用缺少必填字段的数据触发验证
      const result = await executeState({
        action: 'create',
        target: { resourceType: type as any },
        expectedState: {}  // 空数据会触发验证错误，但说明类型被识别
      }, mockContext)

      // 应该返回验证错误，而非"不支持的资源类型"
      if (!result.success) {
        expect(result.error).not.toContain('Unsupported resource type')
      }
      console.log(`  ✓ ${type}: supported`)
    })
  })
})

describe('L1 Validation - Observation Handler', () => {
  STATE_RESOURCE_TYPES.forEach(type => {
    it(`should handle ${type} query action`, async () => {
      const result = await executeObservation({
        action: 'query',
        target: { resourceType: type as any },
        query: { limit: 1 }
      }, mockContext)

      // 查询应该成功（可能返回空数组）
      expect(result.success).toBe(true)
      console.log(`  ✓ ${type}: queryable`)
    })
  })
})
```

### 执行测试

```bash
pnpm test -- --grep "L1 Validation"
```

### 记录结果

| 资源类型 | Access | State | Observation | 备注 |
|---------|--------|-------|-------------|------|
| prompt | - | - | - | - |
| dataset | - | - | - | - |
| model | - | - | - | - |
| provider | - | - | - | - |
| ... | - | - | - | - |

---

## 5.3 执行意图识别测试

### 任务描述

测试意图解析器的准确率。

### 测试脚本

创建文件 `apps/web/src/lib/goi/__tests__/intent-validation.test.ts`：

```typescript
import { parseIntent } from '../intent/parser'

// 测试用例
const TEST_CASES = {
  navigation: [
    { input: '打开模型配置', expectedResource: 'model' },
    { input: '去提示词页面', expectedResource: 'prompt' },
    { input: '进入设置', expectedResource: 'settings' },
    { input: '看看数据集', expectedResource: 'dataset' },
    { input: '打开定时任务', expectedResource: 'scheduled_task' },
    { input: 'open models', expectedResource: 'model' },
    { input: 'go to tasks', expectedResource: 'task' },
    { input: '首页', expectedResource: 'dashboard' },
  ],
  creation: [
    { input: '创建一个提示词', expectedResource: 'prompt' },
    { input: '新建数据集', expectedResource: 'dataset' },
    { input: '添加一个模型', expectedResource: 'model' },
    { input: '新增供应商', expectedResource: 'provider' },
    { input: '创建测试任务', expectedResource: 'task' },
    { input: 'create a prompt', expectedResource: 'prompt' },
  ],
  fuzzy: [
    { input: '打开prompt', expectedResource: 'prompt' },
    { input: '创建个ds', expectedResource: 'dataset' },
    { input: '添加llm', expectedResource: 'model' },
    { input: '查看模版', expectedResource: 'prompt' },
  ],
}

describe('Intent Recognition Validation', () => {
  describe('Navigation intents', () => {
    TEST_CASES.navigation.forEach(tc => {
      it(`"${tc.input}" → ${tc.expectedResource}`, async () => {
        const result = await parseIntent(tc.input)
        expect(result.success).toBe(true)
        expect(result.intent?.category).toBe('navigation')
        expect(result.intent?.resourceType).toBe(tc.expectedResource)
      })
    })
  })

  describe('Creation intents', () => {
    TEST_CASES.creation.forEach(tc => {
      it(`"${tc.input}" → ${tc.expectedResource}`, async () => {
        const result = await parseIntent(tc.input)
        expect(result.success).toBe(true)
        expect(result.intent?.category).toBe('creation')
        expect(result.intent?.resourceType).toBe(tc.expectedResource)
      })
    })
  })

  describe('Fuzzy matching', () => {
    TEST_CASES.fuzzy.forEach(tc => {
      it(`"${tc.input}" → ${tc.expectedResource}`, async () => {
        const result = await parseIntent(tc.input)
        expect(result.success).toBe(true)
        expect(result.intent?.resourceType).toBe(tc.expectedResource)
      })
    })
  })
})
```

### 统计准确率

```typescript
// 在测试结束后统计
afterAll(() => {
  const total = Object.values(TEST_CASES).flat().length
  const passed = /* 从测试结果获取 */
  const accuracy = (passed / total * 100).toFixed(1)
  console.log(`\n意图识别准确率: ${accuracy}% (${passed}/${total})`)
})
```

---

## 5.4 执行端到端测试

### 任务描述

在真实 UI 中测试完整流程。

### 测试场景

#### 场景 1：导航流程

1. [ ] 打开 CopilotPanel
2. [ ] 输入 "打开模型配置"
3. [ ] 验证：页面导航到 /models
4. [ ] 验证：TODO 列表显示 "打开模型配置页面 ✓"

#### 场景 2：创建流程

1. [ ] 在 CopilotPanel 输入 "创建一个提示词"
2. [ ] 验证：页面导航到 /prompts/new
3. [ ] 验证：TODO 列表显示合理的步骤分组

#### 场景 3：弹窗触发

1. [ ] 导航到 /models 页面
2. [ ] 输入 "添加一个模型"
3. [ ] 验证：AddModelModal 弹窗打开

#### 场景 4：澄清对话

1. [ ] 输入 "帮我看看"
2. [ ] 验证：系统返回澄清问题
3. [ ] 验证：提供合理的选项

#### 场景 5：模糊匹配

1. [ ] 输入 "打开prompt"
2. [ ] 验证：正确识别为 prompt
3. [ ] 验证：导航到 /prompts

### 记录结果

| 场景 | 结果 | 问题描述 |
|------|------|---------|
| 导航流程 | - | - |
| 创建流程 | - | - |
| 弹窗触发 | - | - |
| 澄清对话 | - | - |
| 模糊匹配 | - | - |

---

## 5.5 问题修复

### 任务描述

修复测试中发现的问题。

### 问题跟踪表

| ID | 问题描述 | 严重程度 | 状态 | 修复位置 |
|----|---------|---------|------|---------|
| B001 | - | - | 待修复 | - |
| B002 | - | - | 待修复 | - |
| ... | - | - | - | - |

### 修复流程

对于每个问题：

1. [ ] 分析根本原因
2. [ ] 确定修复方案
3. [ ] 实施修复
4. [ ] 验证修复有效
5. [ ] 更新问题状态

---

## 5.6 编写测试报告

### 任务描述

汇总测试结果，编写正式报告。

### 报告模板

```markdown
# GOI L1 智能水平验证报告

## 测试概述

- 测试日期：YYYY-MM-DD
- 测试版本：v1.0
- 测试环境：开发环境

## 测试结果汇总

### 意图识别准确率

| 类别 | 测试数 | 通过数 | 准确率 |
|------|-------|-------|-------|
| 导航意图 | 10 | - | -% |
| 创建意图 | 10 | - | -% |
| 模糊匹配 | 10 | - | -% |
| 复杂意图 | 10 | - | -% |
| 边界情况 | 10 | - | -% |
| **总计** | 50 | - | -% |

### 资源覆盖率

| 操作类型 | 目标数 | 通过数 | 覆盖率 |
|---------|-------|-------|-------|
| Access | 20 | - | -% |
| State | 14 | - | -% |
| Observation | 14 | - | -% |

### 端到端测试

| 场景 | 结果 |
|------|------|
| 导航流程 | ✓/✗ |
| 创建流程 | ✓/✗ |
| 弹窗触发 | ✓/✗ |
| 澄清对话 | ✓/✗ |
| 模糊匹配 | ✓/✗ |

## L1 达标判定

- [ ] 意图识别准确率 > 95%：【是/否】
- [ ] 资源覆盖率 100%：【是/否】
- [ ] TODO 展示用户友好：【是/否】
- [ ] 澄清对话正常工作：【是/否】

**结论**：【达标/未达标】

## 遗留问题

| ID | 问题 | 优先级 | 建议 |
|----|------|-------|------|
| - | - | - | - |

## 下一步建议

1. ...
2. ...
```

### 输出位置

`docs/goi-l1-upgrade/VALIDATION-REPORT.md`

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| - | - | - | - |
