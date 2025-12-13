# GOI 弹窗集成实施计划

> 解决 GOI 系统无法打开页面弹窗的问题

## 问题分析

### 当前状态

1. **GOI 系统**: 执行 Access 操作后返回 `openedDialog: 'xxx-dialog'`
2. **useCopilot Hook**: 分发 `goi:openDialog` 自定义事件
3. **页面组件**: ❌ **没有监听此事件**，弹窗由本地 React state 控制

```typescript
// useCopilot.ts - 已实现
if (executionResult?.openedDialog) {
  window.dispatchEvent(new CustomEvent('goi:openDialog', {
    detail: { dialogId: executionResult.openedDialog }
  }))
}

// models/page.tsx - 缺失
// 没有监听 goi:openDialog 事件
const [addProviderOpen, setAddProviderOpen] = useState(false)
```

### 解决方案

创建一个通用的 `useGoiDialogListener` Hook，在每个页面中使用它来监听 GOI 弹窗事件。

---

## 实施步骤

### 阶段 1：创建 Hook

**文件**: `apps/web/src/hooks/useGoiDialogListener.ts`

```typescript
import { useEffect, useCallback } from 'react'

type DialogHandler = {
  dialogId: string
  handler: () => void
}

/**
 * GOI 弹窗事件监听 Hook
 *
 * @param handlers - 弹窗 ID 到处理函数的映射
 *
 * @example
 * useGoiDialogListener([
 *   { dialogId: 'add-provider-modal', handler: () => setAddProviderOpen(true) },
 *   { dialogId: 'add-model-modal', handler: () => setAddModelProviderId('default') },
 * ])
 */
export function useGoiDialogListener(handlers: DialogHandler[]) {
  const handleGoiDialog = useCallback((event: CustomEvent<{ dialogId: string }>) => {
    const { dialogId } = event.detail
    const handler = handlers.find(h => h.dialogId === dialogId)
    if (handler) {
      handler.handler()
    }
  }, [handlers])

  useEffect(() => {
    window.addEventListener('goi:openDialog', handleGoiDialog as EventListener)
    return () => {
      window.removeEventListener('goi:openDialog', handleGoiDialog as EventListener)
    }
  }, [handleGoiDialog])
}
```

### 阶段 2：定义标准弹窗 ID

**文件**: `apps/web/src/lib/goi/dialogIds.ts`

```typescript
/**
 * GOI 弹窗 ID 常量
 *
 * 命名规则：{action}-{resource}-{type}
 * - action: add, edit, create, view, select
 * - resource: provider, model, prompt, dataset, etc.
 * - type: modal, dialog, drawer
 */
export const GOI_DIALOG_IDS = {
  // 模型配置
  ADD_PROVIDER: 'add-provider-modal',
  EDIT_PROVIDER: 'edit-provider-modal',
  ADD_MODEL: 'add-model-modal',
  EDIT_MODEL: 'edit-model-modal',
  TEST_MODEL: 'test-model-modal',

  // 提示词
  CREATE_PROMPT: 'create-prompt-dialog',
  PUBLISH_VERSION: 'publish-version-modal',
  CREATE_BRANCH: 'create-branch-modal',
  MERGE_BRANCH: 'merge-branch-modal',

  // 数据集
  CREATE_DATASET: 'create-dataset-modal',
  UPLOAD_DATASET: 'upload-dataset-modal',
  CREATE_DATASET_VERSION: 'create-dataset-version-modal',

  // 评估器
  CREATE_EVALUATOR: 'create-evaluator-dialog',
  EVALUATOR_DETAIL: 'evaluator-detail-modal',

  // 任务
  CREATE_TASK: 'create-task-dialog',
  CREATE_AB_TASK: 'create-ab-task-dialog',

  // 定时任务
  CREATE_SCHEDULED: 'create-scheduled-modal',
  EDIT_SCHEDULED: 'edit-scheduled-modal',

  // 监控告警
  CREATE_ALERT_RULE: 'create-alert-rule-modal',
  EDIT_ALERT_RULE: 'edit-alert-rule-modal',
  CREATE_NOTIFY_CHANNEL: 'create-notify-channel-modal',
  EDIT_NOTIFY_CHANNEL: 'edit-notify-channel-modal',

  // Schema
  CREATE_INPUT_SCHEMA: 'create-input-schema-dialog',
  CREATE_OUTPUT_SCHEMA: 'create-output-schema-dialog',
  INFER_SCHEMA: 'infer-schema-modal',
} as const

export type GoiDialogId = typeof GOI_DIALOG_IDS[keyof typeof GOI_DIALOG_IDS]
```

### 阶段 3：更新各页面

#### 3.1 模型配置页面

**文件**: `apps/web/src/app/(dashboard)/models/page.tsx`

```typescript
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

export default function ModelsPage() {
  const [addProviderOpen, setAddProviderOpen] = useState(false)
  const [addModelProviderId, setAddModelProviderId] = useState<string | null>(null)
  const [editProvider, setEditProvider] = useState<Provider | null>(null)
  const [editModel, setEditModel] = useState<Model | null>(null)

  // 监听 GOI 弹窗事件
  useGoiDialogListener([
    {
      dialogId: GOI_DIALOG_IDS.ADD_PROVIDER,
      handler: () => setAddProviderOpen(true)
    },
    {
      dialogId: GOI_DIALOG_IDS.ADD_MODEL,
      handler: () => {
        // 需要选择默认供应商或提示用户选择
        const defaultProvider = providers?.[0]?.id
        if (defaultProvider) {
          setAddModelProviderId(defaultProvider)
        }
      }
    },
    // 注：edit 操作需要 resourceId，通过 URL 参数传递
  ])

  // ...
}
```

#### 3.2 提示词管理页面

**文件**: `apps/web/src/app/(dashboard)/prompts/page.tsx`

```typescript
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

export default function PromptsPage() {
  // 监听 GOI 弹窗事件
  useGoiDialogListener([
    // 提示词列表页通常不需要弹窗
  ])

  // ...
}
```

**文件**: `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx`

```typescript
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

export default function PromptDetailPage() {
  const [publishOpen, setPublishOpen] = useState(false)
  const [createBranchOpen, setCreateBranchOpen] = useState(false)

  // 监听 GOI 弹窗事件
  useGoiDialogListener([
    { dialogId: GOI_DIALOG_IDS.PUBLISH_VERSION, handler: () => setPublishOpen(true) },
    { dialogId: GOI_DIALOG_IDS.CREATE_BRANCH, handler: () => setCreateBranchOpen(true) },
  ])

  // ...
}
```

#### 3.3 数据集管理页面

```typescript
useGoiDialogListener([
  { dialogId: GOI_DIALOG_IDS.CREATE_DATASET, handler: () => setUploadOpen(true) },
  { dialogId: GOI_DIALOG_IDS.CREATE_DATASET_VERSION, handler: () => setCreateVersionOpen(true) },
])
```

#### 3.4 定时任务页面

```typescript
useGoiDialogListener([
  { dialogId: GOI_DIALOG_IDS.CREATE_SCHEDULED, handler: () => setCreateOpen(true) },
])
```

#### 3.5 监控告警页面

```typescript
useGoiDialogListener([
  { dialogId: GOI_DIALOG_IDS.CREATE_ALERT_RULE, handler: () => setAlertRuleOpen(true) },
  { dialogId: GOI_DIALOG_IDS.CREATE_NOTIFY_CHANNEL, handler: () => setChannelOpen(true) },
])
```

### 阶段 4：更新 accessHandler

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
import { GOI_DIALOG_IDS } from '../dialogIds'

// 更新 createDialogMap 使用常量
private getCreateDialogId(resourceType: ResourceType): string {
  const createDialogMap: Partial<Record<ResourceType, string>> = {
    // 模型
    model: GOI_DIALOG_IDS.ADD_MODEL,
    provider: GOI_DIALOG_IDS.ADD_PROVIDER,
    // 提示词
    prompt: GOI_DIALOG_IDS.CREATE_PROMPT,
    prompt_version: GOI_DIALOG_IDS.PUBLISH_VERSION,
    prompt_branch: GOI_DIALOG_IDS.CREATE_BRANCH,
    // 数据集
    dataset: GOI_DIALOG_IDS.CREATE_DATASET,
    dataset_version: GOI_DIALOG_IDS.CREATE_DATASET_VERSION,
    // 评估器
    evaluator: GOI_DIALOG_IDS.CREATE_EVALUATOR,
    // 任务
    task: GOI_DIALOG_IDS.CREATE_TASK,
    // 定时任务
    scheduled_task: GOI_DIALOG_IDS.CREATE_SCHEDULED,
    // 监控
    alert_rule: GOI_DIALOG_IDS.CREATE_ALERT_RULE,
    notify_channel: GOI_DIALOG_IDS.CREATE_NOTIFY_CHANNEL,
    // Schema
    input_schema: GOI_DIALOG_IDS.CREATE_INPUT_SCHEMA,
    output_schema: GOI_DIALOG_IDS.CREATE_OUTPUT_SCHEMA,
  }
  return createDialogMap[resourceType] || `create-${resourceType}-dialog`
}
```

---

## 测试验证

### 测试用例 1：添加供应商

```
用户输入: "帮我添加一个 OpenAI 供应商"
预期流程:
1. Planner 生成 Access 操作: { type: 'access', action: 'create', target: { resourceType: 'provider' } }
2. AccessHandler 执行，返回: { openedDialog: 'add-provider-modal', navigatedTo: '/models' }
3. useCopilot 分发事件: goi:openDialog { dialogId: 'add-provider-modal' }
4. ModelsPage 收到事件，调用: setAddProviderOpen(true)
5. AddProviderModal 显示
```

### 测试用例 2：创建提示词

```
用户输入: "创建一个新的情感分析提示词"
预期流程:
1. 导航到 /prompts/new（create action 映射到新建页面而非弹窗）
```

### 测试用例 3：发布版本

```
用户输入: "发布当前版本"
预期流程:
1. AccessHandler 返回: { openedDialog: 'publish-version-modal' }
2. PromptDetailPage 收到事件，显示 PublishModal
```

---

## 实施检查清单

### Hook 实现

- [ ] 创建 `useGoiDialogListener.ts`
- [ ] 创建 `dialogIds.ts` 常量文件
- [ ] 更新 `accessHandler.ts` 使用常量

### 页面更新

- [ ] `/models` - 模型配置页面
- [ ] `/prompts/[id]` - 提示词详情页面
- [ ] `/datasets/[id]` - 数据集详情页面
- [ ] `/scheduled` - 定时任务页面
- [ ] `/monitor/alerts` - 监控告警页面
- [ ] `/schemas` - Schema 管理页面

### 测试验证

- [ ] 测试添加供应商流程
- [ ] 测试添加模型流程
- [ ] 测试发布版本流程
- [ ] 测试创建定时任务流程
- [ ] 测试创建告警规则流程

---

## 注意事项

### Edit 操作的特殊处理

Edit 操作需要 `resourceId`，但弹窗需要加载对应资源的数据。有两种方案：

**方案 A：通过 URL 参数传递**
```typescript
// 路由：/models?edit=xxx
// 页面从 URL 读取 id，查询数据后打开弹窗
```

**方案 B：通过全局状态传递**
```typescript
// 使用 Zustand 或 Context 传递
// 缺点：增加复杂度
```

建议采用**方案 A**，更符合 Web 应用的标准模式。

### 弹窗需要上下文数据

某些弹窗需要额外的上下文数据（如 AddModelModal 需要 providerId）：

```typescript
// 方案：通过 URL 参数传递
// /models?action=add-model&providerId=xxx

// 页面监听
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('action') === 'add-model') {
    const providerId = params.get('providerId')
    if (providerId) {
      setAddModelProviderId(providerId)
    }
  }
}, [])
```

---

## 后续优化

1. **统一弹窗管理器**：考虑创建全局弹窗管理器，统一处理所有 GOI 触发的弹窗
2. **弹窗预加载**：对于常用弹窗，可以预加载数据提升体验
3. **弹窗历史**：记录弹窗打开历史，支持返回上一个弹窗
