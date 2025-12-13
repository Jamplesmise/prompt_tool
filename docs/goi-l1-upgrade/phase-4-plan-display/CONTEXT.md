# Phase 4: 计划展示优化

## 阶段目标

让 AI 生成的计划（TODO List）对用户友好、易于理解。

## 当前问题

### 1. TODO 列表太技术化

当前生成的 TODO：
```
☐ navigate /tasks/new
☐ click #prompt-selector
☐ input "sentiment"
☐ select first result
☐ click #dataset-selector
```

用户看不懂这些技术操作。

### 2. 缺少分组和结构

所有步骤平铺显示，没有：
- 阶段分组
- 重要性标记
- 说明注释

### 3. 无进度感知

用户不知道：
- 当前进度百分比
- 预计剩余时间
- 哪些步骤是关键步骤

## 设计方案

### 1. 用户友好的 TODO 结构

```typescript
export type TodoGroup = {
  id: string
  name: string                // 分组名称（如"准备工作"）
  emoji?: string              // 分组图标
  items: TodoItem[]
  collapsed?: boolean         // 是否折叠
}

export type TodoItem = {
  id: string
  // 展示信息
  userLabel: string           // 用户可读描述
  technicalLabel?: string     // 技术描述（调试用）
  hint?: string               // 提示说明
  // 状态
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  // 元数据
  isKeyStep?: boolean         // 是否关键步骤
  requiresConfirm?: boolean   // 是否需要确认
  estimatedTime?: number      // 预计耗时（秒）
}
```

### 2. 展示模板

```
📋 创建测试任务 (预计3分钟)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ 准备工作 [2步]
  ✓ 打开任务创建页面
  ☐ 选择 Prompt → sentiment-analysis-v2
    💡 这是你指定的情感分析prompt

▸ 配置数据 [2步]
  ○ 选择数据集 → (待你确认)
  ○ 配置字段映射
    💡 需要把数据集的列对应到prompt的变量

▸ 执行验证 [2步]
  ○ 启动测试任务
  ○ 等待完成并生成报告

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
进度: [████████░░░░░░░░] 25% | 预计剩余: 2分15秒
```

### 3. 标签转换规则

| 技术操作 | 用户标签 |
|---------|---------|
| `navigate /tasks/new` | 打开任务创建页面 |
| `click #prompt-selector` | 打开 Prompt 选择器 |
| `select {name}` | 选择 {name} |
| `input {value}` | 填写 {field}: {value} |
| `submit` | 提交 |
| `wait` | 等待处理... |

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/todo/todoList.ts` | TODO 数据结构 |
| `apps/web/src/components/goi/CopilotPanel/TodoListView.tsx` | TODO 展示组件 |
| `apps/web/src/lib/goi/prompts/planPrompt.ts` | 计划生成提示词 |

## 验收标准

1. [ ] TODO 列表使用自然语言描述
2. [ ] 步骤按阶段分组显示
3. [ ] 关键步骤有提示说明
4. [ ] 显示进度百分比和预计时间
5. [ ] 新用户能在 30 秒内理解计划含义

## 依赖

- Phase 3 完成（意图理解）

## 下一阶段

完成本阶段后，进入 Phase 5：验证与修复
