# Phase 2: AI 配置助手 + 高级评估 - 上下文

> 预计工期：3-4 周（25 工作日）
> 后端：13d | 前端：12d
> 前置依赖：Phase 1 完成

## 目标概述

本阶段的核心目标是：
1. 实现 **AI 配置助手**，通过对话方式帮助用户快速创建 Schema
2. 完善**高级评估能力**，包括条件评估、关键字段聚合
3. 升级**结果展示**，支持字段级评估详情和统计分析

## 核心功能 1：AI 配置助手

### 功能价值

AI 配置助手是**核心易用性功能**，解决用户面临的问题：
- Schema 定义复杂，需要理解字段、类型、评估器等概念
- 手动配置耗时，容易出错
- 数据集模板需要手动对齐 Schema

### 设计原则

**AI 只输出必要信息，代码负责组装**：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        职责分离设计                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   AI 负责（需要理解语义）          代码负责（固定规则）                      │
│   ┌─────────────────────┐         ┌─────────────────────────────────┐      │
│   │ • 变量/字段名称     │         │ • key 生成（驼峰转换）          │      │
│   │ • 数据类型判断      │         │ • datasetField 生成（加前缀）   │      │
│   │ • 是否必填          │         │ • 评估器推断（根据类型）        │      │
│   │ • 枚举值提取        │         │ • 权重分配（均分或按规则）      │      │
│   │ • 是否关键字段      │         │ • 聚合策略（根据是否有关键字段）│      │
│   └─────────────────────┘         │ • Schema 名称（场景名+后缀）    │      │
│                                   │ • parseMode（固定JSON_EXTRACT） │      │
│                                   └─────────────────────────────────┘      │
│                                                                             │
│   输出 ~8 个字段                   组装 ~25 个字段                           │
│   Token ~150                       耗时 <10ms                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 交互流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Step 1      │     │  Step 2      │     │  Step 3      │     │  Step 4      │
│  选择模型    │────►│  描述场景    │────►│  确认结构    │────►│  下载模板    │
│              │     │              │     │              │     │              │
│ [模型下拉框] │     │ [对话输入]   │     │ [预览编辑]   │     │ [Excel下载]  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### AI 输出格式（精简）

AI 只需要输出核心信息：

```json
{
  "inputs": [
    { "name": "用户当前设备", "type": "string", "required": true },
    { "name": "用户所有设备", "type": "array", "required": true },
    { "name": "用户问题", "type": "string", "required": true },
    { "name": "对话历史", "type": "array", "required": false }
  ],
  "outputs": [
    { "name": "思考过程", "type": "string", "critical": false },
    { "name": "问题分类", "type": "enum", "values": ["bluetooth", "wifi", "battery", "screen", "other"], "critical": true },
    { "name": "设备更改", "type": "boolean", "critical": false },
    { "name": "型号提取", "type": "string", "critical": true },
    { "name": "检索关键词", "type": "string", "critical": false }
  ]
}
```

### 代码组装逻辑

```typescript
function assembleSchemas(aiOutput, sceneName) {
  // 1. 组装 InputSchema
  const inputSchema = {
    name: `${sceneName}输入变量`,
    variables: aiOutput.inputs.map(input => ({
      name: input.name,
      key: toCamelCase(input.name),                    // 代码生成
      type: input.type,
      required: input.required,
      datasetField: `ctx_${toSnakeCase(input.name)}`,  // 代码生成：ctx_ 前缀
    }))
  };

  // 2. 组装 OutputSchema
  const hasCriticalFields = aiOutput.outputs.some(o => o.critical);
  const fieldCount = aiOutput.outputs.length;

  const outputSchema = {
    name: `${sceneName}输出结构`,
    parseMode: 'JSON_EXTRACT',                         // 固定值
    fields: aiOutput.outputs.map(output => ({
      name: output.name,
      key: toCamelCase(output.name),                   // 代码生成
      type: output.type,
      enumValues: output.values,
      required: true,
      evaluation: {
        evaluatorId: inferEvaluator(output.type),      // 代码推断
        expectedField: `exp_${toSnakeCase(output.name)}`,  // exp_ 前缀
        weight: 1 / fieldCount,                        // 代码均分
        isCritical: output.critical,
      }
    })),
    aggregation: {
      mode: hasCriticalFields ? 'critical_first' : 'weighted_average',
      passThreshold: 0.7
    }
  };

  return { inputSchema, outputSchema };
}
```

### AI System Prompt

```
你是配置助手。根据用户描述的测试场景，提取输入变量和输出字段的核心信息。

## 输出格式
只返回 JSON，包含 inputs 和 outputs 两个数组：

{
  "inputs": [
    { "name": "变量名", "type": "类型", "required": true/false }
  ],
  "outputs": [
    { "name": "字段名", "type": "类型", "values": ["仅enum填"], "critical": true/false }
  ]
}

## 字段说明
- name: 中文名称，简洁清晰
- type: 只能是 string / number / boolean / array / enum
- required: 输入变量是否必填
- values: 仅 enum 类型需要，列出所有可能的值
- critical: 用户强调必须准确的字段设为 true

## 规则
1. 只输出上述字段，不要添加 key、evaluator、weight 等
2. enum 类型必须提供 values 数组
3. 根据用户描述判断哪些是关键字段（critical）
4. 保持简洁，不要输出多余内容
```

## 核心功能 2：高级评估能力

### 条件表达式求值器

支持字段间条件依赖评估：

```typescript
// 条件表达式示例
"fields.device_change === false"  // 当设备未更改时才评估
"fields.problem_type !== 'other'" // 当问题类型不是其他时才评估
```

**安全设计**：
- 沙箱执行，使用 Function 构造器
- 只允许安全的操作符和标识符
- 禁止危险关键字（eval、function、prototype 等）

```typescript
class ConditionEvaluator {
  evaluate(expression: string, context: EvaluationContext): boolean {
    // 1. 检查表达式安全性
    this.sanitizeExpression(expression);

    // 2. 沙箱执行
    const evaluator = new Function(
      'fields',
      'evaluated',
      `"use strict"; return (${expression});`
    );

    return Boolean(evaluator(context.fields, context.evaluated));
  }
}
```

### 关键字段优先聚合

`critical_first` 模式：

```typescript
function aggregateCriticalFirst(results, configMap, config) {
  // 1. 分离关键字段和普通字段
  const criticalResults = results.filter(r => configMap.get(r.fieldKey)?.isCritical);
  const normalResults = results.filter(r => !configMap.get(r.fieldKey)?.isCritical);

  // 2. 检查关键字段
  const failedCritical = criticalResults.filter(r => !r.passed);
  if (failedCritical.length > 0) {
    return {
      passed: false,
      score: 0,
      reason: `关键字段未通过: ${failedCritical.map(r => r.fieldName).join(', ')}`
    };
  }

  // 3. 关键字段全过，对普通字段加权平均
  if (normalResults.length === 0) {
    return { passed: true, score: 1, reason: '所有关键字段通过' };
  }

  const normalAgg = this.aggregateWeightedAverage(normalResults, configMap, config);
  return {
    passed: normalAgg.passed,
    score: normalAgg.score,
    reason: `关键字段全部通过，普通字段${normalAgg.reason}`
  };
}
```

### 自定义聚合表达式

`custom` 模式支持自定义表达式：

```typescript
// 表达式示例
"fields.problem_type.passed && fields.get_device.score > 0.8"
```

## 核心功能 3：结果展示升级

### 结果详情页扩展

新增字段级评估表格：

| 字段 | 实际值 | 期望值 | 评估器 | 结果 |
|------|--------|--------|--------|------|
| ★问题分类 | bluetooth | bluetooth | 精确匹配 | ✅ 100% |
| ★型号提取 | iPhone 15 Pro | iPhone 15 | 包含匹配 | ✅ 90% |
| 设备更改 | false | false | 精确匹配 | ✅ 100% |

### 聚合计算明细

展示聚合计算过程：
- 关键字段检查结果
- 普通字段加权明细
- 最终得分计算

### 字段级统计页面

新增"字段分析" Tab：
- 字段通过率柱状图
- 字段详细统计表（通过率、平均分、失败原因）
- 字段得分分布图

## API 设计

### AI Schema 生成 API

```typescript
// POST /api/v1/schemas/ai-generate
{
  "modelId": "model-gpt4o-xxx",
  "sceneName": "智能客服意图识别",
  "description": "我在做智能客服的意图识别测试..."
}

// 响应
{
  "code": 200,
  "data": {
    "aiRawOutput": { "inputs": [...], "outputs": [...] },
    "inputSchema": { /* 组装后的完整 Schema */ },
    "outputSchema": { /* 组装后的完整 Schema */ },
    "templateColumns": [ /* 模板列定义 */ ]
  }
}
```

### 字段级结果 API

```typescript
// GET /api/v1/tasks/:id/results/:resultId
// 扩展返回 fieldEvaluations 和 aggregation

// GET /api/v1/tasks/:id/stats/fields
// 字段级统计
{
  "fields": [
    {
      "fieldKey": "problem_type",
      "fieldName": "问题分类",
      "isCritical": true,
      "passRate": 0.95,
      "avgScore": 0.96,
      "passCount": 190,
      "failCount": 10,
      "skipCount": 0
    }
  ],
  "failureReasons": {
    "problem_type": [
      { "reason": "分类错误：实际为 wifi_issue，期望 bluetooth", "count": 5 }
    ]
  }
}
```

## 前端页面

### 新增页面

1. **AI 配置助手页面** (`/schemas/ai-assistant`)
   - 步骤式引导
   - 模型选择
   - 场景描述输入
   - 结构预览编辑
   - 一键模板下载

### 改造页面

1. **OutputSchema 编辑器**
   - 新增条件表达式输入
   - 新增自定义聚合表达式

2. **结果详情页**
   - 字段级评估表格
   - 聚合计算明细

3. **任务统计页**
   - 新增"字段分析" Tab
   - 字段通过率图表
   - 字段得分分布

4. **任务创建页**
   - Schema 关联提示
   - 字段映射校验

## 技术要点

### 中文转拼音

使用 `pinyin` 或 `pinyin-pro` 库：

```typescript
import pinyin from 'pinyin-pro';

function toCamelCase(chinese: string): string {
  const py = pinyin(chinese, { toneType: 'none', type: 'array' });
  return py.map((p, i) => i === 0 ? p : capitalize(p)).join('');
}

// "用户当前设备" → "yongHuDangQianSheBei"
```

### 评估器推断

根据字段类型自动选择评估器：

```typescript
const evaluatorMap = {
  'enum': 'preset-exact-match',      // 枚举值必须精确匹配
  'boolean': 'preset-exact-match',   // 布尔值精确匹配
  'number': 'preset-exact-match',    // 数值精确匹配
  'string': 'preset-contains',       // 字符串包含匹配
  'array': 'preset-array-contains',  // 数组包含匹配
};
```

## 前置依赖

- Phase 1 所有功能完成
- Schema CRUD API 可用
- 字段级评估引擎可用
- 聚合引擎可用

## 风险与应对

| 风险 | 应对措施 |
|------|---------|
| AI 生成结果不准确 | 精简输出格式，降低 AI 决策复杂度 |
| 条件表达式执行不安全 | 沙箱执行，严格字符白名单 |
| 中文转拼音不准确 | 提供手动编辑能力 |
| 统计查询性能问题 | 添加合适的索引，考虑缓存 |

## 成功标准

- [ ] AI 配置助手可正常生成 Schema
- [ ] 生成的 Schema 可直接使用
- [ ] 条件评估正确跳过/执行
- [ ] 关键字段优先聚合正确
- [ ] 结果详情展示字段级评估
- [ ] 字段级统计数据准确
- [ ] 任务创建流程适配完整
