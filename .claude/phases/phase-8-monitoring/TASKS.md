# Phase 8: 定时监控与告警 - 任务清单

> 前置依赖：Phase 0-7 完成
> 预期产出：定时任务 + 监控中心 + 告警规则 + 通知渠道

---

## 开发任务

### 8.1 数据模型扩展

**目标**：添加定时任务、告警相关数据模型

**任务项**：
- [x] 更新 `prisma/schema.prisma` - 添加 ScheduledTask 模型
- [x] 更新 `prisma/schema.prisma` - 添加 ScheduledExecution 模型
- [x] 更新 `prisma/schema.prisma` - 添加 AlertRule 模型
- [x] 更新 `prisma/schema.prisma` - 添加 Alert 模型
- [x] 更新 `prisma/schema.prisma` - 添加 NotifyChannel 模型
- [x] 执行 `pnpm db:push` 同步数据库
- [x] 更新 `packages/shared/types` - 添加相关类型定义

**验收标准**：
- [x] 数据库表创建成功
- [x] Prisma Client 生成成功

---

### 8.2 定时任务调度

**目标**：实现基于 Cron 的定时任务

**任务项**：
- [x] 安装 cron-parser 依赖
- [x] 创建 `lib/scheduler/cronParser.ts` - Cron 表达式解析
- [x] 创建 `lib/scheduler/schedulerQueue.ts` - 调度队列
- [x] 创建 `lib/scheduler/schedulerWorker.ts` - 调度 Worker
- [x] 创建 `api/v1/scheduled-tasks/route.ts` - GET, POST
- [x] 创建 `api/v1/scheduled-tasks/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/scheduled-tasks/[id]/toggle/route.ts` - 启用/禁用
- [x] 创建 `api/v1/scheduled-tasks/[id]/executions/route.ts` - 执行历史
- [x] 创建 `api/v1/scheduled-tasks/[id]/run-now/route.ts` - 立即执行

**代码结构**：
```
src/lib/scheduler/
├── cronParser.ts
├── schedulerQueue.ts
├── schedulerWorker.ts
└── index.ts
```

**验收标准**：
- [x] 定时任务创建正常
- [x] Cron 表达式解析正确
- [x] 按时执行任务
- [x] 执行历史记录正确
- [x] 启用/禁用功能正常

---

### 8.3 定时任务 UI

**目标**：实现定时任务管理页面

**任务项**：
- [x] 创建 `services/scheduledTasks.ts` - API 封装
- [x] 创建 `hooks/useScheduledTasks.ts` - React Query hooks
- [x] 创建 `components/scheduled/ScheduledTaskTable.tsx` - 任务列表
- [x] 创建 `components/scheduled/CronEditor.tsx` - Cron 编辑器（可视化）
- [x] 创建 `components/scheduled/ExecutionHistory.tsx` - 执行历史
- [x] 创建 `components/scheduled/CreateScheduledModal.tsx` - 创建弹窗
- [x] 创建 `app/(dashboard)/scheduled/page.tsx` - 定时任务页面

**验收标准**：
- [x] 定时任务列表正常
- [x] Cron 编辑器易用
- [x] 执行历史展示正常
- [x] 启用/禁用操作正常

---

### 8.4 监控中心页面

**目标**：实现监控中心和性能图表

**任务项**：
- [x] 安装图表库（recharts）
- [x] 创建 `api/v1/stats/trends/route.ts` - 趋势数据 API
- [x] 创建 `lib/metrics/aggregator.ts` - 指标聚合器
- [x] 创建 `services/metrics.ts` - API 封装
- [x] 创建 `hooks/useMetrics.ts` - React Query hooks
- [x] 创建 `components/monitor/TrendCharts.tsx` - 趋势图表（通过率/耗时/成本）
- [x] 创建 `components/monitor/AlertList.tsx` - 活跃告警列表
- [x] 创建 `components/monitor/TimeRangePicker.tsx` - 时间范围选择
- [x] 创建 `app/(dashboard)/monitor/page.tsx` - 监控中心页面

**验收标准**：
- [x] 趋势图表正常渲染
- [x] 时间范围切换正常
- [x] 数据聚合正确
- [x] 图表交互正常（hover、缩放）

---

### 8.5 告警规则管理

**目标**：实现告警规则配置

**任务项**：
- [x] 创建 `api/v1/alert-rules/route.ts` - GET, POST
- [x] 创建 `api/v1/alert-rules/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/alert-rules/[id]/toggle/route.ts` - 启用/禁用
- [x] 创建 `api/v1/alerts/route.ts` - 告警列表
- [x] 创建 `api/v1/alerts/[id]/acknowledge/route.ts` - 确认告警
- [x] 创建 `api/v1/alerts/[id]/resolve/route.ts` - 解决告警
- [x] 创建 `lib/alerting/detector.ts` - 告警检测器
- [x] 创建 `lib/alerting/evaluator.ts` - 条件评估器
- [x] 创建 `services/alerts.ts` - API 封装
- [x] 创建 `hooks/useAlerts.ts` - React Query hooks
- [x] 创建 `app/(dashboard)/monitor/alerts/page.tsx` - 告警管理页

**验收标准**：
- [x] 告警规则 CRUD 正常
- [x] 告警检测正确触发
- [x] 静默期正确生效
- [x] 告警确认/解决功能正常

---

### 8.6 通知渠道

**目标**：实现告警通知发送

**任务项**：
- [x] 安装 nodemailer 依赖
- [x] 创建 `lib/notify/email.ts` - 邮件发送
- [x] 创建 `lib/notify/webhook.ts` - Webhook 发送
- [x] 创建 `lib/notify/dispatcher.ts` - 通知分发器
- [x] 创建 `api/v1/notify-channels/route.ts` - GET, POST
- [x] 创建 `api/v1/notify-channels/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/notify-channels/[id]/test/route.ts` - 测试通知
- [x] 创建 `components/notifications/CreateChannelModal.tsx` - 渠道创建弹窗
- [x] 创建 `app/(dashboard)/settings/notifications/page.tsx` - 通知设置页
- [x] 创建 `app/(dashboard)/settings/page.tsx` - 通用设置页

**验收标准**：
- [x] 邮件发送正常
- [x] Webhook 发送正常
- [x] 测试通知功能可用
- [x] 通知内容完整

---

### 8.7 侧边栏更新

**目标**：添加监控中心入口

**任务项**：
- [x] 更新 `app/(dashboard)/layout.tsx` - 添加监控菜单项
- [x] 添加定时任务菜单项
- [x] 添加设置菜单项（含通知渠道子路由）

**验收标准**：
- [x] 监控菜单正常显示
- [x] 所有子页面可正常访问

---

## 单元测试

### UT-8.1 Cron 解析测试
- [x] 标准表达式解析正确
- [x] 时区处理正确
- [x] 下次执行时间计算正确
- [x] 预设选项验证

### UT-8.2 告警条件评估测试
- [x] 条件评估正确（LT, GT, EQ, LTE, GTE）
- [x] 边界情况处理
- [x] 告警场景模拟

### UT-8.3 通知分发测试
- [x] 多渠道分发正确
- [x] 错误处理正确
- [x] 渠道测试功能正常

### UT-8.4 指标聚合测试
- [x] 时间范围计算正确
- [x] 通过率计算正确
- [x] 平均耗时计算正确
- [x] 成本汇总正确
- [x] 错误率计算正确

---

## 集成测试

### IT-8.1 监控中心完整流程
- [x] 定时任务 CRUD 流程
- [x] 告警规则 CRUD 流程
- [x] 通知渠道 CRUD 流程
- [x] 监控数据查询流程

### IT-8.2 告警检测流程
- [x] 告警条件评估
- [x] 静默期处理

### IT-8.3 通知分发流程
- [x] 邮件通知
- [x] Webhook 通知

---

## 测试结果

| 测试文件 | 测试数量 | 状态 |
|---------|---------|------|
| `cronParser.test.ts` | 16 tests | ✅ 通过 |
| `alertEvaluator.test.ts` | 22 tests | ✅ 通过 |
| `notifyDispatcher.test.ts` | 12 tests | ✅ 通过 |
| `metricsAggregator.test.ts` | 19 tests | ✅ 通过 |
| `monitoringFlow.test.ts` | 36 tests | ✅ 通过 |

**总计**: 105 个测试全部通过

---

## 开发日志

### 2024-12-03 - Claude

**完成任务**：
- 8.1 数据模型扩展：添加 5 个新模型和相关枚举
- 8.2 定时任务调度：BullMQ 队列 + cron-parser 解析
- 8.3 定时任务 UI：可视化 Cron 编辑器 + 任务列表 + 执行历史
- 8.4 监控中心页面：recharts 趋势图表 + 时间范围选择
- 8.5 告警规则管理：检测器 + 评估器 + 告警 CRUD API
- 8.6 通知渠道：nodemailer 邮件 + Webhook + 通知分发器
- 8.7 侧边栏更新：监控中心 + 定时任务 + 设置菜单

**遇到问题**：
- cron-parser v5 API 变化（parseExpression → CronExpressionParser.parse）
- Ant Design Alert/Tag 组件没有 size 属性
- Prisma JSON 字段 null 值需要使用 Prisma.JsonNull

**解决方案**：
- 更新 cron-parser 导入方式
- 使用 style 属性代替 size
- 使用 Prisma.JsonNull 和 Prisma.InputJsonValue

**新增文件**：
- `lib/scheduler/` - cronParser, schedulerQueue, schedulerWorker
- `lib/metrics/aggregator.ts` - 指标聚合
- `lib/alerting/` - detector, evaluator
- `lib/notify/` - email, webhook, dispatcher
- `services/` - scheduledTasks, metrics, alerts
- `hooks/` - useScheduledTasks, useMetrics, useAlerts
- `components/scheduled/` - CronEditor, ScheduledTaskTable, CreateScheduledModal, ExecutionHistory
- `components/monitor/` - TrendCharts, AlertList, TimeRangePicker
- `components/notifications/` - CreateChannelModal
- `app/(dashboard)/scheduled/page.tsx`
- `app/(dashboard)/monitor/page.tsx`
- `app/(dashboard)/monitor/alerts/page.tsx`
- `app/(dashboard)/settings/page.tsx`
- `app/(dashboard)/settings/notifications/page.tsx`
- API 路由：scheduled-tasks, alert-rules, alerts, notify-channels, stats/trends

**单元测试和集成测试**：
- `__tests__/unit/cronParser.test.ts` - 16 tests
- `__tests__/unit/alertEvaluator.test.ts` - 22 tests
- `__tests__/unit/notifyDispatcher.test.ts` - 12 tests
- `__tests__/unit/metricsAggregator.test.ts` - 19 tests
- `__tests__/integration/monitoringFlow.test.ts` - 36 tests

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成
- [x] 单元测试通过
- [x] 集成测试通过
- [x] 定时任务正常执行
- [x] 监控图表正常显示
- [x] 告警正确触发
- [x] 通知正常发送
- [ ] 代码已提交并推送
- [x] 开发日志已更新
