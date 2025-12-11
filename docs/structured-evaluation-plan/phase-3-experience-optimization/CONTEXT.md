# Phase 3: 体验优化 + 生态完善 - 上下文

> 预计工期：2-3 周（13 工作日）
> 后端：9d | 前端：4d
> 前置依赖：Phase 1、Phase 2 完成

## 目标概述

本阶段的核心目标是：
1. 提升**易用性**，降低用户使用门槛
2. 完善**周边功能**，形成完整的生态闭环
3. 实现**高级分析能力**，支持字段级回归检测

## 核心功能 1：易用性优化

### Schema 模板库

提供常用场景的预置模板，用户可一键使用：

| 模板 | 场景 | 输入变量 | 输出字段 |
|------|------|---------|---------|
| 智能客服意图识别 | 客服场景 | 设备、问题、历史 | 分类、提取、检索 |
| 文档摘要生成 | 文档分析 | 文档内容、长度要求 | 摘要、关键词 |
| 情感分析 | 文本分析 | 评论内容 | 情感、置信度 |
| 代码审查 | 代码质量 | 代码片段、语言 | 问题、建议、评分 |
| 实体抽取 | NLP | 文本内容 | 实体列表、类型 |

**实现方式**：
- 模板存储在数据库或 JSON 文件
- 模板包含完整的 InputSchema + OutputSchema
- 支持一键创建

### 从输出推断 Schema

用户粘贴一个样本输出，系统自动推断输出结构：

```json
// 用户粘贴的样本
{
  "thinking": "分析用户问题...",
  "category": "bluetooth",
  "confidence": 0.95,
  "entities": ["iPhone", "耳机"]
}

// 自动推断的 OutputSchema
{
  "fields": [
    { "name": "思考过程", "key": "thinking", "type": "string" },
    { "name": "分类", "key": "category", "type": "string" },
    { "name": "置信度", "key": "confidence", "type": "number" },
    { "name": "实体", "key": "entities", "type": "array" }
  ]
}
```

**推断规则**：
- 根据值类型推断字段类型
- 字符串数组 → array
- 数字 → number
- 布尔 → boolean
- key 保持不变，name 可由 AI 补充

### 快速测试（结构化）

提示词详情页的"快速测试"功能支持结构化输入输出：

**输入表单**：
- 根据 InputSchema 动态生成表单
- 支持各种类型输入
- 数组类型支持添加/删除元素

**输出展示**：
- 显示解析后的字段值
- 按字段展示（非原始 JSON）
- 支持查看原始输出

### AI 助手多轮对话

支持用户对 AI 生成的 Schema 进行追问和调整：

```
用户: 生成智能客服的 Schema
AI: [生成 Schema]

用户: 帮我添加一个"紧急程度"字段，类型是枚举（高/中/低）
AI: [更新 Schema，添加新字段]

用户: 把"问题分类"设为关键字段
AI: [更新 Schema，修改字段配置]
```

## 核心功能 2：导出与报告

### 结果导出增强

导出功能支持字段级评估结果：

**Excel 结构**：

| Sheet | 内容 |
|-------|------|
| 结果概览 | 行号、输入摘要、输出状态、总体通过、总体得分、耗时 |
| 字段级评估 | 行号、字段名、实际值、期望值、评估器、通过、得分、原因 |
| 聚合详情 | 行号、聚合模式、关键字段通过、加权得分、最终结果 |
| 完整数据 | 所有输入字段、所有输出字段、所有评估结果 |

**API 扩展**：
```typescript
// GET /api/v1/tasks/:id/results/export
{
  "format": "xlsx",
  "includeFieldEvaluations": true,   // 新增
  "includeAggregation": true         // 新增
}
```

### 字段级回归检测

检测特定字段通过率下降，帮助发现模型退化：

**检测逻辑**：
1. 对比同一提示词的两次任务
2. 按字段计算通过率变化
3. 检测显著下降的字段

**告警规则**：
- 关键字段通过率下降 > 5%
- 普通字段通过率下降 > 10%

**API 设计**：
```typescript
// POST /api/v1/tasks/compare
{
  "baseTaskId": "task-xxx",      // 基准任务
  "compareTaskId": "task-yyy",   // 对比任务
  "threshold": 0.05              // 变化阈值
}

// 响应
{
  "regressions": [
    {
      "fieldKey": "problem_type",
      "fieldName": "问题分类",
      "basePassRate": 0.95,
      "comparePassRate": 0.88,
      "change": -0.07,
      "isRegression": true
    }
  ]
}
```

### 监控告警扩展

支持字段级指标监控：

**新增告警规则类型**：
- 字段通过率低于阈值
- 字段平均分低于阈值
- 字段回归检测

**示例规则**：
```json
{
  "type": "field_pass_rate",
  "fieldKey": "problem_type",
  "threshold": 0.9,
  "condition": "lt"
}
```

## UI/UX 设计

### Schema 模板库页面

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Schema 模板库                                              [搜索]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 客服场景 ──────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │   │
│  │  │ 智能客服意图   │  │ 工单分类       │  │ 满意度预测     │         │   │
│  │  │ 识别           │  │                │  │                │         │   │
│  │  │ 4 输入 · 5 输出│  │ 2 输入 · 3 输出│  │ 3 输入 · 2 输出│         │   │
│  │  │ [使用模板]     │  │ [使用模板]     │  │ [使用模板]     │         │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘         │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 文档分析 ──────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌────────────────┐  ┌────────────────┐                              │   │
│  │  │ 文档摘要生成   │  │ 关键信息提取   │                              │   │
│  │  │ 3 输入 · 4 输出│  │ 2 输入 · 5 输出│                              │   │
│  │  │ [使用模板]     │  │ [使用模板]     │                              │   │
│  │  └────────────────┘  └────────────────┘                              │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 从输出推断 Schema 弹窗

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  从样本输出推断结构                                               [关闭]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  粘贴一个样本 JSON 输出：                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                      │ │
│  │   "thinking": "分析用户问题...",                                       │ │
│  │   "category": "bluetooth",                                             │ │
│  │   "confidence": 0.95                                                   │ │
│  │ }                                                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                        [推断结构 →]         │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  推断结果：                                                                 │
│  ┌──────────────┬──────────┬──────────┬────────────────────────────────┐   │
│  │ 字段名       │ Key      │ 类型     │ 操作                           │   │
│  ├──────────────┼──────────┼──────────┼────────────────────────────────┤   │
│  │ thinking     │ thinking │ string   │ [编辑名称]                     │   │
│  │ category     │ category │ string   │ [编辑名称] [改为 enum]         │   │
│  │ confidence   │ confidence│ number  │ [编辑名称]                     │   │
│  └──────────────┴──────────┴──────────┴────────────────────────────────┘   │
│                                                                             │
│                                                [创建 OutputSchema →]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 快速测试（结构化）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  快速测试                                                          [关闭]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 选择模型 ────────────────────────────────────────────────────────────┐ │
│  │  [GPT-4o                                                          ▼]  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ 输入变量 ────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  当前设备 (string):                                                    │ │
│  │  [iPhone 15 Pro_________________________________________________]     │ │
│  │                                                                        │ │
│  │  所有设备 (array):                                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ ["iPhone 15 Pro", "iPad Air"]                                   │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │  [+ 添加元素]                                                          │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                              [运行测试]     │
│                                                                             │
│  ┌─ 测试结果 ────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  状态: ✅ 成功    耗时: 1.2s                                          │ │
│  │                                                                        │ │
│  │  ┌─ 解析后的输出字段 ────────────────────────────────────────────────┐│ │
│  │  │  problem_type: bluetooth                                          ││ │
│  │  │  device_change: false                                             ││ │
│  │  │  get_device: iPhone 15 Pro                                        ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API 设计

### 模板库 API

```typescript
// GET /api/v1/schemas/templates
// 获取模板列表
{
  "templates": [
    {
      "id": "tpl-customer-service",
      "name": "智能客服意图识别",
      "category": "客服场景",
      "description": "...",
      "inputVariables": 4,
      "outputFields": 5
    }
  ]
}

// POST /api/v1/schemas/templates/:id/use
// 使用模板创建 Schema
{
  "inputSchemaId": "input-xxx",
  "outputSchemaId": "output-xxx"
}
```

### 推断 API

```typescript
// POST /api/v1/schemas/infer-from-output
// 从样本输出推断结构
{
  "sampleOutput": "{ \"category\": \"bluetooth\", \"confidence\": 0.95 }"
}

// 响应
{
  "fields": [
    { "key": "category", "type": "string", "suggestedName": "分类" },
    { "key": "confidence", "type": "number", "suggestedName": "置信度" }
  ]
}
```

### 快速测试 API（结构化）

```typescript
// POST /api/v1/prompts/:id/quick-test
{
  "modelId": "model-xxx",
  "variables": {
    "current_device": "iPhone 15 Pro",
    "all_devices": ["iPhone 15 Pro", "iPad Air"]
  }
}

// 响应
{
  "output": "...",
  "parsed": {
    "problem_type": "bluetooth",
    "device_change": false
  },
  "parseSuccess": true,
  "latencyMs": 1200,
  "tokens": { "input": 256, "output": 128 }
}
```

### 任务对比 API

```typescript
// POST /api/v1/tasks/compare
{
  "baseTaskId": "task-xxx",
  "compareTaskId": "task-yyy"
}

// 响应
{
  "summary": {
    "basePassRate": 0.92,
    "comparePassRate": 0.88,
    "change": -0.04
  },
  "fieldComparison": [
    {
      "fieldKey": "problem_type",
      "fieldName": "问题分类",
      "basePassRate": 0.95,
      "comparePassRate": 0.88,
      "change": -0.07,
      "isRegression": true
    }
  ]
}
```

## 前置依赖

- Phase 1、Phase 2 所有功能完成
- AI 配置助手可用
- 字段级评估和统计可用

## 技术要点

### 输出推断逻辑

```typescript
function inferSchema(output: unknown): OutputFieldDefinition[] {
  if (typeof output !== 'object' || output === null) {
    throw new Error('输出必须是 JSON 对象');
  }

  return Object.entries(output).map(([key, value]) => ({
    key,
    name: key, // 可由 AI 补充中文名
    type: inferType(value),
    required: true,
    evaluation: {
      evaluatorId: inferEvaluator(inferType(value)),
      weight: 1 / Object.keys(output).length,
      isCritical: false
    }
  }));
}

function inferType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}
```

### 回归检测逻辑

```typescript
function detectRegressions(
  baseStats: FieldStats[],
  compareStats: FieldStats[],
  threshold: number
): RegressionResult[] {
  const results: RegressionResult[] = [];

  for (const baseField of baseStats) {
    const compareField = compareStats.find(f => f.fieldKey === baseField.fieldKey);
    if (!compareField) continue;

    const change = compareField.passRate - baseField.passRate;
    const isRegression = change < -threshold;

    results.push({
      fieldKey: baseField.fieldKey,
      fieldName: baseField.fieldName,
      basePassRate: baseField.passRate,
      comparePassRate: compareField.passRate,
      change,
      isRegression
    });
  }

  return results;
}
```

## 风险与应对

| 风险 | 应对措施 |
|------|---------|
| 推断结果不准确 | 允许用户编辑调整 |
| 模板不满足需求 | 模板仅作起点，支持完全自定义 |
| 回归检测误报 | 提供阈值配置，支持忽略 |

## 成功标准

- [ ] 模板库包含 5+ 常用场景
- [ ] 从输出推断准确率 > 90%
- [ ] 快速测试支持结构化输入输出
- [ ] AI 助手支持多轮调整
- [ ] 导出包含字段级评估
- [ ] 回归检测能识别字段级变化
- [ ] 监控支持字段级告警
