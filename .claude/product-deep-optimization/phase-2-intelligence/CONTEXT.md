# Phase 2: 智能化能力 - 上下文文档

## 阶段目标

让 AI 帮助用户使用 AI 测试工具，提供智能分析、推荐和异常检测能力。

## 前置依赖

- Phase 1: 用户旅程优化（事件总线、引导组件）

## 核心问题

1. 用户需要手动分析失败原因
2. 评估器选择靠经验，没有智能推荐
3. 异常检测依赖固定阈值，不够智能

## 功能范围

### 2.1 智能分析引擎
- 自动识别失败模式（格式、内容、关键词）
- 失败样本聚类分析
- 自动生成优化建议
- 一键应用建议

### 2.2 智能评估器推荐
- 分析提示词和数据集特征
- 推荐最匹配的评估器组合
- 显示匹配度百分比
- 支持手动覆盖

### 2.3 异常检测与告警
- 基于历史数据的异常检测
- 趋势偏离告警
- 可能原因分析
- 快捷操作（回滚/对比）

## 技术要点

- 失败模式识别：规则匹配 + 文本相似度
- 评估器推荐：提示词关键词匹配 + 数据集结构分析
- 异常检测：移动平均 + 标准差
- 后端 API 支持批量分析

## 涉及文件（预估）

```
apps/web/src/
├── components/
│   └── analysis/
│       ├── SmartAnalysisPanel.tsx      # 智能分析面板
│       ├── FailurePatternCard.tsx      # 失败模式卡片
│       ├── OptimizationSuggestion.tsx  # 优化建议组件
│       └── EvaluatorRecommend.tsx      # 评估器推荐组件
│   └── alerts/
│       ├── AnomalyAlert.tsx            # 异常告警组件
│       └── TrendDeviationCard.tsx      # 趋势偏离卡片
├── lib/
│   ├── analysis/
│   │   ├── failurePatternDetector.ts   # 失败模式检测
│   │   ├── clusterAnalysis.ts          # 聚类分析
│   │   └── suggestionGenerator.ts      # 建议生成
│   └── recommendation/
│       └── evaluatorMatcher.ts         # 评估器匹配
├── services/
│   └── analysisService.ts              # 分析服务API
└── app/api/
    └── analysis/
        ├── patterns/route.ts           # 失败模式API
        └── suggestions/route.ts        # 优化建议API
```

## 验收标准

1. 任务完成后自动显示失败模式分析
2. 失败样本正确聚类，相似问题归为一组
3. 优化建议具体可操作
4. 评估器推荐匹配度 > 80%
5. 异常检测准确率 > 90%

## 预估分值提升

- 完成本阶段后：+15 分（50 → 65）
