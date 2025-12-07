# Phase 2: 智能化能力 - 任务清单

## 任务总览

| 子阶段 | 任务数 | 预估复杂度 | 状态 |
|--------|--------|------------|------|
| 2.1 智能分析引擎 | 10 | 高 | ✅ 完成 |
| 2.2 智能评估器推荐 | 5 | 中 | ✅ 完成 |
| 2.3 异常检测与告警 | 6 | 高 | ✅ 完成 |

---

## 2.1 智能分析引擎

### Task 2.1.1: 创建失败模式检测器
**描述**: 自动识别测试失败的模式类型

**文件清单**:
- `apps/web/src/lib/analysis/failurePatternDetector.ts`

**实现要点**:
```typescript
type FailureType =
  | 'format_error'      // 格式错误（JSON/XML等）
  | 'content_missing'   // 内容缺失
  | 'keyword_missing'   // 关键词缺失
  | 'length_violation'  // 长度不符
  | 'semantic_mismatch' // 语义不匹配
  | 'other'

type FailurePattern = {
  type: FailureType
  count: number
  percentage: number
  examples: Array<{
    input: string
    expected: string
    actual: string
  }>
  commonFeatures: string[]
}

function detectPatterns(results: FailedResult[]): FailurePattern[]
```

**验收标准**:
- [x] 正确识别 JSON 格式错误
- [x] 正确识别内容缺失
- [x] 正确识别关键词缺失
- [x] 返回每种模式的占比

---

### Task 2.1.2: 实现文本相似度计算
**描述**: 计算失败样本之间的相似度用于聚类

**文件清单**:
- `apps/web/src/lib/analysis/textSimilarity.ts`

**实现要点**:
- 实现 Jaccard 相似度
- 实现编辑距离相似度
- 支持中英文分词
- 缓存计算结果

**验收标准**:
- [x] 相似度计算准确
- [x] 性能：100 条样本 < 1s

---

### Task 2.1.3: 实现失败样本聚类
**描述**: 将相似的失败样本归为一组

**文件清单**:
- `apps/web/src/lib/analysis/clusterAnalysis.ts`

**实现要点**:
```typescript
type Cluster = {
  id: string
  label: string           // 自动生成的聚类标签
  samples: FailedResult[]
  commonPattern: string   // 共同特征描述
  representativeSample: FailedResult  // 典型样本
}

function clusterFailures(
  results: FailedResult[],
  threshold: number = 0.7
): Cluster[]
```

**验收标准**:
- [x] 相似样本正确归类
- [x] 自动生成有意义的聚类标签
- [x] 识别典型样本

---

### Task 2.1.4: 创建优化建议生成器
**描述**: 基于失败模式生成具体优化建议

**文件清单**:
- `apps/web/src/lib/analysis/suggestionGenerator.ts`

**实现要点**:
```typescript
type Suggestion = {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: {
    type: 'add_constraint' | 'add_example' | 'modify_instruction'
    content: string
    position?: 'start' | 'end' | 'replace'
  }
  estimatedImpact: string  // 如 "预计可将通过率提升 10%"
}

function generateSuggestions(
  patterns: FailurePattern[],
  prompt: Prompt
): Suggestion[]
```

**验收标准**:
- [x] 格式错误 → 建议添加格式约束
- [x] 内容缺失 → 建议补充领域知识
- [x] 关键词缺失 → 建议添加关键词要求
- [x] 建议具体可操作

---

### Task 2.1.5: 创建智能分析面板组件
**描述**: 展示分析结果的主面板

**文件清单**:
- `apps/web/src/components/analysis/SmartAnalysisPanel.tsx`

**实现要点**:
- 标签页：概览 / 失败分析 / 优化建议
- 支持折叠/展开
- 加载状态显示
- 空状态处理

**验收标准**:
- [x] 布局清晰美观
- [x] 标签页切换流畅
- [x] 响应式适配

---

### Task 2.1.6: 创建失败模式卡片组件
**描述**: 单个失败模式的展示卡片

**文件清单**:
- `apps/web/src/components/analysis/FailurePatternCard.tsx`

**实现要点**:
- 显示模式类型图标
- 显示数量和占比
- 可展开查看示例
- 显示共同特征

**验收标准**:
- [x] 信息展示完整
- [x] 展开/收起动画流畅

---

### Task 2.1.7: 创建优化建议组件
**描述**: 优化建议的展示和应用组件

**文件清单**:
- `apps/web/src/components/analysis/OptimizationSuggestion.tsx`

**实现要点**:
- 显示建议内容和预估影响
- "应用建议"按钮
- "忽略"按钮
- 应用后显示 diff 预览

**验收标准**:
- [x] 建议内容清晰
- [x] 应用按钮正常工作
- [x] diff 预览正确

---

### Task 2.1.8: 创建分析 API - 失败模式
**描述**: 后端失败模式分析 API

**文件清单**:
- `apps/web/src/app/api/analysis/patterns/route.ts`

**实现要点**:
```typescript
// POST /api/analysis/patterns
// Body: { taskId: string }
// Response: { patterns: FailurePattern[] }
```

**验收标准**:
- [x] API 正常返回
- [x] 大数据量性能可接受（< 5s）

---

### Task 2.1.9: 创建分析 API - 优化建议
**描述**: 后端优化建议生成 API

**文件清单**:
- `apps/web/src/app/api/analysis/suggestions/route.ts`

**实现要点**:
```typescript
// POST /api/analysis/suggestions
// Body: { taskId: string, promptId: string }
// Response: { suggestions: Suggestion[] }
```

**验收标准**:
- [x] API 正常返回
- [x] 建议与失败模式对应

---

### Task 2.1.10: 集成到任务详情页
**描述**: 在任务详情页集成智能分析面板

**文件清单**:
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx`（修改）

**实现要点**:
- 任务完成后显示分析入口
- 分析结果缓存
- 支持重新分析

**验收标准**:
- [x] 入口位置合理
- [x] 加载状态正确
- [x] 缓存生效

---

## 2.2 智能评估器推荐

### Task 2.2.1: 创建提示词特征提取器
**描述**: 从提示词中提取用于推荐的特征

**文件清单**:
- `apps/web/src/lib/recommendation/promptFeatureExtractor.ts`

**实现要点**:
```typescript
type PromptFeatures = {
  hasJsonOutput: boolean       // 是否要求 JSON 输出
  hasKeywordRequirement: boolean  // 是否有关键词要求
  hasLengthConstraint: boolean   // 是否有长度约束
  hasFormatExample: boolean      // 是否有格式示例
  taskType: 'classification' | 'generation' | 'extraction' | 'qa' | 'other'
}

function extractFeatures(prompt: string): PromptFeatures
```

**验收标准**:
- [x] 正确识别 JSON 输出要求
- [x] 正确识别任务类型
- [x] 正确识别约束条件

---

### Task 2.2.2: 创建数据集特征提取器
**描述**: 从数据集中提取用于推荐的特征

**文件清单**:
- `apps/web/src/lib/recommendation/datasetFeatureExtractor.ts`

**实现要点**:
```typescript
type DatasetFeatures = {
  hasExpectedOutput: boolean    // 是否有期望输出
  hasKeywords: boolean          // 是否有关键词字段
  hasScore: boolean             // 是否有评分字段
  avgInputLength: number        // 平均输入长度
  avgOutputLength: number       // 平均输出长度
}

function extractFeatures(dataset: Dataset): DatasetFeatures
```

**验收标准**:
- [x] 正确识别数据集结构
- [x] 统计数据准确

---

### Task 2.2.3: 创建评估器匹配引擎
**描述**: 根据特征推荐最佳评估器组合

**文件清单**:
- `apps/web/src/lib/recommendation/evaluatorMatcher.ts`

**实现要点**:
```typescript
type EvaluatorRecommendation = {
  evaluatorId: string
  evaluatorName: string
  matchScore: number  // 0-100
  reason: string      // 推荐原因
  required: boolean   // 是否必选
}

function matchEvaluators(
  promptFeatures: PromptFeatures,
  datasetFeatures: DatasetFeatures
): EvaluatorRecommendation[]
```

**验收标准**:
- [x] JSON 输出 → 推荐 JSON Schema 校验
- [x] 有期望输出 → 推荐相似度匹配
- [x] 有关键词 → 推荐关键词包含
- [x] 匹配度计算合理

---

### Task 2.2.4: 创建评估器推荐组件
**描述**: 评估器推荐的 UI 组件

**文件清单**:
- `apps/web/src/components/analysis/EvaluatorRecommend.tsx`

**实现要点**:
- 显示推荐组合和匹配度
- 推荐原因说明
- 勾选/取消勾选
- "使用推荐" / "手动选择"按钮

**验收标准**:
- [x] 推荐结果清晰展示
- [x] 交互流畅

---

### Task 2.2.5: 集成到任务创建页
**描述**: 在创建任务时显示评估器推荐

**文件清单**:
- `apps/web/src/app/(dashboard)/tasks/new/page.tsx`（修改）

**实现要点**:
- 选择提示词和数据集后自动推荐
- 推荐结果可直接应用
- 不影响手动选择

**验收标准**:
- [x] 自动触发推荐
- [x] 推荐结果可一键应用
- [x] 手动选择优先级高于推荐

---

## 2.3 异常检测与告警

### Task 2.3.1: 创建历史数据统计服务
**描述**: 获取提示词/模型的历史表现数据

**文件清单**:
- `apps/web/src/services/historyStatsService.ts`

**实现要点**:
```typescript
type HistoryStats = {
  promptId: string
  modelId: string
  period: '7d' | '30d'
  avgPassRate: number
  stdDeviation: number
  dataPoints: Array<{
    date: string
    passRate: number
    taskCount: number
  }>
}

function getHistoryStats(
  promptId: string,
  modelId: string,
  period: '7d' | '30d'
): Promise<HistoryStats>
```

**验收标准**:
- [x] 正确计算平均值和标准差
- [x] 数据点按时间排序

---

### Task 2.3.2: 创建异常检测算法
**描述**: 基于统计的异常检测

**文件清单**:
- `apps/web/src/lib/analysis/anomalyDetector.ts`

**实现要点**:
```typescript
type Anomaly = {
  type: 'sudden_drop' | 'trend_deviation' | 'unusual_pattern'
  severity: 'high' | 'medium' | 'low'
  currentValue: number
  expectedRange: { min: number; max: number }
  deviation: number  // 偏离程度
  possibleCauses: string[]
}

function detectAnomaly(
  currentValue: number,
  historyStats: HistoryStats
): Anomaly | null
```

**验收标准**:
- [x] 突降检测（下降 > 2 个标准差）
- [x] 趋势偏离检测
- [x] 返回可能原因

---

### Task 2.3.3: 创建异常原因分析器
**描述**: 分析异常的可能原因

**文件清单**:
- `apps/web/src/lib/analysis/anomalyCauseAnalyzer.ts`

**实现要点**:
```typescript
type PossibleCause = {
  cause: string
  likelihood: 'high' | 'medium' | 'low'
  evidence: string
  action: {
    label: string
    href: string
  }
}

async function analyzeCauses(
  anomaly: Anomaly,
  context: {
    promptId: string
    modelId: string
    taskId: string
  }
): Promise<PossibleCause[]>
```

**分析逻辑**:
- 检查提示词最近是否有修改
- 检查模型配置是否变更
- 检查数据集是否有新增测试用例
- 检查同时间段其他模型表现

**验收标准**:
- [x] 正确识别提示词变更
- [x] 正确识别模型配置变更
- [x] 提供对应的快捷操作

---

### Task 2.3.4: 创建异常告警组件
**描述**: 异常告警的 UI 展示

**文件清单**:
- `apps/web/src/components/alerts/AnomalyAlert.tsx`

**实现要点**:
- 醒目的告警样式（红色/橙色边框）
- 显示异常类型和严重程度
- 显示当前值 vs 预期范围
- 可能原因列表
- 快捷操作按钮

**验收标准**:
- [x] 告警样式醒目
- [x] 信息展示完整
- [x] 快捷操作可用

---

### Task 2.3.5: 创建趋势偏离卡片
**描述**: 展示历史趋势和当前偏离

**文件清单**:
- `apps/web/src/components/alerts/TrendDeviationCard.tsx`

**实现要点**:
- 迷你折线图展示历史趋势
- 当前值标记
- 预期范围阴影区域
- 偏离程度指示

**验收标准**:
- [x] 图表正确渲染
- [x] 偏离可视化清晰

---

### Task 2.3.6: 集成到任务详情和监控中心
**描述**: 在相关页面显示异常告警

**文件清单**:
- `apps/web/src/app/(dashboard)/tasks/[id]/page.tsx`（修改）
- `apps/web/src/app/(dashboard)/monitoring/page.tsx`（修改）

**实现要点**:
- 任务完成后自动检测异常
- 监控中心显示所有异常
- 支持告警确认/忽略

**验收标准**:
- [x] 异常自动检测
- [x] 告警正确显示
- [x] 确认/忽略功能正常

---

## 开发日志

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2024-12-06 | Task 2.1.1-2.1.10 | 智能分析引擎完成：失败模式检测、文本相似度、聚类分析、建议生成、UI组件、API |
| 2024-12-06 | Task 2.2.1-2.2.5 | 智能评估器推荐完成：提示词特征提取、数据集特征提取、评估器匹配、推荐组件、集成 |
| 2024-12-06 | Task 2.3.1 | 历史数据统计服务：historyStats.ts + API routes + hooks |
| 2024-12-06 | Task 2.3.2 | 异常检测算法：anomalyDetector.ts (突降/趋势偏离/持续低迷/绝对低值检测) |
| 2024-12-06 | Task 2.3.3 | 异常原因分析器：anomalyCauseAnalyzer.ts |
| 2024-12-06 | Task 2.3.4 | 异常告警组件：AnomalyAlert.tsx + AnomalyAlertList + AnomalyHint |
| 2024-12-06 | Task 2.3.5 | 趋势偏离卡片：TrendDeviationCard.tsx (含迷你折线图) |
| 2024-12-06 | Task 2.3.6 | 集成完成：任务详情页异常提示 + 监控中心异常检测面板 |
| 2024-12-06 | 测试 | 单元测试 anomalyDetector.test.ts (12 tests) + 集成测试 historyStatsFlow.test.ts (19 tests) |
