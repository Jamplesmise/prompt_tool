# Phase 4: 任务执行引擎 - 任务清单

> 前置依赖：Phase 0, 1, 2, 3 完成
> 预期产出：完整的任务创建、执行、监控、结果存储功能

---

## 开发任务

### 4.1 任务执行核心

**目标**：实现任务执行引擎核心逻辑

**任务项**：
- [ ] 创建 `lib/taskExecutor.ts` - 任务执行器主类
- [ ] 创建 `lib/concurrencyLimiter.ts` - 并发控制器
- [ ] 创建 `lib/promptRenderer.ts` - 提示词渲染器
- [ ] 实现执行计划生成（笛卡尔积）
- [ ] 实现单条测试执行流程
- [ ] 实现重试逻辑（指数退避）
- [ ] 实现超时控制
- [ ] 实现任务终止信号

**代码结构**：
```
src/lib/
├── taskExecutor.ts
├── concurrencyLimiter.ts
└── promptRenderer.ts
```

**核心类设计**：
```typescript
// taskExecutor.ts
class TaskExecutor {
  private shouldStop = false;
  private runningCount = 0;

  async execute(taskId: string): Promise<void> {
    const task = await this.loadTask(taskId);
    const plan = this.generateExecutionPlan(task);
    const limiter = new ConcurrencyLimiter(task.config.execution.concurrency);

    await Promise.all(
      plan.map(item =>
        limiter.execute(() => this.executeSingleTest(task, item))
      )
    );

    await this.calculateStats(taskId);
  }

  async stop(): Promise<void> {
    this.shouldStop = true;
    while (this.runningCount > 0) {
      await sleep(100);
    }
  }

  private async executeSingleTest(task: Task, item: ExecutionPlanItem) {
    if (this.shouldStop) return;

    this.runningCount++;
    try {
      // 1. 渲染提示词
      // 2. 调用模型
      // 3. 保存结果
      // 4. 执行评估
      // 5. 更新进度
    } finally {
      this.runningCount--;
    }
  }
}
```

**验收标准**：
- [ ] 执行计划正确生成
- [ ] 并发数正确限制
- [ ] 超时正确处理
- [ ] 重试正确执行
- [ ] 终止信号正确响应

---

### 4.2 进度推送系统

**目标**：实现 SSE 实时进度推送

**任务项**：
- [ ] 创建 `lib/progressPublisher.ts` - 进度发布器
- [ ] 实现 Redis Pub/Sub（可选，MVP 可用内存）
- [ ] 创建 `api/v1/tasks/[id]/progress/route.ts` - SSE 端点
- [ ] 创建 `hooks/useTaskProgress.ts` - 前端订阅 Hook

**代码结构**：
```
src/
├── lib/progressPublisher.ts
├── app/api/v1/tasks/[id]/progress/route.ts
└── hooks/useTaskProgress.ts
```

**进度发布器**：
```typescript
// MVP 简化版本：内存 EventEmitter
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

export function publishProgress(taskId: string, event: ProgressEvent) {
  emitter.emit(`task:${taskId}`, event);
}

export function subscribeProgress(taskId: string, callback: (event: ProgressEvent) => void) {
  const handler = (event: ProgressEvent) => callback(event);
  emitter.on(`task:${taskId}`, handler);
  return () => emitter.off(`task:${taskId}`, handler);
}
```

**验收标准**：
- [ ] SSE 连接正常建立
- [ ] 进度实时推送
- [ ] 完成/失败/终止事件正确发送
- [ ] 连接断开正确清理

---

### 4.3 任务 API - 后端

**目标**：实现任务管理 API

**任务项**：
- [ ] 创建 `api/v1/tasks/route.ts` - GET, POST
- [ ] 创建 `api/v1/tasks/[id]/route.ts` - GET, DELETE
- [ ] 创建 `api/v1/tasks/[id]/run/route.ts` - 启动任务
- [ ] 创建 `api/v1/tasks/[id]/stop/route.ts` - 终止任务
- [ ] 创建 `api/v1/tasks/[id]/retry/route.ts` - 重试失败
- [ ] 创建 `api/v1/tasks/[id]/results/route.ts` - 获取结果
- [ ] 创建 `api/v1/tasks/[id]/results/[rid]/route.ts` - 单条结果
- [ ] 创建 `api/v1/tasks/[id]/results/export/route.ts` - 导出结果

**代码结构**：
```
src/app/api/v1/tasks/
├── route.ts
└── [id]/
    ├── route.ts
    ├── run/route.ts
    ├── stop/route.ts
    ├── retry/route.ts
    ├── progress/route.ts
    └── results/
        ├── route.ts
        ├── export/route.ts
        └── [rid]/route.ts
```

**创建任务事务**：
```typescript
async function createTask(data: CreateTaskInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. 创建任务
    const task = await tx.task.create({
      data: {
        name: data.name,
        description: data.description,
        datasetId: data.config.datasetId,
        config: data.config.execution,
        createdById: userId,
      }
    });

    // 2. 创建关联：提示词
    await tx.taskPrompt.createMany({
      data: data.config.promptIds.map((promptId, index) => ({
        taskId: task.id,
        promptId,
        promptVersionId: data.config.promptVersionIds[index],
      }))
    });

    // 3. 创建关联：模型
    await tx.taskModel.createMany({
      data: data.config.modelIds.map(modelId => ({
        taskId: task.id,
        modelId,
      }))
    });

    // 4. 创建关联：评估器
    await tx.taskEvaluator.createMany({
      data: data.config.evaluatorIds.map(evaluatorId => ({
        taskId: task.id,
        evaluatorId,
      }))
    });

    return task;
  });
}
```

**验收标准**：
- [ ] 任务 CRUD 正常
- [ ] 启动任务状态转换正确
- [ ] 终止任务正确停止执行
- [ ] 结果查询分页正常
- [ ] 导出功能可用

---

### 4.4 任务 UI - 列表和创建

**目标**：实现任务列表和创建页面

**任务项**：
- [ ] 创建 `services/tasks.ts` - API 封装
- [ ] 创建 `hooks/useTasks.ts` - React Query hooks
- [ ] 创建 `components/task/TaskStatusTag.tsx` - 状态标签
- [ ] 创建 `components/task/TaskProgress.tsx` - 进度条组件
- [ ] 创建 `components/task/CreateTaskForm.tsx` - 创建表单（步骤式）
- [ ] 创建 `app/(dashboard)/tasks/page.tsx` - 列表页
- [ ] 创建 `app/(dashboard)/tasks/new/page.tsx` - 创建页

**代码结构**：
```
src/
├── services/tasks.ts
├── hooks/useTasks.ts
├── components/task/
│   ├── TaskStatusTag.tsx
│   ├── TaskProgress.tsx
│   └── CreateTaskForm.tsx
└── app/(dashboard)/tasks/
    ├── page.tsx
    └── new/page.tsx
```

**创建表单步骤**：
```tsx
<StepsForm onFinish={handleCreate}>
  <StepsForm.StepForm name="basic" title="基本信息">
    <ProFormText name="name" label="任务名称" rules={[{ required: true }]} />
    <ProFormTextArea name="description" label="描述" />
  </StepsForm.StepForm>

  <StepsForm.StepForm name="config" title="测试配置">
    <ProFormSelect name="promptIds" label="提示词" mode="multiple" />
    {/* 动态显示版本选择 */}
    <ProFormSelect name="modelIds" label="模型" mode="multiple" />
    <ProFormSelect name="datasetId" label="数据集" />
  </StepsForm.StepForm>

  <StepsForm.StepForm name="evaluators" title="评估配置">
    <ProFormSelect name="evaluatorIds" label="评估器" mode="multiple" />
  </StepsForm.StepForm>

  <StepsForm.StepForm name="execution" title="执行配置">
    <ProFormDigit name="concurrency" label="并发数" min={1} max={20} initialValue={5} />
    <ProFormDigit name="timeoutSeconds" label="超时(秒)" min={10} max={300} initialValue={30} />
    <ProFormDigit name="retryCount" label="重试次数" min={0} max={5} initialValue={3} />
  </StepsForm.StepForm>
</StepsForm>
```

**验收标准**：
- [ ] 任务列表展示正常
- [ ] 状态筛选可用
- [ ] 创建表单步骤流程正确
- [ ] 提示词选择后显示版本选择
- [ ] 预估数据量显示正确

---

### 4.5 任务 UI - 详情和结果

**目标**：实现任务详情和结果查看页面

**任务项**：
- [ ] 创建 `components/task/TaskOverview.tsx` - 概览卡片
- [ ] 创建 `components/task/ResultTable.tsx` - 结果表格
- [ ] 创建 `components/task/ResultDetail.tsx` - 结果详情抽屉
- [ ] 创建 `components/task/ExportButton.tsx` - 导出按钮
- [ ] 创建 `app/(dashboard)/tasks/[id]/page.tsx` - 详情页
- [ ] 集成实时进度更新

**代码结构**：
```
src/
├── components/task/
│   ├── TaskOverview.tsx
│   ├── ResultTable.tsx
│   ├── ResultDetail.tsx
│   └── ExportButton.tsx
└── app/(dashboard)/tasks/[id]/page.tsx
```

**详情页布局**：
```tsx
export default function TaskDetailPage() {
  const { progress, status } = useTaskProgress(taskId);

  return (
    <PageContainer>
      {/* 概览卡片 */}
      <TaskOverview task={task} progress={progress} />

      {/* 操作按钮 */}
      <Space>
        {status === 'RUNNING' && <Button onClick={handleStop}>终止</Button>}
        {['COMPLETED', 'FAILED'].includes(status) && <Button onClick={handleRetry}>重跑失败</Button>}
        <ExportButton taskId={taskId} />
      </Space>

      {/* 结果表格 */}
      <ResultTable taskId={taskId} />

      {/* 详情抽屉 */}
      <ResultDetail result={selectedResult} visible={drawerVisible} />
    </PageContainer>
  );
}
```

**验收标准**：
- [ ] 概览卡片数据正确
- [ ] 进度条实时更新
- [ ] 结果表格分页筛选正常
- [ ] 详情抽屉内容完整
- [ ] 导出功能可用
- [ ] 操作按钮状态正确

---

## 单元测试

### UT-4.1 提示词渲染测试
- [ ] 单个变量替换
- [ ] 多个变量替换
- [ ] 变量不存在保留原文
- [ ] 空值处理

### UT-4.2 并发控制器测试
- [ ] 并发数正确限制
- [ ] 队列正确处理
- [ ] 释放正确触发

### UT-4.3 重试逻辑测试
- [ ] 成功不重试
- [ ] 失败重试指定次数
- [ ] 指数退避间隔正确

### UT-4.4 状态转换测试
- [ ] 合法转换成功
- [ ] 非法转换拒绝

---

## 集成测试

### IT-4.1 任务完整流程
- [ ] 创建任务 → 启动 → 执行完成
- [ ] 进度实时推送
- [ ] 统计计算正确

### IT-4.2 任务控制
- [ ] 终止正在执行的任务
- [ ] 重试失败用例

### IT-4.3 结果导出
- [ ] 导出 xlsx
- [ ] 导出 csv
- [ ] 导出 json

---

## 开发日志

### 模板

```markdown
#### [日期] - [开发者]

**完成任务**：
-

**遇到问题**：
-

**解决方案**：
-

**下一步**：
-
```

### 日志记录

#### 2025-12-02 - Claude

**完成任务**：
- [x] 创建 `lib/taskExecutor.ts` - 任务执行器主类
- [x] 创建 `lib/concurrencyLimiter.ts` - 并发控制器
- [x] 创建 `lib/promptRenderer.ts` - 提示词渲染器
- [x] 创建 `lib/modelInvoker.ts` - 模型调用器
- [x] 创建 `lib/progressPublisher.ts` - 进度发布器
- [x] 实现执行计划生成（笛卡尔积）
- [x] 实现单条测试执行流程
- [x] 实现重试逻辑（指数退避）
- [x] 实现超时控制
- [x] 实现任务终止信号
- [x] 创建 SSE 进度端点 `api/v1/tasks/[id]/progress/route.ts`
- [x] 创建前端订阅 Hook `hooks/useTaskProgress.ts`
- [x] 创建任务管理 API（GET/POST tasks, run, stop, retry, results）
- [x] 创建 `services/tasks.ts` - API 封装
- [x] 创建 `hooks/useTasks.ts` - React Query hooks
- [x] 创建 `components/task/TaskStatusTag.tsx` - 状态标签
- [x] 创建 `components/task/TaskProgress.tsx` - 进度条组件
- [x] 创建 `components/task/TaskOverview.tsx` - 概览卡片
- [x] 创建 `components/task/ResultTable.tsx` - 结果表格
- [x] 创建 `components/task/ResultDetail.tsx` - 结果详情抽屉
- [x] 创建 `components/task/CreateTaskForm.tsx` - 创建表单（步骤式）
- [x] 创建 `app/(dashboard)/tasks/page.tsx` - 列表页
- [x] 创建 `app/(dashboard)/tasks/new/page.tsx` - 创建页
- [x] 创建 `app/(dashboard)/tasks/[id]/page.tsx` - 详情页

**文件清单**：
```
apps/web/src/lib/
├── taskExecutor.ts
├── concurrencyLimiter.ts
├── promptRenderer.ts
├── modelInvoker.ts
└── progressPublisher.ts

apps/web/src/app/api/v1/tasks/
├── route.ts (GET, POST)
└── [id]/
    ├── route.ts (GET, DELETE)
    ├── run/route.ts
    ├── stop/route.ts
    ├── retry/route.ts
    ├── progress/route.ts (SSE)
    └── results/
        ├── route.ts
        └── export/route.ts (已存在)

apps/web/src/services/tasks.ts
apps/web/src/hooks/useTasks.ts
apps/web/src/hooks/useTaskProgress.ts

apps/web/src/components/task/
├── TaskStatusTag.tsx
├── TaskProgress.tsx
├── TaskOverview.tsx
├── ResultTable.tsx
├── ResultDetail.tsx
├── CreateTaskForm.tsx
└── index.ts (更新)

apps/web/src/app/(dashboard)/tasks/
├── page.tsx
├── new/page.tsx
└── [id]/page.tsx
```

**技术说明**：
- 任务执行使用 ConcurrencyLimiter 控制并发，支持 1-20 并发
- 失败重试使用指数退避策略，基础延迟 1 秒，最大延迟 30 秒
- 超时控制使用 Promise.race 实现
- 进度推送使用内存 EventEmitter（MVP），生产环境可换 Redis Pub/Sub
- SSE 连接支持心跳保活（30秒）和自动重连
- 任务创建使用事务确保数据一致性

**下一步**：
- 添加单元测试
- 进行端到端测试验证完整流程

---

## 检查清单

完成本阶段前，确认以下事项：

- [ ] 所有任务项已完成
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 任务创建到执行完整流程正常
- [ ] 进度实时推送正常
- [ ] 任务终止功能正常
- [ ] 结果查看和导出正常
- [ ] 代码已提交并推送
- [ ] 开发日志已更新
