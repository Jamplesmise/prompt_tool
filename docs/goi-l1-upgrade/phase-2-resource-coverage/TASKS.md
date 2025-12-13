# Phase 2: 资源类型全覆盖 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 2.1 修复 Access Handler | P0 | 2h | 待开始 |
| 2.2 扩展 State Handler | P0 | 3h | 待开始 |
| 2.3 完善 Observation Handler | P1 | 2h | 待开始 |
| 2.4 页面弹窗集成 | P0 | 3h | 待开始 |
| 2.5 单元测试 | P1 | 2h | 待开始 |

---

## 2.1 修复 Access Handler

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

### 任务描述

修复和完善 Access Handler 的路由映射和弹窗映射。

### 具体步骤

#### 2.1.1 更新 routeMap

- [ ] 检查所有资源类型的路由是否正确
- [ ] 修复 provider 路由：

```typescript
provider: (id, action) => {
  if (action === 'create') return '/models'  // 在模型页打开弹窗
  if (!id) return '/models'
  if (action === 'edit') return `/models?editProvider=${id}`
  return `/models?provider=${id}`
},
```

- [ ] 添加 comparison 路由：

```typescript
comparison: (id, action) => {
  if (id === 'versions') return '/comparison/versions'
  if (id === 'models') return '/comparison/models'
  if (id === 'tasks') return '/comparison/tasks'
  return '/comparison'
},
```

#### 2.1.2 更新弹窗映射

- [ ] 导入 Phase 1 定义的弹窗 ID 常量
- [ ] 更新 `resolveTarget` 方法使用新常量

```typescript
import { getCreateDialogId, getSelectorDialogId, getTestDialogId } from '../dialogIds'

// 在 resolveTarget 中
case 'create': {
  const dialogId = getCreateDialogId(target.resourceType)
  if (dialogId && !dialogId.endsWith('-page')) {
    result.openedDialog = dialogId
  }
  // 同时导航到相关页面
  const routeGenerator = routeMap[target.resourceType]
  result.navigatedTo = routeGenerator(undefined, 'navigate')
  break
}
```

#### 2.1.3 验证所有资源类型

- [ ] 测试每种资源类型的 view 操作
- [ ] 测试每种资源类型的 create 操作
- [ ] 测试每种资源类型的 select 操作（如支持）

### 预期结果

```typescript
// 测试用例
await executeAccess({
  action: 'create',
  target: { resourceType: 'provider' }
}, context)
// 返回: { openedDialog: 'add-provider-modal', navigatedTo: '/models' }

await executeAccess({
  action: 'view',
  target: { resourceType: 'comparison', resourceId: 'versions' }
}, context)
// 返回: { navigatedTo: '/comparison/versions' }
```

---

## 2.2 扩展 State Handler

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

### 任务描述

添加缺失资源类型的 State 操作支持。

### 具体步骤

#### 2.2.1 更新 resourceModelMap

- [ ] 添加缺失的映射：

```typescript
const resourceModelMap: Partial<Record<ResourceType, string>> = {
  // 现有
  prompt: 'prompt',
  dataset: 'dataset',
  model: 'model',
  evaluator: 'evaluator',
  task: 'task',
  scheduled_task: 'scheduledTask',
  alert_rule: 'alertRule',
  notify_channel: 'notifyChannel',

  // 新增
  provider: 'provider',
  prompt_version: 'promptVersion',
  prompt_branch: 'promptBranch',
  dataset_version: 'datasetVersion',
  input_schema: 'inputSchema',
  output_schema: 'outputSchema',
}
```

#### 2.2.2 更新 requiredFields

- [ ] 为新资源添加必填字段定义：

```typescript
const requiredFields: Record<string, string[]> = {
  // 现有...

  // 新增
  provider: ['name', 'type', 'baseUrl'],
  prompt_version: ['promptId', 'version'],
  prompt_branch: ['promptId', 'name'],
  dataset_version: ['datasetId', 'name'],
  input_schema: ['name', 'fields'],
  output_schema: ['name', 'fields'],
}
```

#### 2.2.3 扩展 handleCreate

- [ ] 添加 provider 创建逻辑：

```typescript
case 'provider':
  created = await prisma.provider.create({
    data: createData as Parameters<typeof prisma.provider.create>[0]['data']
  })
  break
```

- [ ] 添加 prompt_version 创建逻辑（发布版本）
- [ ] 添加 prompt_branch 创建逻辑
- [ ] 添加 dataset_version 创建逻辑
- [ ] 添加 input_schema / output_schema 创建逻辑

#### 2.2.4 扩展 handleUpdate 和 handleDelete

- [ ] 为每种新资源添加 update case
- [ ] 为每种新资源添加 delete case

### 预期结果

```typescript
// 测试用例：创建供应商
await executeState({
  action: 'create',
  target: { resourceType: 'provider' },
  expectedState: {
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1'
  }
}, context)
// 返回: { success: true, resourceId: 'xxx', ... }
```

---

## 2.3 完善 Observation Handler

**文件**: `apps/web/src/lib/goi/executor/observationHandler.ts`

### 任务描述

完善 Observation Handler 的资源映射和默认字段。

### 具体步骤

#### 2.3.1 更新 resourceModelMap

- [ ] 添加缺失的映射（同 State Handler）

#### 2.3.2 更新 defaultFieldsMap

- [ ] 为每种资源定义默认查询字段：

```typescript
const defaultFieldsMap: Partial<Record<ResourceType, string[]>> = {
  prompt: ['id', 'name', 'description', 'content', 'createdAt', 'updatedAt'],
  prompt_version: ['id', 'version', 'content', 'createdAt'],
  prompt_branch: ['id', 'name', 'isDefault', 'createdAt'],
  dataset: ['id', 'name', 'description', 'rowCount', 'createdAt'],
  dataset_version: ['id', 'name', 'rowCount', 'createdAt'],
  model: ['id', 'name', 'providerId', 'isActive', 'isDefault'],
  provider: ['id', 'name', 'type', 'baseUrl', 'isActive'],
  evaluator: ['id', 'name', 'type', 'description', 'isActive'],
  task: ['id', 'name', 'status', 'progress', 'createdAt'],
  scheduled_task: ['id', 'name', 'cronExpression', 'isActive', 'lastRunAt'],
  alert_rule: ['id', 'name', 'metric', 'threshold', 'isActive'],
  notify_channel: ['id', 'name', 'type', 'config', 'isActive'],
  input_schema: ['id', 'name', 'fields', 'createdAt'],
  output_schema: ['id', 'name', 'fields', 'createdAt'],
}
```

#### 2.3.3 实现模糊搜索

- [ ] 添加按名称模糊搜索支持：

```typescript
// 当 query.name 存在时，使用模糊匹配
if (query.name) {
  where.name = { contains: query.name, mode: 'insensitive' }
}
```

### 预期结果

```typescript
// 测试用例：查询包含 "GPT" 的模型
await executeObservation({
  action: 'query',
  target: { resourceType: 'model' },
  query: { name: 'GPT' }
}, context)
// 返回: [{ id: 'xxx', name: 'GPT-4', ... }, ...]
```

---

## 2.4 页面弹窗集成

### 任务描述

在关键页面集成 GOI 弹窗监听。

### 具体步骤

#### 2.4.1 模型配置页面

**文件**: `apps/web/src/app/(dashboard)/models/page.tsx`

- [ ] 导入 `useGoiDialogListener`
- [ ] 添加弹窗监听：

```typescript
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'

export default function ModelsPage() {
  // 监听 GOI 弹窗事件
  useGoiDialogListener('add-provider-modal', () => setShowAddProvider(true))
  useGoiDialogListener('add-model-modal', () => setShowAddModel(true))
  useGoiDialogListener('edit-provider-modal', (data) => {
    setEditingProvider(data.resourceId)
    setShowEditProvider(true)
  })
  useGoiDialogListener('edit-model-modal', (data) => {
    setEditingModel(data.resourceId)
    setShowEditModel(true)
  })

  // ... 其余代码
}
```

#### 2.4.2 定时任务页面

**文件**: `apps/web/src/app/(dashboard)/scheduled/page.tsx`

- [ ] 导入 `useGoiDialogListener`
- [ ] 添加创建/编辑弹窗监听

#### 2.4.3 监控告警页面

**文件**: `apps/web/src/app/(dashboard)/monitor/alerts/page.tsx`

- [ ] 导入 `useGoiDialogListener`
- [ ] 添加告警规则和通知渠道弹窗监听

#### 2.4.4 数据集列表页面

**文件**: `apps/web/src/app/(dashboard)/datasets/page.tsx`

- [ ] 添加创建数据集弹窗监听

### 预期结果

当 GOI 系统发出 `openDialog` 事件时，对应页面的弹窗能自动打开。

---

## 2.5 单元测试

**文件**: `apps/web/src/lib/goi/__tests__/handlers.test.ts`

### 任务描述

为 Access、State、Observation Handler 编写单元测试。

### 具体步骤

- [ ] 创建测试文件
- [ ] 为 Access Handler 编写测试：

```typescript
describe('AccessHandler', () => {
  const resourceTypes: ResourceType[] = [
    'prompt', 'dataset', 'model', 'provider', 'evaluator',
    'task', 'scheduled_task', 'alert_rule', 'notify_channel',
    'settings', 'dashboard', 'monitor', 'comparison'
  ]

  resourceTypes.forEach(type => {
    it(`should handle ${type} view action`, async () => {
      const result = await executeAccess({
        action: 'view',
        target: { resourceType: type }
      }, mockContext)
      expect(result.success).toBe(true)
      expect(result.result?.navigatedTo).toBeDefined()
    })
  })
})
```

- [ ] 为 State Handler 编写测试（create/update/delete）
- [ ] 为 Observation Handler 编写测试（query）

### 验收命令

```bash
pnpm test -- --grep "GOI Handlers"
# 预期: 所有测试通过
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| - | - | - | - |
