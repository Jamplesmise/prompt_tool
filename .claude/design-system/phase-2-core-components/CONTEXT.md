# Phase 2: 核心组件 - 上下文文档

> 本阶段实现设计系统中的核心可复用组件

## 阶段目标

创建统一的组件库，包括统计卡片、状态标签、空状态组件，并统一表格样式。

## 前置依赖

- Phase 1（基础主题）已完成
- SCSS 变量文件已创建
- Ant Design 主题已配置

## 核心改动范围

### 1. StatCard 统计卡片组件

用于工作台等页面展示关键统计数据：

```typescript
type StatCardProps = {
  icon: ReactNode;
  iconBg?: 'primary' | 'success' | 'warning' | 'info';
  title: string;
  value: number | string;
  suffix?: string;
  trend?: {
    value: number;
    type: 'up' | 'down';
    label?: string;
  };
  onClick?: () => void;
}
```

特性：
- 渐变色图标背景
- 数字使用 tabular-nums 对齐
- 可选趋势指示器
- 支持点击交互

### 2. StatusBadge 状态标签组件

用于展示各种状态，替代原有的简单 Tag：

```typescript
type StatusType = 'success' | 'processing' | 'warning' | 'error' | 'default';

type StatusBadgeProps = {
  status: StatusType;
  text: string;
  dot?: boolean;
}
```

特性：
- 渐变色背景
- 可选状态点（processing 时带脉冲动画）
- 统一的视觉语言

### 3. EmptyState 空状态组件

用于列表为空、搜索无结果等场景：

```typescript
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}
```

### 4. 表格样式统一

增强 ProTable 样式：
- 表头背景色使用 $gray-50
- 行悬浮背景色
- 选中行品牌色高亮
- 操作列悬浮显示
- 统一的分页样式

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/components/common/StatCard.tsx` | 新建 | 统计卡片组件 |
| `apps/web/src/components/common/StatCard.module.scss` | 新建 | 统计卡片样式 |
| `apps/web/src/components/common/StatusBadge.tsx` | 新建 | 状态标签组件 |
| `apps/web/src/components/common/StatusBadge.module.scss` | 新建 | 状态标签样式 |
| `apps/web/src/components/common/EmptyState.tsx` | 新建 | 空状态组件 |
| `apps/web/src/components/common/EmptyState.module.scss` | 新建 | 空状态样式 |
| `apps/web/src/components/common/index.ts` | 新建/修改 | 组件导出 |
| `apps/web/src/styles/table.scss` | 新建 | 表格全局样式 |

## 验收标准

- [ ] StatCard 组件可正确渲染，支持所有 props
- [ ] StatusBadge 组件可正确渲染所有状态类型
- [ ] EmptyState 组件可正确渲染，支持操作按钮
- [ ] 表格样式统一，悬浮/选中效果正确
- [ ] 组件支持 TypeScript 类型推导
- [ ] 组件样式与设计规范一致

## 技术约束

- 使用 CSS Modules 隔离样式
- 组件需导出 TypeScript 类型
- 遵循 React 函数组件规范
- 不引入额外的 UI 库

## 组件使用示例

```tsx
// StatCard
<StatCard
  icon={<FileTextOutlined />}
  iconBg="primary"
  title="提示词总数"
  value={12}
  trend={{ value: 2, type: 'up', label: '本周' }}
  onClick={() => navigate('/prompts')}
/>

// StatusBadge
<StatusBadge status="success" text="已完成" dot />
<StatusBadge status="processing" text="执行中" dot />

// EmptyState
<EmptyState
  title="暂无数据"
  description="点击下方按钮创建第一个提示词"
  action={{ text: '新建提示词', onClick: handleCreate }}
/>
```

## 参考文档

- 设计系统规范：`.claude/design-system/design-system.md` 第五章
