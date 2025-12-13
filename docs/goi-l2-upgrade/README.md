# GOI L2 智能水平提升计划

> 目标：让 GOI 系统达到 L2 级别 —— 能规划多步任务，用户全程可控

## 前置条件

**必须先完成 L1 升级**（docs/goi-l1-upgrade/）

L1 提供的基础：
- ✅ 所有资源类型支持
- ✅ 意图理解准确率 > 95%
- ✅ 用户友好的 TODO 展示

## L2 智能水平定义

**L2 = 能规划多步任务**（类比导航软件）

| 能力 | 描述 | 类比 |
|------|------|------|
| 任务分解 | 将复杂目标拆解为可执行步骤 | 导航规划路线 |
| 执行可视化 | 用户看到 AI 在做什么 | 导航显示当前位置 |
| 检查点确认 | 关键决策暂停确认 | 导航提示"即将上高速" |
| 随时暂停 | 用户可中途停止 | 导航可随时退出 |
| 接管感知 | 感知用户手动操作 | 导航检测到偏离路线 |

### 达标标准

| 指标 | 目标 |
|------|------|
| 多步任务成功率 | > 85% |
| 检查点触发准确率 | > 90% |
| 暂停响应时间 | < 500ms |
| 人工操作感知准确率 | > 80% |
| 用户控制感评分 | > 4/5 |

---

## 分阶段计划

### 功能开发阶段（Phase 1-6）✅ 已完成

| 阶段 | 名称 | 目标 | 状态 |
|------|------|------|------|
| Phase 1 | 多步任务规划 | 复杂任务自动拆解为步骤序列 | ✅ |
| Phase 2 | 操作可视化 | AI 每一步操作用户都能看到 | ✅ |
| Phase 3 | 检查点确认 | 关键操作暂停等待用户确认 | ✅ |
| Phase 4 | 暂停与接管 | 用户可随时暂停、接管控制 | ✅ |
| Phase 5 | 人工操作感知 | AI 能感知用户的手动操作 | ✅ |
| Phase 6 | 验证与集成 | 端到端测试、问题修复 | ✅ |

### 测试阶段（Phase 7-9）⬜ 待开始

| 阶段 | 名称 | 目标 | 预估工作量 |
|------|------|------|-----------|
| Phase 7 | 单元测试与集成测试 | 7.A: 28 个 API 端点测试 + 7.B: 前端组件/Hooks/Store 测试 | 7 天 |
| Phase 8 | E2E 端到端测试 | 6 大场景的用户流程测试 | 5 天 |
| Phase 9 | 性能测试 | 响应时间、压力、稳定性测试 | 3 天 |

**测试总计**：15 天

---

## 目录结构

```
docs/goi-l2-upgrade/
├── README.md                          # 本文件
├── TEST-PLAN.md                       # 完整测试计划文档
│
├── # 功能开发阶段 (Phase 1-6) ✅
├── phase-1-multi-step-planning/       # 多步任务规划
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-2-operation-visualization/   # 操作可视化
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-3-checkpoint-confirmation/   # 检查点确认
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-4-pause-takeover/            # 暂停与接管
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-5-human-action-sensing/      # 人工操作感知
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-6-validation/                # 验证与集成
│   ├── CONTEXT.md
│   └── TASKS.md
│
├── # 测试阶段 (Phase 7-9) ⬜
├── phase-7-api-integration-testing/   # 单元测试与集成测试（7.A API + 7.B 前端）
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-8-e2e-testing/               # E2E 端到端测试
│   ├── CONTEXT.md
│   └── TASKS.md
└── phase-9-performance-testing/       # 性能测试
    ├── CONTEXT.md
    └── TASKS.md
```

---

## 关键里程碑

### 功能里程碑（M1-M6）✅ 已完成

| 里程碑 | 验收标准 | 依赖阶段 | 状态 |
|--------|---------|---------|------|
| M1 | "创建测试任务"能自动生成 5+ 步骤的计划 | Phase 1 | ✅ |
| M2 | 执行时每步操作有视觉高亮和说明 | Phase 2 | ✅ |
| M3 | 选择关键资源时自动暂停等待确认 | Phase 3 | ✅ |
| M4 | 点击暂停按钮 500ms 内停止执行 | Phase 4 | ✅ |
| M5 | 用户手动选择资源后 TODO 自动更新 | Phase 5 | ✅ |
| M6 | 完整流程"创建任务→执行→查看结果"成功率 > 85% | Phase 6 | ✅ |

### 测试里程碑（M7-M9）⬜ 待验证

| 里程碑 | 验收标准 | 依赖阶段 | 状态 |
|--------|---------|---------|------|
| M7 | API 测试 100% 通过 + 前端组件/Hooks/Store 测试通过，覆盖率 > 80% | Phase 7 | ⬜ |
| M8 | 6 大 E2E 场景通过率 > 95%，跨浏览器测试通过 | Phase 8 | ⬜ |
| M9 | 所有 P0 性能指标达标，压力测试稳定 | Phase 9 | ⬜ |

---

## 核心设计

### 1. 任务执行状态机

```
┌─────────┐     plan      ┌──────────┐
│  IDLE   │──────────────→│ PLANNING │
└─────────┘               └────┬─────┘
     ↑                         │ ready
     │                         ↓
     │                   ┌───────────┐
     │     cancel        │  READY    │
     ├───────────────────┤  (待确认)  │
     │                   └─────┬─────┘
     │                         │ confirm
     │                         ↓
     │                   ┌───────────┐     pause     ┌──────────┐
     │                   │ EXECUTING │──────────────→│  PAUSED  │
     │                   └─────┬─────┘               └────┬─────┘
     │                         │                          │ resume
     │                         │ step_done                │
     │                         ↓                          │
     │                   ┌───────────┐                    │
     │                   │CHECKPOINT │←───────────────────┘
     │                   │  (等待)    │
     │                   └─────┬─────┘
     │                         │ approve/skip
     │                         ↓
     │      complete     ┌───────────┐
     └───────────────────│ COMPLETED │
                         └───────────┘
```

### 2. 检查点触发规则

| 触发条件 | 优先级 | 说明 |
|---------|-------|------|
| 选择关键资源 | P0 | Prompt、Dataset、Model 选择 |
| 不可逆操作 | P0 | 删除、提交、发布 |
| 涉及费用 | P0 | 调用付费 API |
| 首次执行 | P1 | 用于学习用户偏好 |
| 用户自定义 | P2 | 可配置敏感度 |

### 3. 操作可视化方案

```
AI 执行操作时的视觉反馈：

1. 目标元素高亮
   ┌─────────────────────────┐
   │  ╭─────────────────╮    │
   │  │   选择 Prompt ▼ │ ← 呼吸光圈
   │  ╰─────────────────╯    │
   │                         │
   └─────────────────────────┘

2. 操作说明气泡
   ╭──────────────────────────╮
   │ 🤖 AI 正在选择提示词...    │
   ╰──────────────────────────╯

3. TODO 列表同步更新
   ✓ 打开任务创建页面
   ◉ 选择 Prompt ← 当前步骤
   ○ 选择 Dataset
```

### 4. 暂停状态展示

```
⏸️ 已暂停

已完成 (3/8)：
  ✓ 打开任务创建页
  ✓ 选择 Prompt → sentiment-v2
  ✓ 选择 Dataset → test-data

暂停在：
  ◉ 配置字段映射 ← 执行到这里暂停了

等待执行 (4项)：
  ○ 选择评估模型
  ○ 设置评估指标
  ○ 启动任务
  ○ 生成报告

[▶ 继续执行] [✋ 我来操作] [✕ 取消任务]
```

---

## 技术方案

### 1. 新增数据结构

```typescript
// 任务会话
type TaskSession = {
  id: string
  status: SessionStatus
  plan: TaskPlan
  currentStepIndex: number
  checkpoints: Checkpoint[]
  snapshots: Snapshot[]
  startedAt: Date
  pausedAt?: Date
  completedAt?: Date
}

// 任务计划
type TaskPlan = {
  goal: string                    // 用户目标
  steps: PlanStep[]               // 步骤列表
  estimatedDuration: number       // 预计耗时
  requiredResources: string[]     // 需要的资源
}

// 计划步骤
type PlanStep = {
  id: string
  operation: GoiOperation
  userLabel: string
  isCheckpoint: boolean           // 是否是检查点
  checkpointReason?: string       // 检查点原因
  dependencies: string[]          // 依赖的步骤 ID
  status: StepStatus
}

// 检查点
type Checkpoint = {
  id: string
  stepId: string
  type: CheckpointType
  question: string
  options: CheckpointOption[]
  response?: CheckpointResponse
  createdAt: Date
  respondedAt?: Date
}
```

### 2. 新增 API

| API | 方法 | 用途 |
|-----|------|------|
| `/api/goi/session/create` | POST | 创建任务会话 |
| `/api/goi/session/[id]/plan` | GET | 获取执行计划 |
| `/api/goi/session/[id]/start` | POST | 开始执行 |
| `/api/goi/session/[id]/pause` | POST | 暂停执行 |
| `/api/goi/session/[id]/resume` | POST | 恢复执行 |
| `/api/goi/session/[id]/takeover` | POST | 用户接管 |
| `/api/goi/checkpoint/[id]/respond` | POST | 响应检查点 |
| `/api/goi/sync/user-action` | POST | 上报用户操作 |

### 3. 前端组件

| 组件 | 用途 |
|------|------|
| `ExecutionOverlay` | 执行时的全局遮罩层 |
| `OperationHighlight` | 目标元素高亮效果 |
| `ActionBubble` | 操作说明气泡 |
| `CheckpointDialog` | 检查点确认弹窗 |
| `PauseStatusPanel` | 暂停状态展示面板 |
| `ProgressTimeline` | 执行进度时间线 |

---

## 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|-------|------|---------|
| 多步规划生成质量不稳定 | 高 | 高 | 预设常用场景模板 |
| 检查点过多影响体验 | 中 | 中 | 提供敏感度配置 |
| 暂停后状态恢复困难 | 中 | 高 | 完善快照机制 |
| 用户操作感知延迟 | 中 | 中 | 使用 MutationObserver |
| 视觉高亮遮挡内容 | 低 | 低 | 使用非侵入式设计 |

---

## 成功场景

完成 L2 后，用户体验应该是：

```
用户: "帮我用 GPT-4 模型，测试情感分析提示词，数据用 customer-feedback"

AI: "好的，我来帮你创建测试任务。

     📋 创建测试任务 (预计 2 分钟)
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     ▸ 准备 [2步]
       ☐ 打开任务创建页面
       ☐ 选择 Prompt → sentiment-analysis ⏸️
         💡 检查点：确认这是你要测试的提示词

     ▸ 配置 [3步]
       ○ 选择 Dataset → customer-feedback ⏸️
       ○ 选择 Model → gpt-4 ⏸️
       ○ 配置字段映射

     ▸ 执行 [2步]
       ○ 创建并启动任务
       ○ 等待完成

     ⏸️ = 需要你确认的步骤

     [▶ 开始执行] [✎ 修改计划]"

(用户点击"开始执行")

AI: "正在执行..."
    (页面导航到 /tasks/new)
    (Prompt 选择器高亮)

AI: "⏸️ 检查点
     请确认选择的 Prompt：
     → sentiment-analysis (情感二分类)

     [✓ 确认] [✎ 换一个]"

(用户点击"确认")

AI: "继续执行..."
    (Dataset 选择器高亮)

... (后续步骤)

AI: "✅ 任务创建完成！
     任务 ID: task-12345
     状态: 执行中

     [📊 查看结果] [🔄 再创建一个]"
```

---

## 开发日志

| 日期 | 阶段 | 完成内容 | 负责人 |
|------|------|---------|-------|
| 2024-12-12 | Phase 1-6 | L2 功能开发全部完成 | - |
| 2024-12-13 | Phase 7-9 | 创建测试阶段计划文档 | AI |
| 2024-12-13 | Phase 7 | 新增前端组件测试（7.A API + 7.B 前端），更新 TEST-PLAN | AI |

---

*文档版本：v1.1*
*创建日期：2024-12*
*前置依赖：goi-l1-upgrade 完成*
