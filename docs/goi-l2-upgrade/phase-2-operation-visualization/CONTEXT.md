# Phase 2: 操作可视化

## 阶段目标

让用户能够看到 AI 正在执行的每一步操作，包括：
- 目标元素视觉高亮
- 操作说明气泡
- 实时进度反馈

## 当前问题

### 1. 执行过程不可见

AI 执行时用户只能看到页面变化，不知道：
- 这是 AI 做的还是系统自动的
- AI 正在操作哪个元素
- 下一步要做什么

### 2. 缺少视觉反馈

没有：
- 元素高亮效果
- 操作说明
- 执行轨迹

### 3. 执行速度不可控

AI 执行太快，用户跟不上，无法：
- 理解发生了什么
- 及时中断
- 学习操作流程

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/components/goi/CopilotPanel/` | Copilot 面板组件 |
| `apps/web/src/lib/goi/agent/agentLoop.ts` | Agent 执行循环 |
| `apps/web/src/lib/goi/executor/` | 操作执行器 |

## 设计方案

### 1. 可视化层架构

```
┌─────────────────────────────────────────────────────────┐
│                      页面内容                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │                                                    │ │
│  │    ╭─────────────────────╮                        │ │
│  │    │   目标元素          │  ← HighlightRing       │ │
│  │    │   (呼吸光圈)        │                        │ │
│  │    ╰─────────────────────╯                        │ │
│  │              ↑                                     │ │
│  │    ╭─────────────────────────╮                    │ │
│  │    │ 🤖 正在选择提示词...    │ ← ActionBubble     │ │
│  │    ╰─────────────────────────╯                    │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────────────┐                               │
│  │   执行进度面板       │ ← ExecutionProgress          │
│  │   ▸ 步骤 1 ✓        │                               │
│  │   ◉ 步骤 2 执行中   │                               │
│  │   ○ 步骤 3          │                               │
│  └─────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

### 2. 高亮效果设计

```css
/* 呼吸光圈效果 */
@keyframes breathe {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5),
                0 0 0 4px rgba(59, 130, 246, 0.3),
                0 0 0 8px rgba(59, 130, 246, 0.1);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6),
                0 0 0 8px rgba(59, 130, 246, 0.4),
                0 0 0 12px rgba(59, 130, 246, 0.2);
  }
}

.goi-highlight {
  position: relative;
  z-index: 1000;
  animation: breathe 1.5s ease-in-out infinite;
  border-radius: 4px;
}

/* 点击动画 */
@keyframes click-ripple {
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.goi-click-effect::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: rgba(59, 130, 246, 0.5);
  border-radius: 50%;
  animation: click-ripple 0.5s ease-out;
}
```

### 3. 操作说明气泡

```typescript
type ActionBubble = {
  targetElement: HTMLElement
  message: string
  position: 'top' | 'bottom' | 'left' | 'right'
  icon: '🤖' | '⏳' | '✓' | '❌'
  duration?: number  // 自动消失时间
}
```

### 4. 执行速度控制

```typescript
type ExecutionSpeed = 'fast' | 'normal' | 'slow' | 'step'

const SPEED_DELAYS: Record<ExecutionSpeed, number> = {
  fast: 200,     // 快速：200ms 间隔
  normal: 800,   // 正常：800ms 间隔
  slow: 2000,    // 慢速：2s 间隔（演示用）
  step: -1,      // 单步：每步需确认
}
```

## 验收标准

1. [ ] 执行时目标元素有呼吸光圈效果
2. [ ] 显示操作说明气泡
3. [ ] 点击时有涟漪动画
4. [ ] 支持 3 种执行速度
5. [ ] TODO 列表实时同步更新
6. [ ] 视觉效果不遮挡关键内容

## 依赖

- Phase 1 完成（多步任务规划）

## 下一阶段

完成本阶段后，进入 Phase 3：检查点确认机制
