# 任务执行流程

## 一、任务状态机

### 1.1 状态定义

| 状态 | 说明 | 可转换到 |
|------|------|----------|
| PENDING | 待执行，刚创建 | RUNNING |
| RUNNING | 执行中 | COMPLETED, FAILED, STOPPED |
| COMPLETED | 已完成 | - |
| FAILED | 执行失败 | - |
| STOPPED | 手动终止 | - |

### 1.2 状态转换图

```
                    ┌─────────────────────────────────────────┐
                    │              PENDING                     │
                    │            (待执行)                      │
                    └────────────────┬────────────────────────┘
                                     │
                                     │ POST /tasks/:id/run
                                     ▼
                    ┌─────────────────────────────────────────┐
                    │              RUNNING                     │
                    │             (执行中)                     │
                    └──┬──────────────┬──────────────────┬────┘
                       │              │                  │
          全部完成     │   执行出错    │    手动终止      │
                       ▼              ▼                  ▼
              ┌────────────┐  ┌────────────┐    ┌────────────┐
              │ COMPLETED  │  │  FAILED    │    │  STOPPED   │
              │ (已完成)   │  │  (失败)    │    │  (已终止)  │
              └────────────┘  └────────────┘    └────────────┘
```

### 1.3 状态转换规则

```typescript
const stateTransitions = {
  PENDING: ['RUNNING'],
  RUNNING: ['COMPLETED', 'FAILED', 'STOPPED'],
  COMPLETED: [],
  FAILED: [],
  STOPPED: []
};

function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return stateTransitions[from].includes(to);
}
```

---

## 二、任务执行流程

### 2.1 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         任务执行流程                             │
└─────────────────────────────────────────────────────────────────┘

1. 创建任务
   POST /tasks
       │
       ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 保存任务配置                                              │
   │ - 关联 prompts, models, evaluators, dataset              │
   │ - 设置状态为 PENDING                                      │
   └──────────────────────────────────────────────────────────┘
       │
       ▼
2. 启动任务
   POST /tasks/:id/run
       │
       ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 预处理                                                    │
   │ - 校验状态为 PENDING                                      │
   │ - 加载数据集所有行                                        │
   │ - 生成执行计划（笛卡尔积：prompts × models × rows）       │
   │ - 更新状态为 RUNNING                                      │
   │ - 初始化 progress: {total, completed: 0, failed: 0}      │
   └──────────────────────────────────────────────────────────┘
       │
       ▼
3. 执行测试
   ┌──────────────────────────────────────────────────────────┐
   │ 并发执行（受 concurrency 配置限制）                       │
   │                                                          │
   │ for each (prompt, model, row) in plan:                  │
   │   ├── 渲染提示词（替换变量）                              │
   │   ├── 调用模型 API                                       │
   │   ├── 保存 TaskResult                                    │
   │   ├── 执行评估器                                         │
   │   ├── 保存 EvaluationResult                              │
   │   ├── 更新 progress                                      │
   │   └── 推送进度事件                                       │
   └──────────────────────────────────────────────────────────┘
       │
       ▼
4. 完成任务
   ┌──────────────────────────────────────────────────────────┐
   │ 后处理                                                    │
   │ - 计算统计数据 (passRate, avgLatency, totalTokens)       │
   │ - 更新状态为 COMPLETED 或 FAILED                         │
   │ - 记录 completedAt                                       │
   │ - 推送完成事件                                           │
   └──────────────────────────────────────────────────────────┘
```

### 2.2 执行计划生成

任务可能包含多个提示词和多个模型，需要生成笛卡尔积：

```typescript
type ExecutionPlan = {
  promptId: string;
  promptVersionId: string;
  modelId: string;
  datasetRowId: string;
  rowIndex: number;
}[];

function generatePlan(task: Task, datasetRows: DatasetRow[]): ExecutionPlan {
  const plan: ExecutionPlan = [];
  
  for (const prompt of task.prompts) {
    for (const model of task.models) {
      for (const row of datasetRows) {
        plan.push({
          promptId: prompt.promptId,
          promptVersionId: prompt.promptVersionId,
          modelId: model.modelId,
          datasetRowId: row.id,
          rowIndex: row.rowIndex
        });
      }
    }
  }
  
  return plan;
}
```

**示例**：
- 2 个提示词 × 2 个模型 × 100 条数据 = 400 个执行单元

---

## 三、单条测试执行

### 3.1 执行流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       单条测试执行                               │
└─────────────────────────────────────────────────────────────────┘

输入: ExecutionPlanItem
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. 准备输入                                                   │
│    - 获取提示词版本内容                                       │
│    - 获取数据行数据                                           │
│    - 渲染提示词（替换 {{变量}}）                              │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. 调用模型                                                   │
│    - 获取模型配置和提供商信息                                 │
│    - 构建 API 请求                                            │
│    - 发送请求（带超时和重试）                                 │
│    - 记录耗时和 Token 消耗                                    │
└──────────────────────────────────────────────────────────────┘
    │
    ├── 成功 ──────────────────────────────────────┐
    │                                              │
    ├── 超时 ──► 创建 TaskResult (status=TIMEOUT) ─┼─► 结束
    │                                              │
    └── 失败 ──► 创建 TaskResult (status=FAILED) ──┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. 保存结果                                                   │
│    - 创建 TaskResult (status=SUCCESS)                        │
│    - 记录 input, output, expected                            │
│    - 记录 latencyMs, tokens                                  │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. 执行评估                                                   │
│    - 遍历任务配置的所有评估器                                 │
│    - 对每个评估器执行评估                                     │
│    - 保存 EvaluationResult                                   │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
返回执行结果
```

### 3.2 提示词渲染

```typescript
function renderPrompt(
  template: string, 
  variables: Record<string, any>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g, 
    (match, name) => {
      const value = variables[name];
      return value !== undefined ? String(value) : match;
    }
  );
}

// 示例
const template = "你是{{role}}，请回答：{{question}}";
const variables = { role: "助手", question: "什么是AI？" };
const result = renderPrompt(template, variables);
// "你是助手，请回答：什么是AI？"
```

### 3.3 模型调用

```typescript
async function callModel(
  model: Model,
  provider: Provider,
  prompt: string,
  config: TaskExecutionConfig
): Promise<{
  output: string;
  latencyMs: number;
  tokens: { input: number; output: number; total: number };
}> {
  const startTime = Date.now();
  
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...provider.headers
    },
    body: JSON.stringify({
      model: model.modelId,
      messages: [{ role: 'user', content: prompt }],
      ...model.config
    }),
    signal: AbortSignal.timeout(config.timeoutSeconds * 1000)
  });
  
  const data = await response.json();
  const latencyMs = Date.now() - startTime;
  
  return {
    output: data.choices[0].message.content,
    latencyMs,
    tokens: {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens,
      total: data.usage.total_tokens
    }
  };
}
```

### 3.4 重试逻辑

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
      
      // 最后一次不等待
      if (attempt < retryCount) {
        // 指数退避：1s, 2s, 4s...
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
  
  throw lastError;
}
```

---

## 四、并发控制

### 4.1 并发执行器

使用信号量控制并发数：

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
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }
  
  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}
```

### 4.2 使用示例

```typescript
async function executeTask(task: Task) {
  const plan = generatePlan(task, datasetRows);
  const limiter = new ConcurrencyLimiter(task.config.execution.concurrency);
  
  const results = await Promise.all(
    plan.map(item => 
      limiter.execute(() => executeSingleTest(item))
    )
  );
  
  return results;
}
```

---

## 五、进度推送

### 5.1 SSE 实现

```typescript
// GET /api/tasks/:id/progress
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // 订阅进度更新
      const unsubscribe = subscribeProgress(params.id, (event) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
        controller.enqueue(encoder.encode(data));
        
        if (event.type === 'completed' || event.type === 'failed') {
          controller.close();
        }
      });
      
      // 清理
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

### 5.2 事件类型

| 事件类型 | 数据结构 | 说明 |
|----------|----------|------|
| progress | `{ total, completed, failed }` | 进度更新 |
| completed | `{ status: 'COMPLETED', stats }` | 任务完成 |
| failed | `{ status: 'FAILED', error }` | 任务失败 |
| stopped | `{ status: 'STOPPED' }` | 任务终止 |

### 5.3 前端订阅

```typescript
function useTaskProgress(taskId: string) {
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [status, setStatus] = useState<TaskStatus>('RUNNING');
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/tasks/${taskId}/progress`);
    
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

---

## 六、任务终止

### 6.1 终止流程

```
POST /tasks/:id/stop
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. 校验状态                                                   │
│    - 必须是 RUNNING 状态                                      │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. 发送终止信号                                               │
│    - 设置任务的 shouldStop 标志                               │
│    - 正在执行的请求会继续完成                                 │
│    - 队列中等待的请求不再执行                                 │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. 等待当前执行完成                                           │
│    - 等待所有进行中的请求完成                                 │
│    - 最长等待 30 秒                                          │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. 更新状态                                                   │
│    - 更新状态为 STOPPED                                       │
│    - 计算已完成部分的统计数据                                 │
│    - 推送 stopped 事件                                       │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 实现

```typescript
class TaskExecutor {
  private shouldStop = false;
  private runningCount = 0;
  
  async stop(): Promise<void> {
    this.shouldStop = true;
    
    // 等待正在执行的请求完成
    while (this.runningCount > 0) {
      await sleep(100);
    }
  }
  
  async executeItem(item: ExecutionPlanItem): Promise<void> {
    // 检查是否应该停止
    if (this.shouldStop) {
      return;
    }
    
    this.runningCount++;
    try {
      await this.doExecute(item);
    } finally {
      this.runningCount--;
    }
  }
}
```

---

## 七、统计计算

### 7.1 统计指标

任务完成后计算以下统计：

```typescript
type TaskStats = {
  passRate: number | null;     // 通过率 = passCount / total
  avgLatencyMs: number | null; // 平均耗时
  totalTokens: number;         // 总 Token
  passCount: number;           // 通过数（所有评估器都通过）
  failCount: number;           // 失败数
  totalCost: number;           // 总费用（基于 model.pricing）
};
```

### 7.2 计算逻辑

```typescript
async function calculateStats(taskId: string): Promise<TaskStats> {
  // 查询所有成功的结果
  const results = await prisma.taskResult.findMany({
    where: { taskId, status: 'SUCCESS' },
    include: { evaluations: true }
  });
  
  // 计算通过数（所有评估器都通过）
  const passCount = results.filter(r => 
    r.evaluations.every(e => e.passed)
  ).length;
  
  const failCount = results.length - passCount;
  
  // 计算平均耗时
  const totalLatency = results.reduce((sum, r) => sum + (r.latencyMs || 0), 0);
  const avgLatencyMs = results.length > 0 ? totalLatency / results.length : null;
  
  // 计算 Token 总数
  const totalTokens = results.reduce((sum, r) => {
    const tokens = r.tokens as { total: number };
    return sum + (tokens.total || 0);
  }, 0);
  
  // 计算总费用
  const totalCost = results.reduce((sum, r) => {
    return sum + Number(r.cost || 0);
  }, 0);
  
  return {
    passRate: results.length > 0 ? passCount / results.length : null,
    avgLatencyMs,
    totalTokens,
    passCount,
    failCount,
    totalCost
  };
}
```

---

## 八、队列实现

### 8.1 使用 BullMQ

```typescript
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// 任务队列
export const taskQueue = new Queue('task-execution', { connection });

// 添加任务
export async function enqueueTask(taskId: string) {
  await taskQueue.add('execute', { taskId }, {
    removeOnComplete: true,
    removeOnFail: 100  // 保留最近 100 个失败任务
  });
}

// Worker
export const taskWorker = new Worker('task-execution', 
  async (job) => {
    const { taskId } = job.data;
    await executeTask(taskId);
  },
  { connection, concurrency: 5 }  // 最多同时处理 5 个任务
);

taskWorker.on('failed', (job, err) => {
  console.error(`Task ${job.data.taskId} failed:`, err);
  // 更新任务状态为 FAILED
});
```

### 8.2 任务执行入口

```typescript
// POST /api/tasks/:id/run
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const task = await prisma.task.findUnique({
    where: { id: params.id }
  });
  
  if (!task) {
    return Response.json({ code: 504001, message: '任务不存在' });
  }
  
  if (task.status !== 'PENDING') {
    return Response.json({ code: 504002, message: '任务状态不允许执行' });
  }
  
  // 更新状态
  await prisma.task.update({
    where: { id: params.id },
    data: { status: 'RUNNING', startedAt: new Date() }
  });
  
  // 加入队列
  await enqueueTask(params.id);
  
  return Response.json({ code: 200, data: { status: 'RUNNING' } });
}
```
