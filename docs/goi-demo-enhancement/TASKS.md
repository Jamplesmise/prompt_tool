# GOI Demo 增强计划 - 任务清单

> 预计工期：4-6 天
> 目标：打造有说服力的 GOI 技术演示
> 技术设计：参见 [DESIGN.md](./DESIGN.md)

---

## Phase 1: State Handler 实现（2 天）

> 参考：DESIGN.md 第一节、第五节、第六节

### Day 1: 核心实现

#### 1.1 类型定义补充

- [ ] **更新 `packages/shared/types/goi.ts`**
  - 添加 `StateOperation` 类型（DESIGN.md 1.1）
  - 添加 `StateExecutionResult` 类型
  - 更新 `GoiExecutionResult` 支持 state 类型

```typescript
// 需要添加的类型
export type StateOperation = {
  type: 'state'
  target: { resourceType: ResourceType; resourceId?: string }
  action: 'create' | 'update' | 'delete'
  expectedState?: Record<string, unknown>
}
```

#### 1.2 事件发布函数

- [ ] **更新 `apps/web/src/lib/events/index.ts`**
  - 添加 `publishResourceCreated()` 函数
  - 添加 `publishResourceUpdated()` 函数
  - 添加 `publishResourceDeleted()` 函数
  - 参考 DESIGN.md 第五节

#### 1.3 API 客户端

- [ ] **创建 `apps/web/src/lib/goi/executor/apiClient.ts`**
  - 实现 `GoiApiClient` 类
  - 处理认证（cookie 自动携带）
  - 实现错误重试逻辑
  - 参考 DESIGN.md 第六节

#### 1.4 State Handler 核心

- [ ] **创建 `apps/web/src/lib/goi/executor/stateHandler.ts`**
  - 实现 `StateHandler` 类
  - 实现 API 端点映射 `API_ENDPOINTS`
  - 实现 `execute()` 方法
  - 实现 `validateOperation()` 方法
  - 实现 `getRequiredFields()` 方法
  - 参考 DESIGN.md 1.2、1.3

### Day 2: 集成与测试

#### 1.5 集成到执行器

- [ ] **修改 `apps/web/src/lib/goi/executor/index.ts`**
  - 导入 StateHandler
  - 在 switch 中添加 'state' 分支
  - 存储执行结果用于后续引用

#### 1.6 错误处理

- [ ] **创建 `apps/web/src/lib/goi/executor/errors.ts`**
  - 定义 `GoiErrorCode` 枚举
  - 实现 `GoiError` 类
  - 实现 `isRetryableError()` 函数
  - 参考 DESIGN.md 第九节

- [ ] **创建 `apps/web/src/lib/goi/executor/errorMessages.ts`**
  - 实现 `getErrorMessage()` 函数
  - 定义用户友好的错误信息

#### 1.7 单元测试

- [ ] **创建 `apps/web/src/lib/goi/executor/__tests__/stateHandler.test.ts`**
  - 测试创建资源
  - 测试更新资源
  - 测试删除资源
  - 测试必填字段验证
  - 测试 API 错误处理
  - 参考 DESIGN.md 8.1

---

## Phase 2: Observation Handler 实现（1 天）

> 参考：DESIGN.md 第二节

### 2.1 类型定义

- [ ] **更新 `packages/shared/types/goi.ts`**
  - 添加 `ObservationQuery` 类型
  - 添加 `ObservationOperation` 类型
  - 添加 `ObservationQueryResult` 类型
  - 添加 `ObservationExecutionResult` 类型
  - 参考 DESIGN.md 2.1

### 2.2 Observation Handler 核心

- [ ] **创建 `apps/web/src/lib/goi/executor/observationHandler.ts`**
  - 实现 `ObservationHandler` 类
  - 实现查询端点映射 `QUERY_ENDPOINTS`
  - 实现字段白名单 `FIELD_WHITELIST`
  - 实现 `execute()` 方法
  - 实现 `executeQuery()` 方法
  - 实现 `buildListUrl()` 方法（过滤、排序、分页）
  - 实现 `filterFields()` 方法
  - 参考 DESIGN.md 2.2、2.3

### 2.3 集成到执行器

- [ ] **修改 `apps/web/src/lib/goi/executor/index.ts`**
  - 导入 ObservationHandler
  - 在 switch 中添加 'observation' 分支

### 2.4 单元测试

- [ ] **创建 `apps/web/src/lib/goi/executor/__tests__/observationHandler.test.ts`**
  - 测试单资源查询
  - 测试列表查询
  - 测试过滤条件
  - 测试字段过滤

---

## Phase 3: 变量引用与执行引擎（1 天）

> 参考：DESIGN.md 第三节

### 3.1 变量解析器

- [ ] **创建 `apps/web/src/lib/goi/executor/variableResolver.ts`**
  - 定义 `StepResults` 类型
  - 定义变量引用正则 `VARIABLE_PATTERN`
  - 实现 `resolveVariables()` 函数
  - 实现 `resolveStringVariables()` 函数
  - 实现 `resolveVariable()` 函数
  - 实现 `getNestedValue()` 函数
  - 参考 DESIGN.md 3.1、3.2

### 3.2 变量解析器测试

- [ ] **创建 `apps/web/src/lib/goi/executor/__tests__/variableResolver.test.ts`**
  - 测试简单变量引用 `$1.result.id`
  - 测试数组索引 `$2.result[0].name`
  - 测试嵌套路径 `$1.result.data.items[0].id`
  - 测试对象中的变量替换
  - 测试缺失步骤结果的处理
  - 参考 DESIGN.md 8.2

### 3.3 执行引擎升级

- [ ] **重构 `apps/web/src/lib/goi/executor/index.ts`**
  - 添加 `stepResults: StepResults` 成员
  - 在 `executeItem()` 中调用 `resolveVariables()`
  - 存储每步结果到 `stepResults`
  - 实现 `executeTodoList()` 方法
  - 实现 `areDependenciesMet()` 方法
  - 参考 DESIGN.md 3.3

### 3.4 前端状态同步

- [ ] **更新 `apps/web/src/lib/goi/execution/progressSync.ts`**
  - 实现 `updateTodoItemStatus()` 函数
  - 实现 `setCurrentExecutingItem()` 函数
  - 与 Zustand store 同步
  - 参考 DESIGN.md 7.1

---

## Phase 4: Prompt 优化与演示场景（1-2 天）

> 参考：DESIGN.md 第四节

### 4.1 Prompt 补充

- [ ] **更新 `apps/web/src/lib/goi/prompts/planPrompt.ts`**
  - 添加 State 操作示例（DESIGN.md STATE_EXAMPLES）
  - 添加 Observation 操作示例（DESIGN.md OBSERVATION_EXAMPLES）
  - 添加完整场景示例（DESIGN.md FULL_SCENARIO_EXAMPLE）
  - 添加变量引用语法说明

### 4.2 前端展示优化

- [ ] **更新 `apps/web/src/components/goi/CopilotPanel/TodoListView.tsx`**
  - 在 TodoItemView 中添加结果摘要展示
  - 根据 category 格式化不同类型的结果
  - 添加 styles.resultSummary 样式
  - 参考 DESIGN.md 7.2

- [ ] **更新 `apps/web/src/components/goi/CopilotPanel/CheckpointSection.tsx`**
  - 展示 Observation 查询结果供用户确认
  - 支持从多个结果中选择一个

### 4.3 演示场景测试

- [ ] **准备测试数据**
  - 确保有名称包含"测试"的数据集
  - 确保有可用的启用状态的模型
  - 确保 API 端点正常工作

- [ ] **端到端测试用例**
  - 输入："帮我创建一个情感分析提示词"
  - 验证：提示词被正确创建

- [ ] **端到端测试用例**
  - 输入："帮我创建一个提示词，用测试数据集跑一下"
  - 验证：
    1. 提示词被创建
    2. 数据集被查询到并展示供确认
    3. 模型被自动选择
    4. 任务被创建
    5. 任务开始执行

---

## Phase 5: 润色与演示准备（0.5 天）

### 5.1 代码清理

- [ ] 删除调试用的 console.log
- [ ] 添加必要的代码注释
- [ ] 统一错误处理格式
- [ ] 检查 TypeScript 类型完整性

### 5.2 边界情况处理

- [ ] API 超时处理
- [ ] 网络断开处理
- [ ] 用户取消执行处理
- [ ] 空结果处理

### 5.3 演示准备

- [ ] **编写演示脚本**
  - 步骤 1：展示当前问题（只能导航）
  - 步骤 2：展示增强后能力（完整执行）
  - 步骤 3：展示人机协作（checkpoint）

- [ ] **准备演示环境**
  - 清理测试数据
  - 预置演示用的数据集
  - 配置好可用的模型

---

## 文件变更清单

### 新增文件（8 个）

| 文件 | 说明 | Phase |
|------|------|-------|
| `apps/web/src/lib/goi/executor/stateHandler.ts` | State 操作处理器 | 1 |
| `apps/web/src/lib/goi/executor/observationHandler.ts` | Observation 操作处理器 | 2 |
| `apps/web/src/lib/goi/executor/variableResolver.ts` | 变量引用解析器 | 3 |
| `apps/web/src/lib/goi/executor/apiClient.ts` | API 客户端 | 1 |
| `apps/web/src/lib/goi/executor/errors.ts` | 错误定义 | 1 |
| `apps/web/src/lib/goi/executor/errorMessages.ts` | 错误信息 | 1 |
| `apps/web/src/lib/goi/executor/__tests__/stateHandler.test.ts` | State 测试 | 1 |
| `apps/web/src/lib/goi/executor/__tests__/variableResolver.test.ts` | 变量解析测试 | 3 |

### 修改文件（6 个）

| 文件 | 变更内容 | Phase |
|------|---------|-------|
| `packages/shared/types/goi.ts` | 添加 State/Observation 类型 | 1-2 |
| `apps/web/src/lib/goi/executor/index.ts` | 集成新 Handler，重构执行逻辑 | 1-3 |
| `apps/web/src/lib/events/index.ts` | 添加资源 CRUD 事件发布函数 | 1 |
| `apps/web/src/lib/goi/prompts/planPrompt.ts` | 添加示例，优化 prompt | 4 |
| `apps/web/src/lib/goi/execution/progressSync.ts` | 添加状态同步函数 | 3 |
| `apps/web/src/components/goi/CopilotPanel/TodoListView.tsx` | 添加结果展示 | 4 |

---

## 验收标准

### 功能验收

- [ ] 输入"创建一个提示词叫xxx"，系统自动创建（无需手动填表单）
- [ ] 输入"查找数据集"，系统返回数据集列表
- [ ] 步骤间变量引用正常工作（$1.result.id）
- [ ] TODO List 自动推进执行
- [ ] Checkpoint 能正常暂停和继续
- [ ] 执行失败有清晰提示和错误码

### 演示验收

- [ ] 演示场景"创建提示词并测试"完整执行
- [ ] 完整流程在 2 分钟内完成
- [ ] 非技术人员能理解 GOI 的价值
- [ ] 展示与手动操作的效率对比

---

## 开发日志

### Day 1 - 2025-12-15

**计划**：
- [x] Phase 3：变量解析器实现
- [x] Phase 4：Prompt 优化、前端展示优化

**实际**：
- ✅ 创建 `variableResolver.ts` - 完整的变量解析器（支持 `$1.result.id`、`$prev.result`、数组索引、嵌套路径）
- ✅ 创建 `variableResolver.test.ts` - 40 个单元测试全部通过
- ✅ 更新 `executor/index.ts` - 集成变量解析器，GoiExecutor 支持步骤结果存储
- ✅ 更新 `planPrompt.ts` - 添加变量引用语法说明、State/Observation 示例、完整场景示例
- ✅ 更新 `displayTypes.ts` - 添加 result、error、category 字段
- ✅ 更新 `groupGenerator.ts` - 传递 result、error、category 到展示层
- ✅ 更新 `TodoListView.tsx` - 添加结果摘要展示（根据 category 格式化）
- ✅ 更新 `CheckpointSection.tsx` - 添加 Observation 查询结果表格展示
- ✅ 更新 `styles.module.css` - 添加结果摘要和错误信息样式

**问题**：
- 无，Phase 1-2（State/Observation Handler）之前已实现

---

### Day 2 - 2025-12-15 (续)

**计划**：
- [x] 前端集成 P1：弹窗监听补全

**实际**：
- ✅ 更新 `datasets/page.tsx` - 添加 GOI 弹窗监听（CREATE_DATASET, UPLOAD_DATASET, TEMPLATE_DOWNLOAD）
- ✅ 更新 `prompts/page.tsx` - 添加 GOI 弹窗监听（CREATE_PROMPT → 导航到新建页）
- ✅ 更新 `evaluators/page.tsx` - 添加 GOI 弹窗监听（CREATE_EVALUATOR, EVALUATOR_DETAIL）
- ✅ 更新 `tasks/page.tsx` - 添加 GOI 弹窗监听（CREATE_TASK, CREATE_AB_TASK）
- ✅ 更新 `schemas/page.tsx` - 添加 GOI 弹窗监听（CREATE_INPUT_SCHEMA, CREATE_OUTPUT_SCHEMA, INFER_SCHEMA）

**说明**：
- 已有监听的页面：models、scheduled、monitor/alerts（共 3 页面）
- 新增监听的页面：datasets、prompts、evaluators、tasks、schemas（共 5 页面）
- 各页面根据实际使用的弹窗/导航逻辑添加对应的监听器

---

### Day 2 - P2 表单自动预填

**计划**：
- [x] 前端集成 P2：表单自动预填

**实际**：
- ✅ 创建 `formStore.ts` - Zustand store 存储待预填表单数据
- ✅ 创建 `useGoiFormPrefill.ts` - Hook 支持表单自动填充（事件 + store 双通道）
- ✅ 更新 `operations.ts` - AccessContext 添加 formData、autoSubmit 字段
- ✅ 更新 `operations.ts` - AccessExecutionResult 添加 formPrefill 字段
- ✅ 更新 `accessHandler.ts` - 支持 formPrefill 数据传递
- ✅ 更新 `useCopilot.ts` - 处理 formPrefill 事件分发（3处）
- ✅ 更新 `prompts/new/page.tsx` - 添加 GOI 表单预填支持
- ✅ 更新 `CreateTaskForm.tsx` - 添加 GOI 表单预填支持

**说明**：
- 数据集创建为文件上传，无法预填文件，跳过
- 表单预填通过 `goi:prefillForm` CustomEvent 实现
- 支持字段映射和字段转换

---

### 待完成

**前端集成 P3-P5**：
- [ ] P3：State-UI 联动
- [ ] P4：资源 ID 模糊解析
- [ ] P5：端到端演示场景

**Phase 5**：
- [ ] 边界情况处理（API 超时、网络断开、用户取消）
- [ ] 演示场景准备
