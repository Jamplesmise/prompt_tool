# 评估器规格说明

## 一、评估器概述

评估器用于判断模型输出是否符合预期。系统支持多种评估器类型，可单独使用或组合使用。

### 1.1 评估器输入

所有评估器接收相同的输入参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| input | string | 原始用户输入 |
| output | string | 模型实际输出 |
| expected | string \| null | 期望输出（可选） |
| metadata | object | 额外元数据（来自数据集其他字段） |

### 1.2 评估器输出

所有评估器返回统一格式：

```typescript
type EvaluationOutput = {
  passed: boolean;       // 是否通过
  score?: number;        // 评分 0-1（可选）
  reason?: string;       // 判断理由（可选）
  details?: object;      // 详细信息（可选）
};
```

---

## 二、预置评估器

### 2.1 精确匹配 (exact_match)

**规则**：`output === expected`

**配置**：无

**使用场景**：
- 分类任务（输出固定类别）
- 提取任务（输出固定格式）

**示例**：
```
input: "北京是哪个国家的首都？"
output: "中国"
expected: "中国"
result: { passed: true, score: 1.0 }
```

---

### 2.2 包含匹配 (contains)

**规则**：`output.includes(expected)`

**配置**：无

**使用场景**：
- 关键词检测
- 答案包含验证

**示例**：
```
input: "介绍一下北京"
output: "北京是中国的首都，有着悠久的历史..."
expected: "首都"
result: { passed: true, score: 1.0 }
```

---

### 2.3 正则匹配 (regex)

**规则**：`new RegExp(pattern, flags).test(output)`

**配置**：
```typescript
{
  pattern: string;  // 正则表达式
  flags?: string;   // 标志，如 'i', 'g', 'im'
}
```

**使用时传参**：配置中的 pattern 为默认值，实际使用时可通过 expected 覆盖

**使用场景**：
- 格式验证（邮箱、电话等）
- 模式匹配

**示例**：
```
config: { pattern: "\\d{4}-\\d{2}-\\d{2}" }
output: "会议时间是 2024-01-15"
result: { passed: true, score: 1.0 }
```

---

### 2.4 JSON Schema 校验 (json_schema)

**规则**：输出解析为 JSON 后符合 Schema

**配置**：
```typescript
{
  schema: object;  // JSON Schema 定义
}
```

**使用场景**：
- 结构化输出验证
- API 响应格式验证

**示例**：
```
config: {
  schema: {
    type: "object",
    required: ["name", "age"],
    properties: {
      name: { type: "string" },
      age: { type: "number" }
    }
  }
}
output: '{"name": "张三", "age": 25}'
result: { passed: true, score: 1.0 }
```

**错误处理**：
- JSON 解析失败：passed = false, reason = "输出不是有效的 JSON"
- Schema 校验失败：passed = false, reason = 具体校验错误

---

### 2.5 相似度匹配 (similarity)

**规则**：`similarity(output, expected) >= threshold`

**配置**：
```typescript
{
  threshold: number;  // 阈值，0-1，默认 0.8
  algorithm?: 'levenshtein' | 'cosine' | 'jaccard';  // 算法，默认 levenshtein
}
```

**算法说明**：

| 算法 | 说明 | 适用场景 |
|------|------|----------|
| levenshtein | 编辑距离，归一化后取相似度 | 短文本、拼写检查 |
| cosine | 余弦相似度（需分词） | 长文本、语义相似 |
| jaccard | 集合相似度 | 关键词匹配 |

**示例**：
```
config: { threshold: 0.8, algorithm: "levenshtein" }
output: "北京是中国首都"
expected: "北京是中国的首都"
similarity: 0.88
result: { passed: true, score: 0.88 }
```

---

## 三、代码评估器

### 3.1 概述

用户编写自定义代码进行评估，支持 Node.js 和 Python（V2）。

### 3.2 Node.js 代码规范

**函数签名**：

```javascript
/**
 * 评估函数
 * @param {string} input - 原始输入
 * @param {string} output - 模型输出
 * @param {string|null} expected - 期望输出
 * @param {object} metadata - 额外元数据
 * @returns {Promise<{passed: boolean, score?: number, reason?: string}>}
 */
module.exports = async function evaluate(input, output, expected, metadata) {
  // 评估逻辑
  return {
    passed: true,
    score: 1.0,
    reason: '评估通过'
  };
};
```

**可用内置模块**：

| 模块 | 说明 |
|------|------|
| lodash | 工具函数库 |
| dayjs | 日期处理 |
| validator | 字符串校验 |
| ajv | JSON Schema 校验 |

**限制**：
- 执行超时：5 秒
- 内存限制：128 MB
- 禁止网络请求
- 禁止文件系统操作

**示例 - 长度检查**：

```javascript
module.exports = async function evaluate(input, output, expected, metadata) {
  const minLength = metadata.minLength || 100;
  
  if (output.length < minLength) {
    return {
      passed: false,
      score: output.length / minLength,
      reason: `输出长度 ${output.length} 小于要求的 ${minLength}`
    };
  }
  
  return {
    passed: true,
    score: 1.0,
    reason: '长度符合要求'
  };
};
```

**示例 - 关键词检查**：

```javascript
const _ = require('lodash');

module.exports = async function evaluate(input, output, expected, metadata) {
  const keywords = metadata.keywords || [];
  const foundKeywords = keywords.filter(kw => output.includes(kw));
  const coverage = foundKeywords.length / keywords.length;
  
  return {
    passed: coverage >= 0.8,
    score: coverage,
    reason: `包含关键词 ${foundKeywords.length}/${keywords.length}`,
    details: { foundKeywords, missingKeywords: _.difference(keywords, foundKeywords) }
  };
};
```

### 3.3 Python 代码规范（V2）

**函数签名**：

```python
def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """
    评估函数
    
    Args:
        input: 原始输入
        output: 模型输出
        expected: 期望输出
        metadata: 额外元数据
    
    Returns:
        {"passed": bool, "score": float | None, "reason": str | None}
    """
    return {
        "passed": True,
        "score": 1.0,
        "reason": "评估通过"
    }
```

**可用库**：
- json
- re
- math
- collections
- difflib

---

## 四、LLM 评估器（V2）

### 4.1 概述

使用另一个 LLM 模型评估输出质量。

### 4.2 配置

```typescript
{
  modelId: string;    // 评估模型 ID
  prompt: string;     // 评估提示词模板
  scoreRange?: {
    min: number;      // 最小分，默认 0
    max: number;      // 最大分，默认 10
  };
}
```

### 4.3 提示词模板

模板中可使用变量：

| 变量 | 说明 |
|------|------|
| `{{input}}` | 原始输入 |
| `{{output}}` | 模型输出 |
| `{{expected}}` | 期望输出 |

**默认模板**：

```
你是一个评估专家。请评估以下 AI 助手的回答质量。

用户问题：
{{input}}

AI 回答：
{{output}}

{{#if expected}}
参考答案：
{{expected}}
{{/if}}

请从以下维度评估（每项 0-10 分）：
1. 准确性：回答是否正确
2. 完整性：是否完整回答了问题
3. 清晰度：表达是否清晰易懂

请以 JSON 格式返回评估结果：
{
  "accuracy": <分数>,
  "completeness": <分数>,
  "clarity": <分数>,
  "overall": <总分>,
  "reason": "<评估理由>"
}
```

### 4.4 输出解析

系统从 LLM 输出中提取 JSON，计算通过状态：

```typescript
// 归一化分数到 0-1
const normalizedScore = (overall - scoreRange.min) / (scoreRange.max - scoreRange.min);

// 默认 0.6 以上为通过
const passed = normalizedScore >= 0.6;
```

---

## 五、组合评估器（V2）

### 5.1 概述

将多个评估器组合使用，支持串行/并行执行和多种聚合逻辑。

### 5.2 配置

```typescript
{
  evaluatorIds: string[];  // 子评估器 ID 列表
  mode: 'parallel' | 'serial';  // 执行模式
  aggregation: 'and' | 'or' | 'weighted_average';  // 聚合方式
  weights?: number[];  // 权重（weighted_average 时使用）
}
```

### 5.3 执行模式

**parallel（并行）**：
- 所有评估器同时执行
- 总耗时 = 最慢的评估器耗时

**serial（串行）**：
- 按顺序执行
- 如果使用 `and` 聚合，遇到失败立即停止
- 总耗时 = 所有评估器耗时之和

### 5.4 聚合方式

**and（与）**：
- passed = 所有子评估器都通过
- score = 所有子评分的最小值

**or（或）**：
- passed = 任一子评估器通过
- score = 所有子评分的最大值

**weighted_average（加权平均）**：
- passed = 加权平均分 >= 0.6
- score = Σ(weight[i] * score[i]) / Σweight[i]

### 5.5 示例

```typescript
// 配置
{
  evaluatorIds: ['preset-contains', 'custom-length-check'],
  mode: 'parallel',
  aggregation: 'and'
}

// 执行结果
评估器1: { passed: true, score: 1.0 }
评估器2: { passed: true, score: 0.85 }

// 聚合结果
{ passed: true, score: 0.85 }
```

---

## 六、执行流程

### 6.1 单评估器执行

```
┌─────────────────────────────────────────────────────────────────┐
│                        评估器执行流程                            │
└─────────────────────────────────────────────────────────────────┘

输入数据
    │
    ▼
┌─────────────┐
│  类型判断   │
└──────┬──────┘
       │
       ├─── PRESET ───► 调用预置评估函数
       │
       ├─── CODE ─────► 沙箱执行用户代码
       │
       ├─── LLM ──────► 调用评估模型
       │
       └─── COMPOSITE ► 递归执行子评估器
               │
               ▼
       ┌─────────────┐
       │  结果聚合   │
       └─────────────┘
               │
               ▼
         返回结果
```

### 6.2 任务评估流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        任务评估流程                              │
└─────────────────────────────────────────────────────────────────┘

TaskResult (模型调用结果)
    │
    ▼
遍历任务配置的评估器列表
    │
    ├──► 评估器1 ──► EvaluationResult1
    │
    ├──► 评估器2 ──► EvaluationResult2
    │
    └──► 评估器N ──► EvaluationResultN
    │
    ▼
汇总通过状态（所有评估器都通过才算通过）
    │
    ▼
更新 TaskResult.passed
```

---

## 七、错误处理

### 7.1 评估器执行错误

| 错误类型 | 处理方式 |
|----------|----------|
| 代码语法错误 | passed = false, reason = 语法错误信息 |
| 执行超时 | passed = false, reason = "评估超时" |
| 返回格式错误 | passed = false, reason = "返回格式不符合规范" |
| 依赖模块不存在 | passed = false, reason = "模块 xxx 不可用" |

### 7.2 默认行为

- 评估器执行失败不影响其他评估器
- 单条结果的多个评估器独立执行
- 评估失败的结果标记为未通过

---

## 八、预置评估器 ID

| ID | 名称 | 类型 |
|----|------|------|
| `preset-exact-match` | 精确匹配 | PRESET |
| `preset-contains` | 包含匹配 | PRESET |
| `preset-regex` | 正则匹配 | PRESET |
| `preset-json-schema` | JSON Schema | PRESET |
| `preset-similarity` | 相似度匹配 | PRESET |

这些 ID 固定不变，可直接在代码中引用。
