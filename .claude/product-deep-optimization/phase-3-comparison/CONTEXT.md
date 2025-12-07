# Phase 3: 对比分析能力 - 上下文文档

## 阶段目标

帮助用户回答"哪个更好"这个核心问题，提供直观的版本对比和模型对比能力。

## 前置依赖

- Phase 1: 用户旅程优化（基础组件）
- Phase 2: 智能化能力（分析引擎）

## 核心问题

1. 用户改动提示词后不知道效果变好还是变差
2. 多个模型之间的表现对比不直观
3. 缺乏可视化的差异展示

## 功能范围

### 3.1 提示词版本对比
- 双栏展示两个版本的指标对比
- 提示词文本 diff 展示
- 效果变化分析（改进项/潜在风险）
- 发布/继续优化决策支持

### 3.2 模型对比分析
- 相同提示词下多模型并排对比
- 多维度指标对比（通过率、延迟、成本、格式准确率）
- 胜出指标高亮
- 使用场景建议

## 技术要点

- diff 算法：使用 diff-match-patch 库
- 图表：使用 Ant Design Charts
- 对比数据缓存
- 支持导出对比报告

## 涉及文件（预估）

```
apps/web/src/
├── components/
│   └── comparison/
│       ├── VersionComparePanel.tsx     # 版本对比面板
│       ├── VersionMetricsCard.tsx      # 版本指标卡片
│       ├── PromptDiffView.tsx          # 提示词 diff 视图
│       ├── EffectChangeAnalysis.tsx    # 效果变化分析
│       ├── ModelComparePanel.tsx       # 模型对比面板
│       ├── ModelCompareTable.tsx       # 模型对比表格
│       └── ModelRecommendation.tsx     # 模型推荐建议
├── lib/
│   └── comparison/
│       ├── diffGenerator.ts            # diff 生成
│       ├── metricsCalculator.ts        # 指标计算
│       └── effectAnalyzer.ts           # 效果分析
├── services/
│   └── comparisonService.ts            # 对比服务
└── app/
    └── (dashboard)/
        └── comparison/
            ├── versions/page.tsx       # 版本对比页
            └── models/page.tsx         # 模型对比页
```

## 验收标准

1. 版本对比清晰展示指标变化和变化方向
2. 提示词 diff 高亮增删改
3. 效果分析准确识别改进项和风险
4. 模型对比表格信息完整
5. 支持导出对比报告

## 预估分值提升

- 完成本阶段后：+8 分（65 → 73）
