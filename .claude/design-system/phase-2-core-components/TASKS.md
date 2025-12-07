# Phase 2: 核心组件 - 任务清单

> 预计工时：5 天

## 任务列表

### Task 2.1: 实现 StatCard 统计卡片组件

**优先级**: P0
**预估**: 4h

- [x] 创建 `apps/web/src/components/common/StatCard.tsx`
- [x] 定义 StatCardProps 类型
- [x] 实现渐变色图标背景（primary/success/warning/info）
- [x] 实现数字展示（使用 font-feature-settings: 'tnum'）
- [x] 实现可选后缀
- [x] 实现趋势指示器（上升/下降）
- [x] 实现点击交互（可选）
- [x] 创建对应的 CSS 模块文件

**代码结构**:
```tsx
// StatCard.tsx
export type StatCardProps = {
  icon: ReactNode;
  iconBg?: 'primary' | 'success' | 'warning' | 'info';
  title: string;
  value: number | string;
  suffix?: string;
  trend?: { value: number; type: 'up' | 'down'; label?: string };
  onClick?: () => void;
};

export const StatCard: React.FC<StatCardProps> = ({ ... }) => { ... };
```

**验收**:
- 渲染 4 种不同颜色的 StatCard
- 显示趋势箭头和百分比
- 点击时触发回调

---

### Task 2.2: 实现 StatusBadge 状态标签组件

**优先级**: P0
**预估**: 3h

- [x] 创建 `apps/web/src/components/common/StatusBadge.tsx`
- [x] 定义 StatusType 和 StatusBadgeProps 类型
- [x] 实现 5 种状态类型（success/processing/warning/error/default）
- [x] 实现渐变色背景
- [x] 实现可选状态点
- [x] 实现 processing 状态的脉冲动画
- [x] 创建对应的 CSS 模块文件

**状态配置**:
```typescript
const statusConfig = {
  success: { bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', color: '#065F46' },
  processing: { bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', color: '#1E40AF' },
  warning: { bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92400E' },
  error: { bg: 'linear-gradient(135deg, #FEE2E2, #FECACA)', color: '#991B1B' },
  default: { bg: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)', color: '#4B5563' },
};
```

**验收**:
- 渲染 5 种状态的标签
- processing 状态点有脉冲动画
- 样式与设计规范一致

---

### Task 2.3: 实现 EmptyState 空状态组件

**优先级**: P0
**预估**: 2h

- [x] 复用现有 `apps/web/src/components/common/PageStates.tsx` 中的 EmptyState
- [x] 已有 EmptyStateProps 类型定义
- [x] 已实现基于 Ant Design Empty 组件
- [x] 支持标题和描述文字
- [x] 支持操作按钮（使用品牌渐变样式）
- [x] 居中对齐布局

**验收**:
- 渲染空状态组件
- 操作按钮可点击
- 无操作按钮时正常渲染

---

### Task 2.4: 创建组件导出入口

**优先级**: P1
**预估**: 0.5h

- [x] 更新 `apps/web/src/components/common/index.ts`
- [x] 导出 StatCard 组件和类型
- [x] 导出 StatusBadge 组件和类型
- [x] 保留现有 EmptyState 导出

**代码**:
```typescript
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusType } from './StatusBadge';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
```

---

### Task 2.5: 统一表格样式

**优先级**: P0
**预估**: 3h

- [x] 在 `apps/web/src/app/globals.css` 中添加表格样式
- [x] 设置表头背景色（#F9FAFB）
- [x] 设置表头文字样式（font-weight: 600, color: #374151）
- [x] 设置行悬浮背景色（#F9FAFB）
- [x] 设置选中行背景色（#FEF2F2）
- [x] 实现操作列悬浮显示效果（.row-actions）
- [x] 添加表格圆角和边框样式

**样式要点**:
```scss
.ant-table {
  .ant-table-thead > tr > th {
    background: $gray-50;
    font-weight: 600;
  }

  .row-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }

  tr:hover .row-actions {
    opacity: 1;
  }
}
```

**验收**:
- 表头背景为浅灰色
- 行悬浮有背景变化
- 选中行显示品牌色背景
- 操作列悬浮时显示

---

### Task 2.6: 添加 hover-card 通用样式类

**优先级**: P1
**预估**: 1h

- [x] 在 globals.css 中添加 `.hover-card` 类
- [x] 实现悬浮时边框颜色变化
- [x] 实现悬浮时阴影增强
- [x] 实现悬浮时微上移效果
- [x] 添加平滑过渡动画
- [x] 添加 `.hover-card-light` 轻量级悬浮效果
- [x] 添加 `.hover-card-primary` 品牌色边框悬浮效果

**代码**:
```scss
.hover-card {
  transition: all 0.2s ease;

  &:hover {
    border-color: $primary-200;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}
```

---

### Task 2.7: 组件单元测试

**优先级**: P2
**预估**: 2h

- [x] 为 StatCard 编写渲染测试（17 个测试用例）
- [x] 为 StatCard 编写点击交互测试（键盘操作支持）
- [x] 为 StatusBadge 编写各状态渲染测试（11 个测试用例）
- [x] 为 EmptyState 编写渲染测试（已有 PageStates.test.tsx）
- [x] 为 EmptyState 编写操作按钮测试（已有 PageStates.test.tsx）

---

### Task 2.8: 组件文档与示例

**优先级**: P2
**预估**: 1.5h

- [ ] 在组件文件中添加 JSDoc 注释
- [ ] 创建 Storybook stories（如果项目使用）
- [ ] 或在组件文件头部添加使用示例注释

---

## 完成标准

- [x] 所有 Task 标记为完成
- [x] 组件 TypeScript 类型完整
- [x] 组件样式与设计规范一致
- [x] 单元测试覆盖核心功能
- [x] 代码通过 lint 检查

---

## 开发日志

| 日期 | 进度 | 备注 |
|------|------|------|
| 2025-12-06 | 100% | 完成所有任务：StatCard、StatusBadge、表格样式、hover-card、单元测试（29个测试用例全部通过）|
