# Phase 5: 专业深度 - 任务清单

## 任务总览

| 子阶段 | 任务数 | 预估复杂度 |
|--------|--------|------------|
| 5.1 测试结果深度分析 | 9 | 高 |
| 5.2 失败样本聚类 | 5 | 中 |
| 5.3 回归测试追踪 | 6 | 中 |

---

## 5.1 测试结果深度分析

### Task 5.1.1: 创建结果分析主面板
**描述**: 整合所有分析功能的主面板组件

**文件清单**:
- `apps/web/src/components/results/ResultsAnalysisPanel.tsx`

**实现要点**:
- 标签页结构：概览 / 失败分析 / 性能分析 / 成本分析 / 导出
- 顶部显示任务基本信息
- 支持刷新和时间范围选择
- 加载状态和错误处理

**验收标准**:
- [x] 标签页切换流畅
- [x] 布局响应式
- [x] 加载状态正确

---

### Task 5.1.2: 创建概览标签页
**描述**: 展示测试结果的总体概览

**文件清单**:
- `apps/web/src/components/results/OverviewTab.tsx`

**实现要点**:
- 统计卡片：总数、通过数、失败数、通过率
- 环形图：通过/失败占比
- 关键指标：平均延迟、总 Token、总成本
- 快速洞察：自动生成的摘要文字

**验收标准**:
- [x] 数据展示准确
- [x] 图表渲染正确

---

### Task 5.1.3: 创建失败分布图表
**描述**: 可视化展示失败原因分布

**文件清单**:
- `apps/web/src/components/results/FailureDistributionChart.tsx`

**实现要点**:
```typescript
type FailureDistribution = {
  category: string  // 失败类型
  count: number
  percentage: number
}
```

- 水平柱状图展示
- 显示百分比和数量
- 点击某类型可过滤样本
- 支持切换排序方式

**验收标准**:
- [x] 图表渲染正确
- [x] 交互正常

---

### Task 5.1.4: 创建维度分析器
**描述**: 按不同维度分组分析结果

**文件清单**:
- `apps/web/src/lib/results/dimensionAnalyzer.ts`

**实现要点**:
```typescript
type Dimension =
  | 'question_type'   // 问题类型
  | 'difficulty'      // 难度
  | 'length'          // 输入长度区间
  | 'evaluator'       // 评估器

type DimensionAnalysis = {
  dimension: Dimension
  groups: Array<{
    label: string
    total: number
    passed: number
    passRate: number
    trend: 'up' | 'down' | 'stable'
  }>
}

function analyzeDimension(
  results: TaskResult[],
  dimension: Dimension
): DimensionAnalysis
```

**验收标准**:
- [x] 分组统计准确
- [x] 支持多种维度

---

### Task 5.1.5: 创建维度分析表格
**描述**: 表格形式展示维度分析结果

**文件清单**:
- `apps/web/src/components/results/DimensionAnalysisTable.tsx`

**实现要点**:
- 维度选择器（下拉切换）
- 表格列：类型、总数、通过、失败、通过率、趋势
- 通过率低的行高亮
- 点击行查看对应样本

**验收标准**:
- [x] 表格渲染正确
- [x] 维度切换正常
- [x] 样本过滤正常

---

### Task 5.1.6: 创建失败分析标签页
**描述**: 整合失败相关的所有分析

**文件清单**:
- `apps/web/src/components/results/FailureAnalysisTab.tsx`

**实现要点**:
- 失败分布图表
- 维度分析表格
- 失败样本列表（带分页）
- 快速过滤器

**验收标准**:
- [x] 组件正确集成
- [x] 过滤联动正常

---

### Task 5.1.7: 创建性能分析标签页
**描述**: 展示性能相关指标分析

**文件清单**:
- `apps/web/src/components/results/PerformanceTab.tsx`

**实现要点**:
- 延迟分布直方图
- 延迟趋势折线图（按时间/批次）
- P50/P90/P99 延迟统计
- 慢请求列表（延迟 > P90）

**验收标准**:
- [x] 延迟统计准确
- [x] 图表渲染正确

---

### Task 5.1.8: 创建成本分析标签页
**描述**: 展示成本相关指标分析

**文件清单**:
- `apps/web/src/components/results/CostAnalysisTab.tsx`

**实现要点**:
- 总成本和平均成本
- Token 消耗分布（输入/输出）
- 成本趋势图
- 成本优化建议

**验收标准**:
- [x] 成本计算准确
- [x] 建议合理

---

### Task 5.1.9: 创建失败样本列表
**描述**: 可分页查看失败样本详情

**文件清单**:
- `apps/web/src/components/results/FailureSampleList.tsx`

**实现要点**:
- 分页列表（每页 10 条）
- 显示：输入、期望输出、实际输出、评估器结果
- 展开/收起详情
- 支持搜索和过滤
- 支持复制到剪贴板

**验收标准**:
- [x] 分页正常
- [x] 详情展示完整
- [x] 复制功能正常

---

## 5.2 失败样本聚类

### Task 5.2.1: 创建聚类算法实现
**描述**: 基于文本相似度的失败样本聚类

**文件清单**:
- `apps/web/src/lib/clustering/hierarchicalClustering.ts`

**实现要点**:
```typescript
type ClusterConfig = {
  similarityThreshold: number  // 相似度阈值，默认 0.7
  minClusterSize: number       // 最小聚类大小，默认 2
  maxClusters: number          // 最大聚类数，默认 10
}

type Cluster = {
  id: string
  label: string                // 自动生成的标签
  samples: FailedSample[]
  centroid: FailedSample       // 聚类中心（典型样本）
  commonFeatures: string[]     // 共同特征
  suggestedFix: string         // 建议修复方案
}

function clusterSamples(
  samples: FailedSample[],
  config?: ClusterConfig
): Cluster[]
```

**验收标准**:
- [x] 聚类结果合理
- [x] 性能：100 样本 < 2s

---

### Task 5.2.2: 创建聚类标签生成器
**描述**: 自动为聚类生成有意义的标签

**文件清单**:
- `apps/web/src/lib/clustering/labelGenerator.ts`

**实现要点**:
```typescript
function generateClusterLabel(
  samples: FailedSample[],
  commonFeatures: string[]
): string

// 示例输出：
// "JSON格式错误 - 缺少闭合括号"
// "回答过短 - 技术问题类"
// "关键词缺失 - 退款政策相关"
```

**验收标准**:
- [x] 标签描述准确
- [x] 标签简洁易懂

---

### Task 5.2.3: 创建聚类列表组件
**描述**: 展示所有聚类的列表

**文件清单**:
- `apps/web/src/components/clustering/ClusterList.tsx`

**实现要点**:
- 按样本数量排序
- 显示聚类标签和样本数
- 点击展开查看详情
- 支持一键应用修复建议

**验收标准**:
- [x] 列表正确显示
- [x] 交互流畅

---

### Task 5.2.4: 创建聚类卡片组件
**描述**: 单个聚类的详细展示

**文件清单**:
- `apps/web/src/components/clustering/ClusterCard.tsx`

**实现要点**:
- 显示聚类标签和统计
- 典型样本展示
- 共同特征标签
- 修复建议和操作按钮
- 展开查看所有样本

**验收标准**:
- [x] 信息展示完整
- [x] 样式美观

---

### Task 5.2.5: 创建样本查看器
**描述**: 查看单个样本的详细对比

**文件清单**:
- `apps/web/src/components/clustering/SampleViewer.tsx`

**实现要点**:
- 左右分栏：期望输出 vs 实际输出
- 差异高亮显示
- 评估器详细结果
- 原始 API 响应（可选展开）

**验收标准**:
- [x] 对比展示清晰
- [x] 差异高亮正确

---

## 5.3 回归测试追踪

### Task 5.3.1: 创建版本指标快照服务
**描述**: 存储每个版本的测试指标快照

**文件清单**:
- `apps/web/src/services/versionSnapshotService.ts`
- `apps/web/prisma/schema.prisma`（可能需要新增模型）

**实现要点**:
```typescript
type VersionSnapshot = {
  promptId: string
  version: number
  taskId: string
  createdAt: Date
  metrics: {
    passRate: number
    avgLatency: number
    avgCost: number
    totalTests: number
  }
  changeDescription: string  // 版本变更描述
}

async function saveSnapshot(snapshot: VersionSnapshot): Promise<void>
async function getSnapshots(promptId: string): Promise<VersionSnapshot[]>
```

**验收标准**:
- [x] 快照保存正常
- [x] 历史数据可查询

---

### Task 5.3.2: 创建版本趋势图组件
**描述**: 展示版本通过率变化趋势

**文件清单**:
- `apps/web/src/components/regression/VersionTrendChart.tsx`

**实现要点**:
- 折线图展示通过率趋势
- X 轴：版本号或时间
- Y 轴：通过率（0-100%）
- 数据点可点击查看详情
- 支持缩放和平移

**验收标准**:
- [x] 图表渲染正确
- [x] 交互正常

---

### Task 5.3.3: 创建版本时间线组件
**描述**: 展示版本变更的时间线

**文件清单**:
- `apps/web/src/components/regression/VersionTimeline.tsx`

**实现要点**:
- 垂直时间线布局
- 显示版本号、时间、变更描述
- 关键指标变化
- 当前版本高亮

**验收标准**:
- [x] 时间线渲染正确
- [x] 变更信息完整

---

### Task 5.3.4: 创建回归检测器
**描述**: 自动检测版本间的回归问题

**文件清单**:
- `apps/web/src/lib/results/regressionDetector.ts`

**实现要点**:
```typescript
type Regression = {
  type: 'passRate_drop' | 'latency_increase' | 'cost_increase'
  severity: 'high' | 'medium' | 'low'
  fromVersion: number
  toVersion: number
  oldValue: number
  newValue: number
  affectedTests: string[]  // 受影响的测试用例
}

function detectRegressions(
  snapshots: VersionSnapshot[]
): Regression[]
```

**验收标准**:
- [x] 正确检测通过率下降
- [x] 正确检测延迟增加
- [x] 识别受影响测试

---

### Task 5.3.5: 创建回归追踪面板
**描述**: 整合回归追踪功能的主面板

**文件清单**:
- `apps/web/src/components/regression/RegressionTracker.tsx`

**实现要点**:
- 提示词选择器
- 版本趋势图
- 版本时间线
- 回归问题列表
- 快捷操作（回滚、对比）

**验收标准**:
- [x] 组件正确集成
- [x] 回归问题显示正确

---

### Task 5.3.6: 集成到提示词详情页
**描述**: 在提示词详情页添加回归追踪入口

**文件清单**:
- `apps/web/src/app/(dashboard)/prompts/[id]/page.tsx`（修改）

**实现要点**:
- 添加"质量追踪"标签页
- 显示简化版趋势图
- "查看完整报告"链接
- 回归告警提示

**验收标准**:
- [x] 入口位置合理
- [x] 简化版信息足够
- [x] 跳转正确

---

## 开发日志

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2025-12-06 | 5.1.1-5.1.9 结果深度分析 | 创建 ResultsAnalysisPanel、OverviewTab、FailureDistributionChart、DimensionAnalysisTable、FailureAnalysisTab、PerformanceTab、CostAnalysisTab、FailureSampleList |
| 2025-12-06 | 5.2.1-5.2.5 失败样本聚类 | 复用已有 clusterAnalysis.ts，创建 ClusterList、ClusterCard、SampleViewer |
| 2025-12-06 | 5.3.1-5.3.6 回归测试追踪 | 创建 regressionDetector.ts、VersionTrendChart、VersionTimeline、RegressionTracker，集成到提示词详情页 |
| 2025-12-07 | 单元测试与组件测试 | 共 65 个测试全部通过：dimensionAnalyzer.test.ts (13)、regressionDetector.test.ts (21)、ResultsAnalysisPanel.test.tsx (14)、ClusterList.test.tsx (6)、RegressionTracker.test.tsx (11) |
| 2025-12-07 | TypeScript 类型修复 | 修复 ClusterList.tsx (centroid/commonFeatures 属性映射)、PromptDiffView.tsx (foldCount 类型检查)、clusterAnalysis.ts (ClusterSummary.avgSimilarity) |
