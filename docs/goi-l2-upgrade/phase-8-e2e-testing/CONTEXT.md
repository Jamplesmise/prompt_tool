# Phase 8: E2E 端到端测试

## 阶段概述

本阶段专注于 GOI 系统的端到端测试，验证完整的用户流程和交互体验。使用 Playwright 进行浏览器自动化测试。

## 技术栈

- **框架**: Next.js 15 + React 19
- **测试工具**: Playwright
- **浏览器**: Chromium / Firefox / WebKit
- **断言库**: @playwright/test

## 前置条件

- Phase 7 (API 集成测试) 完成
- 开发服务已启动 (`pnpm dev`)
- Playwright 已安装 (`npx playwright install`)

## 测试范围

### 核心场景（6 大类）

| 场景 | 描述 | 测试数 | 优先级 |
|------|------|--------|--------|
| A. 完整任务流程 | 从目标输入到任务完成 | 3 | P0 |
| B. 暂停续跑 | 模式切换、暂停恢复 | 3 | P0 |
| C. 人机协作 | 接管、交还、操作感知 | 3 | P0 |
| D. 检查点确认 | 各类检查点的交互 | 4 | P0 |
| E. 模式对比 | 三种模式的行为差异 | 4 | P1 |
| F. 失败恢复 | 错误处理和恢复 | 3 | P1 |
| G. 边界情况 | 异常输入和并发操作 | 7 | P2 |

### 测试覆盖目标

| 维度 | 目标 |
|------|------|
| 用户流程覆盖 | 100% 核心流程 |
| 三种模式覆盖 | 每种模式至少 3 个场景 |
| 错误场景覆盖 | 主要错误类型 |
| 浏览器兼容 | Chromium + Firefox |

## 目录结构

```
apps/web/e2e/goi/
├── fixtures/
│   ├── index.ts           # 导出 fixtures
│   ├── goiPage.ts         # GOI 页面操作封装
│   └── testData.ts        # 测试数据
├── complete-task-flow.spec.ts      # 场景 A
├── pause-resume.spec.ts            # 场景 B
├── collaboration.spec.ts           # 场景 C
├── checkpoint.spec.ts              # 场景 D
├── modes.spec.ts                   # 场景 E
├── failure-recovery.spec.ts        # 场景 F
├── edge-cases.spec.ts              # 场景 G
└── performance.spec.ts             # 性能场景
```

## 测试 Fixtures

```typescript
// fixtures/goiPage.ts
import { Page, expect } from '@playwright/test'

export class GoiPage {
  constructor(private page: Page) {}

  async login() {
    // 使用测试账号登录
  }

  async openCopilot() {
    await this.page.click('[data-testid="copilot-toggle"]')
    await expect(this.page.locator('[data-testid="copilot-panel"]')).toBeVisible()
  }

  async switchMode(mode: 'manual' | 'assisted' | 'auto') {
    await this.page.click(`[data-testid="mode-${mode}"]`)
  }

  async startWithGoal(goal: string) {
    await this.page.fill('[data-testid="goal-input"]', goal)
    await this.page.click('[data-testid="start-button"]')
  }

  async waitForTodoList() {
    await this.page.waitForSelector('[data-testid="todo-list"]', { timeout: 10000 })
  }

  async waitForCheckpoint() {
    await this.page.waitForSelector('[data-testid="checkpoint-dialog"]', { timeout: 10000 })
  }

  async approveCheckpoint() {
    await this.page.click('[data-testid="checkpoint-approve"]')
  }

  async getTodoItemCount() {
    return await this.page.locator('[data-testid="todo-item"]').count()
  }

  async getCompletedTodoCount() {
    return await this.page.locator('[data-testid="todo-item"][data-status="completed"]').count()
  }

  // ... 更多方法
}
```

## 验收标准

| 标准 | 要求 |
|------|------|
| P0 场景通过率 | 100% |
| P1 场景通过率 | 95% |
| 跨浏览器测试 | Chromium + Firefox |
| 测试稳定性 | 重复运行 3 次全通过 |

## 依赖关系

```
Phase 8 (E2E 测试)
    ├── 依赖: Phase 7 (API 集成测试)
    └── 被依赖: Phase 9 (性能测试)
```

## 预计工作量

| 任务 | 预计 |
|------|------|
| Fixtures 完善 | 0.5 天 |
| 场景 A-D (P0) | 2 天 |
| 场景 E-G (P1/P2) | 1.5 天 |
| 跨浏览器测试 | 0.5 天 |
| 稳定性修复 | 0.5 天 |
| **总计** | **5 天** |
