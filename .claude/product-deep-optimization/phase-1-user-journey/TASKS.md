# Phase 1: 用户旅程优化 - 任务清单

## 任务总览

| 子阶段 | 任务数 | 预估复杂度 |
|--------|--------|------------|
| 1.1 新用户引导向导 | 8 | 中 |
| 1.2 上下文感知建议 | 6 | 中 |
| 1.3 任务完成引导 | 5 | 低 |

---

## 1.1 新用户引导向导

### Task 1.1.1: 创建引导状态管理
**描述**: 创建 Zustand store 管理引导流程状态

**文件清单**:
- `apps/web/src/stores/onboardingStore.ts`

**实现要点**:
```typescript
type OnboardingState = {
  isFirstVisit: boolean
  currentStep: number // 0-3
  completedSteps: number[]
  isSkipped: boolean
  showOnboarding: boolean
}
```

**验收标准**:
- [x] 状态持久化到 localStorage
- [x] 支持跳过/恢复引导
- [x] 支持步骤完成标记

---

### Task 1.1.2: 创建引导弹窗容器
**描述**: 创建引导弹窗的主容器组件

**文件清单**:
- `apps/web/src/components/onboarding/OnboardingModal.tsx`

**实现要点**:
- 使用 Ant Design Modal
- 宽度 720px，居中显示
- 左侧步骤指示器，右侧内容区
- 底部操作按钮（上一步/下一步/跳过）

**验收标准**:
- [x] 弹窗正确显示
- [x] 步骤切换动画流畅
- [x] 响应式适配移动端

---

### Task 1.1.3: 实现步骤1 - 模型配置
**描述**: 引导用户配置第一个 AI 模型

**文件清单**:
- `apps/web/src/components/onboarding/StepModelConfig.tsx`

**实现要点**:
- 预设常用模型（OpenAI/Claude/DeepSeek）
- API Key 输入与验证
- 连接测试按钮
- 预计时间提示："约 2 分钟"

**验收标准**:
- [x] 模型选择器正常工作
- [x] API Key 验证通过后显示成功状态
- [x] 错误时显示友好提示

---

### Task 1.1.4: 实现步骤2 - 创建提示词
**描述**: 引导用户创建第一个提示词

**文件清单**:
- `apps/web/src/components/onboarding/StepPromptCreate.tsx`

**实现要点**:
- 提供 3 个常用模板（客服、分类、摘要）
- 支持从模板开始或粘贴现有提示词
- 简化的编辑器（仅系统提示词）
- 预计时间提示："约 30 秒"

**验收标准**:
- [x] 模板选择正常
- [x] 提示词保存成功
- [x] 内容不能为空验证

---

### Task 1.1.5: 实现步骤3 - 快速测试
**描述**: 引导用户运行第一个测试

**文件清单**:
- `apps/web/src/components/onboarding/StepQuickTest.tsx`

**实现要点**:
- 自动关联步骤1的模型和步骤2的提示词
- 提供 3 条示例测试数据
- 一键运行测试
- 实时显示测试进度和结果
- 预计时间提示："约 30 秒"

**验收标准**:
- [x] 自动填充配置正确
- [x] 测试执行成功
- [x] 结果展示清晰

---

### Task 1.1.6: 创建进度指示器
**描述**: 左侧步骤进度展示组件

**文件清单**:
- `apps/web/src/components/onboarding/OnboardingProgress.tsx`

**实现要点**:
- 垂直 Steps 组件
- 已完成步骤显示勾选
- 当前步骤高亮
- 显示每步预计时间

**验收标准**:
- [x] 步骤状态正确显示
- [x] 点击已完成步骤可回退

---

### Task 1.1.7: 创建引导入口 Hook
**描述**: 封装引导逻辑的自定义 Hook

**文件清单**:
- `apps/web/src/hooks/useOnboarding.ts`

**实现要点**:
```typescript
function useOnboarding() {
  // 判断是否需要显示引导
  // 控制引导弹窗显示
  // 处理步骤完成逻辑
  // 处理跳过逻辑
}
```

**验收标准**:
- [x] 首次访问自动触发
- [x] 逻辑封装完整

---

### Task 1.1.8: 集成到工作台页面
**描述**: 在工作台页面集成引导入口

**文件清单**:
- `apps/web/src/app/(dashboard)/page.tsx`

**实现要点**:
- 页面加载时检查引导状态
- 显示"重新开始引导"入口（针对已跳过用户）
- 集成 OnboardingModal

**验收标准**:
- [x] 新用户自动显示引导
- [x] 老用户可手动触发
- [x] 引导完成后不再自动显示

---

## 1.2 上下文感知操作建议

### Task 1.2.1: 创建上下文提示组件
**描述**: 可复用的上下文提示 UI 组件

**文件清单**:
- `apps/web/src/components/guidance/ContextualTip.tsx`

**实现要点**:
- 轻量级提示卡片样式
- 支持图标 + 标题 + 描述 + 操作按钮
- 支持关闭/不再提示
- 动画入场效果

**验收标准**:
- [x] 样式美观统一
- [x] 关闭后状态持久化

---

### Task 1.2.2: 创建提示管理 Store
**描述**: 管理各类上下文提示的显示状态

**文件清单**:
- `apps/web/src/stores/guidanceStore.ts`

**实现要点**:
```typescript
type GuidanceState = {
  dismissedTips: string[]  // 已关闭的提示 ID
  showTip: (tipId: string) => void
  dismissTip: (tipId: string) => void
  shouldShowTip: (tipId: string) => boolean
}
```

**验收标准**:
- [x] 状态持久化
- [x] 支持"不再提示"功能

---

### Task 1.2.3: 提示词修改后测试建议
**描述**: 用户修改提示词后显示测试建议

**文件清单**:
- `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx`（修改）
- `apps/web/src/components/guidance/PromptChangeTip.tsx`

**实现要点**:
- 监听提示词保存事件
- 保存成功后显示提示卡片
- 提供"一键测试"和"与上版本对比"按钮

**验收标准**:
- [x] 保存后自动显示提示
- [x] 按钮跳转正确
- [x] 可关闭提示

---

### Task 1.2.4: 数据集上传后配置建议
**描述**: 用户上传数据集后显示配置建议

**文件清单**:
- `apps/web/src/app/(dashboard)/datasets/page.tsx`（修改）
- `apps/web/src/components/guidance/DatasetUploadTip.tsx`

**实现要点**:
- 监听数据集上传完成事件
- 显示"创建测试任务"建议
- 显示数据集字段映射提示

**验收标准**:
- [x] 上传完成后显示
- [x] 引导到任务创建页

---

### Task 1.2.5: 模型配置后使用建议
**描述**: 用户配置新模型后显示使用建议

**文件清单**:
- `apps/web/src/app/(dashboard)/models/page.tsx`（修改）
- `apps/web/src/components/guidance/ModelConfigTip.tsx`

**实现要点**:
- 监听模型配置保存事件
- 显示"去创建提示词"或"在现有提示词中使用"建议

**验收标准**:
- [x] 配置成功后显示
- [x] 跳转链接正确

---

### Task 1.2.6: 创建事件监听系统
**描述**: 统一的事件监听机制支持上下文感知

**文件清单**:
- `apps/web/src/lib/eventBus.ts`

**实现要点**:
```typescript
type EventType =
  | 'prompt:saved'
  | 'dataset:uploaded'
  | 'model:configured'
  | 'task:completed'

const eventBus = {
  emit: (event: EventType, data?: unknown) => void
  on: (event: EventType, handler: Function) => void
  off: (event: EventType, handler: Function) => void
}
```

**验收标准**:
- [x] 事件发布订阅正常
- [x] 组件卸载时正确清理监听

---

## 1.3 任务完成引导

### Task 1.3.1: 创建任务完成摘要组件
**描述**: 任务完成后的结果摘要卡片

**文件清单**:
- `apps/web/src/components/guidance/TaskCompleteSummary.tsx`

**实现要点**:
- 显示通过率、总数、失败数
- 失败模式快速预览（前 3 个）
- 下一步操作按钮

**验收标准**:
- [x] 数据展示正确
- [x] 失败模式提取准确

---

### Task 1.3.2: 创建下一步引导组件
**描述**: 基于任务结果推荐下一步操作

**文件清单**:
- `apps/web/src/components/guidance/NextStepGuide.tsx`

**实现要点**:
- 通过率 < 80%：推荐"查看失败案例"、"优化提示词"
- 通过率 >= 80%：推荐"导出报告"、"发布版本"
- 支持自定义推荐规则

**验收标准**:
- [x] 根据通过率显示不同建议
- [x] 按钮跳转正确

---

### Task 1.3.3: 集成到任务详情页
**描述**: 在任务详情页集成完成引导

**文件清单**:
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx`（修改）

**实现要点**:
- 任务完成后自动显示摘要
- 固定在页面顶部或作为弹窗
- 可收起/展开

**验收标准**:
- [x] 任务完成后自动显示
- [x] 不遮挡主要内容

---

### Task 1.3.4: 失败模式快速识别
**描述**: 自动识别并归类失败原因

**文件清单**:
- `apps/web/src/lib/failureAnalysis.ts`

**实现要点**:
```typescript
type FailurePattern = {
  type: 'format' | 'content' | 'keyword' | 'other'
  count: number
  examples: string[]
  suggestion: string
}

function analyzeFailures(results: TaskResult[]): FailurePattern[]
```

**验收标准**:
- [x] 正确识别格式错误
- [x] 正确识别内容问题
- [x] 提供改进建议

---

### Task 1.3.5: 任务完成通知
**描述**: 任务完成时的通知提醒

**文件清单**:
- `apps/web/src/components/guidance/TaskCompleteNotification.tsx`

**实现要点**:
- 使用 Ant Design notification
- 显示任务名称、通过率
- 点击跳转到任务详情
- 支持浏览器原生通知（可选）

**验收标准**:
- [x] 任务完成后自动弹出
- [x] 点击跳转正确
- [x] 多任务完成时不堆叠

---

## 开发日志

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2025-12-06 | Task 1.1.1 - 1.1.8 | 新用户引导向导全部完成 |
| 2025-12-06 | Task 1.2.1 - 1.2.6 | 上下文感知建议全部完成 |
| 2025-12-06 | Task 1.3.1 - 1.3.5 | 任务完成引导全部完成 |
| 2025-12-06 | 单元测试补充 | 新增 96 个测试用例，全部通过 |
| 2025-12-06 | taskFlow.test.ts 修复 | 修复 Redis Pub/Sub 异步订阅时序问题，4 个失败测试已通过 |

### 实现文件清单

**1.1 新用户引导向导**
- `apps/web/src/stores/onboardingStore.ts` - 引导状态管理
- `apps/web/src/components/onboarding/OnboardingModal.tsx` - 引导弹窗容器
- `apps/web/src/components/onboarding/OnboardingProgress.tsx` - 步骤进度指示器
- `apps/web/src/components/onboarding/StepModelConfig.tsx` - 步骤1：模型配置
- `apps/web/src/components/onboarding/StepPromptCreate.tsx` - 步骤2：创建提示词
- `apps/web/src/components/onboarding/StepQuickTest.tsx` - 步骤3：快速测试
- `apps/web/src/components/onboarding/OnboardingWrapper.tsx` - 引导包装组件
- `apps/web/src/components/onboarding/index.ts` - 导出索引
- `apps/web/src/hooks/useOnboarding.ts` - 引导逻辑 Hook
- `apps/web/src/app/(dashboard)/page.tsx` - 集成到工作台页面

**1.2 上下文感知建议**
- `apps/web/src/stores/guidanceStore.ts` - 提示状态管理
- `apps/web/src/lib/eventBus.ts` - 事件总线
- `apps/web/src/components/guidance/ContextualTip.tsx` - 上下文提示组件
- `apps/web/src/components/guidance/PromptSavedTip.tsx` - 提示词保存提示
- `apps/web/src/components/guidance/DatasetUploadedTip.tsx` - 数据集上传提示
- `apps/web/src/components/guidance/ModelConfiguredTip.tsx` - 模型配置提示
- `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx` - 集成提示词保存事件
- `apps/web/src/app/(dashboard)/datasets/page.tsx` - 集成数据集上传事件
- `apps/web/src/app/(dashboard)/models/page.tsx` - 集成模型配置提示
- `apps/web/src/components/model/AddProviderModal.tsx` - 集成模型配置事件

**1.3 任务完成引导**
- `apps/web/src/lib/failureAnalysis.ts` - 失败模式分析工具
- `apps/web/src/components/guidance/TaskCompleteSummary.tsx` - 任务完成摘要
- `apps/web/src/components/guidance/NextStepGuide.tsx` - 下一步引导
- `apps/web/src/components/guidance/TaskCompleteNotification.tsx` - 任务完成通知
- `apps/web/src/components/guidance/index.ts` - 导出索引
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx` - 集成任务完成引导
- `apps/web/src/app/(dashboard)/layout.tsx` - 集成全局任务完成通知

**测试文件清单**
- `apps/web/src/lib/__tests__/eventBus.test.ts` - 事件总线测试（8 个用例）
- `apps/web/src/lib/__tests__/failureAnalysis.test.ts` - 失败模式分析测试（13 个用例）
- `apps/web/src/stores/__tests__/onboardingStore.test.ts` - 引导状态管理测试（29 个用例）
- `apps/web/src/stores/__tests__/guidanceStore.test.ts` - 提示状态管理测试（23 个用例）
- `apps/web/src/components/__tests__/ContextualTip.test.tsx` - 上下文提示组件测试（11 个用例）
- `apps/web/src/components/__tests__/TaskCompleteSummary.test.tsx` - 任务完成摘要测试（12 个用例）
- `apps/web/src/__tests__/integration/taskFlow.test.ts` - 任务流程集成测试（修复异步时序问题）

**测试统计**
- Phase 1 新增测试：96 个用例，全部通过
- 修复既有测试：taskFlow.test.ts 4 个失败用例修复
- 总测试套件：976 个用例，970 通过，5 跳过，1 失败（预先存在的 API e2e 问题）
