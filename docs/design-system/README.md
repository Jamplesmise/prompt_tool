# 设计系统优化计划

> 建立统一的视觉基础和交互规范，为产品深度优化提供支撑

## 概述

设计系统优化是产品升级的**基础设施层**，与 `product-deep-optimization` 计划**并行推进、相互配合**。

## 与产品深度优化的关系

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         产品升级全景图                                   │
└─────────────────────────────────────────────────────────────────────────┘

 设计系统优化 (design-system)        产品深度优化 (product-deep-optimization)
 ────────────────────────────        ─────────────────────────────────────

 Phase 1: 基础主题                   Phase 1: 用户旅程
    │                                   │
    │  ← 主题配置为引导组件提供基础 ←    │
    ▼                                   ▼
 Phase 2: 核心组件                   Phase 2: 智能化能力
    │                                   │
    │  ← StatCard 用于分析面板展示 ←    │
    ▼                                   ▼
 Phase 3: 页面改造                   Phase 3: 对比分析
    │                                   │
    │  ← 统一布局支撑对比页面 ←         │
    ▼                                   ▼
 Phase 4: 交互增强                   Phase 4: 效率工具
    │                                   │
    │  ← 全局搜索作为命令面板基础 ←     │
    ▼                                   ▼
 Phase 5: 打磨优化                   Phase 5: 专业深度
    │                                   │
    └───────────────┬───────────────────┘
                    ▼
            产品从 40 分提升到 80 分
```

## 协作原则

### 1. 设计系统优先

设计系统的组件和样式是产品功能的基础：
- 新建功能组件时，先检查设计系统是否有可复用的组件
- 产品功能页面应使用设计系统定义的布局规范
- 交互反馈使用统一的 feedback 工具函数

### 2. 并行开发策略

| 时间线 | 设计系统 | 产品深度优化 |
|--------|----------|--------------|
| Week 1 | Phase 1: 基础主题 | Phase 1: 用户旅程（设计稿） |
| Week 2 | Phase 2: 核心组件 | Phase 1: 用户旅程（开发） |
| Week 3 | Phase 3: 页面改造（工作台） | Phase 1: 用户旅程（集成） |
| Week 4 | Phase 3: 页面改造（列表页） | Phase 2: 智能化（设计） |
| Week 5 | Phase 3: 页面改造（详情页） | Phase 2: 智能化（开发） |
| Week 6 | Phase 4: 交互增强 | Phase 2: 智能化（开发） |
| Week 7 | Phase 4: 交互增强 | Phase 3: 对比分析 |
| Week 8 | Phase 5: 打磨优化 | Phase 3: 对比分析 |
| Week 9 | 收尾 | Phase 4: 效率工具 |
| Week 10 | - | Phase 5: 专业深度 |

### 3. 共享组件映射

| 设计系统组件 | 产品功能使用场景 |
|--------------|------------------|
| `StatCard` | 工作台统计、分析面板、对比结果 |
| `StatusBadge` | 任务状态、测试结果、告警状态 |
| `EmptyState` | 无数据、无结果、引导入口 |
| `GlobalSearch` | 命令面板基础 |
| `HotkeysHelp` | 快捷键系统 |
| `PageSkeleton` | 所有页面加载状态 |

## 阶段概览

### Phase 1: 基础主题 (3天)

建立统一的视觉基础：
- Ant Design 主题 Token 配置
- SCSS 变量文件
- 主按钮渐变样式
- 侧边栏选中状态

### Phase 2: 核心组件 (5天)

创建可复用的核心组件：
- StatCard 统计卡片
- StatusBadge 状态标签
- EmptyState 空状态
- 表格样式统一

### Phase 3: 页面改造 (7天)

应用设计系统到具体页面：
- 工作台重构
- 列表页统一
- 详情页统一
- 设置页优化

### Phase 4: 交互增强 (3天)

提升交互品质：
- 动效系统
- 快捷键系统
- 全局搜索
- 反馈机制

### Phase 5: 打磨优化 (2天)

收尾和质量保证：
- 响应式适配
- 性能优化
- 边界情况处理
- 最终测试

## 文件结构

```
docs/design-system/
├── README.md                    # 本文档
├── design-system.md             # 设计系统规范
├── phase-1-base-theme/
│   ├── CONTEXT.md              # 阶段上下文
│   └── TASKS.md                # 任务清单
├── phase-2-core-components/
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-3-page-refactor/
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-4-interaction/
│   ├── CONTEXT.md
│   └── TASKS.md
└── phase-5-polish/
    ├── CONTEXT.md
    └── TASKS.md
```

## 开发指南

### 开始新阶段

1. 阅读该阶段的 `CONTEXT.md` 了解背景
2. 按照 `TASKS.md` 中的任务清单逐项完成
3. 每完成一个任务，在 TASKS.md 中勾选
4. 在开发日志中记录进度和问题

### 组件开发规范

```typescript
// 1. 使用 CSS Modules
import styles from './ComponentName.module.scss';

// 2. 导出类型定义
export type ComponentNameProps = {
  // ...
};

// 3. 使用函数组件
export const ComponentName: React.FC<ComponentNameProps> = ({ ... }) => {
  // ...
};
```

### 样式开发规范

```scss
// 1. 引入变量
@import '@/styles/variables';

// 2. 使用设计系统变量
.component {
  color: $gray-700;
  background: $primary-50;
  padding: $space-4;
  border-radius: $radius-lg;
}

// 3. 使用动效变量
.animated {
  transition: all $duration-normal $ease-default;
}
```

## 相关文档

- [设计系统规范](./design-system.md) - 完整的视觉与交互规范
- [产品深度优化](../product-deep-optimization/product-deep-optimization.md) - 功能级优化计划
- [UI 规范](../07-ui-convention.md) - 项目 UI 开发约定
