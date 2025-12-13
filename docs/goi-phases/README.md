# GOI 改造分阶段开发计划

> 版本：v1.0
> 基于：goi-transformation-plan.md
> 遵循：MVU 原则（单次改动 < 5 文件，< 200 行）

## 项目概述

**GOI (Goal-Oriented Interface)** - 目标导向接口改造

让 AI 能够通过声明式接口操控 AI 测试平台，实现：
- AI 只声明"想要什么"（策略）
- 系统负责"如何实现"（机制）
- 用户保持完全控制权

## 核心设计原则

1. **无 AI 也能完整运行** - GOI 是装饰层，不改变底层 API
2. **细粒度操作追踪** - 每个操作拆分到最小可观测单元
3. **失败安全** - 任何操作失败时自动回滚到安全状态

## 分阶段开发计划

| 阶段 | 名称 | 内容 | 预估周期 |
|------|------|------|----------|
| Phase 0 | 基础设施层 | 事件系统 + 状态快照 | 2 周 |
| Phase 1 | GOI 执行层 | GOI 接口 + TODO List + Agent Loop | 3 周 |
| Phase 2 | 人机协作层 | Checkpoint + Copilot UI + 同步机制 | 3 周 |
| Phase 3 | 可靠性保障 | 上下文管理 + 回滚机制 | 2 周 |
| Phase 4 | 集成优化 | 全流程测试 + 性能优化 | 2 周 |

## 技术栈复用

- **Event Bus**: Redis Pub/Sub（已有）
- **Event Store**: PostgreSQL（已有）
- **实时通信**: WebSocket
- **状态管理**: Zustand + React Query（已有）

## 关键里程碑

| 里程碑 | 验收标准 |
|--------|---------|
| M1 | 事件系统可用，现有功能不受影响 |
| M2 | 可以用 GOI 执行简单任务 |
| M3 | 可以在三种模式下工作 |
| M4 | 失败可恢复，上下文可管理 |
| M5 | 全功能可用，稳定运行 |

## 目录结构

```
docs/goi-phases/
├── README.md                    # 本文件
├── phase-0-infrastructure/      # 阶段0：基础设施
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-1-goi-core/            # 阶段1：GOI核心
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-2-collaboration/       # 阶段2：人机协作
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-3-reliability/         # 阶段3：可靠性保障
│   ├── CONTEXT.md
│   └── TASKS.md
└── phase-4-integration/         # 阶段4：集成优化
    ├── CONTEXT.md
    └── TASKS.md
```

## 风险控制

- **事件系统影响性能** → 异步发布、批量写入
- **模型响应不稳定** → 重试机制、降级策略
- **上下文压缩丢失信息** → 多级压缩、关键信息标记
