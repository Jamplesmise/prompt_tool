# Phase 1: 基础设施补全 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 1.1 补全 ResourceType 定义 | P0 | 30min | 待开始 |
| 1.2 完善资源别名映射 | P0 | 1h | 待开始 |
| 1.3 统一弹窗 ID 常量 | P0 | 1h | 待开始 |
| 1.4 类型检查与修复 | P0 | 30min | 待开始 |

---

## 1.1 补全 ResourceType 定义

**文件**: `packages/shared/src/types/goi/events.ts`

### 任务描述

在 ResourceType 类型定义中添加缺失的资源类型。

### 具体步骤

- [ ] 打开 `packages/shared/src/types/goi/events.ts`
- [ ] 找到 `ResourceType` 类型定义
- [ ] 添加缺失的类型：
  ```typescript
  | 'provider'      // 模型供应商
  | 'comparison'    // 对比分析
  ```
- [ ] 确保注释完整，说明每种类型的用途

### 预期结果

```typescript
export type ResourceType =
  // 核心资源
  | 'prompt'           // 提示词
  | 'prompt_version'   // 提示词版本
  | 'prompt_branch'    // 提示词分支
  | 'dataset'          // 数据集
  | 'dataset_version'  // 数据集版本
  | 'model'            // 模型
  | 'provider'         // 模型供应商 ← 新增
  | 'evaluator'        // 评估器
  | 'task'             // 测试任务
  | 'task_result'      // 任务结果
  // 系统资源
  | 'scheduled_task'   // 定时任务
  | 'alert_rule'       // 告警规则
  | 'notify_channel'   // 通知渠道
  | 'input_schema'     // 输入Schema
  | 'output_schema'    // 输出Schema
  | 'evaluation_schema'// 评估Schema
  // 页面资源（仅导航）
  | 'settings'         // 设置页面
  | 'dashboard'        // 仪表盘
  | 'monitor'          // 监控中心
  | 'schema'           // Schema管理
  | 'comparison'       // 对比分析 ← 新增
```

---

## 1.2 完善资源别名映射

**文件**: `apps/web/src/lib/goi/executor/shared.ts`

### 任务描述

扩展 `resourceTypeAliases` 对象，支持更多中英文别名和同义词。

### 具体步骤

- [ ] 打开 `apps/web/src/lib/goi/executor/shared.ts`
- [ ] 找到 `resourceTypeAliases` 对象
- [ ] 按类别添加别名：

```typescript
export const resourceTypeAliases: Record<string, ResourceType> = {
  // ============ 提示词 ============
  '提示词': 'prompt',
  'prompt': 'prompt',
  'prompts': 'prompt',
  '模板': 'prompt',
  '模版': 'prompt',
  'template': 'prompt',

  // 提示词版本
  '版本': 'prompt_version',
  'version': 'prompt_version',
  'prompt版本': 'prompt_version',
  '提示词版本': 'prompt_version',

  // 提示词分支
  '分支': 'prompt_branch',
  'branch': 'prompt_branch',
  '实验分支': 'prompt_branch',

  // ============ 数据集 ============
  '数据集': 'dataset',
  'dataset': 'dataset',
  'datasets': 'dataset',
  'ds': 'dataset',
  '数据': 'dataset',

  // 数据集版本
  '数据集版本': 'dataset_version',
  'dataset版本': 'dataset_version',

  // ============ 模型 ============
  '模型': 'model',
  'model': 'model',
  'models': 'model',
  'llm': 'model',

  // 供应商
  '供应商': 'provider',
  'provider': 'provider',
  'providers': 'provider',
  '服务商': 'provider',
  '厂商': 'provider',

  // ============ 评估器 ============
  '评估器': 'evaluator',
  'evaluator': 'evaluator',
  'evaluators': 'evaluator',
  '评估': 'evaluator',

  // ============ 任务 ============
  '任务': 'task',
  'task': 'task',
  'tasks': 'task',
  '测试': 'task',
  '测试任务': 'task',

  // 任务结果
  '结果': 'task_result',
  'result': 'task_result',
  'results': 'task_result',

  // ============ 定时任务 ============
  '定时任务': 'scheduled_task',
  '定时': 'scheduled_task',
  'scheduled': 'scheduled_task',
  'cron': 'scheduled_task',

  // ============ 监控告警 ============
  '告警': 'alert_rule',
  '告警规则': 'alert_rule',
  'alert': 'alert_rule',

  '通知': 'notify_channel',
  '通知渠道': 'notify_channel',
  'notification': 'notify_channel',
  'channel': 'notify_channel',

  // ============ Schema ============
  'schema': 'schema',
  '输入schema': 'input_schema',
  '输出schema': 'output_schema',
  'input': 'input_schema',
  'output': 'output_schema',

  // ============ 页面 ============
  '设置': 'settings',
  'settings': 'settings',

  '仪表盘': 'dashboard',
  '首页': 'dashboard',
  'home': 'dashboard',
  'dashboard': 'dashboard',

  '监控': 'monitor',
  'monitor': 'monitor',

  '对比': 'comparison',
  'compare': 'comparison',
  'diff': 'comparison',
}
```

- [ ] 添加 `normalizeResourceType` 函数的单元测试

### 预期结果

- 用户输入 "帮我打开提示词" → 识别为 `prompt`
- 用户输入 "创建一个定时任务" → 识别为 `scheduled_task`
- 用户输入 "打开设置" → 识别为 `settings`

---

## 1.3 统一弹窗 ID 常量

**文件**: `apps/web/src/lib/goi/dialogIds.ts`

### 任务描述

重构 `dialogIds.ts`，确保所有弹窗 ID 统一管理。

### 具体步骤

- [ ] 打开 `apps/web/src/lib/goi/dialogIds.ts`
- [ ] 按资源类型组织常量：

```typescript
/**
 * GOI 弹窗 ID 统一管理
 *
 * 命名规范: {action}-{resource}-{type}
 * - action: create | edit | select | view | test
 * - resource: prompt | model | dataset | ...
 * - type: modal | dialog | drawer
 */

// ============ 创建弹窗 ============
export const CREATE_DIALOG_IDS = {
  // 提示词
  prompt: 'create-prompt-page',        // 提示词是页面，不是弹窗
  prompt_version: 'publish-version-modal',
  prompt_branch: 'create-branch-modal',

  // 数据集
  dataset: 'create-dataset-modal',
  dataset_version: 'create-dataset-version-modal',

  // 模型
  model: 'add-model-modal',
  provider: 'add-provider-modal',

  // 评估器
  evaluator: 'create-evaluator-page',  // 页面

  // 任务
  task: 'create-task-page',            // 页面

  // 定时任务
  scheduled_task: 'create-scheduled-modal',

  // 监控
  alert_rule: 'create-alert-rule-modal',
  notify_channel: 'create-notify-channel-modal',

  // Schema
  input_schema: 'create-input-schema-page',
  output_schema: 'create-output-schema-page',
} as const

// ============ 编辑弹窗 ============
export const EDIT_DIALOG_IDS = {
  model: 'edit-model-modal',
  provider: 'edit-provider-modal',
  scheduled_task: 'edit-scheduled-modal',
  alert_rule: 'edit-alert-rule-modal',
  notify_channel: 'edit-notify-channel-modal',
} as const

// ============ 选择器弹窗 ============
export const SELECTOR_DIALOG_IDS = {
  prompt: 'prompt-selector-dialog',
  dataset: 'dataset-selector-dialog',
  model: 'model-selector-dialog',
  evaluator: 'evaluator-selector-dialog',
} as const

// ============ 测试弹窗 ============
export const TEST_DIALOG_IDS = {
  model: 'test-model-modal',
  notify_channel: 'test-notify-channel-modal',
} as const

// ============ 辅助函数 ============
export function getCreateDialogId(resourceType: ResourceType): string | undefined {
  return CREATE_DIALOG_IDS[resourceType as keyof typeof CREATE_DIALOG_IDS]
}

export function getEditDialogId(resourceType: ResourceType): string | undefined {
  return EDIT_DIALOG_IDS[resourceType as keyof typeof EDIT_DIALOG_IDS]
}

export function getSelectorDialogId(resourceType: ResourceType): string | undefined {
  return SELECTOR_DIALOG_IDS[resourceType as keyof typeof SELECTOR_DIALOG_IDS]
}

export function getTestDialogId(resourceType: ResourceType): string | undefined {
  return TEST_DIALOG_IDS[resourceType as keyof typeof TEST_DIALOG_IDS]
}
```

- [ ] 更新 `accessHandler.ts` 使用新的常量
- [ ] 检查页面组件中的弹窗 ID 是否一致

### 预期结果

- 所有弹窗 ID 在一个文件中管理
- `getXxxDialogId` 函数提供类型安全的访问

---

## 1.4 类型检查与修复

### 任务描述

运行类型检查，修复所有类型错误。

### 具体步骤

- [ ] 运行 `pnpm typecheck`
- [ ] 修复报告的类型错误
- [ ] 确保无新增类型警告

### 验收命令

```bash
cd /home/alg/alg/claude_dev/prompt_tool
pnpm typecheck
# 预期: 无错误
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-12 | 1.1 补全 ResourceType | ✅ 完成 | 添加 `comparison` 类型 |
| 2025-12-12 | 1.2 完善资源别名映射 | ✅ 完成 | 添加 80+ 中英文别名，覆盖所有资源类型 |
| 2025-12-12 | 1.3 统一弹窗 ID 常量 | ✅ 完成 | 添加 `TEST_NOTIFY_CHANNEL` |
| 2025-12-12 | 1.4 类型检查与修复 | ✅ 完成 | 修复 accessHandler.ts 中缺失的 comparison 路由 |
