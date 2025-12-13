# GOI 配置完整性检查清单

> 当 GOI 操作失败（如 `INVALID_OPERATION`、`RESOURCE_NOT_FOUND`）时，按此清单检查配置

## 快速诊断流程

```
操作失败
   │
   ├── INVALID_OPERATION → 检查 1-4
   │
   ├── RESOURCE_NOT_FOUND → 检查 5-6
   │
   ├── 导航不执行 → 检查 7-8
   │
   └── 依赖未满足 → 检查 9
```

---

## 1. ResourceType 定义（最基础）

**文件**: `packages/shared/src/types/goi/events.ts`

```typescript
export type ResourceType =
  | 'prompt'
  | 'dataset'
  // ... 添加新类型
```

**检查点**:
- [ ] 新资源类型是否已添加到 `ResourceType` 联合类型
- [ ] 类型名称是否使用 snake_case（如 `scheduled_task` 而非 `scheduledTask`）

---

## 2. 资源类型别名映射（已集中管理）

**文件**: `apps/web/src/lib/goi/executor/shared.ts` (**唯一来源**)

```typescript
// 所有 Handler 共用此映射
export const resourceTypeAliases: Record<string, ResourceType> = {
  'task_schedule': 'scheduled_task',  // LLM 可能生成的变体
  'system': 'settings',               // 通用别名
  // ...
}

export function normalizeResourceType(type: string): ResourceType {
  return (resourceTypeAliases[type] || type) as ResourceType
}
```

**检查点**:
- [ ] 新别名是否添加到 `shared.ts`（不要在各 Handler 中单独添加）
- [ ] LLM 可能生成的所有变体名称是否都有映射
- [ ] 常见同义词是否都有映射（如 `alert` → `alert_rule`）
- [ ] 复数形式是否有映射（如 `prompts` → `prompt`）

**常见 LLM 生成的变体**:
| 标准类型 | 常见变体 |
|---------|---------|
| `scheduled_task` | `task_schedule`, `schedule`, `cron_task` |
| `alert_rule` | `alert`, `alarm`, `alarm_rule` |
| `notify_channel` | `notification`, `channel` |
| `settings` | `system`, `config`, `preference` |

---

## 3. 路由映射（routeMap）

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
const routeMap: Record<ResourceType, (id?: string, action?: AccessAction) => string> = {
  prompt: (id, action) => {
    if (action === 'create') return '/prompts/new'
    if (!id) return '/prompts'
    if (action === 'edit') return `/prompts/${id}/edit`
    return `/prompts/${id}`
  },
  // ... 每个 ResourceType 都需要
}
```

**检查点**:
- [ ] 每个 `ResourceType` 是否都有对应的路由生成函数
- [ ] 路由是否正确处理所有 `AccessAction`：
  - `view` - 查看详情
  - `edit` - 编辑页面
  - `create` - 创建页面/弹窗
  - `navigate` - 列表页
  - `select` - 选择器
- [ ] 路由路径是否与实际页面路径匹配

---

## 4. 系统页面验证豁免

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
// 系统页面资源类型（不需要 resourceId）
const systemPageTypes: ResourceType[] = ['settings', 'dashboard', 'monitor', 'schema']
```

**检查点**:
- [ ] 不需要 `resourceId` 的页面类型是否都在列表中
- [ ] 这些类型的路由函数是否正确处理无 ID 情况

---

## 5. 数据库表映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
const resourceTableMap: Partial<Record<ResourceType, string>> = {
  prompt: 'prompt',
  dataset: 'dataset',
  // ... 需要验证资源存在的类型
}
```

**检查点**:
- [ ] 需要验证存在性的资源类型是否有映射
- [ ] 映射的表名是否与 Prisma schema 中的模型名匹配（camelCase）
- [ ] 不在映射中的类型会假设存在（可能导致 404）

---

## 6. 资源存在性检查

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
private async checkResourceExists(resourceType, resourceId) {
  switch (tableName) {
    case 'prompt':
      resource = await prisma.prompt.findUnique(...)
    // ... 每个表需要一个 case
  }
}
```

**检查点**:
- [ ] `resourceTableMap` 中的每个表是否都有对应的查询 case
- [ ] 查询是否选择了 `id` 和 `name` 字段

---

## 7. 选择器弹窗映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
const selectorDialogMap: Partial<Record<ResourceType, string>> = {
  prompt: 'prompt-selector-dialog',
  // ...
}
```

**检查点**:
- [ ] 需要选择器的资源类型是否有映射
- [ ] Dialog ID 是否与前端组件中的 ID 匹配
- [ ] 系统页面类型可以设为 `undefined`

---

## 8. 创建弹窗映射

**文件**: `apps/web/src/lib/goi/executor/accessHandler.ts`

```typescript
private getCreateDialogId(resourceType: ResourceType): string {
  const createDialogMap: Partial<Record<ResourceType, string>> = {
    model: 'add-model-dialog',
    // ...
  }
}
```

**检查点**:
- [ ] 通过弹窗创建的资源类型是否有映射
- [ ] Dialog ID 是否与前端组件中的 ID 匹配
- [ ] 默认回退 `create-${resourceType}-dialog` 是否可用

---

## 9. 前端导航处理

**文件**: `apps/web/src/hooks/useCopilot.ts` 或相关组件

```typescript
// 处理 Access 操作结果
if (result.navigatedTo) {
  router.push(result.navigatedTo)
}
if (result.openedDialog) {
  // 触发弹窗打开
}
```

**检查点**:
- [ ] `navigatedTo` 是否调用 `router.push()`
- [ ] `openedDialog` 是否触发对应弹窗
- [ ] 导航/弹窗是否在正确的时机执行

---

## 10. Observation 查询字段配置

**文件**: `apps/web/src/lib/goi/executor/observationHandler.ts`

```typescript
const defaultFields: Record<ResourceType, string[]> = {
  prompt: ['id', 'name', 'content', 'description'],
  // ...
}
```

**检查点**:
- [ ] 每个可查询的资源类型是否有默认字段列表
- [ ] 字段名是否与数据库 schema 匹配

---

## 11. State 操作处理器

**文件**: `apps/web/src/lib/goi/executor/stateHandler.ts`

**检查点**:
- [ ] 每个可修改的资源类型是否有 create/update/delete 处理
- [ ] 处理器是否正确调用对应的 Prisma 操作
- [ ] 是否正确处理乐观锁版本

---

## 添加新资源类型的完整流程

1. **定义类型** (`packages/shared/src/types/goi/events.ts`)
   ```typescript
   export type ResourceType = ... | 'new_resource'
   ```

2. **添加别名** (`apps/web/src/lib/goi/executor/shared.ts`) ⚠️ 唯一来源
   ```typescript
   export const resourceTypeAliases = {
     // ...
     'new_resources': 'new_resource',  // 复数形式
     'new-resource': 'new_resource',   // 连字符形式
   }
   ```

3. **添加路由** (`apps/web/src/lib/goi/executor/accessHandler.ts`)
   ```typescript
   routeMap.new_resource = (id, action) => { ... }
   ```

4. **添加表映射**（如需验证存在，`accessHandler.ts`）
   ```typescript
   resourceTableMap.new_resource = 'newResource'
   ```

5. **添加存在性检查 case**（`accessHandler.ts`）
   ```typescript
   case 'newResource':
     resource = await prisma.newResource.findUnique(...)
   ```

6. **添加选择器映射**（如需选择器，`accessHandler.ts`）
   ```typescript
   selectorDialogMap.new_resource = 'new-resource-selector-dialog'
   ```

7. **添加创建弹窗映射**（如通过弹窗创建，`accessHandler.ts`）
   ```typescript
   createDialogMap.new_resource = 'create-new-resource-dialog'
   ```

8. **添加 Observation 模型映射**（如需查询，`observationHandler.ts`）
   ```typescript
   resourceModelMap.new_resource = 'newResource'
   ```

9. **添加 Observation 默认字段**（如需查询，`observationHandler.ts`）
   ```typescript
   defaultFieldsMap.new_resource = ['id', 'name', ...]
   ```

10. **添加 State 模型映射**（如需增删改，`stateHandler.ts`）
    ```typescript
    resourceModelMap.new_resource = 'newResource'
    ```

---

## 调试技巧

### 查看规范化后的资源类型
```typescript
console.log('[AccessHandler] Normalized:', normalizeResourceType(operation.target.resourceType))
```

### 查看验证错误
```typescript
console.log('[AccessHandler] Validation:', this.validateOperation(operation))
```

### 查看生成的 URL
```typescript
console.log('[AccessHandler] Resolved URL:', result.navigatedTo)
console.log('[AccessHandler] Resolved Dialog:', result.openedDialog)
```

---

## 当前已支持的资源类型

| 类型 | 别名 | 路由 | 表映射 | 选择器 |
|-----|------|------|--------|-------|
| `prompt` | `prompts` | ✅ | ✅ | ✅ |
| `prompt_version` | - | ✅ | - | ✅ |
| `prompt_branch` | - | ✅ | - | ✅ |
| `dataset` | `datasets` | ✅ | ✅ | ✅ |
| `dataset_version` | - | ✅ | - | ✅ |
| `model` | `models` | ✅ | ✅ | ✅ |
| `provider` | - | ✅ | - | ✅ |
| `evaluator` | `evaluators` | ✅ | ✅ | ✅ |
| `task` | `tasks`, `test_task` | ✅ | ✅ | ✅ |
| `task_result` | - | ✅ | - | ✅ |
| `evaluation_schema` | - | ✅ | - | ✅ |
| `input_schema` | - | ✅ | - | ✅ |
| `output_schema` | - | ✅ | - | ✅ |
| `scheduled_task` | `task_schedule`, `schedule`, `cron_task` | ✅ | ✅ | ✅ |
| `alert_rule` | `alert`, `alarm` | ✅ | ✅ | ✅ |
| `notify_channel` | `notification`, `channel` | ✅ | ✅ | ✅ |
| `settings` | `system`, `config`, `preference` | ✅ | - | - |
| `dashboard` | `home`, `overview`, `main` | ✅ | - | - |
| `monitor` | `monitoring`, `alerts` | ✅ | - | - |
| `schema` | `schemas` | ✅ | - | ✅ |
