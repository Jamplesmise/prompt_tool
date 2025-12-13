# Phase 1: 基础设施补全

## 阶段目标

补全 GOI 系统的基础配置，确保所有资源类型都有对应的常量定义和类型支持。

## 当前问题

### 1. ResourceType 定义不完整

`packages/shared/src/types/goi/events.ts` 中的 ResourceType 缺少：
- `provider` - 模型供应商
- `comparison` - 对比分析

### 2. 资源别名映射不完整

`apps/web/src/lib/goi/executor/shared.ts` 中的 `resourceTypeAliases` 缺少常用别名：
- "供应商" → provider
- "版本" → prompt_version / dataset_version
- "分支" → prompt_branch

### 3. 弹窗 ID 常量散落各处

虽然有 `dialogIds.ts`，但：
- 部分弹窗 ID 写死在页面组件中
- 命名不统一（有的用 kebab-case，有的用 camelCase）
- 缺少很多资源类型的弹窗映射

## 相关文件

| 文件 | 用途 |
|------|------|
| `packages/shared/src/types/goi/events.ts` | ResourceType 定义 |
| `apps/web/src/lib/goi/executor/shared.ts` | 别名映射、工具函数 |
| `apps/web/src/lib/goi/dialogIds.ts` | 弹窗 ID 常量 |

## 设计决策

### 1. ResourceType 完整列表

```typescript
export type ResourceType =
  // 核心资源
  | 'prompt'
  | 'prompt_version'
  | 'prompt_branch'
  | 'dataset'
  | 'dataset_version'
  | 'model'
  | 'provider'
  | 'evaluator'
  | 'task'
  | 'task_result'
  // 系统资源
  | 'scheduled_task'
  | 'alert_rule'
  | 'notify_channel'
  | 'input_schema'
  | 'output_schema'
  | 'evaluation_schema'
  // 页面资源
  | 'settings'
  | 'dashboard'
  | 'monitor'
  | 'schema'
  | 'comparison'
```

### 2. 别名映射规则

| 类型 | 别名示例 |
|------|---------|
| 中文 | "提示词" → prompt |
| 英文单数 | "model" → model |
| 英文复数 | "models" → model |
| 简写 | "ds" → dataset |
| 同义词 | "模版" → prompt |

### 3. 弹窗 ID 命名规范

```
{action}-{resource}-{type}
```

示例：
- `create-prompt-modal`
- `edit-model-modal`
- `select-dataset-dialog`

## 验收标准

1. [ ] `ResourceType` 包含全部 20 种资源类型
2. [ ] 每种资源类型至少有 3 个别名（中文/英文/简写）
3. [ ] 所有弹窗 ID 在 `dialogIds.ts` 中统一定义
4. [ ] 类型检查通过（`pnpm typecheck`）

## 依赖

- 无前置依赖

## 下一阶段

完成本阶段后，进入 Phase 2：资源类型全覆盖
