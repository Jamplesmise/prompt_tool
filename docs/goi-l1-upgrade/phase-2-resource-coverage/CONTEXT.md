# Phase 2: 资源类型全覆盖

## 阶段目标

让所有 20 种资源类型都能正确处理 Access、State、Observation 三种操作。

## 当前问题

### 1. Access Handler 问题

`accessHandler.ts` 现状：
- ✅ 路由映射基本完整
- ❌ 弹窗 ID 映射不完整
- ❌ 部分资源类型返回错误路由

需要修复的资源：
| 资源 | 问题 |
|------|------|
| provider | create 应该打开弹窗，不是导航 |
| prompt_version | 缺少 publish 弹窗映射 |
| prompt_branch | 缺少 create/merge 弹窗映射 |
| dataset_version | 缺少 create 弹窗映射 |

### 2. State Handler 问题

`stateHandler.ts` 现状：
- ✅ 支持 8 种资源类型
- ❌ 缺少 12 种资源类型

缺失的资源：
```
provider, prompt_version, prompt_branch, dataset_version,
input_schema, output_schema, evaluation_schema,
comparison, settings, dashboard, monitor, schema
```

注意：页面资源（settings, dashboard 等）不需要 State 操作。

### 3. Observation Handler 问题

`observationHandler.ts` 现状：
- ✅ 支持基础查询
- ❌ 缺少默认字段配置
- ❌ 部分资源没有 Prisma 模型映射

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/executor/accessHandler.ts` | 资源访问处理 |
| `apps/web/src/lib/goi/executor/stateHandler.ts` | 状态变更处理 |
| `apps/web/src/lib/goi/executor/observationHandler.ts` | 数据查询处理 |
| `apps/web/prisma/schema.prisma` | 数据模型定义 |

## 设计决策

### 1. 资源分类

| 类别 | 资源 | 支持操作 |
|------|------|---------|
| 核心资源 | prompt, dataset, model, evaluator, task | Access + State + Observation |
| 衍生资源 | prompt_version, prompt_branch, dataset_version, provider | Access + State + Observation |
| 系统资源 | scheduled_task, alert_rule, notify_channel | Access + State + Observation |
| Schema | input_schema, output_schema, evaluation_schema | Access + State + Observation |
| 页面资源 | settings, dashboard, monitor, schema, comparison | Access only |

### 2. State 操作映射

对于需要 State 操作的资源，映射到 Prisma 模型：

```typescript
const resourceModelMap = {
  prompt: 'prompt',
  prompt_version: 'promptVersion',
  prompt_branch: 'promptBranch',
  dataset: 'dataset',
  dataset_version: 'datasetVersion',
  model: 'model',
  provider: 'provider',
  evaluator: 'evaluator',
  task: 'task',
  scheduled_task: 'scheduledTask',
  alert_rule: 'alertRule',
  notify_channel: 'notifyChannel',
  input_schema: 'inputSchema',
  output_schema: 'outputSchema',
}
```

### 3. 弹窗 vs 页面

| 操作类型 | 弹窗 | 页面 |
|---------|------|------|
| 创建 | model, provider, scheduled_task, alert_rule, notify_channel, prompt_version, prompt_branch, dataset_version | prompt, evaluator, task, schema |
| 编辑 | model, provider, scheduled_task, alert_rule, notify_channel | prompt, evaluator, dataset |
| 选择 | prompt, dataset, model, evaluator | - |

## 验收标准

1. [ ] 所有 20 种资源类型的 Access 操作不返回错误
2. [ ] 所有 14 种实体资源的 State 操作可执行
3. [ ] 所有资源的 Observation 操作能返回数据
4. [ ] 单元测试覆盖所有资源类型

## 依赖

- Phase 1 完成（ResourceType 定义、别名映射、弹窗 ID）

## 下一阶段

完成本阶段后，进入 Phase 3：意图理解增强
