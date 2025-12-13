# Phase 4: 计划展示优化 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 4.1 定义展示数据结构 | P0 | 1h | ✅ 完成 |
| 4.2 实现标签转换器 | P0 | 1.5h | ✅ 完成 |
| 4.3 实现分组生成器 | P0 | 1h | ✅ 完成 |
| 4.4 优化展示组件 | P0 | 2h | ✅ 完成 |
| 4.5 添加进度计算 | P1 | 1h | ✅ 完成 |

---

## 4.1 定义展示数据结构

**文件**: `apps/web/src/lib/goi/todo/types.ts`（新建或扩展）

### 任务描述

定义用户友好的 TODO 展示数据结构。

### 具体步骤

- [ ] 定义分组结构：

```typescript
/**
 * TODO 分组
 */
export type TodoGroup = {
  id: string
  name: string                // "准备工作"、"配置数据"、"执行验证"
  emoji: string               // "📝"、"⚙️"、"▶️"
  phase: 'prepare' | 'config' | 'execute' | 'verify'
  items: DisplayTodoItem[]
  collapsed: boolean
}

/**
 * 展示用 TODO 项
 */
export type DisplayTodoItem = {
  id: string
  // 展示文本
  userLabel: string           // "选择 Prompt"
  valueLabel?: string         // "→ sentiment-analysis-v2"
  hint?: string               // "💡 这是你指定的情感分析prompt"
  // 状态
  status: TodoStatus
  statusIcon: string          // "☐"、"◉"、"✓"、"✗"、"⏭"
  // 元数据
  isKeyStep: boolean
  requiresConfirm: boolean
  estimatedSeconds: number
  // 原始数据（调试用）
  _raw?: {
    operation: GoiOperation
    technicalLabel: string
  }
}

/**
 * 整体展示数据
 */
export type TodoDisplayData = {
  title: string               // "创建测试任务"
  totalSteps: number
  completedSteps: number
  progress: number            // 0-100
  estimatedTotalSeconds: number
  estimatedRemainingSeconds: number
  groups: TodoGroup[]
}
```

---

## 4.2 实现标签转换器

**文件**: `apps/web/src/lib/goi/todo/labelConverter.ts`（新建）

### 任务描述

将技术操作转换为用户可读的标签。

### 具体步骤

- [ ] 创建 `labelConverter.ts` 文件
- [ ] 实现操作到标签的映射：

```typescript
/**
 * 资源类型中文名
 */
const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  prompt: '提示词',
  dataset: '数据集',
  model: '模型',
  provider: '供应商',
  evaluator: '评估器',
  task: '测试任务',
  scheduled_task: '定时任务',
  alert_rule: '告警规则',
  notify_channel: '通知渠道',
  // ...
}

/**
 * 操作动词中文
 */
const ACTION_LABELS: Record<string, string> = {
  navigate: '打开',
  create: '创建',
  select: '选择',
  edit: '编辑',
  delete: '删除',
  submit: '提交',
  wait: '等待',
  verify: '验证',
}

/**
 * 转换 Access 操作
 */
function convertAccessOperation(op: AccessOperation): { userLabel: string; valueLabel?: string; hint?: string } {
  const resourceLabel = RESOURCE_TYPE_LABELS[op.target.resourceType] || op.target.resourceType
  const actionLabel = ACTION_LABELS[op.action] || op.action

  switch (op.action) {
    case 'navigate':
      return {
        userLabel: `打开${resourceLabel}页面`,
      }
    case 'create':
      return {
        userLabel: `打开${resourceLabel}创建表单`,
      }
    case 'select':
      return {
        userLabel: `选择${resourceLabel}`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : '→ (待选择)',
        hint: op.target.resourceId ? undefined : '需要你从列表中选择',
      }
    case 'view':
      return {
        userLabel: `查看${resourceLabel}`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : undefined,
      }
    default:
      return {
        userLabel: `${actionLabel}${resourceLabel}`,
      }
  }
}

/**
 * 转换 State 操作
 */
function convertStateOperation(op: StateOperation): { userLabel: string; valueLabel?: string; hint?: string } {
  const resourceLabel = RESOURCE_TYPE_LABELS[op.target.resourceType] || op.target.resourceType

  switch (op.action) {
    case 'create':
      const name = op.expectedState?.name as string
      return {
        userLabel: `创建${resourceLabel}`,
        valueLabel: name ? `→ ${name}` : undefined,
        hint: name ? undefined : '需要填写必要信息',
      }
    case 'update':
      return {
        userLabel: `更新${resourceLabel}`,
        valueLabel: `→ 修改 ${Object.keys(op.expectedState).join(', ')}`,
      }
    case 'delete':
      return {
        userLabel: `删除${resourceLabel}`,
        hint: '⚠️ 此操作不可撤销',
      }
    default:
      return {
        userLabel: `${op.action} ${resourceLabel}`,
      }
  }
}

/**
 * 主转换函数
 */
export function convertToUserLabel(operation: GoiOperation): {
  userLabel: string
  valueLabel?: string
  hint?: string
  technicalLabel: string
} {
  let result: { userLabel: string; valueLabel?: string; hint?: string }

  switch (operation.type) {
    case 'access':
      result = convertAccessOperation(operation as AccessOperation)
      break
    case 'state':
      result = convertStateOperation(operation as StateOperation)
      break
    case 'observation':
      result = { userLabel: '查询数据' }
      break
    default:
      result = { userLabel: '执行操作' }
  }

  return {
    ...result,
    technicalLabel: JSON.stringify(operation),
  }
}
```

---

## 4.3 实现分组生成器

**文件**: `apps/web/src/lib/goi/todo/groupGenerator.ts`（新建）

### 任务描述

将 TODO 列表按逻辑分组。

### 具体步骤

- [ ] 创建 `groupGenerator.ts` 文件
- [ ] 定义分组规则：

```typescript
/**
 * 分组定义
 */
const GROUP_DEFINITIONS = [
  {
    id: 'prepare',
    name: '准备工作',
    emoji: '📝',
    phase: 'prepare' as const,
    matchOperations: (op: GoiOperation) =>
      op.type === 'access' && ['navigate', 'view'].includes((op as AccessOperation).action),
  },
  {
    id: 'select',
    name: '选择资源',
    emoji: '🔍',
    phase: 'config' as const,
    matchOperations: (op: GoiOperation) =>
      op.type === 'access' && (op as AccessOperation).action === 'select',
  },
  {
    id: 'config',
    name: '配置数据',
    emoji: '⚙️',
    phase: 'config' as const,
    matchOperations: (op: GoiOperation) =>
      op.type === 'state' && (op as StateOperation).action !== 'delete',
  },
  {
    id: 'execute',
    name: '执行操作',
    emoji: '▶️',
    phase: 'execute' as const,
    matchOperations: (op: GoiOperation) =>
      op.type === 'state' && (op as StateOperation).action === 'create' &&
      (op as StateOperation).target.resourceType === 'task',
  },
  {
    id: 'verify',
    name: '验证结果',
    emoji: '✅',
    phase: 'verify' as const,
    matchOperations: (op: GoiOperation) =>
      op.type === 'observation',
  },
]

/**
 * 将操作列表分组
 */
export function groupOperations(operations: GoiOperation[]): TodoGroup[] {
  const groups: Map<string, TodoGroup> = new Map()

  for (const op of operations) {
    // 找到匹配的分组
    let matched = false
    for (const def of GROUP_DEFINITIONS) {
      if (def.matchOperations(op)) {
        if (!groups.has(def.id)) {
          groups.set(def.id, {
            id: def.id,
            name: def.name,
            emoji: def.emoji,
            phase: def.phase,
            items: [],
            collapsed: false,
          })
        }
        const group = groups.get(def.id)!
        const labels = convertToUserLabel(op)
        group.items.push({
          id: `${def.id}-${group.items.length}`,
          ...labels,
          status: 'pending',
          statusIcon: '☐',
          isKeyStep: isKeyStep(op),
          requiresConfirm: requiresConfirmation(op),
          estimatedSeconds: estimateTime(op),
        })
        matched = true
        break
      }
    }

    // 未匹配的放入"其他"分组
    if (!matched) {
      if (!groups.has('other')) {
        groups.set('other', {
          id: 'other',
          name: '其他操作',
          emoji: '📌',
          phase: 'execute',
          items: [],
          collapsed: false,
        })
      }
      const group = groups.get('other')!
      const labels = convertToUserLabel(op)
      group.items.push({
        id: `other-${group.items.length}`,
        ...labels,
        status: 'pending',
        statusIcon: '☐',
        isKeyStep: false,
        requiresConfirm: false,
        estimatedSeconds: 5,
      })
    }
  }

  // 按 phase 排序
  const phaseOrder = ['prepare', 'config', 'execute', 'verify']
  return Array.from(groups.values()).sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  )
}
```

---

## 4.4 优化展示组件

**文件**: `apps/web/src/components/goi/CopilotPanel/TodoListView.tsx`

### 任务描述

优化 TODO 列表的 UI 展示。

### 具体步骤

- [ ] 重构 TodoListView 组件：

```tsx
import { TodoDisplayData, TodoGroup, DisplayTodoItem } from '@/lib/goi/todo/types'

type Props = {
  data: TodoDisplayData
  onItemClick?: (itemId: string) => void
}

export function TodoListView({ data, onItemClick }: Props) {
  return (
    <div className="todo-list">
      {/* 标题和进度 */}
      <div className="todo-header">
        <h3>{data.title}</h3>
        <span className="todo-meta">
          预计 {formatTime(data.estimatedTotalSeconds)}
        </span>
      </div>

      {/* 进度条 */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${data.progress}%` }}
        />
        <span className="progress-text">
          {data.progress}% | 剩余 {formatTime(data.estimatedRemainingSeconds)}
        </span>
      </div>

      {/* 分组列表 */}
      {data.groups.map(group => (
        <TodoGroupView
          key={group.id}
          group={group}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}

function TodoGroupView({ group, onItemClick }: { group: TodoGroup; onItemClick?: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(group.collapsed)

  return (
    <div className="todo-group">
      <div
        className="group-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="group-emoji">{group.emoji}</span>
        <span className="group-name">{group.name}</span>
        <span className="group-count">[{group.items.length}步]</span>
        <span className="collapse-icon">{collapsed ? '▸' : '▾'}</span>
      </div>

      {!collapsed && (
        <div className="group-items">
          {group.items.map(item => (
            <TodoItemView
              key={item.id}
              item={item}
              onClick={() => onItemClick?.(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TodoItemView({ item, onClick }: { item: DisplayTodoItem; onClick?: () => void }) {
  return (
    <div
      className={`todo-item status-${item.status}`}
      onClick={onClick}
    >
      <span className="status-icon">{item.statusIcon}</span>
      <div className="item-content">
        <span className="user-label">{item.userLabel}</span>
        {item.valueLabel && (
          <span className="value-label">{item.valueLabel}</span>
        )}
        {item.hint && (
          <div className="hint">{item.hint}</div>
        )}
      </div>
      {item.isKeyStep && <span className="key-badge">关键</span>}
    </div>
  )
}
```

- [ ] 添加样式：

```css
.todo-list {
  font-family: system-ui, sans-serif;
  font-size: 14px;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}

.progress-bar {
  height: 24px;
  background: #f3f4f6;
  border-radius: 4px;
  margin: 12px 0;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #6b7280;
}

.todo-group {
  margin: 8px 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
}

.group-header:hover {
  background: #f9fafb;
}

.group-items {
  margin-left: 16px;
  border-left: 2px solid #e5e7eb;
  padding-left: 12px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
}

.todo-item.status-completed {
  opacity: 0.6;
}

.todo-item.status-in_progress {
  background: #eff6ff;
  border-radius: 4px;
  padding: 8px;
  margin: -4px;
}

.status-icon {
  font-size: 16px;
  width: 20px;
}

.value-label {
  color: #3b82f6;
  margin-left: 4px;
}

.hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.key-badge {
  font-size: 10px;
  background: #fef3c7;
  color: #d97706;
  padding: 2px 6px;
  border-radius: 4px;
}
```

---

## 4.5 添加进度计算

**文件**: `apps/web/src/lib/goi/todo/progress.ts`（新建）

### 任务描述

实现进度百分比和剩余时间计算。

### 具体步骤

- [ ] 创建 `progress.ts` 文件：

```typescript
import type { TodoDisplayData, TodoGroup, DisplayTodoItem } from './types'

/**
 * 计算进度数据
 */
export function calculateProgress(groups: TodoGroup[]): {
  totalSteps: number
  completedSteps: number
  progress: number
  estimatedTotalSeconds: number
  estimatedRemainingSeconds: number
} {
  let totalSteps = 0
  let completedSteps = 0
  let estimatedTotalSeconds = 0
  let completedSeconds = 0

  for (const group of groups) {
    for (const item of group.items) {
      totalSteps++
      estimatedTotalSeconds += item.estimatedSeconds

      if (item.status === 'completed' || item.status === 'skipped') {
        completedSteps++
        completedSeconds += item.estimatedSeconds
      } else if (item.status === 'in_progress') {
        // 进行中的算一半
        completedSeconds += item.estimatedSeconds * 0.5
      }
    }
  }

  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const estimatedRemainingSeconds = Math.max(0, estimatedTotalSeconds - completedSeconds)

  return {
    totalSteps,
    completedSteps,
    progress,
    estimatedTotalSeconds,
    estimatedRemainingSeconds,
  }
}

/**
 * 格式化时间
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }
  return `${minutes}分${remainingSeconds}秒`
}

/**
 * 估算操作耗时
 */
export function estimateTime(operation: GoiOperation): number {
  switch (operation.type) {
    case 'access':
      const accessOp = operation as AccessOperation
      if (accessOp.action === 'navigate') return 2
      if (accessOp.action === 'create') return 3
      if (accessOp.action === 'select') return 5
      return 3

    case 'state':
      const stateOp = operation as StateOperation
      if (stateOp.action === 'create') return 10
      if (stateOp.action === 'update') return 5
      if (stateOp.action === 'delete') return 3
      return 5

    case 'observation':
      return 3

    default:
      return 5
  }
}
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-12 | 4.1 定义展示数据结构 | ✅ 完成 | 创建 displayTypes.ts |
| 2025-12-12 | 4.2 实现标签转换器 | ✅ 完成 | 创建 labelConverter.ts |
| 2025-12-12 | 4.3 实现分组生成器 | ✅ 完成 | 创建 groupGenerator.ts |
| 2025-12-12 | 4.5 添加进度计算 | ✅ 完成 | 创建 progress.ts |
| 2025-12-12 | 4.4 优化展示组件 | ✅ 完成 | 重构 TodoListView.tsx，添加样式 |
| 2025-12-12 | 更新导出 | ✅ 完成 | 更新 todo/index.ts |
