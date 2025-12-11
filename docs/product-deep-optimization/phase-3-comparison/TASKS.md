# Phase 3: 对比分析能力 - 任务清单

## 任务总览

| 子阶段 | 任务数 | 预估复杂度 |
|--------|--------|------------|
| 3.1 提示词版本对比 | 8 | 中 |
| 3.2 模型对比分析 | 6 | 中 |

---

## 3.1 提示词版本对比

### Task 3.1.1: 创建 diff 生成器
**描述**: 生成两个提示词版本的文本差异

**文件清单**:
- `apps/web/src/lib/comparison/diffGenerator.ts`

**实现要点**:
```typescript
type DiffSegment = {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  lineNumber?: number
}

type DiffResult = {
  segments: DiffSegment[]
  stats: {
    additions: number
    deletions: number
    unchanged: number
  }
}

function generateDiff(
  oldText: string,
  newText: string
): DiffResult
```

**验收标准**:
- [ ] 正确识别新增内容
- [ ] 正确识别删除内容
- [ ] 统计变更行数

---

### Task 3.1.2: 创建版本指标计算器
**描述**: 计算版本的各项性能指标

**文件清单**:
- `apps/web/src/lib/comparison/metricsCalculator.ts`

**实现要点**:
```typescript
type VersionMetrics = {
  passRate: number
  avgLatency: number      // 秒
  avgTokens: number       // Token 消耗
  estimatedCost: number   // 美元
  formatAccuracy: number  // 格式准确率
  totalTests: number
}

type MetricsComparison = {
  old: VersionMetrics
  new: VersionMetrics
  changes: {
    passRate: { value: number; direction: 'up' | 'down' | 'same' }
    avgLatency: { value: number; direction: 'up' | 'down' | 'same' }
    avgTokens: { value: number; direction: 'up' | 'down' | 'same' }
    estimatedCost: { value: number; direction: 'up' | 'down' | 'same' }
  }
}

function calculateMetrics(taskId: string): Promise<VersionMetrics>
function compareMetrics(oldMetrics: VersionMetrics, newMetrics: VersionMetrics): MetricsComparison
```

**验收标准**:
- [ ] 指标计算准确
- [ ] 变化方向正确
- [ ] 变化百分比正确

---

### Task 3.1.3: 创建效果变化分析器
**描述**: 分析版本变化带来的效果影响

**文件清单**:
- `apps/web/src/lib/comparison/effectAnalyzer.ts`

**实现要点**:
```typescript
type EffectChange = {
  improvements: Array<{
    label: string
    description: string
    impact: 'high' | 'medium' | 'low'
  }>
  risks: Array<{
    label: string
    description: string
    severity: 'high' | 'medium' | 'low'
  }>
  recommendation: 'publish' | 'review' | 'rollback'
  recommendationReason: string
}

function analyzeEffect(
  oldVersion: PromptVersion,
  newVersion: PromptVersion,
  metricsComparison: MetricsComparison
): EffectChange
```

**验收标准**:
- [ ] 正确识别改进项
- [ ] 正确识别风险项
- [ ] 推荐结论合理

---

### Task 3.1.4: 创建版本指标卡片组件
**描述**: 展示单个版本的指标信息

**文件清单**:
- `apps/web/src/components/comparison/VersionMetricsCard.tsx`

**实现要点**:
- 显示版本号、创建时间
- 显示通过率、延迟、Token、成本
- 变化趋势指示（上升/下降箭头）
- 支持 hover 查看详情

**验收标准**:
- [ ] 指标展示完整
- [ ] 趋势指示正确
- [ ] 样式美观

---

### Task 3.1.5: 创建提示词 diff 视图组件
**描述**: 可视化展示提示词文本差异

**文件清单**:
- `apps/web/src/components/comparison/PromptDiffView.tsx`

**实现要点**:
- 左右分栏或上下分栏显示
- 新增内容绿色背景
- 删除内容红色背景
- 行号显示
- 支持折叠未变更部分

**验收标准**:
- [ ] diff 渲染正确
- [ ] 颜色区分清晰
- [ ] 大文本滚动流畅

---

### Task 3.1.6: 创建效果变化分析组件
**描述**: 展示效果变化和推荐建议

**文件清单**:
- `apps/web/src/components/comparison/EffectChangeAnalysis.tsx`

**实现要点**:
- 改进项列表（绿色勾选）
- 风险项列表（黄色警告）
- 推荐结论卡片
- 操作按钮（发布/继续优化）

**验收标准**:
- [ ] 列表清晰展示
- [ ] 推荐结论突出显示

---

### Task 3.1.7: 创建版本对比面板组件
**描述**: 整合所有对比功能的主面板

**文件清单**:
- `apps/web/src/components/comparison/VersionComparePanel.tsx`

**实现要点**:
- 顶部版本选择器（下拉选择两个版本）
- 指标对比区域
- Diff 展示区域
- 效果分析区域
- 支持交换左右版本

**验收标准**:
- [ ] 版本切换正常
- [ ] 各区域布局合理
- [ ] 加载状态处理

---

### Task 3.1.8: 创建版本对比页面
**描述**: 独立的版本对比页面

**文件清单**:
- `apps/web/src/app/(dashboard)/comparison/versions/page.tsx`

**实现要点**:
- URL 参数：?promptId=xxx&v1=1&v2=2
- 面包屑导航
- 集成 VersionComparePanel
- 支持从提示词详情页跳转

**验收标准**:
- [ ] 页面正常渲染
- [ ] URL 参数正确解析
- [ ] 返回导航正确

---

## 3.2 模型对比分析

### Task 3.2.1: 创建模型对比服务
**描述**: 获取多个模型在相同条件下的测试数据

**文件清单**:
- `apps/web/src/services/comparisonService.ts`

**实现要点**:
```typescript
type ModelComparisonData = {
  modelId: string
  modelName: string
  metrics: {
    passRate: number
    avgLatency: number
    avgCost: number
    formatAccuracy: number
    complexQuestionScore: number  // 复杂问题表现
  }
  sampleResults: Array<{
    input: string
    output: string
    passed: boolean
  }>
}

async function getModelComparison(
  promptId: string,
  datasetId: string,
  modelIds: string[]
): Promise<ModelComparisonData[]>
```

**验收标准**:
- [ ] 正确获取多模型数据
- [ ] 数据结构完整

---

### Task 3.2.2: 创建模型对比表格组件
**描述**: 表格形式展示多模型对比

**文件清单**:
- `apps/web/src/components/comparison/ModelCompareTable.tsx`

**实现要点**:
- 每列一个模型
- 每行一个指标
- 最优值高亮（绿色）
- 支持按指标排序
- 胜出次数统计

**验收标准**:
- [ ] 表格渲染正确
- [ ] 最优值高亮正确
- [ ] 排序功能正常

---

### Task 3.2.3: 创建模型推荐建议组件
**描述**: 基于对比结果给出模型使用建议

**文件清单**:
- `apps/web/src/components/comparison/ModelRecommendation.tsx`

**实现要点**:
```typescript
type ModelRecommendation = {
  scenario: string          // 使用场景
  recommendedModel: string  // 推荐模型
  reason: string            // 推荐原因
  tradeoff: string          // 需要权衡的点
}
```

- 简单问题推荐性价比模型
- 复杂问题推荐高质量模型
- 成本敏感推荐低成本模型

**验收标准**:
- [ ] 建议场景覆盖全面
- [ ] 推荐理由合理

---

### Task 3.2.4: 创建模型对比面板组件
**描述**: 整合模型对比功能的主面板

**文件清单**:
- `apps/web/src/components/comparison/ModelComparePanel.tsx`

**实现要点**:
- 提示词和数据集选择器
- 模型多选器（至少选 2 个）
- 对比表格
- 推荐建议区域
- 支持运行对比测试

**验收标准**:
- [ ] 选择器交互正常
- [ ] 对比结果正确显示

---

### Task 3.2.5: 创建模型对比页面
**描述**: 独立的模型对比页面

**文件清单**:
- `apps/web/src/app/(dashboard)/comparison/models/page.tsx`

**实现要点**:
- 步骤式引导（选择提示词 → 选择数据集 → 选择模型 → 查看结果）
- 支持保存对比配置
- 支持导出对比报告

**验收标准**:
- [ ] 步骤流程清晰
- [ ] 页面正常运作

---

### Task 3.2.6: 添加对比入口
**描述**: 在相关页面添加对比功能入口

**文件清单**:
- `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx`（修改）
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx`（修改）
- `apps/web/src/components/layout/Sidebar.tsx`（修改）

**实现要点**:
- 提示词详情页添加"版本对比"按钮
- 任务详情页添加"模型对比"入口
- 侧边栏添加"对比分析"菜单

**验收标准**:
- [ ] 入口位置合理
- [ ] 跳转参数正确

---

## 开发日志

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2025-12-06 | Task 3.1.1 - 3.1.8 | 完成提示词版本对比全部功能 |
| 2025-12-06 | Task 3.2.1 - 3.2.6 | 完成模型对比分析全部功能 |

### 完成的文件清单

**基础设施层 (lib/comparison/)**
- `diffGenerator.ts` - diff 生成器，基于 LCS 算法
- `metricsCalculator.ts` - 版本指标计算器
- `effectAnalyzer.ts` - 效果变化分析器
- `index.ts` - 模块导出

**服务层 (services/)**
- `comparisonService.ts` - 模型对比服务

**组件层 (components/comparison/)**
- `VersionMetricsCard.tsx` - 版本指标卡片
- `PromptDiffView.tsx` - 提示词 diff 视图
- `EffectChangeAnalysis.tsx` - 效果变化分析
- `VersionComparePanel.tsx` - 版本对比面板
- `ModelCompareTable.tsx` - 模型对比表格
- `ModelRecommendation.tsx` - 模型推荐建议
- `ModelComparePanel.tsx` - 模型对比面板
- `index.ts` - 组件导出

**API 层**
- `app/api/v1/prompts/[id]/versions/[vid]/metrics/route.ts` - 版本指标 API
- `app/api/v1/comparison/models/route.ts` - 模型对比 API

**页面层**
- `app/(dashboard)/comparison/versions/page.tsx` - 版本对比页
- `app/(dashboard)/comparison/models/page.tsx` - 模型对比页

**入口修改**
- `app/(dashboard)/layout.tsx` - 侧边栏添加对比分析菜单
- `app/(dashboard)/prompts/[id]/page.tsx` - 提示词详情页添加详细对比入口
- `app/(dashboard)/tasks/[id]/page.tsx` - 任务详情页添加模型对比入口
