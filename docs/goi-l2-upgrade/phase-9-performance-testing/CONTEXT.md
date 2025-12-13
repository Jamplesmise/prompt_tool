# Phase 9: 性能测试

## 阶段概述

本阶段专注于 GOI 系统的性能测试，包括响应时间基准、API 性能、并发压力测试和长会话稳定性测试。

## 技术栈

- **框架**: Next.js 15 + React 19 + Prisma 6
- **性能测试**: Vitest (API) + Playwright (E2E)
- **压力测试**: 自定义脚本 / k6 (可选)
- **监控**: 控制台日志 + 时间戳

## 前置条件

- Phase 7-8 完成
- 开发服务已启动 (`pnpm dev`)
- 系统处于低负载状态（准确测量）

## 测试范围

### 性能指标

| 指标 | 目标值 | 优先级 |
|------|--------|--------|
| 计划生成时间（模板） | < 500ms | P0 |
| 计划生成时间（LLM） | < 5s | P0 |
| 暂停响应时间 | < 500ms | P0 |
| 模式切换时间 | < 100ms | P0 |
| 检查点渲染时间 | < 200ms | P1 |
| API 平均响应时间 | < 500ms | P1 |
| 并发会话数 | >= 10 | P1 |
| 长会话稳定性 | 20+ 步骤 | P2 |

### 测试类型

| 类型 | 描述 | 目标 |
|------|------|------|
| 响应时间 | 关键操作的响应时间 | 达标 |
| API 性能 | 接口响应时间统计 | 平均 < 500ms |
| 压力测试 | 并发和连续请求 | 稳定性 |
| 长会话 | 多步骤会话稳定性 | 无内存泄漏 |

## 目录结构

```
apps/web/
├── e2e/goi/
│   └── performance.spec.ts       # E2E 性能测试
├── src/__tests__/api/goi/
│   ├── performance.test.ts       # API 性能测试
│   └── stress.test.ts            # 压力测试
└── scripts/
    └── performance-report.ts     # 性能报告生成
```

## 测试数据收集

```typescript
// 性能数据结构
type PerformanceMetrics = {
  operation: string
  samples: number[]
  min: number
  max: number
  avg: number
  p95: number
  p99: number
}

// 收集函数
function collectMetrics(operation: string, times: number[]): PerformanceMetrics {
  const sorted = times.sort((a, b) => a - b)
  return {
    operation,
    samples: times,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: times.reduce((a, b) => a + b) / times.length,
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }
}
```

## 验收标准

| 标准 | 要求 |
|------|------|
| P0 指标 | 100% 达标 |
| P1 指标 | 90% 达标 |
| 压力测试 | 10 并发无错误 |
| 稳定性 | 连续运行无崩溃 |

## 依赖关系

```
Phase 9 (性能测试)
    ├── 依赖: Phase 7-8 (功能测试)
    └── 输出: 性能基准报告
```

## 预计工作量

| 任务 | 预计 |
|------|------|
| 响应时间测试 | 0.5 天 |
| API 性能测试 | 0.5 天 |
| 压力测试 | 1 天 |
| 长会话稳定性 | 0.5 天 |
| 报告生成 | 0.5 天 |
| **总计** | **3 天** |
