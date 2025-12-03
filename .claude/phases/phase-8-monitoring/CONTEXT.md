# Phase 8: 定时监控与告警 - 上下文

> 前置依赖：Phase 0-7 完成
> 本阶段目标：实现定时任务、性能监控、告警通知

---

## 一、阶段概述

本阶段实现 `docs/01-product-scope.md` 中规划的监控和告警功能：

1. **定时任务** - 基于 Cron 表达式的定时测试执行
2. **监控中心** - `/monitor` 页面，展示性能趋势
3. **告警规则** - 配置阈值触发条件
4. **告警通知** - 邮件和 Webhook 通知

---

## 二、功能范围

### 2.1 定时任务

**功能**：
- 创建定时任务，配置 Cron 表达式
- 定时任务基于已有任务模板
- 执行历史记录
- 启用/禁用定时任务

**Cron 表达式示例**：
- `0 0 * * *` - 每天 00:00
- `0 */6 * * *` - 每 6 小时
- `0 9 * * 1-5` - 工作日 09:00

**定时任务配置**：
```typescript
type ScheduledTask = {
  id: string;
  name: string;
  description?: string;
  taskTemplateId: string;  // 关联的任务模板
  cronExpression: string;
  timezone: string;        // 默认 Asia/Shanghai
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdById: string;
};
```

### 2.2 监控中心

**功能**：
- 性能趋势图表（通过率、耗时、成本）
- 时间范围筛选（24h、7d、30d、自定义）
- 按任务/提示词/模型分组
- 异常检测和标记

**趋势数据**：
```typescript
type TrendData = {
  timestamp: Date;
  passRate: number;
  avgLatency: number;
  totalCost: number;
  taskCount: number;
};
```

**图表类型**：
- 折线图：通过率趋势
- 面积图：调用量趋势
- 柱状图：成本趋势
- 热力图：按时间段的成功率

### 2.3 告警规则

**功能**：
- 配置告警规则（指标、阈值、条件）
- 告警级别（警告、严重、紧急）
- 告警静默期
- 告警确认和关闭

**告警规则配置**：
```typescript
type AlertRule = {
  id: string;
  name: string;
  description?: string;
  metric: 'pass_rate' | 'avg_latency' | 'error_rate' | 'cost';
  condition: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  threshold: number;
  duration: number;        // 持续时间（分钟）
  severity: 'warning' | 'critical' | 'urgent';
  silencePeriod: number;   // 静默期（分钟）
  notifyChannels: string[];
  isActive: boolean;
  scope?: {
    taskIds?: string[];
    promptIds?: string[];
    modelIds?: string[];
  };
};
```

### 2.4 告警通知

**通知渠道**：
- 邮件通知
- Webhook（HTTP POST）
- 站内通知（消息中心）

**通知配置**：
```typescript
type NotifyChannel = {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'internal';
  config: {
    // email
    recipients?: string[];
    // webhook
    url?: string;
    headers?: Record<string, string>;
    template?: string;
  };
  isActive: boolean;
};
```

**Webhook 请求体**：
```json
{
  "alertId": "alert_xxx",
  "ruleName": "通过率低于80%",
  "severity": "critical",
  "metric": "pass_rate",
  "value": 0.65,
  "threshold": 0.80,
  "triggeredAt": "2024-01-15T10:30:00Z",
  "context": {
    "taskId": "task_xxx",
    "taskName": "每日回归测试"
  }
}
```

---

## 三、技术架构

### 3.1 定时任务调度

使用 BullMQ 的重复任务功能：

```typescript
import { Queue } from 'bullmq';

const schedulerQueue = new Queue('scheduler', { connection });

// 添加定时任务
async function addScheduledTask(task: ScheduledTask) {
  await schedulerQueue.add(
    'scheduled-run',
    { scheduledTaskId: task.id },
    {
      repeat: {
        pattern: task.cronExpression,
        tz: task.timezone
      },
      jobId: `scheduled-${task.id}`
    }
  );
}
```

### 3.2 指标聚合

```typescript
// 定时聚合任务指标
async function aggregateMetrics(timeRange: { start: Date; end: Date }) {
  const results = await prisma.taskResult.groupBy({
    by: ['taskId', 'createdAt'],
    where: {
      createdAt: { gte: timeRange.start, lte: timeRange.end }
    },
    _count: true,
    _avg: { latencyMs: true },
    _sum: { cost: true }
  });

  // 计算通过率
  for (const result of results) {
    const passCount = await prisma.taskResult.count({
      where: {
        taskId: result.taskId,
        passed: true,
        createdAt: { gte: timeRange.start, lte: timeRange.end }
      }
    });
    result.passRate = passCount / result._count;
  }

  return results;
}
```

### 3.3 告警检测

```typescript
// 告警检测器
async function checkAlerts() {
  const rules = await prisma.alertRule.findMany({
    where: { isActive: true }
  });

  for (const rule of rules) {
    const value = await getMetricValue(rule.metric, rule.duration);
    const triggered = evaluateCondition(value, rule.condition, rule.threshold);

    if (triggered) {
      await triggerAlert(rule, value);
    }
  }
}

// 每分钟检查一次
setInterval(checkAlerts, 60 * 1000);
```

---

## 四、数据模型

### 4.1 定时任务

```prisma
model ScheduledTask {
  id              String   @id @default(cuid())
  name            String
  description     String?
  taskTemplateId  String
  taskTemplate    Task     @relation(fields: [taskTemplateId], references: [id])

  cronExpression  String
  timezone        String   @default("Asia/Shanghai")
  isActive        Boolean  @default(true)

  lastRunAt       DateTime?
  nextRunAt       DateTime?

  executions      ScheduledExecution[]

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model ScheduledExecution {
  id              String   @id @default(cuid())
  scheduledTaskId String
  scheduledTask   ScheduledTask @relation(fields: [scheduledTaskId], references: [id])

  taskId          String   // 实际执行的任务 ID
  task            Task     @relation(fields: [taskId], references: [id])

  status          String   // SUCCESS, FAILED
  error           String?

  createdAt       DateTime @default(now())
}
```

### 4.2 告警

```prisma
model AlertRule {
  id              String   @id @default(cuid())
  name            String
  description     String?

  metric          String   // pass_rate, avg_latency, error_rate, cost
  condition       String   // lt, gt, eq, lte, gte
  threshold       Float
  duration        Int      // 分钟

  severity        String   // warning, critical, urgent
  silencePeriod   Int      @default(30)  // 分钟

  notifyChannels  Json     // string[]
  scope           Json?    // { taskIds?, promptIds?, modelIds? }

  isActive        Boolean  @default(true)

  alerts          Alert[]

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Alert {
  id              String   @id @default(cuid())
  ruleId          String
  rule            AlertRule @relation(fields: [ruleId], references: [id])

  value           Float    // 触发时的值
  status          String   // triggered, acknowledged, resolved
  acknowledgedAt  DateTime?
  acknowledgedBy  String?
  resolvedAt      DateTime?

  createdAt       DateTime @default(now())
}

model NotifyChannel {
  id              String   @id @default(cuid())
  name            String
  type            String   // email, webhook, internal
  config          Json

  isActive        Boolean  @default(true)

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 五、页面设计

### 5.1 监控中心 `/monitor`

```
┌─────────────────────────────────────────────────────────────────┐
│ 监控中心                                    [时间范围: 7天 ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 通过率趋势                                                 │   │
│ │   100% ─────────────────────────────────────────          │   │
│ │    80% ────●────●────●────●────●────●────●────            │   │
│ │    60% ─────────────────────────────────────────          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ 平均耗时                     │ │ 调用成本                     │ │
│ │ [面积图]                     │ │ [柱状图]                     │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 活跃告警                                          [全部 >] │   │
│ │ ⚠️ 通过率低于80% - 每日回归测试 - 5分钟前                  │   │
│ │ 🔴 错误率超过10% - API测试 - 1小时前                       │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 定时任务管理

```
┌─────────────────────────────────────────────────────────────────┐
│ 定时任务                                        [+ 创建定时任务] │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────┬────────────┬────────────┬──────────┬────────┬──────┐ │
│ │ 名称   │ Cron       │ 上次执行   │ 下次执行 │ 状态   │ 操作 │ │
│ ├────────┼────────────┼────────────┼──────────┼────────┼──────┤ │
│ │ 每日   │ 0 0 * * *  │ 今天 00:00 │ 明天     │ ✓ 启用 │ ... │ │
│ │ 回归   │            │ ✓ 成功     │ 00:00    │        │      │ │
│ ├────────┼────────────┼────────────┼──────────┼────────┼──────┤ │
│ │ 每周   │ 0 9 * * 1  │ 上周一     │ 下周一   │ ✓ 启用 │ ... │ │
│ │ 全量   │            │ ✓ 成功     │ 09:00    │        │      │ │
│ └────────┴────────────┴────────────┴──────────┴────────┴──────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、依赖关系

### 6.1 外部依赖

- nodemailer（邮件发送）
- cron-parser（Cron 表达式解析）
- echarts/recharts（图表库）

### 6.2 内部依赖

- Phase 7：BullMQ 任务队列
- Phase 5：统计 API
