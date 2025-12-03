# Phase 4: 任务执行引擎 - 上下文

> 本阶段目标：实现测试任务的创建、执行、监控和结果存储

## 一、阶段概述

任务执行引擎是平台的核心，负责：
- **任务创建**：配置提示词、模型、数据集、评估器
- **执行调度**：并发控制、超时处理、失败重试
- **进度推送**：SSE 实时推送执行进度
- **结果存储**：保存执行结果和评估结果

## 二、数据模型

### Task 模型
```prisma
model Task {
  id          String     @id @default(uuid())
  name        String
  description String?
  type        TaskType   @default(PROMPT)
  status      TaskStatus @default(PENDING)

  config      Json       // 执行配置
  progress    Json       @default("{\"total\": 0, \"completed\": 0, \"failed\": 0}")
  stats       Json       @default("{}")

  error       String?

  startedAt   DateTime?  @map("started_at")
  completedAt DateTime?  @map("completed_at")

  datasetId   String     @map("dataset_id")
  dataset     Dataset    @relation(fields: [datasetId], references: [id])

  createdById String     @map("created_by_id")
  createdBy   User       @relation(fields: [createdById], references: [id])

  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  results    TaskResult[]
  prompts    TaskPrompt[]
  models     TaskModel[]
  evaluators TaskEvaluator[]

  @@index([status])
  @@index([createdById])
  @@index([createdAt])
  @@map("tasks")
}

enum TaskType {
  PROMPT   // 提示词测试
  AGENT    // Agent 测试 (V2)
  API      // API 测试 (V2)
  AB_TEST  // A/B 对比 (V2)
}

enum TaskStatus {
  PENDING    // 待执行
  RUNNING    // 执行中
  COMPLETED  // 已完成
  FAILED     // 失败
  STOPPED    // 已终止
}

// 任务-提示词 多对多
model TaskPrompt {
  id              String @id @default(uuid())
  taskId          String @map("task_id")
  task            Task   @relation(...)
  promptId        String @map("prompt_id")
  prompt          Prompt @relation(...)
  promptVersionId String @map("prompt_version_id")
  @@unique([taskId, promptId])
  @@map("task_prompts")
}

// 任务-模型 多对多
model TaskModel {
  id      String @id @default(uuid())
  taskId  String @map("task_id")
  task    Task   @relation(...)
  modelId String @map("model_id")
  model   Model  @relation(...)
  @@unique([taskId, modelId])
  @@map("task_models")
}

// 任务-评估器 多对多
model TaskEvaluator {
  id          String    @id @default(uuid())
  taskId      String    @map("task_id")
  task        Task      @relation(...)
  evaluatorId String    @map("evaluator_id")
  evaluator   Evaluator @relation(...)
  @@unique([taskId, evaluatorId])
  @@map("task_evaluators")
}
```

### TaskResult 模型
```prisma
model TaskResult {
  id              String        @id @default(uuid())
  taskId          String        @map("task_id")
  task            Task          @relation(...)

  datasetRowId    String        @map("dataset_row_id")
  datasetRow      DatasetRow    @relation(...)

  promptId        String        @map("prompt_id")
  promptVersionId String        @map("prompt_version_id")
  promptVersion   PromptVersion @relation(...)

  modelId         String        @map("model_id")
  model           Model         @relation(...)

  input           Json          // 实际输入
  output          String?       // 模型输出
  expected        String?       // 期望输出

  latencyMs       Int?          @map("latency_ms")
  tokens          Json          @default("{\"input\": 0, \"output\": 0, \"total\": 0}")
  cost            Decimal?      @db.Decimal(10, 6)

  status          ResultStatus  @default(PENDING)
  error           String?

  createdAt       DateTime      @default(now()) @map("created_at")

  evaluations     EvaluationResult[]

  @@index([taskId])
  @@index([taskId, status])
  @@map("task_results")
}

enum ResultStatus {
  PENDING  // 待执行
  SUCCESS  // 成功
  FAILED   // 调用失败
  TIMEOUT  // 超时
  ERROR    // 错误
}

model EvaluationResult {
  id           String     @id @default(uuid())
  taskResultId String     @map("task_result_id")
  taskResult   TaskResult @relation(...)

  evaluatorId  String     @map("evaluator_id")
  evaluator    Evaluator  @relation(...)

  passed       Boolean
  score        Decimal?   @db.Decimal(5, 4)
  reason       String?
  details      Json       @default("{}")

  latencyMs    Int?       @map("latency_ms")

  createdAt    DateTime   @default(now()) @map("created_at")

  @@index([taskResultId])
  @@map("evaluation_results")
}
```

### JSONB 结构

**Task.config**：
```typescript
type TaskConfig = {
  execution: {
    concurrency: number;     // 并发数，1-20
    timeoutSeconds: number;  // 超时秒数，10-300
    retryCount: number;      // 重试次数，0-5
  };
};
```

**Task.progress**：
```typescript
type TaskProgress = {
  total: number;      // 总数
  completed: number;  // 已完成
  failed: number;     // 失败数
};
```

**Task.stats**：
```typescript
type TaskStats = {
  passRate: number | null;     // 通过率 0-1
  avgLatencyMs: number | null; // 平均耗时
  totalTokens: number;         // 总 Token
  passCount: number;           // 通过数
  failCount: number;           // 失败数
  totalCost: number;           // 总费用
};
```

**TaskResult.tokens**：
```typescript
type TokenUsage = {
  input: number;
  output: number;
  total: number;
};
```

## 三、任务状态机

### 状态转换规则

```
PENDING ──────► RUNNING
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
   COMPLETED   FAILED   STOPPED
```

| 当前状态 | 可转换到 |
|----------|----------|
| PENDING | RUNNING |
| RUNNING | COMPLETED, FAILED, STOPPED |
| COMPLETED | - |
| FAILED | - |
| STOPPED | - |

### 状态转换触发

- PENDING → RUNNING: `POST /tasks/:id/run`
- RUNNING → COMPLETED: 所有任务执行完成
- RUNNING → FAILED: 执行出错
- RUNNING → STOPPED: `POST /tasks/:id/stop`

## 四、执行流程

### 4.1 执行计划生成

任务可能包含多个提示词和多个模型，生成笛卡尔积：

```typescript
type ExecutionPlanItem = {
  promptId: string;
  promptVersionId: string;
  modelId: string;
  datasetRowId: string;
  rowIndex: number;
};

// 2 个提示词 × 2 个模型 × 100 条数据 = 400 个执行单元
```

### 4.2 单条测试执行流程

```
1. 准备输入
   ├── 获取提示词版本内容
   ├── 获取数据行数据
   └── 渲染提示词（替换 {{变量}}）

2. 调用模型
   ├── 获取模型配置和提供商信息
   ├── 构建 API 请求
   ├── 发送请求（带超时和重试）
   └── 记录耗时和 Token 消耗

3. 保存结果
   └── 创建 TaskResult

4. 执行评估
   ├── 遍历任务配置的所有评估器
   ├── 对每个评估器执行评估
   └── 保存 EvaluationResult
```

### 4.3 提示词渲染

```typescript
function renderPrompt(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const value = variables[name];
    return value !== undefined ? String(value) : match;
  });
}
```

### 4.4 并发控制

```typescript
class ConcurrencyLimiter {
  private running = 0;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.limit) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.queue.push(() => { this.running++; resolve(); });
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}
```

### 4.5 重试逻辑

```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retryCount: number
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retryCount) {
        await sleep(Math.pow(2, attempt) * 1000);  // 指数退避
      }
    }
  }

  throw lastError;
}
```

## 五、API 规格

### GET /api/v1/tasks
```typescript
// 查询参数
{
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

// 响应
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      name: string;
      status: string;
      progress: { total: number; completed: number; failed: number; };
      stats: { passRate: number | null; avgLatencyMs: number | null; };
      createdAt: string;
      startedAt: string | null;
      completedAt: string | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### POST /api/v1/tasks
```typescript
// 请求
{
  name: string;
  description?: string;
  config: {
    promptIds: string[];
    promptVersionIds: string[];  // 与 promptIds 一一对应
    modelIds: string[];
    datasetId: string;
    evaluatorIds: string[];
    execution: {
      concurrency: number;       // 1-20
      timeoutSeconds: number;    // 10-300
      retryCount: number;        // 0-5
    };
  };
}
```

### GET /api/v1/tasks/:id
获取任务详情（含配置快照）

### POST /api/v1/tasks/:id/run
启动任务执行

### POST /api/v1/tasks/:id/stop
终止任务

### POST /api/v1/tasks/:id/retry
重试失败用例

### DELETE /api/v1/tasks/:id
删除任务

### GET /api/v1/tasks/:id/results
```typescript
// 查询参数
{
  page?: number;
  pageSize?: number;
  status?: 'success' | 'failed' | 'timeout' | 'error';
  passed?: boolean;
}

// 响应
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      rowIndex: number;
      promptId: string;
      promptVersion: number;
      modelId: string;
      input: Record<string, any>;
      output: string;
      expected: string | null;
      status: string;
      latencyMs: number;
      tokens: { input: number; output: number; total: number; };
      evaluations: Array<{
        evaluatorId: string;
        evaluatorName: string;
        passed: boolean;
        score: number | null;
        reason: string | null;
      }>;
      error: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### GET /api/v1/tasks/:id/results/export
```typescript
// 查询参数
{ format?: 'xlsx' | 'csv' | 'json'; }

// 响应：文件流
```

### GET /api/v1/tasks/:id/progress (SSE)
```typescript
// Server-Sent Events
event: progress
data: {"total": 100, "completed": 50, "failed": 2}

event: completed
data: {"status": "completed", "stats": {...}}

event: failed
data: {"status": "failed", "error": "..."}

event: stopped
data: {"status": "stopped"}
```

## 六、页面规格

### 任务列表页 `/tasks`

**筛选栏**：
- 状态筛选（全部/待执行/执行中/已完成/失败/已终止）
- 时间范围
- 搜索（任务名称）

**表格列**：
| 列名 | 字段 | 宽度 |
|------|------|------|
| 任务名称 | name | 200px |
| 状态 | status | 100px |
| 进度 | progress | 150px |
| 通过率 | passRate | 100px |
| 创建时间 | createdAt | 180px |
| 操作 | - | 200px |

**状态标签颜色**：
- pending: 灰色
- running: 蓝色
- completed: 绿色
- failed: 红色
- stopped: 橙色

**操作列**：查看详情、重跑、终止、删除

### 创建任务页 `/tasks/new`

**步骤表单**：

**步骤 1：基本信息**
| 字段 | 类型 | 必填 |
|------|------|------|
| 任务名称 | text | 是 |
| 描述 | textarea | 否 |

**步骤 2：测试配置**
| 字段 | 类型 | 必填 |
|------|------|------|
| 提示词 | select（多选） | 是 |
| 版本 | 每个提示词选一个版本 | 是 |
| 模型 | select（多选） | 是 |
| 数据集 | select | 是 |

**步骤 3：评估配置**
| 字段 | 类型 | 必填 |
|------|------|------|
| 评估器 | select（多选） | 是 |

**步骤 4：执行配置**
| 字段 | 类型 | 默认值 |
|------|------|--------|
| 并发数 | number | 5 |
| 超时时间(秒) | number | 30 |
| 重试次数 | number | 3 |

**确认页**：汇总所有配置，显示预估数据量

### 任务详情页 `/tasks/[id]`

**概览卡片**：
- 任务状态、进度条
- 统计数据：总数、通过、失败、通过率、平均耗时
- 操作按钮：重跑、导出

**结果表格列**：
| 列名 | 字段 | 宽度 |
|------|------|------|
| 序号 | index | 80px |
| 输入摘要 | input | 200px |
| 输出摘要 | output | 200px |
| 状态 | status | 100px |
| 评估结果 | passed | 100px |
| 耗时 | latency | 100px |
| 操作 | - | 80px |

**筛选**：状态、评估结果

**详情抽屉**（点击行展开）：
- 完整输入
- 完整输出
- 期望输出
- 各评估器结果详情
- Token 消耗

## 七、进度推送实现

### SSE 服务端

```typescript
// GET /api/v1/tasks/:id/progress
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const unsubscribe = subscribeProgress(params.id, (event) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(data));

        if (['completed', 'failed', 'stopped'].includes(event.type)) {
          controller.close();
        }
      });

      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

### SSE 客户端 Hook

```typescript
function useTaskProgress(taskId: string) {
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [status, setStatus] = useState<TaskStatus>('RUNNING');

  useEffect(() => {
    const eventSource = new EventSource(`/api/v1/tasks/${taskId}/progress`);

    eventSource.addEventListener('progress', (e) => {
      setProgress(JSON.parse(e.data));
    });

    eventSource.addEventListener('completed', (e) => {
      setStatus('COMPLETED');
      eventSource.close();
    });

    eventSource.addEventListener('failed', (e) => {
      setStatus('FAILED');
      eventSource.close();
    });

    return () => eventSource.close();
  }, [taskId]);

  return { progress, status };
}
```

## 八、错误码

| 错误码 | 说明 |
|--------|------|
| 504001 | 任务不存在 |
| 504002 | 任务状态不允许该操作 |

## 九、依赖关系

**上游依赖**：
- Phase 0: 数据库
- Phase 1: 认证、模型配置
- Phase 2: 提示词、数据集
- Phase 3: 评估器

**下游影响**：
- Phase 5 结果分析和工作台

## 十、测试要点

### 单元测试
- 提示词渲染
- 并发控制器
- 重试逻辑
- 状态转换

### 集成测试
- 任务创建到执行完整流程
- 进度推送
- 任务终止
- 结果导出
