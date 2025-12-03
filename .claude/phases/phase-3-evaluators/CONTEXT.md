# Phase 3: 评估器模块 - 上下文

> 本阶段目标：实现评估器管理（预置评估器 + 代码评估器）

## 一、阶段概述

评估器用于判断模型输出是否符合预期，系统支持：
- **预置评估器**：系统内置的 5 种评估规则（只读）
- **代码评估器**：用户自定义的 Node.js 代码（MVP）
- **LLM 评估器**：使用另一个 LLM 评估（V2）
- **组合评估器**：多个评估器组合（V2）

**MVP 范围**：预置评估器 + Node.js 代码评估器

## 二、数据模型

```prisma
model Evaluator {
  id          String        @id @default(uuid())
  name        String
  description String?
  type        EvaluatorType
  config      Json          // 配置，结构见下方说明
  isPreset    Boolean       @default(false) @map("is_preset")

  createdById String?       @map("created_by_id")
  createdBy   User?         @relation(fields: [createdById], references: [id])

  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  evaluationResults EvaluationResult[]
  tasks             TaskEvaluator[]

  @@index([type])
  @@map("evaluators")
}

enum EvaluatorType {
  PRESET     // 预置评估器
  CODE       // 代码评估器
  LLM        // LLM 评估器 (V2)
  COMPOSITE  // 组合评估器 (V2)
}
```

### config 结构

**PRESET 类型**：
```typescript
type PresetConfig = {
  presetType: 'exact_match' | 'contains' | 'regex' | 'json_schema' | 'similarity';
  params: {
    // exact_match: 无参数
    // contains: 无参数
    // regex: { pattern: string, flags?: string }
    // json_schema: { schema: object }
    // similarity: { threshold: number, algorithm?: string }
  };
};
```

**CODE 类型**：
```typescript
type CodeConfig = {
  language: 'nodejs' | 'python';  // MVP 仅支持 nodejs
  code: string;
  timeout?: number;  // 执行超时，毫秒，默认 5000
};
```

## 三、预置评估器

### 3.1 精确匹配 (exact_match)

**规则**：`output === expected`

**使用场景**：分类任务、提取任务

**示例**：
```
input: "北京是哪个国家的首都？"
output: "中国"
expected: "中国"
result: { passed: true, score: 1.0 }
```

### 3.2 包含匹配 (contains)

**规则**：`output.includes(expected)`

**使用场景**：关键词检测、答案包含验证

**示例**：
```
output: "北京是中国的首都，有着悠久的历史..."
expected: "首都"
result: { passed: true, score: 1.0 }
```

### 3.3 正则匹配 (regex)

**规则**：`new RegExp(pattern, flags).test(output)`

**配置**：
```typescript
{ pattern: string; flags?: string; }  // 如 "i" 忽略大小写
```

**使用场景**：格式验证（日期、邮箱等）

### 3.4 JSON Schema 校验 (json_schema)

**规则**：输出解析为 JSON 后符合 Schema

**配置**：
```typescript
{ schema: object; }  // JSON Schema 定义
```

**使用场景**：结构化输出验证

**错误处理**：
- JSON 解析失败：passed = false
- Schema 校验失败：passed = false, reason = 具体错误

### 3.5 相似度匹配 (similarity)

**规则**：`similarity(output, expected) >= threshold`

**配置**：
```typescript
{
  threshold: number;  // 0-1，默认 0.8
  algorithm?: 'levenshtein' | 'cosine' | 'jaccard';  // 默认 levenshtein
}
```

**算法说明**：
| 算法 | 说明 | 适用场景 |
|------|------|----------|
| levenshtein | 编辑距离归一化 | 短文本、拼写检查 |
| cosine | 余弦相似度 | 长文本、语义相似 |
| jaccard | 集合相似度 | 关键词匹配 |

## 四、代码评估器规范

### 4.1 函数签名

```javascript
/**
 * 评估函数
 * @param {string} input - 原始输入
 * @param {string} output - 模型输出
 * @param {string|null} expected - 期望输出
 * @param {object} metadata - 额外元数据（数据集其他字段）
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

### 4.2 可用内置模块

| 模块 | 说明 |
|------|------|
| lodash | 工具函数库 |
| dayjs | 日期处理 |
| validator | 字符串校验 |
| ajv | JSON Schema 校验 |

### 4.3 限制

- 执行超时：5 秒
- 内存限制：128 MB
- 禁止网络请求
- 禁止文件系统操作

### 4.4 代码示例

**长度检查**：
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

  return { passed: true, score: 1.0, reason: '长度符合要求' };
};
```

**关键词检查**：
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

## 五、API 规格

### GET /api/v1/evaluators
```typescript
// 查询参数
{ type?: 'preset' | 'code' | 'llm' | 'composite'; }

// 响应
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    description: string | null;
    type: 'preset' | 'code' | 'llm' | 'composite';
    isPreset: boolean;
    createdAt: string;
    updatedAt: string;
  }>
}
```

### GET /api/v1/evaluators/presets
```typescript
// 响应 - 预置评估器列表
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    description: string;
    type: 'preset';
    config: {
      presetType: string;
      params: Record<string, any>;
    };
  }>
}
```

### POST /api/v1/evaluators
```typescript
// 请求 - 创建自定义评估器
{
  name: string;
  description?: string;
  type: 'code';  // MVP 仅支持 code
  config: {
    language: 'nodejs';
    code: string;
    timeout?: number;
  };
}

// 响应
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    config: Record<string, any>;
    isPreset: false;
    createdAt: string;
    updatedAt: string;
  }
}
```

### GET /api/v1/evaluators/:id
获取评估器详情

### PUT /api/v1/evaluators/:id
更新评估器（预置评估器不可更新）

### DELETE /api/v1/evaluators/:id
删除评估器（预置评估器不可删除）

### POST /api/v1/evaluators/:id/test
测试评估器
```typescript
// 请求
{
  input: string;
  output: string;
  expected: string;
  metadata?: Record<string, any>;
}

// 响应
{
  code: 200,
  data: {
    passed: boolean;
    score: number | null;
    reason: string | null;
    latencyMs: number;
    error: string | null;
  }
}
```

## 六、页面规格

### 评估器列表页 `/evaluators`

**布局**：Tabs + 表格

**Tabs**：
- 预置评估器（只读展示）
- 自定义评估器（可增删改）

**预置评估器展示**：
| 名称 | 说明 |
|------|------|
| 精确匹配 | 输出与期望完全一致 |
| 包含匹配 | 输出包含期望内容 |
| 正则匹配 | 输出匹配正则表达式 |
| JSON Schema | 输出符合 JSON Schema |
| 相似度 | 文本相似度超过阈值 |

**自定义评估器表格列**：
| 列名 | 字段 | 宽度 |
|------|------|------|
| 名称 | name | 200px |
| 类型 | type | 100px |
| 语言 | language | 100px |
| 更新时间 | updatedAt | 180px |
| 操作 | - | 120px |

### 评估器编辑页 `/evaluators/[id]`

**布局**：配置表单 + 代码编辑器

```
┌─────────────────────────────────────────────────────────────────┐
│ [返回] 评估器名称                                     [保存]    │
├─────────────────────────────────────────────────────────────────┤
│ 基本信息                                                        │
│ 名称: [________________]  类型: [代码 ▼]  语言: [Node.js ▼]    │
│ 描述: [________________________________________________]        │
├─────────────────────────────────────────────────────────────────┤
│ 输入参数                                                        │
│ ┌──────────┬──────────┬──────────────────────────────────────┐ │
│ │ 参数名    │ 类型     │ 说明                                 │ │
│ ├──────────┼──────────┼──────────────────────────────────────┤ │
│ │ input    │ string   │ 原始输入                             │ │
│ │ output   │ string   │ 模型输出                             │ │
│ │ expected │ string   │ 期望输出                             │ │
│ │ metadata │ object   │ 额外数据                             │ │
│ └──────────┴──────────┴──────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 代码                                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ // 返回格式: { passed: boolean, score?: number, reason? }  │ │
│ │ module.exports = async function(input, output, expected) { │ │
│ │   return { passed: true, score: 1.0, reason: '通过' };     │ │
│ │ }                                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 测试运行                                                        │
│ input: [________]  output: [________]  expected: [________]    │
│ [运行测试]                                                      │
│ 结果: ✓ passed=true, score=1.0                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 七、沙箱执行

### 沙箱服务调用

```typescript
// lib/sandbox.ts
export async function executeInSandbox(
  code: string,
  input: EvaluatorInput,
  timeout: number = 5000
): Promise<EvaluatorOutput> {
  const response = await fetch(`${process.env.SANDBOX_URL}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SANDBOX_SECRET}`,
    },
    body: JSON.stringify({
      language: 'nodejs',
      code,
      input,
      timeout,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.result;
}
```

### MVP 简化方案

如果沙箱服务未就绪，可使用 `vm2` 在进程内执行：

```typescript
import { VM } from 'vm2';

export function executeCode(code: string, input: EvaluatorInput) {
  const vm = new VM({
    timeout: 5000,
    sandbox: {
      require: createSafeRequire(['lodash', 'dayjs', 'validator', 'ajv']),
      input,
    },
  });

  const wrappedCode = `
    const fn = ${code};
    fn(input.input, input.output, input.expected, input.metadata);
  `;

  return vm.run(wrappedCode);
}
```

## 八、预置评估器实现

```typescript
// packages/evaluators/src/presets/index.ts
export const presetEvaluators = {
  exact_match: (input: EvaluatorInput) => ({
    passed: input.output === input.expected,
    score: input.output === input.expected ? 1 : 0,
  }),

  contains: (input: EvaluatorInput) => ({
    passed: input.output.includes(input.expected || ''),
    score: input.output.includes(input.expected || '') ? 1 : 0,
  }),

  regex: (input: EvaluatorInput, params: { pattern: string; flags?: string }) => {
    const regex = new RegExp(params.pattern, params.flags);
    const passed = regex.test(input.output);
    return { passed, score: passed ? 1 : 0 };
  },

  json_schema: (input: EvaluatorInput, params: { schema: object }) => {
    try {
      const data = JSON.parse(input.output);
      const ajv = new Ajv();
      const valid = ajv.validate(params.schema, data);
      return {
        passed: valid,
        score: valid ? 1 : 0,
        reason: valid ? undefined : ajv.errorsText(),
      };
    } catch (e) {
      return { passed: false, score: 0, reason: '输出不是有效的 JSON' };
    }
  },

  similarity: (input: EvaluatorInput, params: { threshold: number; algorithm?: string }) => {
    const score = calculateSimilarity(input.output, input.expected || '', params.algorithm);
    return {
      passed: score >= params.threshold,
      score,
    };
  },
};
```

## 九、错误码

| 错误码 | 说明 |
|--------|------|
| 503001 | 评估器不存在 |
| 503002 | 评估器执行失败 |

## 十、依赖关系

**上游依赖**：
- Phase 0: 数据库、共享类型
- Phase 1: 用户认证

**下游影响**：
- Phase 4 任务执行需要评估器

## 十一、测试要点

### 单元测试
- 预置评估器各类型测试
- 相似度算法测试
- 代码执行超时测试

### 集成测试
- 评估器 CRUD 流程
- 测试运行功能
