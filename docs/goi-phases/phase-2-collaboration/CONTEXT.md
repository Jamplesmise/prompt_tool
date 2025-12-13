# Phase 2: 人机协作系统 - 上下文文档

## 阶段目标

构建人机协作的核心能力，包括检查点控制、AI Copilot 面板和实时同步机制，实现三种运行模式。

**核心理念**：让执行过程透明可控 - 用户始终知道 AI 在做什么、打算做什么，可以在任意节点干预。

## 前置依赖

- Phase 0: 事件系统 + 快照机制
- Phase 1: GOI 执行器 + TODO List + Agent Loop

## 技术背景

### 1. 三种运行模式

#### 模式一：纯人工模式

```
用户操作 → 传统UI → Event Bus → Core API
                        │
                        ▼
                   Event Store (仅记录)
```

- AI 层完全不参与
- 所有操作记录到事件流
- 与升级前体验完全一致

#### 模式二：AI 辅助模式（推荐）

```
                    AI Copilot 面板
                    显示建议、TODO List、当前状态
                           │
                    Checkpoint Controller
                    判断是否需要用户确认
                           │
用户操作 → 传统UI ─┬─────→ │
                  │       │
                  ▼       ▼
              Event Bus ← AI Agent (GOI)
                  │
                  ▼
              Core API
```

- AI 在侧边栏提供建议和执行计划
- 关键操作需要用户确认
- 用户随时可直接操作传统 UI
- 人工操作会同步更新 AI 的理解

#### 模式三：AI 自动模式

```
用户设定目标 → Agent Loop → GOI Executor → Event Bus → Core API
                  │                            │
                  │← 结果反馈 ←─────────────────┘
                  │
                  ▼
          自动执行直到完成或遇到异常
```

- 用户只需描述目标
- AI 自动规划并执行所有步骤
- 仅在预设检查点暂停

### 2. 检查点规则

| 操作类型 | 默认策略 | 说明 |
|---------|---------|------|
| 观察类 | 自动通过 | 查询、浏览，无副作用 |
| 访问类 | 自动通过 | 打开页面、切换 Tab |
| 创建类 | 需要确认 | 创建新资源 |
| 更新类 | 智能判断 | 根据影响范围和用户历史 |
| 删除类 | **必须确认** | 不可逆操作 |
| 执行类 | 需要确认 | 运行测试任务等 |

### 3. 控制权切换

```
┌───────────────────────────────────────────────────────────────┐
│  AI 主导模式              ←──切换──→            人工主导模式   │
│                                                              │
│  AI 按计划执行                         用户自由操作           │
│  用户监督确认                          AI 观察学习           │
│  [交给我来] 按钮                       [继续执行] 按钮        │
└───────────────────────────────────────────────────────────────┘

切换时机：
- 用户点击"我来操作"：AI → 人工
- 用户点击"继续执行"：人工 → AI
- 检查点被拒绝：AI → 人工
- 人工完成 TODO 项：可选择让 AI 继续
```

## 涉及的文件/模块

### 新增文件

```
packages/shared/types/goi/
├── checkpoint.ts       # 检查点类型定义
└── collaboration.ts    # 协作相关类型

apps/web/src/lib/goi/
├── checkpoint/
│   ├── controller.ts   # 检查点控制器
│   ├── rules.ts        # 规则引擎
│   └── queue.ts        # 等待队列
└── collaboration/
    ├── syncManager.ts  # 同步管理器
    └── controlTransfer.ts # 控制权转移

apps/web/src/components/goi/
├── CopilotPanel/
│   ├── index.tsx       # 主面板
│   ├── CurrentUnderstanding.tsx  # 当前理解展示
│   ├── TodoListView.tsx          # TODO 列表
│   ├── CheckpointDialog.tsx      # 检查点确认弹窗
│   ├── ContextIndicator.tsx      # 上下文指示器
│   └── ModeSelector.tsx          # 模式选择器
└── hooks/
    ├── useCopilot.ts   # Copilot 状态管理
    └── useGoiEvents.ts # 事件订阅

apps/web/src/app/api/goi/
├── checkpoint/route.ts # 检查点 API
└── collaboration/route.ts # 协作 API
```

## UI 设计

### AI Copilot 面板布局

```
┌──────────────────────────────────────┐
│ 🤖 AI Copilot                    [x] │
├──────────────────────────────────────┤
│                                      │
│ 💭 当前理解                           │
│ ┌──────────────────────────────────┐│
│ │ 用户正在创建测试任务，            ││
│ │ 已选择 sentiment-v2 提示词...     ││
│ └──────────────────────────────────┘│
│                                      │
│ 📋 任务计划 (3/12)                   │
│ ┌──────────────────────────────────┐│
│ │ ✅ 选择提示词                     ││
│ │ ✅ 打开数据集选择                 ││
│ │ 🔧 搜索数据集                     ││
│ │ ⏳ 选中数据集                     ││
│ │ ⏳ ...                            ││
│ └──────────────────────────────────┘│
│                                      │
│ ⏸️ 等待确认                          │
│ ┌──────────────────────────────────┐│
│ │ 确认选择数据集: test-data        ││
│ │                                  ││
│ │ [确认] [换一个] [我来操作]       ││
│ └──────────────────────────────────┘│
│                                      │
│ 上下文: ████████░░ 78%              │
│                                      │
├──────────────────────────────────────┤
│ [💬 输入指令...]                     │
│                                      │
│ ○ 逐步  ● 智能  ○ 全自动             │
└──────────────────────────────────────┘
```

### 检查点确认交互

```
┌──────────────────────────────────────────────────────────────┐
│                        检查点确认                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 📍 当前操作：选择数据集                                       │
│                                                              │
│ AI 打算选择以下数据集：                                       │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 📊 test-data                                             ││
│ │                                                          ││
│ │ 描述：情感分析测试数据集                                   ││
│ │ 数据量：100 条                                            ││
│ │ 字段：text, sentiment, confidence                         ││
│ │                                                          ││
│ │ [预览数据]                                                ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [✅ 确认继续]  [✏️ 换一个]  [✋ 我来操作]  [❌ 取消]      ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ 💡 选择"我来操作"后，您可以手动完成此步骤，AI会继续后续任务    │
└──────────────────────────────────────────────────────────────┘
```

## 实时同步机制

### 人工操作 → AI 感知

```
用户在传统 UI 执行操作
        │
        ▼
操作通过 Event Bus 发布事件
        │
        ▼
AI Copilot 订阅事件更新
        │
        ├── 更新"当前理解"面板
        │
        ├── 检查是否影响当前 TODO
        │   ├── 是：标记 TODO 为已完成/调整计划
        │   └── 否：仅记录
        │
        └── 更新 TODO List 显示
```

### AI 操作 → UI 反映

```
AI 通过 GOI 执行操作
        │
        ▼
GOI Executor 调用 Core API
        │
        ▼
API 触发 UI 状态变更
        │
        ├── 页面导航（如果需要）
        │
        ├── 表单填充（如果需要）
        │
        └── 弹窗打开/关闭（如果需要）
        │
        ▼
用户在传统 UI 看到"幽灵操作"效果
（添加视觉提示表明这是 AI 操作）
```

## API 设计

### 检查点 API

```typescript
// 获取当前等待的检查点
GET /api/goi/checkpoint/pending?sessionId={id}

// 响应检查点
POST /api/goi/checkpoint/{id}/respond
{
  action: 'approve' | 'modify' | 'reject' | 'takeover';
  modifications?: Partial<TodoItem>;
  reason?: string;
}

// 配置检查点规则
PUT /api/goi/checkpoint/rules
{
  sessionId: string;
  rules: CheckpointRule[];
}
```

### 协作 API

```typescript
// 获取当前协作状态
GET /api/goi/collaboration/status?sessionId={id}
{
  mode: 'manual' | 'assisted' | 'auto';
  controller: 'user' | 'ai';
  aiUnderstanding: string;
  todoProgress: { completed: number; total: number };
}

// 切换控制权
POST /api/goi/collaboration/transfer
{
  sessionId: string;
  to: 'user' | 'ai';
  reason?: string;
}

// 切换运行模式
POST /api/goi/collaboration/mode
{
  sessionId: string;
  mode: 'manual' | 'assisted' | 'auto';
}
```

## 验收标准

### 功能验收

- [ ] Checkpoint Controller 可根据规则判断是否需要确认
- [ ] AI Copilot 面板完整显示 TODO List 和当前状态
- [ ] 人工操作可实时同步到 AI 理解
- [ ] AI 操作可在传统 UI 上可视化展示
- [ ] 三种运行模式可自由切换
- [ ] 控制权可在人和 AI 之间转移

### 交互验收

- [ ] 检查点确认界面清晰易懂
- [ ] 模式切换无感知延迟
- [ ] 控制权转移流畅自然

## 注意事项

1. **面板不影响现有布局**：使用可折叠侧边栏，不改变主界面
2. **响应式设计**：面板在小屏幕上自动隐藏或简化
3. **性能优化**：事件订阅使用防抖，避免频繁更新
4. **无障碍访问**：检查点操作支持键盘快捷键

## 参考资源

- Ant Design Drawer 组件
- WebSocket 实现：参考现有任务进度推送
- 状态管理：复用 Zustand store 模式
