# 问题排查与修复记录

> 本文档记录项目开发过程中遇到的问题及解决方案

## 目录

1. [Docker 构建问题](#1-docker-构建问题)
2. [API 响应格式不匹配问题](#2-api-响应格式不匹配问题)
3. [测试用例修复](#3-测试用例修复)
4. [Redis 连接与跨进程通信问题](#4-redis-连接与跨进程通信问题)

---

## 1. Docker 构建问题

### 1.1 问题描述

Docker 构建时出现多个错误：

1. **Worker 初始化失败** - 构建阶段尝试连接 Redis
2. **Prisma Client 路径问题** - 生产镜像中找不到 Prisma Client

### 1.2 错误日志

```
Error: connect ECONNREFUSED 127.0.0.1:6379
Error: @prisma/client did not initialize yet
```

### 1.3 解决方案

#### 1.3.1 跳过构建时 Worker 初始化

在 `apps/web/src/lib/queue/initWorker.ts` 中添加构建阶段检测：

```typescript
function shouldSkipWorkerInit(): boolean {
  // 显式禁用 Worker 初始化
  if (process.env.SKIP_WORKER_INIT === 'true') {
    return true
  }
  // Next.js 在构建时设置 NEXT_PHASE
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return true
  }
  // 检查 Redis URL 是否是占位符
  const redisUrl = process.env.REDIS_URL || ''
  if (redisUrl.includes('placeholder') || redisUrl === 'redis://localhost:6379') {
    return true
  }
  return false
}
```

#### 1.3.2 修复 Dockerfile

在 `docker/web.Dockerfile` 中：

```dockerfile
# 构建阶段 - 设置占位符环境变量
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder-secret-32"
ENV REDIS_URL="redis://placeholder:6379"
ENV SKIP_WORKER_INIT="true"

# 生产阶段 - 复制 Prisma Client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma ./node_modules/@prisma
```

### 1.4 相关文件

- `docker/web.Dockerfile`
- `apps/web/src/lib/queue/initWorker.ts`

---

## 2. API 响应格式不匹配问题

### 2.1 问题描述

运行时出现 `g.filter is not a function` 错误，点击评估器或模型配置页面时触发。

### 2.2 根本原因

**API 响应格式与类型定义不匹配：**

| 层级 | 期望格式 | 实际格式 |
|------|---------|---------|
| API 返回 | - | `{ list: T[], total: number }` |
| Service 类型定义 | `T[]` | - |
| Hooks 返回 | `response.data` | - |
| 页面调用 | `.filter()` `.map()` | - |

页面代码调用 `.filter()` 方法时，收到的是对象 `{ list, total }` 而不是数组，导致运行时错误。

### 2.3 错误的修复方式

最初尝试在 hooks 中强制类型转换：

```typescript
// ❌ 错误方式 - 类型不安全
const data = response.data as unknown as { list: unknown[]; total: number }
return data?.list || []
```

这导致构建时类型错误：`Type 'unknown[]' is not assignable to type 'Model[]'`

### 2.4 正确的解决方案

**从源头修复类型定义：**

#### 2.4.1 更新 Service 类型定义

```typescript
// apps/web/src/services/models.ts
// apps/web/src/services/evaluators.ts

// 添加列表响应格式类型
type ListResponse<T> = {
  list: T[]
  total: number
}

// 更新方法返回类型
async list(): Promise<ApiResponse<ListResponse<ProviderWithModels>>> {
  // ...
}
```

#### 2.4.2 更新 Hooks 提取数据

```typescript
// apps/web/src/hooks/useModels.ts
export function useProviders() {
  return useQuery({
    queryKey: PROVIDERS_KEY,
    queryFn: async () => {
      const response = await modelsService.providers.list()
      if (response.code !== 200) {
        throw new Error(response.message)
      }
      return response.data.list  // ✅ 正确提取 list
    },
  })
}
```

### 2.5 相关文件

- `apps/web/src/services/models.ts`
- `apps/web/src/services/evaluators.ts`
- `apps/web/src/hooks/useModels.ts`
- `apps/web/src/hooks/useEvaluators.ts`

---

## 3. 测试用例修复

### 3.1 问题描述

修复 API 响应格式后，8 个测试失败：

- 2 个 `useEvaluators` hooks 测试
- 2 个 `useModels` hooks 测试
- 1 个评估器 API 测试
- 3 个 E2E 测试

### 3.2 原因分析

测试中的 mock 数据格式与新的 API 响应格式不匹配。

### 3.3 修复方案

#### 3.3.1 Hooks 测试 Mock 数据

```typescript
// 修复前
vi.mocked(evaluatorsService.list).mockResolvedValue({
  code: 200,
  message: 'success',
  data: mockEvaluators,  // ❌ 直接返回数组
})

// 修复后
vi.mocked(evaluatorsService.list).mockResolvedValue({
  code: 200,
  message: 'success',
  data: { list: mockEvaluators, total: 2 },  // ✅ 返回 { list, total }
})
```

#### 3.3.2 E2E 测试断言

```typescript
// 修复前
expect((data as { data: unknown[] }).data).toBeInstanceOf(Array)

// 修复后
expect((data as { data: { list: unknown[]; total: number } }).data.list).toBeInstanceOf(Array)
```

#### 3.3.3 API 测试断言

```typescript
// 修复前
expect(data.data).toHaveLength(1)
expect(data.data[0].name).toBe('测试评估器')

// 修复后
expect(data.data.list).toHaveLength(1)
expect(data.data.list[0].name).toBe('测试评估器')
expect(data.data.total).toBe(1)
```

### 3.4 测试结果

修复后所有测试通过：

```
Test Files  45 passed (45)
Tests       877 passed | 5 skipped (882)
```

### 3.5 相关文件

- `apps/web/src/hooks/__tests__/useEvaluators.test.ts`
- `apps/web/src/hooks/__tests__/useModels.test.ts`
- `apps/web/src/app/api/v1/evaluators/__tests__/evaluators.test.ts`
- `apps/web/src/__tests__/e2e/api.e2e.test.ts`

---

## 经验总结

### 1. 类型安全原则

- **从源头定义类型** - 不要在中间层进行类型转换
- **保持一致性** - API 响应格式、Service 类型、Hooks 返回值必须匹配
- **避免 `as unknown`** - 强制类型转换是代码异味的标志

### 2. Docker 构建最佳实践

- **分离构建和运行时** - 使用环境变量控制初始化逻辑
- **使用占位符** - 构建时使用占位符环境变量
- **检查依赖路径** - pnpm monorepo 的依赖路径需要特别注意

### 3. 测试维护

- **API 格式变更时同步更新测试** - mock 数据必须与实际 API 响应格式一致
- **E2E 测试覆盖关键路径** - 列表 API 的响应格式验证很重要

---

## 版本记录

| 版本 | 日期 | 修复内容 |
|------|------|---------|
| v1.3.1 | 2024-12 | Docker 构建问题修复 |
| v1.3.2 | 2024-12 | API 响应格式修复、测试用例更新 |
| v1.4.0 | 2024-12 | Redis 连接优化、跨进程进度推送改造 |

---

## 4. Redis 连接与跨进程通信问题

### 4.1 问题描述

项目存在三个 Redis 相关问题：

1. **长时间空闲断连** - Worker 长时间无任务时 Redis 连接断开
2. **多项目 Key 冲突** - 多个项目共用同一 Redis 实例时 Key 互相覆盖
3. **跨进程事件推送失败** - 任务完成后前端页面不会自动刷新，需手动刷新

### 4.2 根本原因

#### 4.2.1 空闲断连

ioredis 默认 `keepAlive` 为 0（禁用），长时间无网络活动时 TCP 连接会被中间网络设备断开。

#### 4.2.2 Key 冲突

BullMQ 不支持 ioredis 的 `keyPrefix` 配置，需要使用 BullMQ 自己的 `prefix` 选项。

#### 4.2.3 跨进程通信

原实现使用 Node.js `EventEmitter`：

```typescript
// ❌ 问题代码 - EventEmitter 无法跨进程
const eventEmitter = new EventEmitter()

export function publishProgress(taskId: string, event: ProgressEvent): void {
  eventEmitter.emit(`task:${taskId}`, event)
}

export function subscribeProgress(taskId: string, callback: (event: ProgressEvent) => void): () => void {
  eventEmitter.on(`task:${taskId}`, callback)
  return () => eventEmitter.off(`task:${taskId}`, callback)
}
```

**问题**：`EventEmitter` 只在单个 Node.js 进程内有效。当 Worker（进程 A）发布事件，SSE 订阅端（进程 B）无法收到。

### 4.3 解决方案

#### 4.3.1 添加 keepAlive 心跳

```typescript
// apps/web/src/lib/redis.ts
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  keepAlive: 30000,  // ✅ 30秒发送心跳
  lazyConnect: true,
})
```

#### 4.3.2 添加 BullMQ 前缀隔离

```typescript
// apps/web/src/lib/redis.ts
export const BULLMQ_PREFIX = 'prompt-tool'

// apps/web/src/lib/queue/taskQueue.ts
globalForQueue.taskQueue = new Queue<TaskJobData, TaskJobResult>(TASK_QUEUE_NAME, {
  connection: redis,
  prefix: BULLMQ_PREFIX,  // ✅ 生成 prompt-tool:task-execution:*
  // ...
})

// apps/web/src/lib/queue/taskWorker.ts
taskWorker = new Worker<TaskJobData, TaskJobResult>(
  TASK_QUEUE_NAME,
  processor,
  {
    connection: redis,
    prefix: BULLMQ_PREFIX,  // ✅ 与队列保持一致
    // ...
  }
)
```

**生成的 Key 格式**：`prompt-tool:task-execution:*`

#### 4.3.3 改用 Redis Pub/Sub

```typescript
// apps/web/src/lib/redis.ts
export const PUBSUB_PREFIX = 'prompt-tool:'

// 订阅专用连接（Redis Pub/Sub 需要独立连接）
export const getSubscriberConnection = (): Redis => {
  if (!globalForRedis.redisSub) {
    globalForRedis.redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      keepAlive: 30000,
      lazyConnect: true,
    })
  }
  return globalForRedis.redisSub
}
```

```typescript
// apps/web/src/lib/progressPublisher.ts
import { redis, getSubscriberConnection, PUBSUB_PREFIX } from './redis'

function getChannelName(taskId: string): string {
  return `${PUBSUB_PREFIX}task:${taskId}`
}

// 发布事件（Worker 进程调用）
async function publishEvent(taskId: string, event: ProgressEvent): Promise<void> {
  const channel = getChannelName(taskId)
  await redis.publish(channel, JSON.stringify(event))
}

// 订阅事件（SSE API 调用）
export function subscribeProgress(
  taskId: string,
  callback: (event: ProgressEvent) => void
): () => void {
  const channel = getChannelName(taskId)
  const subscriber = getSubscriberConnection()

  const handler = (ch: string, message: string) => {
    if (ch === channel) {
      try {
        const event = JSON.parse(message) as ProgressEvent
        callback(event)
      } catch {
        // ignore parse errors
      }
    }
  }

  subscriber.subscribe(channel)
  subscriber.on('message', handler)

  return () => {
    subscriber.off('message', handler)
    subscriber.unsubscribe(channel)
  }
}
```

### 4.4 架构对比

| 方面 | 改造前 | 改造后 |
|------|--------|--------|
| 事件机制 | EventEmitter（进程内） | Redis Pub/Sub（跨进程） |
| 心跳机制 | 无 | 30秒 keepAlive |
| Key 隔离 | 无 | `prompt-tool:` 前缀 |
| 订阅连接 | 共用主连接 | 独立订阅连接 |

### 4.5 为什么需要独立订阅连接

Redis 的 Pub/Sub 模式下，连接进入订阅状态后只能执行 `SUBSCRIBE`、`UNSUBSCRIBE`、`PSUBSCRIBE`、`PUNSUBSCRIBE` 命令，无法执行其他命令（如队列操作）。因此需要独立的订阅连接。

### 4.6 相关文件

- `apps/web/src/lib/redis.ts` - Redis 连接配置
- `apps/web/src/lib/progressPublisher.ts` - 进度推送实现
- `apps/web/src/lib/queue/taskQueue.ts` - 任务队列
- `apps/web/src/lib/queue/taskWorker.ts` - 任务 Worker
- `apps/web/src/lib/scheduler/schedulerQueue.ts` - 调度队列
- `apps/web/src/lib/scheduler/schedulerWorker.ts` - 调度 Worker

### 4.7 测试验证

```javascript
// test-redis.js
const Redis = require('ioredis')

async function testPubSub() {
  const pub = new Redis(process.env.REDIS_URL)
  const sub = new Redis(process.env.REDIS_URL)

  await sub.subscribe('prompt-tool:test')

  sub.on('message', (channel, message) => {
    console.log(`Received: ${channel} -> ${message}`)
  })

  await pub.publish('prompt-tool:test', 'hello')
}
```

测试结果：
- ✅ Pub/Sub 跨进程通信正常
- ✅ 前缀隔离生效
- ✅ keepAlive 心跳正常
- ✅ 123 个 e2e 测试通过
