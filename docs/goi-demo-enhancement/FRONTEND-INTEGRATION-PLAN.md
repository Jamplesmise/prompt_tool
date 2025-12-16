# GOI 前端集成补全计划

> 版本：v1.0
> 日期：2024-12-15
> 背景：Handler 框架已存在，问题是**前端页面没有正确响应 GOI 事件**
> 目标：让 GOI 从"只能导航"升级到"端到端自动化"

---

## 一、问题诊断总结

### 1.1 核心断点

```
GOI 执行链路：

LLM 规划      Handler 执行      事件分发        前端响应
   ✅    →       ✅       →      ✅      →      ❌
                                                 ↑
                                            问题在这里！
```

### 1.2 具体问题

| 问题 | 现状 | 影响 |
|------|------|------|
| 弹窗事件没人监听 | 只有 3/20+ 页面有 `useGoiDialogListener` | 弹窗打不开 |
| 表单无法预填 | 没有实现表单数据传递机制 | 用户还要手动填 |
| 资源变更 UI 不更新 | StateHandler 改了数据，列表不刷新 | 用户看不到变化 |
| 资源 ID 解析缺失 | 用户说"情感分析提示词"，系统不知道是哪个 | 无法自动关联 |

### 1.3 已有的基础

| 组件 | 状态 | 位置 |
|------|------|------|
| `useGoiDialogListener` Hook | ✅ 已实现 | `apps/web/src/hooks/useGoiDialogListener.ts` |
| `GOI_DIALOG_IDS` 常量 | ✅ 已定义 | `apps/web/src/lib/goi/dialogIds.ts` |
| `AccessHandler` | ✅ 返回 URL+dialogId | `apps/web/src/lib/goi/executor/accessHandler.ts` |
| `StateHandler` | ✅ 调用 API | `apps/web/src/lib/goi/executor/stateHandler.ts` |
| `ObservationHandler` | ✅ 查询数据 | `apps/web/src/lib/goi/executor/observationHandler.ts` |
| `goi:openDialog` 事件分发 | ✅ 在 useCopilot 中 | `apps/web/src/components/goi/hooks/useCopilot.ts` |

---

## 二、阶段 1：弹窗监听补全（P1）

> 预估工时：**4-6 小时**
> 优先级：🔴 最高（不做这个，后面都白搭）

### 2.1 目标

让所有页面都能响应 `goi:openDialog` 事件，正确打开对应弹窗。

### 2.2 需要修改的文件

#### 已完成（验证即可）

| 页面 | 文件 | 状态 |
|------|------|------|
| 模型配置 | `apps/web/src/app/(dashboard)/models/page.tsx` | ✅ |
| 定时任务 | `apps/web/src/app/(dashboard)/scheduled/page.tsx` | ✅ |
| 监控告警 | `apps/web/src/app/(dashboard)/monitor/alerts/page.tsx` | ✅ |

#### 需要添加

| 页面 | 文件 | 涉及弹窗 |
|------|------|---------|
| 提示词列表 | `apps/web/src/app/(dashboard)/prompts/page.tsx` | CREATE_PROMPT |
| 提示词详情 | `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx` | PUBLISH_VERSION, CREATE_BRANCH, MERGE_BRANCH |
| 数据集列表 | `apps/web/src/app/(dashboard)/datasets/page.tsx` | CREATE_DATASET, UPLOAD_DATASET |
| 数据集详情 | `apps/web/src/app/(dashboard)/datasets/[id]/page.tsx` | CREATE_DATASET_VERSION, VERSION_DIFF |
| 评估器列表 | `apps/web/src/app/(dashboard)/evaluators/page.tsx` | CREATE_EVALUATOR |
| 评估器详情 | `apps/web/src/app/(dashboard)/evaluators/[id]/page.tsx` | EVALUATOR_DETAIL |
| 任务列表 | `apps/web/src/app/(dashboard)/tasks/page.tsx` | CREATE_TASK, CREATE_AB_TASK |
| 任务详情 | `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx` | - |
| Schema 管理 | `apps/web/src/app/(dashboard)/schemas/page.tsx` | CREATE_INPUT_SCHEMA, CREATE_OUTPUT_SCHEMA |

### 2.3 实施模板

```typescript
// 在每个页面组件顶部添加
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

export default function SomePage() {
  // 已有的 state
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  // 添加 GOI 弹窗监听
  useGoiDialogListener({
    [GOI_DIALOG_IDS.CREATE_XXX]: () => setCreateOpen(true),
    [GOI_DIALOG_IDS.EDIT_XXX]: () => {
      // 如果需要编辑特定资源，从 URL 参数获取
      const params = new URLSearchParams(window.location.search)
      const editId = params.get('editId')
      if (editId) {
        // 加载资源并打开编辑弹窗
        loadAndEdit(editId)
      }
    },
  })

  // ... 其余代码
}
```

### 2.4 任务清单

- [ ] **验证已有页面**
  - [ ] 测试 `/models` 页面 GOI 弹窗
  - [ ] 测试 `/scheduled` 页面 GOI 弹窗
  - [ ] 测试 `/monitor/alerts` 页面 GOI 弹窗

- [ ] **添加监听 - 提示词模块**
  - [ ] `/prompts/page.tsx` 添加 `useGoiDialogListener`
  - [ ] `/prompts/[id]/page.tsx` 添加 `useGoiDialogListener`

- [ ] **添加监听 - 数据集模块**
  - [ ] `/datasets/page.tsx` 添加 `useGoiDialogListener`
  - [ ] `/datasets/[id]/page.tsx` 添加 `useGoiDialogListener`

- [ ] **添加监听 - 评估器模块**
  - [ ] `/evaluators/page.tsx` 添加 `useGoiDialogListener`
  - [ ] `/evaluators/[id]/page.tsx` 添加 `useGoiDialogListener`

- [ ] **添加监听 - 任务模块**
  - [ ] `/tasks/page.tsx` 添加 `useGoiDialogListener`

- [ ] **添加监听 - Schema 模块**
  - [ ] `/schemas/page.tsx` 添加 `useGoiDialogListener`

### 2.5 验收测试

```bash
# 测试用例 1
输入: "帮我添加一个供应商"
期望:
  1. 导航到 /models ✓
  2. 打开 AddProviderModal ✓

# 测试用例 2
输入: "创建一个新的数据集"
期望:
  1. 导航到 /datasets ✓
  2. 打开 CreateDatasetModal ✓ (之前❌)

# 测试用例 3
输入: "发布当前提示词版本"
前提: 在提示词详情页
期望:
  1. 打开 PublishVersionModal ✓ (之前❌)
```

---

## 三、阶段 2：表单自动预填（P2）

> 预估工时：**1 天**
> 优先级：🔴 高

### 3.1 目标

GOI 能够自动填充表单字段，用户只需确认提交。

### 3.2 技术方案

采用 **Zustand Store + CustomEvent** 双通道方案：

```typescript
// 1. 创建 goiFormStore
// apps/web/src/lib/goi/formStore.ts
import { create } from 'zustand'

type GoiFormData = {
  formId: string
  resourceType: string
  data: Record<string, unknown>
  autoSubmit?: boolean  // 是否自动提交
}

type GoiFormStore = {
  pendingForm: GoiFormData | null
  setPendingForm: (data: GoiFormData | null) => void
  clearPendingForm: () => void
}

export const useGoiFormStore = create<GoiFormStore>((set) => ({
  pendingForm: null,
  setPendingForm: (pendingForm) => set({ pendingForm }),
  clearPendingForm: () => set({ pendingForm: null }),
}))

// 2. AccessHandler 设置预填数据
// 在 accessHandler.ts 中
async execute(operation: AccessOperation) {
  // ... 原有逻辑

  // 如果操作包含表单数据，设置预填
  if (operation.formData) {
    // 发送事件（立即生效）
    window.dispatchEvent(new CustomEvent('goi:prefillForm', {
      detail: {
        formId: `${operation.target.resourceType}-form`,
        resourceType: operation.target.resourceType,
        data: operation.formData,
      }
    }))
  }

  return result
}

// 3. 创建 useGoiFormPrefill Hook
// apps/web/src/hooks/useGoiFormPrefill.ts
import { useEffect } from 'react'
import { useGoiFormStore } from '@/lib/goi/formStore'
import type { FormInstance } from 'antd'

export function useGoiFormPrefill(
  form: FormInstance,
  formId: string,
  options?: {
    onPrefill?: (data: Record<string, unknown>) => void
    autoSubmit?: boolean
  }
) {
  const { pendingForm, clearPendingForm } = useGoiFormStore()

  useEffect(() => {
    // 监听事件
    const handler = (e: CustomEvent) => {
      if (e.detail.formId === formId) {
        form.setFieldsValue(e.detail.data)
        options?.onPrefill?.(e.detail.data)

        if (options?.autoSubmit || e.detail.autoSubmit) {
          setTimeout(() => form.submit(), 100)
        }
      }
    }

    window.addEventListener('goi:prefillForm', handler as EventListener)
    return () => window.removeEventListener('goi:prefillForm', handler as EventListener)
  }, [form, formId, options])

  // 也检查 store 中的数据
  useEffect(() => {
    if (pendingForm?.formId === formId) {
      form.setFieldsValue(pendingForm.data)
      options?.onPrefill?.(pendingForm.data)
      clearPendingForm()

      if (options?.autoSubmit || pendingForm.autoSubmit) {
        setTimeout(() => form.submit(), 100)
      }
    }
  }, [pendingForm, formId, form, options, clearPendingForm])
}
```

### 3.3 任务清单

- [ ] **创建基础设施**
  - [ ] 创建 `apps/web/src/lib/goi/formStore.ts`
  - [ ] 创建 `apps/web/src/hooks/useGoiFormPrefill.ts`
  - [ ] 更新 `accessHandler.ts` 支持 `formData` 字段

- [ ] **更新 Plan Prompt**
  - [ ] 在 `planPrompt.ts` 中添加表单数据生成示例
  - [ ] 指导 LLM 生成合理的默认值

- [ ] **为表单添加预填支持**
  - [ ] 提示词创建表单
  - [ ] 数据集创建表单
  - [ ] 任务创建表单
  - [ ] 模型配置表单
  - [ ] 评估器创建表单

### 3.4 使用示例

```typescript
// 在提示词创建页面
import { useGoiFormPrefill } from '@/hooks/useGoiFormPrefill'

export default function CreatePromptPage() {
  const [form] = Form.useForm()

  // 添加 GOI 表单预填
  useGoiFormPrefill(form, 'prompt-form', {
    onPrefill: (data) => {
      console.log('Form prefilled by GOI:', data)
    },
    autoSubmit: false, // 让用户确认后再提交
  })

  return (
    <Form form={form} name="prompt-form" onFinish={handleSubmit}>
      <Form.Item name="name" label="名称">
        <Input />
      </Form.Item>
      <Form.Item name="content" label="内容">
        <TextArea />
      </Form.Item>
      <Button type="primary" htmlType="submit">创建</Button>
    </Form>
  )
}
```

### 3.5 验收测试

```bash
# 测试用例
输入: "创建一个名为'情感分析'的提示词，内容是'请分析以下文本的情感倾向'"
期望:
  1. 导航到 /prompts/new
  2. 表单自动填充：
     - name = "情感分析"
     - content = "请分析以下文本的情感倾向"
  3. 用户点击"创建"按钮提交
```

---

## 四、阶段 3：State 执行与 UI 联动（P3）

> 预估工时：**1 天**
> 优先级：🔴 高

### 4.1 目标

StateHandler 执行成功后，UI 能正确响应（刷新列表、显示新资源）。

### 4.2 当前问题

```
StateHandler.execute()
  → POST /api/prompts 成功
  → 返回 { id: 'xxx', name: '情感分析' }
  → Agent 收到结果 ✅
  → 但页面列表没刷新 ❌
  → 用户看不到新创建的资源 ❌
```

### 4.3 技术方案

#### 方案 A：事件驱动 + React Query 失效

```typescript
// 1. StateHandler 执行后发布事件
// stateHandler.ts
async execute(operation: StateOperation) {
  const result = await this.callApi(operation)

  // 发布资源变更事件
  window.dispatchEvent(new CustomEvent('goi:resourceChanged', {
    detail: {
      action: operation.action,
      resourceType: operation.target.resourceType,
      resourceId: result.id || operation.target.resourceId,
      data: result,
    }
  }))

  return { success: true, result }
}

// 2. 创建 useGoiResourceListener Hook
// apps/web/src/hooks/useGoiResourceListener.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useGoiResourceListener(resourceType: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.resourceType === resourceType) {
        // 使查询失效，触发重新获取
        queryClient.invalidateQueries({ queryKey: [resourceType] })

        console.log(`[GOI] Resource ${e.detail.action}:`, e.detail)
      }
    }

    window.addEventListener('goi:resourceChanged', handler as EventListener)
    return () => window.removeEventListener('goi:resourceChanged', handler as EventListener)
  }, [resourceType, queryClient])
}

// 3. 在列表页面使用
// prompts/page.tsx
export default function PromptsPage() {
  // 监听 GOI 资源变更
  useGoiResourceListener('prompt')

  // 使用 React Query 获取列表
  const { data: prompts, refetch } = useQuery({
    queryKey: ['prompt'],
    queryFn: fetchPrompts,
  })

  // ...
}
```

### 4.4 任务清单

- [ ] **创建基础设施**
  - [ ] 创建 `apps/web/src/hooks/useGoiResourceListener.ts`
  - [ ] 更新 `stateHandler.ts` 添加事件发布

- [ ] **为列表页添加监听**
  - [ ] `/prompts/page.tsx` 添加 `useGoiResourceListener`
  - [ ] `/datasets/page.tsx` 添加 `useGoiResourceListener`
  - [ ] `/tasks/page.tsx` 添加 `useGoiResourceListener`
  - [ ] `/models/page.tsx` 添加 `useGoiResourceListener`
  - [ ] `/evaluators/page.tsx` 添加 `useGoiResourceListener`

- [ ] **自动导航到新资源**
  - [ ] StateHandler 创建成功后，自动跳转到详情页
  - [ ] 或者在列表中高亮新创建的资源

### 4.5 验收测试

```bash
# 测试用例
场景: 在提示词列表页
输入: "创建一个名为'测试提示词'的提示词"
期望:
  1. StateHandler 调用 POST /api/prompts 成功
  2. 提示词列表自动刷新
  3. 新创建的"测试提示词"出现在列表中
  4. (可选) 自动跳转到新创建的提示词详情页
```

---

## 五、阶段 4：资源 ID 模糊解析（P4）

> 预估工时：**1 天**
> 优先级：🟡 中

### 5.1 目标

用户说"情感分析提示词"，系统能自动匹配到正确的资源 ID。

### 5.2 技术方案

```typescript
// 1. 在 Gatherer 阶段解析资源引用
// apps/web/src/lib/goi/agent/resourceResolver.ts

type ResourceHint = {
  resourceType: string
  hint: string  // 用户描述，如"情感分析"、"测试数据集"
}

type ResolveResult = {
  resolved: boolean
  resourceId?: string
  resourceName?: string
  candidates?: Array<{ id: string; name: string }>
  needsConfirmation?: boolean
}

async function resolveResource(hint: ResourceHint): Promise<ResolveResult> {
  // 1. 模糊搜索
  const response = await fetch(
    `/api/${hint.resourceType}s?search=${encodeURIComponent(hint.hint)}&limit=5`
  )
  const { data } = await response.json()

  if (data.length === 0) {
    return { resolved: false }
  }

  if (data.length === 1) {
    return {
      resolved: true,
      resourceId: data[0].id,
      resourceName: data[0].name,
    }
  }

  // 多个匹配，需要用户确认
  return {
    resolved: false,
    needsConfirmation: true,
    candidates: data.map((d: { id: string; name: string }) => ({
      id: d.id,
      name: d.name,
    })),
  }
}

// 2. 在 Checkpoint 中展示选项
// 如果 needsConfirmation，创建资源选择检查点
if (!resolution.resolved && resolution.needsConfirmation) {
  return {
    checkpoint: {
      type: 'resource_selection',
      message: `找到多个匹配的${resourceTypeName}，请选择：`,
      options: resolution.candidates.map(c => ({
        label: c.name,
        value: c.id,
      })),
    },
  }
}
```

### 5.3 任务清单

- [ ] **创建资源解析器**
  - [ ] 创建 `apps/web/src/lib/goi/agent/resourceResolver.ts`
  - [ ] 实现模糊搜索逻辑
  - [ ] 实现多候选处理

- [ ] **集成到 Gatherer**
  - [ ] 在 `gatherer.ts` 中调用资源解析
  - [ ] 处理解析失败的情况

- [ ] **更新 Checkpoint 组件**
  - [ ] 支持资源选择类型的 Checkpoint
  - [ ] 展示候选资源列表供用户选择

- [ ] **更新 Plan Prompt**
  - [ ] 添加资源引用语法示例（如 `$prompt:情感分析`）
  - [ ] 指导 LLM 使用描述性引用

### 5.4 验收测试

```bash
# 测试用例 1
前提: 只有一个名为"情感分析"的提示词
输入: "用情感分析提示词创建任务"
期望: 自动解析到该提示词 ID，无需确认

# 测试用例 2
前提: 有"情感分析v1"和"情感分析v2"两个提示词
输入: "用情感分析提示词创建任务"
期望: 弹出 Checkpoint，让用户选择使用哪个
```

---

## 六、阶段 5：端到端演示场景（P5）

> 预估工时：**0.5 天**
> 优先级：🟢 中

### 6.1 演示脚本

```
=== GOI 端到端演示 ===

准备工作:
1. 已配置好模型（OpenAI 或其他）
2. 已有一个名为"测试数据集"的数据集（10+ 条数据）

演示步骤:

[场景1: 简单创建]
用户: "帮我创建一个情感分析提示词"
系统:
  ✓ TODO: 创建情感分析提示词
  → 自动填充表单
  → 等待用户确认提交
用户: 点击"创建"
结果: 提示词创建成功，跳转到详情页

[场景2: 端到端流程]
用户: "用刚才的提示词和测试数据集创建一个任务跑一下"
系统:
  ✓ TODO: 查找测试数据集
  → 找到"测试数据集"
  🔄 Checkpoint: 确认使用这个数据集？
用户: 点击"确认"
系统:
  ✓ TODO: 创建测试任务
  🔄 Checkpoint: 确认创建任务？
用户: 点击"确认"
系统:
  ✓ TODO: 执行任务
  → 跳转到任务结果页
  → 显示执行进度
结果: 用户全程只点击了 3 次

演示亮点:
1. 用户只说目标，系统自动规划执行
2. 关键步骤有确认，用户保持控制权
3. 自动填表单、自动跳转、自动刷新
4. 整个流程 < 2 分钟
```

### 6.2 任务清单

- [ ] 准备演示数据
- [ ] 端到端测试完整流程
- [ ] 修复发现的问题
- [ ] 录制演示视频

---

## 七、总体进度计划

| 阶段 | 内容 | 工时 | 累计 | 成功率提升 |
|------|------|------|------|-----------|
| P1 | 弹窗监听补全 | 4-6h | 0.5-1天 | 10% → 30% |
| P2 | 表单自动预填 | 1天 | 1.5-2天 | 30% → 50% |
| P3 | State-UI 联动 | 1天 | 2.5-3天 | 50% → 60% |
| P4 | 资源 ID 解析 | 1天 | 3.5-4天 | 60% → 70% |
| P5 | 端到端演示 | 0.5天 | 4-4.5天 | 验证 |

**总计：4-4.5 个工作日**

---

## 八、快速验证检查清单

完成每个阶段后，执行以下测试：

### P1 完成后

```bash
# 测试所有弹窗能打开
[ ] 模型页 - 添加供应商弹窗
[ ] 模型页 - 添加模型弹窗
[ ] 提示词页 - 创建提示词（页面/弹窗）
[ ] 数据集页 - 上传数据集弹窗
[ ] 任务页 - 创建任务弹窗
[ ] 定时任务页 - 创建定时任务弹窗
[ ] 监控页 - 创建告警规则弹窗
```

### P2 完成后

```bash
# 测试表单预填
[ ] 创建提示词 - 名称和内容自动填充
[ ] 创建任务 - 名称自动填充
[ ] 创建模型 - 名称自动填充
```

### P3 完成后

```bash
# 测试 State 执行
[ ] 创建提示词后，列表自动刷新
[ ] 创建任务后，列表自动刷新
[ ] 删除资源后，列表自动更新
```

### P4 完成后

```bash
# 测试资源解析
[ ] "用情感分析提示词创建任务" - 自动匹配
[ ] 多候选时弹出选择 Checkpoint
```

---

## 九、开发日志

### Day 1-2 (2024-12-15~16)

**P1 弹窗监听补全** ✅
- [x] 为 9 个页面添加 `useGoiDialogListener`
- [x] prompts/page.tsx, prompts/new/page.tsx
- [x] datasets/page.tsx
- [x] evaluators/page.tsx
- [x] tasks/page.tsx
- [x] schemas/page.tsx

**P2 表单自动预填** ✅
- [x] 创建 `goiFormStore.ts`
- [x] 创建 `useGoiFormPrefill.ts` Hook
- [x] 更新 AccessHandler 支持 formData
- [x] 更新 CreateTaskForm 添加预填支持
- [x] 更新 prompts/new/page.tsx 添加预填支持

**P3 State-UI 联动** ✅
- [x] 创建 `useGoiResourceListener.ts` Hook
- [x] 更新 StateHandler 返回 action 和 resourceType
- [x] 更新 useCopilot 分发 `goi:resourceChanged` 事件
- [x] 为 prompts/tasks/datasets 页面添加资源监听

**P4 资源 ID 模糊解析** ✅
- [x] 创建 `resourceResolver.ts`（模糊搜索、批量解析）
- [x] 集成到 `gatherer.ts`（resolveResourceReferences）
- [x] 更新 `agentLoop.ts` 处理资源选择检查点
- [x] 更新 `todoItem.ts` 添加 resource_selection 检查点类型
- [x] 更新 `planPrompt.ts` 添加资源引用语法说明

**P5 端到端演示修复** ✅
- [x] 更新 `/api/goi/agent/checkpoint` 支持 selectedResourceId
- [x] 更新 `/api/goi/agent/step` 返回 pendingCheckpoint
- [x] 更新 useCopilot.respondCheckpoint 处理资源选择
- [x] 更新 useCopilot 的执行循环设置 pendingCheckpoint
