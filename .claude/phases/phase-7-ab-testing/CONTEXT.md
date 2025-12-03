# Phase 7: A/B 测试与任务增强 - 上下文

> 前置依赖：Phase 0-6 完成
> 本阶段目标：实现 A/B 对比测试、断点续跑、任务队列增强

---

## 一、阶段概述

本阶段增强任务执行能力，实现 `docs/01-product-scope.md` 中规划的 V2 功能：

1. **A/B 对比测试** - 对比不同提示词/模型的效果差异
2. **断点续跑** - 任务中断后从断点继续执行
3. **BullMQ 任务队列** - 使用 Redis 队列管理任务执行
4. **费率配置与成本计算** - 追踪 API 调用成本

---

## 二、功能范围

### 2.1 A/B 对比测试

**功能**：
- 创建对比测试任务，选择对比维度（提示词/模型）
- 同一数据行分别用 A、B 配置执行
- 结果并排对比展示
- 统计显著性分析

**对比维度**：
- 提示词对比：同一模型，不同提示词版本
- 模型对比：同一提示词，不同模型

**结果展示**：
```
┌─────────────────────────────────────────────────────────────────┐
│ A/B 测试结果                                                     │
├───────────────┬─────────────────┬─────────────────┬─────────────┤
│ 数据行        │ 配置 A          │ 配置 B          │ 胜出        │
├───────────────┼─────────────────┼─────────────────┼─────────────┤
│ Row 1         │ ✓ 通过 (0.95)   │ ✗ 失败 (0.45)   │ A          │
│ Row 2         │ ✓ 通过 (0.88)   │ ✓ 通过 (0.92)   │ B          │
│ ...           │ ...             │ ...             │ ...        │
├───────────────┴─────────────────┴─────────────────┴─────────────┤
│ 汇总：A 胜出 65/100，B 胜出 35/100，A 显著优于 B (p < 0.05)     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 断点续跑

**功能**：
- 任务中断（失败/停止）后可从断点继续
- 记录已完成的执行项
- 续跑时跳过已完成项，只执行未完成项
- 支持重试失败项

**状态扩展**：
```typescript
type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'    // 新增：暂停
  | 'COMPLETED'
  | 'FAILED'
  | 'STOPPED';
```

### 2.3 BullMQ 任务队列

**功能**：
- 使用 BullMQ 管理任务执行
- 支持任务优先级
- 支持并发任务数限制
- 支持任务进度持久化
- 支持 Worker 水平扩展

**队列设计**：
```typescript
// 任务队列
const taskQueue = new Queue('task-execution', { connection });

// 任务 Job 数据
type TaskJobData = {
  taskId: string;
  priority?: number;
  resumeFrom?: string;  // 断点续跑起始点
};

// Worker 配置
const worker = new Worker('task-execution', processor, {
  connection,
  concurrency: 5,  // 最多同时处理 5 个任务
});
```

### 2.4 费率配置与成本计算

**功能**：
- 模型配置中添加费率信息
- 任务执行时计算成本
- 结果页显示成本汇总
- 工作台显示总成本统计

**费率配置**：
```typescript
type ModelPricing = {
  inputPer1kTokens: number;   // 输入 1k tokens 价格
  outputPer1kTokens: number;  // 输出 1k tokens 价格
  currency: 'USD' | 'CNY';    // 货币单位
};
```

---

## 三、技术架构

### 3.1 A/B 测试数据模型

```prisma
model ABTest {
  id          String   @id @default(cuid())
  taskId      String   @unique
  task        Task     @relation(fields: [taskId], references: [id])

  compareType String   // 'prompt' | 'model'
  configA     Json     // { promptId, promptVersionId, modelId }
  configB     Json

  results     ABTestResult[]

  createdAt   DateTime @default(now())
}

model ABTestResult {
  id          String   @id @default(cuid())
  abTestId    String
  abTest      ABTest   @relation(fields: [abTestId], references: [id])

  rowIndex    Int
  resultA     String   // TaskResult ID
  resultB     String   // TaskResult ID
  winner      String?  // 'A' | 'B' | 'tie' | null

  createdAt   DateTime @default(now())
}
```

### 3.2 任务执行状态持久化

```typescript
// 执行进度存储在 Redis
type ExecutionProgress = {
  taskId: string;
  total: number;
  completed: string[];      // 已完成的 planItem IDs
  failed: string[];         // 失败的 planItem IDs
  pending: string[];        // 待执行的 planItem IDs
  lastCheckpoint: Date;
};
```

### 3.3 成本计算

```typescript
function calculateCost(
  tokens: { input: number; output: number },
  pricing: ModelPricing
): number {
  const inputCost = (tokens.input / 1000) * pricing.inputPer1kTokens;
  const outputCost = (tokens.output / 1000) * pricing.outputPer1kTokens;
  return inputCost + outputCost;
}
```

---

## 四、页面变更

### 4.1 创建任务页增强

- 添加任务类型选择：普通任务 / A/B 测试
- A/B 测试模式：选择对比维度，配置 A 和 B

### 4.2 任务详情页增强

- A/B 测试结果并排展示
- 显示成本信息
- 断点续跑按钮
- 暂停任务按钮

### 4.3 模型配置页增强

- 添加费率配置表单

### 4.4 工作台增强

- 显示总成本统计

---

## 五、依赖关系

### 5.1 外部依赖

- BullMQ
- Redis（已有）

### 5.2 内部依赖

- Phase 4：任务执行核心
- Phase 5：结果展示
