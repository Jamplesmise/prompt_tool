# GOI 页面功能配置审计计划

> 检查每个页面的所有功能操作是否在 GOI 系统中正确配置

## 审计状态说明

| 状态 | 含义 |
|-----|------|
| ✅ | 已配置且测试通过 |
| ⚠️ | 已配置但未测试 |
| ❌ | 未配置 |
| 🔧 | 需要修复 |
| ➖ | 不需要 GOI 支持 |

---

## 1. 模型配置页面 (`/models`)

**ResourceType**: `model`, `provider`
**页面路径**: `/apps/web/src/app/(dashboard)/models/page.tsx`

### 1.1 供应商操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 添加供应商 | `AddProviderModal` | `create` | `provider` | ❌ |
| 编辑供应商 | `EditProviderModal` | `edit` | `provider` | ❌ |
| 删除供应商 | 确认弹窗 | `delete` (State) | `provider` | ❌ |
| 查看供应商 | 展开卡片 | `view` | `provider` | ⚠️ |
| 测试供应商连接 | - | 自定义 | `provider` | ❌ |

### 1.2 模型操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 添加模型 | `AddModelModal` | `create` | `model` | ⚠️ |
| 编辑模型 | `EditModelModal` | `edit` | `model` | ⚠️ |
| 删除模型 | 确认弹窗 | `delete` (State) | `model` | ❌ |
| 测试模型 | `TestResultModal` | 自定义 | `model` | ❌ |
| 设为默认模型 | - | `update` (State) | `model` | ❌ |
| 启用/禁用模型 | - | `update` (State) | `model` | ❌ |

### 1.3 检查清单

- [ ] `provider` 添加到 ResourceType
- [ ] `provider` 路由映射完善（当前只有 `/models?provider=${id}`）
- [ ] `AddProviderModal` 弹窗 ID 映射
- [ ] `EditProviderModal` 弹窗 ID 映射
- [ ] `AddModelModal` 弹窗 ID 映射（当前：`add-model-dialog`）
- [ ] `EditModelModal` 弹窗 ID 映射
- [ ] Provider 的 State 操作支持
- [ ] Model 的 State 操作支持

### 1.4 需要修复

```typescript
// accessHandler.ts - routeMap 需要更新
provider: (id, action) => {
  if (action === 'create') return '/models?action=add-provider'
  if (!id) return '/models'
  if (action === 'edit') return `/models?provider=${id}&action=edit`
  return `/models?provider=${id}`
},

// accessHandler.ts - selectorDialogMap 需要添加
provider: 'provider-selector-dialog',

// accessHandler.ts - createDialogMap 需要添加
provider: 'add-provider-modal',
model: 'add-model-modal',

// stateHandler.ts - resourceModelMap 需要添加
provider: 'provider',
```

---

## 2. 提示词管理页面 (`/prompts`)

**ResourceType**: `prompt`, `prompt_version`, `prompt_branch`
**页面路径**: `/apps/web/src/app/(dashboard)/prompts/`

### 2.1 提示词操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建提示词 | `/prompts/new` | `create` | `prompt` | ⚠️ |
| 编辑提示词 | `/prompts/[id]` | `edit` | `prompt` | ⚠️ |
| 删除提示词 | 确认弹窗 | `delete` (State) | `prompt` | ❌ |
| 查看提示词 | `/prompts/[id]` | `view` | `prompt` | ⚠️ |
| 导航到列表 | `/prompts` | `navigate` | `prompt` | ✅ |

### 2.2 版本操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 发布版本 | `PublishModal` | `create` (State) | `prompt_version` | ❌ |
| 查看版本 | 版本详情 | `view` | `prompt_version` | ⚠️ |
| 回滚到版本 | - | `update` (State) | `prompt` | ❌ |
| 对比版本 | `/comparison/versions` | `view` | `prompt_version` | ❌ |

### 2.3 分支操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建分支 | `CreateBranchModal` | `create` (State) | `prompt_branch` | ❌ |
| 合并分支 | `MergeBranchModal` | 自定义 | `prompt_branch` | ❌ |
| 分支对比 | `BranchDiffModal` | `view` | `prompt_branch` | ❌ |
| 删除分支 | 确认弹窗 | `delete` (State) | `prompt_branch` | ❌ |

### 2.4 检查清单

- [ ] `PublishModal` 弹窗 ID 映射
- [ ] `CreateBranchModal` 弹窗 ID 映射
- [ ] `MergeBranchModal` 弹窗 ID 映射
- [ ] `prompt_version` State 操作支持
- [ ] `prompt_branch` State 操作支持

---

## 3. 数据集管理页面 (`/datasets`)

**ResourceType**: `dataset`, `dataset_version`
**页面路径**: `/apps/web/src/app/(dashboard)/datasets/`

### 3.1 数据集操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建数据集 | `DatasetUploadModal` | `create` | `dataset` | ⚠️ |
| 上传数据 | `UploadModal` | `update` (State) | `dataset` | ❌ |
| 编辑数据集 | `/datasets/[id]` | `edit` | `dataset` | ⚠️ |
| 删除数据集 | 确认弹窗 | `delete` (State) | `dataset` | ❌ |
| 查看数据集 | `/datasets/[id]` | `view` | `dataset` | ⚠️ |
| 下载模板 | `TemplateDownloadModal` | - | - | ➖ |

### 3.2 版本操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建版本 | `CreateVersionModal` | `create` (State) | `dataset_version` | ❌ |
| 查看版本行 | `VersionRowsModal` | `view` | `dataset_version` | ❌ |
| 版本对比 | `VersionDiffModal` | `view` | `dataset_version` | ❌ |
| 回滚版本 | - | `update` (State) | `dataset` | ❌ |

### 3.3 检查清单

- [ ] `DatasetUploadModal` 弹窗 ID 映射
- [ ] `CreateVersionModal` 弹窗 ID 映射
- [ ] `dataset_version` State 操作支持
- [ ] 数据集行编辑 State 操作

---

## 4. 评估器管理页面 (`/evaluators`)

**ResourceType**: `evaluator`, `evaluation_schema`
**页面路径**: `/apps/web/src/app/(dashboard)/evaluators/`

### 4.1 评估器操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建评估器 | `/evaluators/new` | `create` | `evaluator` | ⚠️ |
| 编辑评估器 | `/evaluators/[id]` | `edit` | `evaluator` | ⚠️ |
| 删除评估器 | 确认弹窗 | `delete` (State) | `evaluator` | ❌ |
| 查看评估器 | `/evaluators/[id]` | `view` | `evaluator` | ⚠️ |
| 查看详情弹窗 | `EvaluatorDetailModal` | `view` | `evaluator` | ❌ |
| 测试评估器 | - | 自定义 | `evaluator` | ❌ |
| 启用/禁用 | - | `update` (State) | `evaluator` | ❌ |

### 4.2 检查清单

- [ ] `EvaluatorDetailModal` 弹窗 ID 映射
- [ ] 评估器 State 操作完善

---

## 5. 任务管理页面 (`/tasks`)

**ResourceType**: `task`, `task_result`
**页面路径**: `/apps/web/src/app/(dashboard)/tasks/`

### 5.1 任务操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建任务 | `/tasks/new` | `create` | `task` | ⚠️ |
| 创建 A/B 测试 | `/tasks/new-ab` | `create` | `task` | ❌ |
| 查看任务 | `/tasks/[id]` | `view` | `task` | ⚠️ |
| 查看结果 | `/tasks/[id]/results` | `view` | `task_result` | ⚠️ |
| 删除任务 | 确认弹窗 | `delete` (State) | `task` | ❌ |
| 暂停任务 | - | 自定义 | `task` | ❌ |
| 恢复任务 | - | 自定义 | `task` | ❌ |
| 重跑任务 | - | 自定义 | `task` | ❌ |
| 对比任务 | `/tasks/compare` | `view` | `task` | ❌ |
| 导出结果 | - | - | - | ➖ |

### 5.2 检查清单

- [ ] A/B 测试创建路由
- [ ] 任务对比路由
- [ ] 任务控制操作（暂停/恢复/重跑）

---

## 6. 定时任务页面 (`/scheduled`)

**ResourceType**: `scheduled_task`
**页面路径**: `/apps/web/src/app/(dashboard)/scheduled/`

### 6.1 定时任务操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建定时任务 | `CreateScheduledModal` | `create` | `scheduled_task` | ❌ |
| 编辑定时任务 | `CreateScheduledModal` | `edit` | `scheduled_task` | ❌ |
| 删除定时任务 | 确认弹窗 | `delete` (State) | `scheduled_task` | ❌ |
| 启用/禁用 | - | `update` (State) | `scheduled_task` | ❌ |
| 立即执行 | - | 自定义 | `scheduled_task` | ❌ |
| 查看历史 | - | `view` | `scheduled_task` | ❌ |

### 6.2 检查清单

- [ ] `CreateScheduledModal` 弹窗 ID 映射
- [ ] `scheduled_task` State 操作支持
- [ ] Observation 默认字段

---

## 7. 监控告警页面 (`/monitor`)

**ResourceType**: `monitor`, `alert_rule`, `notify_channel`
**页面路径**: `/apps/web/src/app/(dashboard)/monitor/`

### 7.1 监控概览操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 查看概览 | `/monitor/overview` | `navigate` | `monitor` | ⚠️ |
| 查看告警 | `/monitor/alerts` | `navigate` | `monitor` | ⚠️ |

### 7.2 告警规则操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建告警规则 | `AlertRuleModal` | `create` | `alert_rule` | ❌ |
| 编辑告警规则 | `AlertRuleModal` | `edit` | `alert_rule` | ❌ |
| 删除告警规则 | 确认弹窗 | `delete` (State) | `alert_rule` | ❌ |
| 启用/禁用规则 | - | `update` (State) | `alert_rule` | ❌ |

### 7.3 通知渠道操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建通知渠道 | `CreateChannelModal` | `create` | `notify_channel` | ❌ |
| 编辑通知渠道 | `CreateChannelModal` | `edit` | `notify_channel` | ❌ |
| 删除通知渠道 | 确认弹窗 | `delete` (State) | `notify_channel` | ❌ |
| 测试通知 | - | 自定义 | `notify_channel` | ❌ |

### 7.4 检查清单

- [ ] `AlertRuleModal` 弹窗 ID 映射
- [ ] `CreateChannelModal` 弹窗 ID 映射
- [ ] `alert_rule` State 操作支持
- [ ] `notify_channel` State 操作支持

---

## 8. Schema 管理页面 (`/schemas`)

**ResourceType**: `schema`, `input_schema`, `output_schema`
**页面路径**: `/apps/web/src/app/(dashboard)/schemas/`

### 8.1 Schema 操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 创建 Input Schema | `/schemas/input/new` | `create` | `input_schema` | ⚠️ |
| 创建 Output Schema | `/schemas/output/new` | `create` | `output_schema` | ⚠️ |
| 编辑 Schema | `/schemas/[id]` | `edit` | `schema` | ⚠️ |
| 删除 Schema | 确认弹窗 | `delete` (State) | `schema` | ❌ |
| 从输出推断 | `InferSchemaModal` | 自定义 | `schema` | ❌ |
| AI 助手 | `/schemas/ai-assistant` | `navigate` | `schema` | ❌ |
| 模板库 | `/schemas/templates` | `navigate` | `schema` | ❌ |

### 8.2 检查清单

- [ ] `InferSchemaModal` 弹窗 ID 映射
- [ ] AI 助手路由
- [ ] 模板库路由
- [ ] Schema State 操作支持

---

## 9. 设置页面 (`/settings`)

**ResourceType**: `settings`
**页面路径**: `/apps/web/src/app/(dashboard)/settings/`

### 9.1 设置操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 导航到设置 | `/settings` | `navigate` | `settings` | ✅ |
| 修改设置 | - | `update` (State) | `settings` | ❌ |

### 9.2 检查清单

- [ ] Settings State 操作支持（如果需要）

---

## 10. 仪表盘页面 (`/`)

**ResourceType**: `dashboard`
**页面路径**: `/apps/web/src/app/(dashboard)/page.tsx`

### 10.1 仪表盘操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 导航到仪表盘 | `/` | `navigate` | `dashboard` | ✅ |
| 查看统计 | - | `observation` | 多种 | ❌ |

---

## 11. 对比分析页面 (`/comparison`)

**ResourceType**: `comparison` (建议新增)
**页面路径**: `/apps/web/src/app/(dashboard)/comparison/`

### 11.1 对比操作

| 操作 | 弹窗/页面 | GOI Action | ResourceType | 配置状态 |
|-----|----------|-----------|--------------|---------|
| 版本对比 | `/comparison/versions` | `navigate` | `comparison` | ❌ |
| 模型对比 | `/comparison/models` | `navigate` | `comparison` | ❌ |

### 11.2 检查清单

- [ ] 考虑添加 `comparison` ResourceType
- [ ] 对比页面路由映射

---

## 修复优先级

### P0 - 核心功能（影响主要工作流）

1. **模型配置**
   - [ ] Provider CRUD 操作
   - [ ] Model CRUD 操作
   - [ ] 弹窗 ID 映射

2. **任务执行**
   - [ ] 任务暂停/恢复/重跑
   - [ ] A/B 测试创建

### P1 - 重要功能

3. **提示词管理**
   - [ ] 版本发布
   - [ ] 分支管理

4. **数据集管理**
   - [ ] 版本管理
   - [ ] 数据上传

5. **定时任务**
   - [ ] 完整 CRUD
   - [ ] 启用/禁用

### P2 - 辅助功能

6. **监控告警**
   - [ ] 告警规则 CRUD
   - [ ] 通知渠道 CRUD

7. **Schema 管理**
   - [ ] Schema CRUD
   - [ ] AI 助手集成

### P3 - 增强功能

8. **对比分析**
   - [ ] 版本对比
   - [ ] 模型对比

---

## 实施步骤

### 阶段 1：补全 ResourceType 和别名

```typescript
// packages/shared/src/types/goi/events.ts
export type ResourceType =
  // ... 现有类型
  | 'comparison'      // 对比分析

// apps/web/src/lib/goi/executor/shared.ts
export const resourceTypeAliases = {
  // ... 现有别名
  'compare': 'comparison',
  'diff': 'comparison',
}
```

### 阶段 2：补全路由映射

```typescript
// apps/web/src/lib/goi/executor/accessHandler.ts
const routeMap = {
  // ... 现有路由
  comparison: (id, action) => {
    if (id === 'versions') return '/comparison/versions'
    if (id === 'models') return '/comparison/models'
    return '/comparison/versions'
  },
}
```

### 阶段 3：补全弹窗 ID 映射

```typescript
// apps/web/src/lib/goi/executor/accessHandler.ts
const createDialogMap = {
  // 模型
  provider: 'add-provider-modal',
  model: 'add-model-modal',
  // 提示词
  prompt_version: 'publish-modal',
  prompt_branch: 'create-branch-modal',
  // 数据集
  dataset: 'dataset-upload-modal',
  dataset_version: 'create-version-modal',
  // 定时任务
  scheduled_task: 'create-scheduled-modal',
  // 监控
  alert_rule: 'alert-rule-modal',
  notify_channel: 'create-channel-modal',
  // Schema
  input_schema: 'create-input-schema-dialog',
  output_schema: 'create-output-schema-dialog',
}
```

### 阶段 4：补全 State 操作

```typescript
// apps/web/src/lib/goi/executor/stateHandler.ts
const resourceModelMap = {
  // 需要添加
  provider: 'provider',
  prompt_version: 'promptVersion',
  prompt_branch: 'promptBranch',
  dataset_version: 'datasetVersion',
  // ... 其他
}
```

### 阶段 5：补全 Observation 查询

```typescript
// apps/web/src/lib/goi/executor/observationHandler.ts
const resourceModelMap = {
  // 需要添加
  provider: 'provider',
  prompt_version: 'promptVersion',
  prompt_branch: 'promptBranch',
  // ... 其他
}

const defaultFieldsMap = {
  provider: ['id', 'name', 'type', 'baseUrl', 'isActive'],
  prompt_version: ['id', 'version', 'content', 'createdAt'],
  prompt_branch: ['id', 'name', 'isDefault', 'createdAt'],
  // ... 其他
}
```

---

## 测试清单

每完成一个页面的配置，使用以下测试用例验证：

### 模型配置页面测试

```
1. "帮我添加一个 OpenAI 供应商"
   - 预期：打开 AddProviderModal

2. "帮我添加一个 GPT-4 模型"
   - 预期：打开 AddModelModal

3. "打开模型配置页面"
   - 预期：导航到 /models

4. "查看 xxx 供应商的详情"
   - 预期：导航到 /models?provider=xxx
```

### 提示词页面测试

```
1. "创建一个新提示词"
   - 预期：导航到 /prompts/new

2. "发布当前版本"
   - 预期：打开 PublishModal

3. "创建一个实验分支"
   - 预期：打开 CreateBranchModal
```

---

## 文档维护

当添加新页面或功能时，请更新此文档：

1. 在对应章节添加新操作
2. 更新配置状态
3. 添加到检查清单
4. 确定优先级
5. 更新实施步骤
