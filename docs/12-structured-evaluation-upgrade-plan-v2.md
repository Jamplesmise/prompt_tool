# 结构化评估能力迭代升级计划

> 版本：v2.0  
> 日期：2024-12  
> 状态：技术方案  

---

## 〇、系统性影响分析

### 0.1 受影响的功能模块

本次升级是**系统性改造**，以下模块都需要适配：

| 模块 | 影响程度 | 改造内容 |
|------|---------|---------|
| **数据集管理** | 🔴 高 | 上传流程、模板下载、字段映射、数据预览 |
| **提示词管理** | 🔴 高 | Schema 关联、变量定义、模板渲染 |
| **任务创建** | 🔴 高 | 配置流程、Schema 选择、映射验证 |
| **任务执行** | 🔴 高 | 解析引擎、字段评估、聚合计算 |
| **结果展示** | 🔴 高 | 字段级结果、聚合详情、统计分析 |
| **评估器** | 🟡 中 | 输入签名扩展、字段上下文传递 |
| **快速测试** | 🟡 中 | 结构化输入、结构化输出展示 |
| **结果导出** | 🟡 中 | 字段级导出、聚合信息导出 |
| **监控告警** | 🟢 低 | 字段级指标监控（Phase 3） |

### 0.2 新增核心功能

| 功能 | 说明 | 优先级 |
|------|------|--------|
| **AI 配置助手** | 对话式生成 Schema + 数据集模板 | P0 |
| **智能模板下载** | 根据 Schema 自动生成数据集模板 | P0 |
| **字段映射向导** | 可视化配置数据集与 Schema 的映射 | P0 |
| **字段级评估** | 每个输出字段独立评估 | P0 |
| **聚合策略** | 多种聚合模式（加权、关键字段） | P0 |
| **字段级统计** | 按字段维度的通过率、得分分布 | P1 |

---

## 一、升级背景与目标

### 1.1 问题陈述

当前平台基于**简单三元组模型**设计：

```
input(string) → LLM → output(string) → 对比 expected(string) → passed/failed
```

这在面对复杂 AI 应用评估时完全失效：

| 复杂场景特征 | 当前系统能力 | 差距 |
|-------------|-------------|------|
| 动态数量的输入上下文变量 | 静态 `{{var}}` 插槽 | 无法处理嵌套/动态结构 |
| 结构化多字段输出 | 单一 `output: string` | 无法拆分评估 |
| 每字段独立评估逻辑 | 整体评估器 | 无法配置字段级评估 |
| 字段间有依赖关系 | 无依赖支持 | 无法条件评估 |
| 字段重要性不同 | 简单 AND/OR | 无加权聚合 |

**核心矛盾**：不同提示词有不同的输入输出结构，系统需要**配置驱动**而非**硬编码**。

### 1.2 升级目标

```
┌─────────────────────────────────────────────────────────────────────┐
│                         目标架构                                     │
└─────────────────────────────────────────────────────────────────────┘

提示词 A                    提示词 B                    提示词 C
(智能客服)                  (文档分析)                  (代码审查)
    │                           │                           │
    ▼                           ▼                           ▼
InputSchema A               InputSchema B               InputSchema C
(5个上下文变量)             (3个上下文变量)             (8个上下文变量)
    │                           │                           │
    ▼                           ▼                           ▼
OutputSchema A              OutputSchema B              OutputSchema C  
(5个输出字段)               (3个输出字段)               (8个输出字段)
    │                           │                           │
    └───────────────────────────┼───────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   通用评估引擎        │
                    │   (配置驱动执行)      │
                    └───────────────────────┘
```

### 1.3 成功标准

- [ ] 支持任意数量、任意结构的输入变量定义
- [ ] 支持任意数量、任意结构的输出字段定义  
- [ ] 每个输出字段可独立配置评估器、期望值来源、权重
- [ ] 支持字段间条件依赖评估
- [ ] 提供多种聚合策略（全部通过、加权平均、关键字段）
- [ ] 字段级评估结果可查询、可统计、可导出
- [ ] 完全向后兼容现有简单场景

---

## 二、数据模型设计

### 2.1 新增模型：InputSchema（输入结构定义）

```prisma
// 输入变量结构定义 - 与提示词关联
model InputSchema {
  id          String   @id @default(uuid())
  name        String
  description String?
  
  // 变量定义列表
  variables   Json     // InputVariableDefinition[]
  
  createdById String   @map("created_by_id")
  createdBy   User     @relation(fields: [createdById], references: [id])
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // 关联
  prompts     Prompt[]
  
  @@index([createdById])
  @@map("input_schemas")
}
```

**InputVariableDefinition 类型定义**：

```typescript
type InputVariableDefinition = {
  // 基础信息
  name: string;              // 显示名称，如 "用户当前设备"
  key: string;               // 变量键名，如 "current_device"
  description?: string;      // 变量说明
  
  // 类型定义
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  
  // 数组类型的元素类型
  itemType?: 'string' | 'number' | 'boolean' | 'object';
  
  // object 类型的嵌套结构（简化版，支持一层嵌套）
  properties?: Array<{
    key: string;
    type: 'string' | 'number' | 'boolean';
  }>;
  
  // 约束
  required: boolean;
  defaultValue?: unknown;
  
  // 数据集映射
  datasetField?: string;     // 映射到数据集的哪个字段
};
```

**示例 - 智能客服输入变量**：

```json
[
  {
    "name": "用户当前设备",
    "key": "current_device",
    "type": "string",
    "required": true,
    "datasetField": "context_current_device"
  },
  {
    "name": "用户所有设备",
    "key": "all_devices",
    "type": "array",
    "itemType": "string",
    "required": true,
    "datasetField": "context_all_devices"
  },
  {
    "name": "用户问题",
    "key": "user_question",
    "type": "string",
    "required": true,
    "datasetField": "context_user_question"
  },
  {
    "name": "对话历史",
    "key": "dialog_history",
    "type": "array",
    "itemType": "object",
    "properties": [
      { "key": "role", "type": "string" },
      { "key": "content", "type": "string" }
    ],
    "required": false,
    "defaultValue": [],
    "datasetField": "context_dialog_history"
  }
]
```

### 2.2 新增模型：OutputSchema（输出结构定义）

```prisma
// 输出结构定义 - 与提示词关联
model OutputSchema {
  id          String    @id @default(uuid())
  name        String
  description String?
  
  // 字段定义列表
  fields      Json      // OutputFieldDefinition[]
  
  // 输出解析配置
  parseMode   ParseMode @default(JSON)
  parseConfig Json      @default("{}")
  
  // 聚合配置
  aggregation Json      @default("{}")  // AggregationConfig
  
  createdById String    @map("created_by_id")
  createdBy   User      @relation(fields: [createdById], references: [id])
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // 关联
  prompts     Prompt[]
  
  @@index([createdById])
  @@map("output_schemas")
}

enum ParseMode {
  JSON           // 直接 JSON.parse
  JSON_EXTRACT   // 从文本中提取 JSON（处理 markdown code block）
  REGEX          // 正则表达式提取
  TEMPLATE       // 模板匹配
}
```

**OutputFieldDefinition 类型定义**：

```typescript
type OutputFieldDefinition = {
  // 基础信息
  name: string;              // 显示名称，如 "问题分类"
  key: string;               // JSON key，如 "problem_type"
  description?: string;
  
  // 类型定义
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  required: boolean;
  
  // enum 类型的可选值
  enumValues?: string[];
  
  // array 类型的元素类型
  itemType?: string;
  
  // 评估配置
  evaluation: {
    // 使用哪个评估器（可选，不配置则跳过评估）
    evaluatorId?: string;
    
    // 期望值来源：数据集字段名
    expectedField?: string;
    
    // 权重（0-1），默认 1
    weight: number;
    
    // 是否为关键字段（关键字段必须通过）
    isCritical: boolean;
    
    // 条件表达式（可选）
    // 仅当条件满足时才评估此字段
    // 表达式中可引用 fields.xxx（其他字段的值）
    condition?: string;
  };
};
```

**示例 - 智能客服输出结构**：

```json
[
  {
    "name": "分类思考过程",
    "key": "thinking_process",
    "type": "string",
    "required": true,
    "evaluation": {
      "evaluatorId": "llm-reasoning-quality",
      "weight": 0.1,
      "isCritical": false
    }
  },
  {
    "name": "问题分类",
    "key": "problem_type",
    "type": "enum",
    "required": true,
    "enumValues": ["bluetooth_connection", "wifi_issue", "battery", "screen", "other"],
    "evaluation": {
      "evaluatorId": "preset-exact-match",
      "expectedField": "expected_problem_type",
      "weight": 0.3,
      "isCritical": true
    }
  },
  {
    "name": "咨询设备是否更改",
    "key": "device_change",
    "type": "boolean",
    "required": true,
    "evaluation": {
      "evaluatorId": "preset-exact-match",
      "expectedField": "expected_device_change",
      "weight": 0.2,
      "isCritical": false
    }
  },
  {
    "name": "型号提取",
    "key": "get_device",
    "type": "string",
    "required": true,
    "evaluation": {
      "evaluatorId": "preset-contains",
      "expectedField": "expected_device",
      "weight": 0.25,
      "isCritical": true,
      "condition": "fields.device_change === false"
    }
  },
  {
    "name": "检索标题",
    "key": "context",
    "type": "string",
    "required": true,
    "evaluation": {
      "evaluatorId": "preset-similarity",
      "expectedField": "expected_context",
      "weight": 0.15,
      "isCritical": false
    }
  }
]
```

**AggregationConfig 类型定义**：

```typescript
type AggregationConfig = {
  // 聚合模式
  mode: 'all_pass' | 'weighted_average' | 'critical_first' | 'custom';
  
  // weighted_average 模式：通过阈值（默认 0.6）
  passThreshold?: number;
  
  // custom 模式：自定义表达式
  // 例如: "fields.problem_type.passed && fields.get_device.score > 0.8"
  customExpression?: string;
};
```

### 2.3 修改模型：Prompt（关联 Schema）

```prisma
model Prompt {
  id             String   @id @default(uuid())
  name           String
  description    String?
  content        String
  
  // 原有字段保留，用于简单场景
  variables      Json     @default("[]")
  
  // 新增：关联输入结构定义（可选）
  inputSchemaId  String?  @map("input_schema_id")
  inputSchema    InputSchema? @relation(fields: [inputSchemaId], references: [id])
  
  // 新增：关联输出结构定义（可选）
  outputSchemaId String?  @map("output_schema_id")
  outputSchema   OutputSchema? @relation(fields: [outputSchemaId], references: [id])
  
  // ... 其他字段保持不变
}
```

### 2.4 修改模型：TaskResult（支持结构化输出）

```prisma
model TaskResult {
  id              String           @id @default(uuid())
  taskId          String           @map("task_id")
  task            Task             @relation(...)
  
  // ... 现有关联字段保持不变 ...
  
  // === 修改：输入输出存储 ===
  input           Json             // 保持 Json 类型，存储结构化输入
  
  // 原有 output 字段改名，保持兼容
  outputRaw       String?          @map("output_raw")    // 模型原始输出
  
  // 新增：解析后的结构化输出
  outputParsed    Json?            @map("output_parsed") // 解析后的字段值
  parseSuccess    Boolean          @default(true) @map("parse_success")
  parseError      String?          @map("parse_error")
  
  // expected 改为 Json 类型，存储多字段期望值
  expectedValues  Json?            @map("expected_values") // { fieldKey: expectedValue }
  
  // ... 其他字段保持不变 ...
  
  // === 新增关联 ===
  fieldEvaluations FieldEvaluationResult[]
  
  @@map("task_results")
}
```

### 2.5 新增模型：FieldEvaluationResult（字段级评估结果）

```prisma
// 字段级评估结果
model FieldEvaluationResult {
  id              String     @id @default(uuid())
  
  taskResultId    String     @map("task_result_id")
  taskResult      TaskResult @relation(fields: [taskResultId], references: [id], onDelete: Cascade)
  
  // 字段信息
  fieldName       String     @map("field_name")      // 显示名称
  fieldKey        String     @map("field_key")       // JSON key
  fieldValue      Json?      @map("field_value")     // 实际值
  expectedValue   Json?      @map("expected_value")  // 期望值
  
  // 评估信息
  evaluatorId     String?    @map("evaluator_id")    // 使用的评估器（可为空表示跳过）
  evaluatorName   String?    @map("evaluator_name")
  
  // 评估结果
  passed          Boolean
  score           Decimal?   @db.Decimal(5, 4)       // 0.0000 - 1.0000
  reason          String?
  details         Json       @default("{}")
  
  // 状态标记
  skipped         Boolean    @default(false)         // 因条件不满足而跳过
  skipReason      String?    @map("skip_reason")
  
  // 性能
  latencyMs       Int?       @map("latency_ms")
  
  createdAt       DateTime   @default(now()) @map("created_at")
  
  @@index([taskResultId])
  @@index([fieldKey])
  @@index([passed])
  @@map("field_evaluation_results")
}
```

### 2.6 数据模型关系图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              数据模型关系                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   InputSchema   │
                    │  (输入结构定义)  │
                    │  variables: []  │
                    └────────┬────────┘
                             │ 1:N (可选)
                             │
┌─────────────────┐          │          ┌─────────────────┐
│   OutputSchema  │          │          │    Dataset      │
│  (输出结构定义)  │◄─────────┼─────────►│   (数据集)      │
│  fields: []     │          │          │   schema: []    │
│  aggregation    │          │          └────────┬────────┘
└────────┬────────┘          │                   │
         │ 1:N (可选)        │                   │
         │                   │                   │
         │          ┌────────▼────────┐          │
         └─────────►│     Prompt      │◄─────────┘
                    │    (提示词)      │   字段映射
                    │  inputSchemaId  │
                    │  outputSchemaId │
                    └────────┬────────┘
                             │
                             │
                    ┌────────▼────────┐
                    │      Task       │
                    │     (任务)      │
                    └────────┬────────┘
                             │
                             │ 1:N
                    ┌────────▼────────┐
                    │   TaskResult    │
                    │   (测试结果)    │
                    │  outputParsed   │
                    │  expectedValues │
                    └────────┬────────┘
                             │
                             │ 1:N
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │FieldEvaluat │  │FieldEvaluat │  │FieldEvaluat │
    │  ionResult  │  │  ionResult  │  │  ionResult  │
    │ (字段1评估) │  │ (字段2评估) │  │ (字段N评估) │
    └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 三、核心引擎设计

### 3.1 模板渲染引擎（支持复杂变量）

**现有问题**：只支持 `{{variable}}` 简单替换

**升级方案**：引入 Handlebars 模板引擎

```typescript
// packages/shared/src/template/templateEngine.ts

import Handlebars from 'handlebars';

// 注册自定义 helper
Handlebars.registerHelper('json', (context) => JSON.stringify(context));
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('includes', (arr, item) => Array.isArray(arr) && arr.includes(item));

export class TemplateEngine {
  private cache: Map<string, HandlebarsTemplateDelegate> = new Map();
  
  /**
   * 渲染提示词模板
   * 支持: {{var}}, {{obj.prop}}, {{#each}}, {{#if}}, {{#with}}
   */
  render(template: string, variables: Record<string, unknown>): string {
    let compiled = this.cache.get(template);
    
    if (!compiled) {
      compiled = Handlebars.compile(template, { strict: false });
      this.cache.set(template, compiled);
    }
    
    return compiled(variables);
  }
  
  /**
   * 从模板中提取变量名（用于校验）
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{([^#/}][^}]*)\}\}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      // 提取根变量名（处理 obj.prop 格式）
      const varPath = match[1].trim();
      const rootVar = varPath.split('.')[0].split(' ')[0];
      if (rootVar && !['else', 'this'].includes(rootVar)) {
        variables.add(rootVar);
      }
    }
    
    return Array.from(variables);
  }
}
```

**模板示例**：

```handlebars
你是一个智能客服助手。

## 用户信息
- 当前咨询设备: {{current_device}}
- 用户拥有的设备:
{{#each all_devices}}
  - {{this}}
{{/each}}

## 对话历史
{{#if dialog_history.length}}
{{#each dialog_history}}
[{{this.role}}]: {{this.content}}
{{/each}}
{{else}}
（无历史对话）
{{/if}}

## 用户当前问题
{{user_question}}

请分析用户问题并返回 JSON 格式结果。
```

### 3.2 输出解析引擎

```typescript
// packages/shared/src/parser/outputParser.ts

import { OutputSchema, ParseMode, OutputFieldDefinition } from '../types';

export interface ParseResult {
  success: boolean;
  fields: Record<string, unknown>;
  errors: Array<{ field: string; error: string }>;
  rawOutput: string;
}

export interface OutputParser {
  parse(rawOutput: string, schema: OutputSchema): ParseResult;
}

/**
 * JSON 解析器
 */
export class JsonOutputParser implements OutputParser {
  parse(rawOutput: string, schema: OutputSchema): ParseResult {
    const errors: Array<{ field: string; error: string }> = [];
    let parsed: Record<string, unknown>;
    
    // 尝试解析 JSON
    try {
      parsed = this.extractJson(rawOutput, schema.parseMode);
    } catch (e) {
      return {
        success: false,
        fields: {},
        errors: [{ field: '_root', error: `JSON 解析失败: ${e.message}` }],
        rawOutput
      };
    }
    
    // 验证并提取字段
    const fields: Record<string, unknown> = {};
    
    for (const fieldDef of schema.fields as OutputFieldDefinition[]) {
      const value = parsed[fieldDef.key];
      
      // 必填检查
      if (value === undefined || value === null) {
        if (fieldDef.required) {
          errors.push({ field: fieldDef.key, error: '必填字段缺失' });
        }
        continue;
      }
      
      // 类型检查
      const typeError = this.validateType(value, fieldDef);
      if (typeError) {
        errors.push({ field: fieldDef.key, error: typeError });
        continue;
      }
      
      // 枚举检查
      if (fieldDef.type === 'enum' && fieldDef.enumValues) {
        if (!fieldDef.enumValues.includes(value as string)) {
          errors.push({ 
            field: fieldDef.key, 
            error: `值 "${value}" 不在枚举范围 [${fieldDef.enumValues.join(', ')}] 内` 
          });
          continue;
        }
      }
      
      fields[fieldDef.key] = value;
    }
    
    return {
      success: errors.length === 0,
      fields,
      errors,
      rawOutput
    };
  }
  
  private extractJson(output: string, mode: ParseMode): Record<string, unknown> {
    switch (mode) {
      case 'JSON':
        return JSON.parse(output);
        
      case 'JSON_EXTRACT':
        // 尝试从 markdown code block 提取
        const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          return JSON.parse(codeBlockMatch[1].trim());
        }
        // 尝试提取裸 JSON
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('未找到有效的 JSON 内容');
        
      default:
        return JSON.parse(output);
    }
  }
  
  private validateType(value: unknown, fieldDef: OutputFieldDefinition): string | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    switch (fieldDef.type) {
      case 'string':
      case 'enum':
        if (typeof value !== 'string') {
          return `期望 string，实际 ${actualType}`;
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          return `期望 number，实际 ${actualType}`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `期望 boolean，实际 ${actualType}`;
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return `期望 array，实际 ${actualType}`;
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          return `期望 object，实际 ${actualType}`;
        }
        break;
    }
    
    return null;
  }
}

/**
 * 解析器工厂
 */
export function createOutputParser(mode: ParseMode): OutputParser {
  switch (mode) {
    case 'JSON':
    case 'JSON_EXTRACT':
      return new JsonOutputParser();
    // 后续可扩展 REGEX, TEMPLATE 等
    default:
      return new JsonOutputParser();
  }
}
```

### 3.3 条件表达式求值器

```typescript
// packages/shared/src/evaluator/conditionEvaluator.ts

/**
 * 安全的条件表达式求值器
 * 支持: fields.xxx, evaluated.xxx, 比较运算符, 逻辑运算符
 */
export class ConditionEvaluator {
  /**
   * 评估条件表达式
   * @param expression 条件表达式，如 "fields.device_change === false"
   * @param context 上下文数据 { fields: {...}, evaluated: {...} }
   */
  evaluate(expression: string, context: EvaluationContext): boolean {
    if (!expression || expression.trim() === '') {
      return true;
    }
    
    try {
      // 安全求值：只允许特定操作
      const safeEval = this.createSafeEvaluator(context);
      return safeEval(expression);
    } catch (e) {
      console.warn(`条件表达式求值失败: ${expression}`, e);
      return true; // 失败时默认为 true，允许评估
    }
  }
  
  private createSafeEvaluator(context: EvaluationContext): (expr: string) => boolean {
    // 使用 Function 构造器创建沙箱环境
    const fn = new Function(
      'fields',
      'evaluated',
      `"use strict"; return (${this.sanitizeExpression(arguments[0])});`
    );
    
    return (expr: string) => {
      const sanitized = this.sanitizeExpression(expr);
      const evaluator = new Function(
        'fields',
        'evaluated',
        `"use strict"; return (${sanitized});`
      );
      return Boolean(evaluator(context.fields, context.evaluated));
    };
  }
  
  private sanitizeExpression(expr: string): string {
    // 只允许安全的操作符和标识符
    const allowed = /^[\w\s.[\]'"()&|!=<>+\-*/]+$/;
    if (!allowed.test(expr)) {
      throw new Error('表达式包含不允许的字符');
    }
    
    // 禁止危险关键字
    const forbidden = /\b(eval|function|constructor|prototype|__proto__|window|document|global)\b/i;
    if (forbidden.test(expr)) {
      throw new Error('表达式包含禁止的关键字');
    }
    
    return expr;
  }
}

interface EvaluationContext {
  fields: Record<string, unknown>;      // 当前解析出的所有字段值
  evaluated: Record<string, {           // 已评估字段的结果
    value: unknown;
    passed: boolean;
    score?: number;
  }>;
}
```

### 3.4 字段级评估引擎

```typescript
// packages/evaluators/src/fieldEvaluationEngine.ts

import { OutputFieldDefinition, FieldEvaluationResult } from '@repo/shared';
import { ConditionEvaluator } from './conditionEvaluator';
import { EvaluatorRegistry } from './evaluatorRegistry';

export class FieldEvaluationEngine {
  constructor(
    private evaluatorRegistry: EvaluatorRegistry,
    private conditionEvaluator: ConditionEvaluator
  ) {}
  
  /**
   * 执行字段级评估
   */
  async evaluateFields(
    taskResultId: string,
    parsedFields: Record<string, unknown>,
    expectedValues: Record<string, unknown>,
    fieldDefinitions: OutputFieldDefinition[],
    metadata: Record<string, unknown>
  ): Promise<FieldEvaluationResult[]> {
    const results: FieldEvaluationResult[] = [];
    const evaluated: Record<string, { value: unknown; passed: boolean; score?: number }> = {};
    
    // 按字段定义顺序执行（支持依赖）
    // 未来可优化为拓扑排序
    for (const fieldDef of fieldDefinitions) {
      const fieldValue = parsedFields[fieldDef.key];
      const expectedValue = fieldDef.evaluation?.expectedField
        ? expectedValues[fieldDef.evaluation.expectedField]
        : undefined;
      
      // 检查条件
      if (fieldDef.evaluation?.condition) {
        const shouldEvaluate = this.conditionEvaluator.evaluate(
          fieldDef.evaluation.condition,
          { fields: parsedFields, evaluated }
        );
        
        if (!shouldEvaluate) {
          results.push({
            taskResultId,
            fieldName: fieldDef.name,
            fieldKey: fieldDef.key,
            fieldValue,
            expectedValue,
            evaluatorId: fieldDef.evaluation?.evaluatorId,
            passed: true,
            score: null,
            reason: null,
            skipped: true,
            skipReason: `条件不满足: ${fieldDef.evaluation.condition}`
          });
          continue;
        }
      }
      
      // 无评估器配置则跳过
      if (!fieldDef.evaluation?.evaluatorId) {
        results.push({
          taskResultId,
          fieldName: fieldDef.name,
          fieldKey: fieldDef.key,
          fieldValue,
          expectedValue,
          passed: true,
          score: null,
          skipped: true,
          skipReason: '未配置评估器'
        });
        continue;
      }
      
      // 执行评估
      const startTime = Date.now();
      const evaluator = await this.evaluatorRegistry.get(fieldDef.evaluation.evaluatorId);
      
      const evalResult = await evaluator.evaluate({
        input: JSON.stringify(metadata),
        output: this.serializeValue(fieldValue),
        expected: this.serializeValue(expectedValue),
        metadata: {
          ...metadata,
          fieldDefinition: fieldDef,
          allFields: parsedFields
        }
      });
      
      const latencyMs = Date.now() - startTime;
      
      const result: FieldEvaluationResult = {
        taskResultId,
        fieldName: fieldDef.name,
        fieldKey: fieldDef.key,
        fieldValue,
        expectedValue,
        evaluatorId: fieldDef.evaluation.evaluatorId,
        evaluatorName: evaluator.name,
        passed: evalResult.passed,
        score: evalResult.score ?? (evalResult.passed ? 1 : 0),
        reason: evalResult.reason,
        details: evalResult.details || {},
        skipped: false,
        latencyMs
      };
      
      results.push(result);
      
      // 记录已评估结果（供后续条件判断使用）
      evaluated[fieldDef.key] = {
        value: fieldValue,
        passed: result.passed,
        score: result.score
      };
    }
    
    return results;
  }
  
  private serializeValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }
}
```

### 3.5 聚合引擎

```typescript
// packages/evaluators/src/aggregationEngine.ts

import { FieldEvaluationResult, AggregationConfig } from '@repo/shared';

export interface AggregatedResult {
  passed: boolean;
  score: number;
  breakdown: Array<{
    fieldKey: string;
    fieldName: string;
    weight: number;
    score: number;
    contribution: number;
    passed: boolean;
    isCritical: boolean;
  }>;
  reason: string;
}

export class AggregationEngine {
  aggregate(
    fieldResults: FieldEvaluationResult[],
    fieldDefinitions: OutputFieldDefinition[],
    config: AggregationConfig
  ): AggregatedResult {
    // 构建字段权重和关键字段映射
    const fieldConfigMap = new Map(
      fieldDefinitions.map(f => [f.key, f.evaluation])
    );
    
    // 过滤掉跳过的字段
    const activeResults = fieldResults.filter(r => !r.skipped);
    
    switch (config.mode) {
      case 'all_pass':
        return this.aggregateAllPass(activeResults, fieldConfigMap);
        
      case 'weighted_average':
        return this.aggregateWeightedAverage(activeResults, fieldConfigMap, config);
        
      case 'critical_first':
        return this.aggregateCriticalFirst(activeResults, fieldConfigMap, config);
        
      case 'custom':
        return this.aggregateCustom(activeResults, config);
        
      default:
        return this.aggregateAllPass(activeResults, fieldConfigMap);
    }
  }
  
  /**
   * 全部通过模式：所有字段必须通过
   */
  private aggregateAllPass(
    results: FieldEvaluationResult[],
    configMap: Map<string, any>
  ): AggregatedResult {
    const breakdown = results.map(r => ({
      fieldKey: r.fieldKey,
      fieldName: r.fieldName,
      weight: configMap.get(r.fieldKey)?.weight ?? 1,
      score: r.score ?? (r.passed ? 1 : 0),
      contribution: r.passed ? 1 : 0,
      passed: r.passed,
      isCritical: configMap.get(r.fieldKey)?.isCritical ?? false
    }));
    
    const allPassed = results.every(r => r.passed);
    const avgScore = results.length > 0
      ? results.reduce((sum, r) => sum + (r.score ?? (r.passed ? 1 : 0)), 0) / results.length
      : 0;
    
    const failedFields = results.filter(r => !r.passed).map(r => r.fieldName);
    
    return {
      passed: allPassed,
      score: avgScore,
      breakdown,
      reason: allPassed
        ? '所有字段均通过'
        : `以下字段未通过: ${failedFields.join(', ')}`
    };
  }
  
  /**
   * 加权平均模式：按权重计算综合得分
   */
  private aggregateWeightedAverage(
    results: FieldEvaluationResult[],
    configMap: Map<string, any>,
    config: AggregationConfig
  ): AggregatedResult {
    let totalWeight = 0;
    let weightedSum = 0;
    
    const breakdown = results.map(r => {
      const weight = configMap.get(r.fieldKey)?.weight ?? 1;
      const score = r.score ?? (r.passed ? 1 : 0);
      const contribution = weight * score;
      
      totalWeight += weight;
      weightedSum += contribution;
      
      return {
        fieldKey: r.fieldKey,
        fieldName: r.fieldName,
        weight,
        score,
        contribution,
        passed: r.passed,
        isCritical: configMap.get(r.fieldKey)?.isCritical ?? false
      };
    });
    
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const threshold = config.passThreshold ?? 0.6;
    
    return {
      passed: finalScore >= threshold,
      score: finalScore,
      breakdown,
      reason: `加权平均分: ${(finalScore * 100).toFixed(1)}%，阈值: ${(threshold * 100)}%`
    };
  }
  
  /**
   * 关键字段优先模式：关键字段必须全过，其他加权
   */
  private aggregateCriticalFirst(
    results: FieldEvaluationResult[],
    configMap: Map<string, any>,
    config: AggregationConfig
  ): AggregatedResult {
    // 分离关键字段和普通字段
    const criticalResults = results.filter(r => configMap.get(r.fieldKey)?.isCritical);
    const normalResults = results.filter(r => !configMap.get(r.fieldKey)?.isCritical);
    
    // 检查关键字段
    const failedCritical = criticalResults.filter(r => !r.passed);
    if (failedCritical.length > 0) {
      return {
        passed: false,
        score: 0,
        breakdown: results.map(r => ({
          fieldKey: r.fieldKey,
          fieldName: r.fieldName,
          weight: configMap.get(r.fieldKey)?.weight ?? 1,
          score: r.score ?? 0,
          contribution: 0,
          passed: r.passed,
          isCritical: configMap.get(r.fieldKey)?.isCritical ?? false
        })),
        reason: `关键字段未通过: ${failedCritical.map(r => r.fieldName).join(', ')}`
      };
    }
    
    // 关键字段全过，对普通字段加权平均
    if (normalResults.length === 0) {
      return {
        passed: true,
        score: 1,
        breakdown: results.map(r => ({
          fieldKey: r.fieldKey,
          fieldName: r.fieldName,
          weight: configMap.get(r.fieldKey)?.weight ?? 1,
          score: r.score ?? 1,
          contribution: r.score ?? 1,
          passed: r.passed,
          isCritical: true
        })),
        reason: '所有关键字段通过'
      };
    }
    
    // 计算普通字段加权得分
    const normalAgg = this.aggregateWeightedAverage(normalResults, configMap, config);
    
    return {
      passed: normalAgg.passed,
      score: normalAgg.score,
      breakdown: results.map(r => {
        const normalBreakdown = normalAgg.breakdown.find(b => b.fieldKey === r.fieldKey);
        return normalBreakdown || {
          fieldKey: r.fieldKey,
          fieldName: r.fieldName,
          weight: 0,
          score: r.score ?? 1,
          contribution: 0,
          passed: r.passed,
          isCritical: true
        };
      }),
      reason: `关键字段全部通过，普通字段${normalAgg.reason}`
    };
  }
  
  /**
   * 自定义表达式模式
   */
  private aggregateCustom(
    results: FieldEvaluationResult[],
    config: AggregationConfig
  ): AggregatedResult {
    // 构建字段结果映射
    const fields: Record<string, { passed: boolean; score: number }> = {};
    for (const r of results) {
      fields[r.fieldKey] = {
        passed: r.passed,
        score: r.score ?? (r.passed ? 1 : 0)
      };
    }
    
    try {
      const evaluator = new Function(
        'fields',
        `"use strict"; return Boolean(${config.customExpression});`
      );
      const passed = evaluator(fields);
      
      const avgScore = results.length > 0
        ? results.reduce((sum, r) => sum + (r.score ?? 0), 0) / results.length
        : 0;
      
      return {
        passed,
        score: avgScore,
        breakdown: results.map(r => ({
          fieldKey: r.fieldKey,
          fieldName: r.fieldName,
          weight: 1,
          score: r.score ?? 0,
          contribution: r.score ?? 0,
          passed: r.passed,
          isCritical: false
        })),
        reason: `自定义表达式: ${config.customExpression} = ${passed}`
      };
    } catch (e) {
      return {
        passed: false,
        score: 0,
        breakdown: [],
        reason: `表达式执行失败: ${e.message}`
      };
    }
  }
}
```

---

## 四、任务执行流程升级

### 4.1 升级后的执行流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          升级后的任务执行流程                                │
└─────────────────────────────────────────────────────────────────────────────┘

1. 任务启动
   │
   ├─── 加载配置 ───► Prompt + InputSchema + OutputSchema + Dataset
   │
   ▼
2. 数据准备
   │
   ├─── 遍历数据集行
   │    │
   │    ├─── 根据 InputSchema.variables 映射字段
   │    │    { datasetField → variableKey }
   │    │
   │    └─── 根据 OutputSchema.fields 映射期望值
   │         { expectedField → fieldKey }
   │
   ▼
3. 执行循环（每条数据）
   │
   ├─── 3.1 渲染提示词
   │    │
   │    │   输入: Prompt.content + 结构化变量
   │    │   引擎: Handlebars（支持嵌套、循环、条件）
   │    │
   │    └─── 输出: 完整提示词文本
   │
   ├─── 3.2 调用模型
   │    │
   │    └─── 输出: rawOutput (string)
   │
   ├─── 3.3 解析输出 ◄─── 新增步骤
   │    │
   │    │   输入: rawOutput + OutputSchema
   │    │   引擎: OutputParser（JSON/正则/模板）
   │    │
   │    ├─── 成功: parsedFields { key: value, ... }
   │    │
   │    └─── 失败: parseError（仍继续，字段评估标记为失败）
   │
   ├─── 3.4 字段级评估 ◄─── 新增步骤
   │    │
   │    │   遍历 OutputSchema.fields:
   │    │   │
   │    │   ├─── 检查 condition（条件不满足则跳过）
   │    │   │
   │    │   ├─── 获取 evaluatorId 对应的评估器
   │    │   │
   │    │   ├─── 执行评估: fieldValue vs expectedValue
   │    │   │
   │    │   └─── 保存 FieldEvaluationResult
   │    │
   │    └─── 输出: FieldEvaluationResult[]
   │
   ├─── 3.5 聚合计算 ◄─── 新增步骤
   │    │
   │    │   输入: FieldEvaluationResult[] + AggregationConfig
   │    │   引擎: AggregationEngine
   │    │
   │    │   模式:
   │    │   - all_pass: 全部通过才算通过
   │    │   - weighted_average: 加权平均 >= 阈值
   │    │   - critical_first: 关键字段必过 + 其他加权
   │    │   - custom: 自定义表达式
   │    │
   │    └─── 输出: { passed, score, breakdown, reason }
   │
   └─── 3.6 保存结果
        │
        ├─── TaskResult
        │    - outputRaw
        │    - outputParsed
        │    - expectedValues
        │    - 聚合后的 passed/score
        │
        └─── FieldEvaluationResult[] （批量插入）
   │
   ▼
4. 任务完成
   │
   ├─── 计算统计（含字段级统计）
   │
   └─── 推送完成事件
```

### 4.2 执行代码示例

```typescript
// apps/web/src/lib/executor/structuredTaskExecutor.ts

export class StructuredTaskExecutor {
  constructor(
    private templateEngine: TemplateEngine,
    private outputParser: OutputParser,
    private fieldEvaluationEngine: FieldEvaluationEngine,
    private aggregationEngine: AggregationEngine
  ) {}
  
  async executeSingle(
    prompt: PromptWithSchema,
    model: Model,
    datasetRow: DatasetRow,
    evaluators: Evaluator[]
  ): Promise<TaskResultWithFieldEvaluations> {
    // 1. 构建输入变量
    const variables = this.buildVariables(prompt.inputSchema, datasetRow.data);
    
    // 2. 渲染提示词
    const renderedPrompt = this.templateEngine.render(prompt.content, variables);
    
    // 3. 调用模型
    const modelResult = await this.callModel(model, renderedPrompt);
    
    // 4. 解析输出
    const parseResult = this.outputParser.parse(
      modelResult.output,
      prompt.outputSchema
    );
    
    // 5. 构建期望值映射
    const expectedValues = this.buildExpectedValues(
      prompt.outputSchema.fields,
      datasetRow.data
    );
    
    // 6. 字段级评估
    const fieldEvaluations = await this.fieldEvaluationEngine.evaluateFields(
      'temp-id', // 实际保存时生成
      parseResult.fields,
      expectedValues,
      prompt.outputSchema.fields,
      { input: variables, rowIndex: datasetRow.rowIndex }
    );
    
    // 7. 聚合
    const aggregation = this.aggregationEngine.aggregate(
      fieldEvaluations,
      prompt.outputSchema.fields,
      prompt.outputSchema.aggregation
    );
    
    return {
      input: variables,
      outputRaw: modelResult.output,
      outputParsed: parseResult.fields,
      parseSuccess: parseResult.success,
      parseError: parseResult.errors.length > 0 
        ? parseResult.errors.map(e => `${e.field}: ${e.error}`).join('; ')
        : null,
      expectedValues,
      passed: aggregation.passed,
      score: aggregation.score,
      aggregationReason: aggregation.reason,
      fieldEvaluations,
      latencyMs: modelResult.latencyMs,
      tokens: modelResult.tokens
    };
  }
  
  private buildVariables(
    inputSchema: InputSchema | null,
    rowData: Record<string, unknown>
  ): Record<string, unknown> {
    if (!inputSchema) {
      // 简单模式：直接使用行数据
      return rowData;
    }
    
    const variables: Record<string, unknown> = {};
    
    for (const varDef of inputSchema.variables) {
      const datasetField = varDef.datasetField || varDef.key;
      let value = rowData[datasetField];
      
      // 类型转换
      if (value !== undefined) {
        value = this.convertType(value, varDef.type);
      } else if (varDef.defaultValue !== undefined) {
        value = varDef.defaultValue;
      }
      
      variables[varDef.key] = value;
    }
    
    return variables;
  }
  
  private buildExpectedValues(
    fields: OutputFieldDefinition[],
    rowData: Record<string, unknown>
  ): Record<string, unknown> {
    const expected: Record<string, unknown> = {};
    
    for (const field of fields) {
      if (field.evaluation?.expectedField) {
        expected[field.evaluation.expectedField] = rowData[field.evaluation.expectedField];
      }
    }
    
    return expected;
  }
  
  private convertType(value: unknown, type: string): unknown {
    if (type === 'array' && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(s => s.trim());
      }
    }
    if (type === 'object' && typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    if (type === 'number' && typeof value === 'string') {
      return Number(value);
    }
    if (type === 'boolean' && typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  }
}
```

---

## 五、API 设计

### 5.1 InputSchema API

```typescript
// POST /api/v1/input-schemas
// 创建输入结构定义
{
  "name": "智能客服输入变量",
  "description": "定义智能客服场景的输入上下文",
  "variables": [
    {
      "name": "用户当前设备",
      "key": "current_device",
      "type": "string",
      "required": true,
      "datasetField": "context_current_device"
    },
    {
      "name": "用户所有设备",
      "key": "all_devices",
      "type": "array",
      "itemType": "string",
      "required": true,
      "datasetField": "context_all_devices"
    }
  ]
}

// 响应
{
  "code": 200,
  "data": {
    "id": "input-schema-xxx",
    "name": "智能客服输入变量",
    "variables": [...],
    "createdAt": "2024-12-10T10:00:00Z"
  }
}
```

### 5.2 OutputSchema API

```typescript
// POST /api/v1/output-schemas
// 创建输出结构定义
{
  "name": "智能客服输出结构",
  "parseMode": "JSON_EXTRACT",
  "fields": [
    {
      "name": "问题分类",
      "key": "problem_type",
      "type": "enum",
      "required": true,
      "enumValues": ["bluetooth_connection", "wifi_issue", "battery", "screen", "other"],
      "evaluation": {
        "evaluatorId": "preset-exact-match",
        "expectedField": "expected_problem_type",
        "weight": 0.3,
        "isCritical": true
      }
    },
    {
      "name": "型号提取",
      "key": "get_device",
      "type": "string",
      "required": true,
      "evaluation": {
        "evaluatorId": "preset-contains",
        "expectedField": "expected_device",
        "weight": 0.25,
        "isCritical": true,
        "condition": "fields.device_change === false"
      }
    }
  ],
  "aggregation": {
    "mode": "critical_first",
    "passThreshold": 0.7
  }
}
```

### 5.3 Prompt API 扩展

```typescript
// PUT /api/v1/prompts/:id
// 更新提示词，关联 Schema
{
  "name": "智能客服意图识别",
  "content": "你是一个智能客服助手...",
  "inputSchemaId": "input-schema-xxx",   // 新增
  "outputSchemaId": "output-schema-xxx"  // 新增
}
```

### 5.4 Task Results API 扩展

```typescript
// GET /api/v1/tasks/:id/results/:resultId
// 获取单条结果详情（含字段级评估）
{
  "code": 200,
  "data": {
    "id": "result-xxx",
    "input": {
      "current_device": "iPhone 15 Pro",
      "all_devices": ["iPhone 15 Pro", "iPad Air"],
      "user_question": "我的手机连不上蓝牙耳机"
    },
    "outputRaw": "{\"thinking_process\": \"...\", \"problem_type\": \"bluetooth_connection\", ...}",
    "outputParsed": {
      "thinking_process": "用户提到蓝牙耳机连接问题...",
      "problem_type": "bluetooth_connection",
      "device_change": false,
      "get_device": "iPhone 15 Pro",
      "context": "iPhone蓝牙连接故障排查"
    },
    "parseSuccess": true,
    "expectedValues": {
      "expected_problem_type": "bluetooth_connection",
      "expected_device_change": false,
      "expected_device": "iPhone 15",
      "expected_context": "iPhone蓝牙连接故障排查"
    },
    "passed": true,
    "score": 0.87,
    
    // 新增：字段级评估结果
    "fieldEvaluations": [
      {
        "fieldName": "问题分类",
        "fieldKey": "problem_type",
        "fieldValue": "bluetooth_connection",
        "expectedValue": "bluetooth_connection",
        "evaluatorName": "精确匹配",
        "passed": true,
        "score": 1.0,
        "isCritical": true
      },
      {
        "fieldName": "型号提取",
        "fieldKey": "get_device",
        "fieldValue": "iPhone 15 Pro",
        "expectedValue": "iPhone 15",
        "evaluatorName": "包含匹配",
        "passed": true,
        "score": 0.9,
        "reason": "输出包含期望值",
        "isCritical": true
      },
      {
        "fieldName": "分类思考过程",
        "fieldKey": "thinking_process",
        "fieldValue": "用户提到蓝牙耳机连接问题...",
        "evaluatorName": "LLM推理质量",
        "passed": true,
        "score": 0.85,
        "reason": "推理过程清晰",
        "isCritical": false
      }
    ],
    
    // 新增：聚合详情
    "aggregation": {
      "mode": "critical_first",
      "passed": true,
      "score": 0.87,
      "breakdown": [
        { "fieldName": "问题分类", "weight": 0.3, "score": 1.0, "contribution": 0.3, "isCritical": true },
        { "fieldName": "型号提取", "weight": 0.25, "score": 0.9, "contribution": 0.225, "isCritical": true },
        { "fieldName": "设备更改", "weight": 0.2, "score": 1.0, "contribution": 0.2, "isCritical": false },
        { "fieldName": "检索标题", "weight": 0.15, "score": 0.95, "contribution": 0.1425, "isCritical": false },
        { "fieldName": "思考过程", "weight": 0.1, "score": 0.85, "contribution": 0.085, "isCritical": false }
      ],
      "reason": "关键字段全部通过，普通字段加权平均: 87%"
    }
  }
}
```

### 5.5 字段级统计 API

```typescript
// GET /api/v1/tasks/:id/stats/fields
// 获取字段级统计
{
  "code": 200,
  "data": {
    "taskId": "task-xxx",
    "totalResults": 200,
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
      },
      {
        "fieldKey": "get_device",
        "fieldName": "型号提取",
        "isCritical": true,
        "passRate": 0.82,
        "avgScore": 0.85,
        "passCount": 148,
        "failCount": 32,
        "skipCount": 20  // 因条件跳过
      },
      {
        "fieldKey": "thinking_process",
        "fieldName": "分类思考过程",
        "isCritical": false,
        "passRate": 0.70,
        "avgScore": 0.75,
        "passCount": 140,
        "failCount": 60,
        "skipCount": 0
      }
    ],
    
    // 按字段分组的失败原因
    "failureReasons": {
      "problem_type": [
        { "reason": "分类错误：实际为 wifi_issue，期望 bluetooth", "count": 5 },
        { "reason": "分类错误：实际为 other，期望 battery", "count": 3 }
      ],
      "get_device": [
        { "reason": "未提取到设备型号", "count": 20 },
        { "reason": "提取的型号不包含期望值", "count": 12 }
      ]
    }
  }
}
```

---

## 六、AI 配置助手设计

### 6.1 功能概述

**AI 配置助手**是本次升级的核心易用性功能，帮助用户通过对话方式快速完成：
1. 输入变量结构定义（InputSchema）
2. 输出字段结构定义（OutputSchema）
3. 数据集模板文件生成与下载

### 6.2 交互流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI 配置助手工作流程                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Step 1      │     │  Step 2      │     │  Step 3      │     │  Step 4      │
│  选择模型    │────►│  描述场景    │────►│  确认结构    │────►│  下载模板    │
│              │     │              │     │              │     │              │
│ [模型下拉框] │     │ [对话输入]   │     │ [预览编辑]   │     │ [Excel下载]  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### 6.3 页面设计：AI 配置助手

**入口**：Schema 管理页 → "AI 智能配置" 按钮
**路由**：`/schemas/ai-assistant`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← 返回    AI 配置助手                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ Step 1: 选择 AI 模型 ───────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  选择用于生成配置的模型:                                              │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  [OpenAI / GPT-4o                                           ▼]  │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  已配置的模型:                                                        │  │
│  │  • OpenAI: GPT-4o, GPT-4o-mini                                       │  │
│  │  • Anthropic: Claude-3.5-Sonnet                                      │  │
│  │  • 自定义: DeepSeek-V3                                               │  │
│  │                                                                       │  │
│  │  💡 建议使用能力较强的模型以获得更准确的结构定义                       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Step 2: 描述你的测试场景 ────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 🤖 请描述你要测试的 AI 应用场景，包括：                        │   │  │
│  │  │    1. 输入时需要提供哪些上下文信息？                           │   │  │
│  │  │    2. 模型输出应该包含哪些字段？                               │   │  │
│  │  │    3. 哪些输出字段是关键的（必须正确）？                       │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 👤 我在做智能客服的意图识别测试。                              │   │  │
│  │  │                                                                │   │  │
│  │  │ 输入上下文需要：                                               │   │  │
│  │  │ - 用户当前咨询的设备型号                                       │   │  │
│  │  │ - 用户拥有的所有设备列表                                       │   │  │
│  │  │ - 用户的问题内容                                               │   │  │
│  │  │ - 历史对话记录（可选）                                         │   │  │
│  │  │                                                                │   │  │
│  │  │ 输出需要：                                                     │   │  │
│  │  │ - 分类思考过程                                                 │   │  │
│  │  │ - 问题分类（蓝牙/WiFi/电池/屏幕/其他）                        │   │  │
│  │  │ - 用户是否在问其他设备的问题                                   │   │  │
│  │  │ - 从问题中提取的设备型号                                       │   │  │
│  │  │ - 建议的检索关键词                                             │   │  │
│  │  │                                                                │   │  │
│  │  │ 其中"问题分类"和"设备型号提取"是关键字段，必须准确。          │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │                                                    [生成配置 →]       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌─ Step 3: 确认生成的结构 ──────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─ 输入变量结构 (InputSchema) ────────────────────────── [编辑] ──┐ │  │
│  │  │                                                                  │ │  │
│  │  │  名称: 智能客服输入变量                                          │ │  │
│  │  │                                                                  │ │  │
│  │  │  ┌────────────┬──────────┬────────┬────────────────────────────┐│ │  │
│  │  │  │ 变量名     │ 类型     │ 必填   │ 数据集列名                 ││ │  │
│  │  │  ├────────────┼──────────┼────────┼────────────────────────────┤│ │  │
│  │  │  │ 当前设备   │ string   │ ✓      │ ctx_current_device         ││ │  │
│  │  │  │ 所有设备   │ array    │ ✓      │ ctx_all_devices            ││ │  │
│  │  │  │ 用户问题   │ string   │ ✓      │ ctx_user_question          ││ │  │
│  │  │  │ 对话历史   │ array    │        │ ctx_dialog_history         ││ │  │
│  │  │  └────────────┴──────────┴────────┴────────────────────────────┘│ │  │
│  │  │                                                                  │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  ┌─ 输出字段结构 (OutputSchema) ───────────────────────── [编辑] ──┐ │  │
│  │  │                                                                  │ │  │
│  │  │  名称: 智能客服输出结构                                          │ │  │
│  │  │  解析模式: JSON 提取                                             │ │  │
│  │  │  聚合策略: 关键字段优先 (阈值 70%)                               │ │  │
│  │  │                                                                  │ │  │
│  │  │  ┌────────────┬────────┬────────┬──────────┬─────────┬────────┐│ │  │
│  │  │  │ 字段名     │ 类型   │ 关键   │ 评估器   │ 权重    │ 期望列 ││ │  │
│  │  │  ├────────────┼────────┼────────┼──────────┼─────────┼────────┤│ │  │
│  │  │  │ 思考过程   │ string │        │ LLM评估  │ 0.10    │ -      ││ │  │
│  │  │  │ 问题分类   │ enum   │ ★      │ 精确匹配 │ 0.30    │ exp_type││ │  │
│  │  │  │ 设备更改   │ boolean│        │ 精确匹配 │ 0.15    │ exp_chg ││ │  │
│  │  │  │ 型号提取   │ string │ ★      │ 包含匹配 │ 0.30    │ exp_dev ││ │  │
│  │  │  │ 检索关键词 │ string │        │ 相似度   │ 0.15    │ exp_kw  ││ │  │
│  │  │  └────────────┴────────┴────────┴──────────┴─────────┴────────┘│ │  │
│  │  │                                                                  │ │  │
│  │  │  枚举值 (问题分类): bluetooth, wifi, battery, screen, other     │ │  │
│  │  │                                                                  │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │                                    [重新生成]    [确认并继续 →]       │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Step 4: 下载数据集模板 ──────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ✅ 结构定义已保存！                                                  │  │
│  │                                                                       │  │
│  │  下载数据集模板文件，按模板填写测试数据：                             │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │  📄 智能客服测试数据模板.xlsx                                    │ │  │
│  │  │                                                                  │ │  │
│  │  │  包含列:                                                         │ │  │
│  │  │  • ctx_current_device (输入-当前设备)                            │ │  │
│  │  │  • ctx_all_devices (输入-所有设备，JSON数组格式)                 │ │  │
│  │  │  • ctx_user_question (输入-用户问题)                             │ │  │
│  │  │  • ctx_dialog_history (输入-对话历史，JSON数组格式)              │ │  │
│  │  │  • exp_type (期望-问题分类)                                      │ │  │
│  │  │  • exp_chg (期望-设备更改)                                       │ │  │
│  │  │  • exp_dev (期望-型号提取)                                       │ │  │
│  │  │  • exp_kw (期望-检索关键词)                                      │ │  │
│  │  │                                                                  │ │  │
│  │  │                                         [下载 Excel] [下载 CSV]  │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  接下来:                                                              │  │
│  │  • [去创建提示词] - 创建提示词并关联此结构                           │  │
│  │  • [去上传数据集] - 上传填写好的数据集                               │  │
│  │  • [返回 Schema 管理] - 查看已创建的结构定义                         │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 AI 配置助手 API

#### 设计原则：AI 只输出必要信息，代码负责组装

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

#### API 请求

```typescript
// POST /api/v1/schemas/ai-generate
{
  "modelId": "model-gpt4o-xxx",           // 使用哪个模型生成（复用模型选择器）
  "sceneName": "智能客服意图识别",         // 场景名称
  "description": "我在做智能客服的意图识别测试..."  // 用户描述
}
```

#### AI 原始输出（精简）

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

#### 代码组装逻辑

```typescript
// packages/shared/src/schema/schemaAssembler.ts

interface AISchemaOutput {
  inputs: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required: boolean;
  }>;
  outputs: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'enum' | 'array';
    values?: string[];  // 仅 enum 类型
    critical: boolean;
  }>;
}

export function assembleSchemas(
  aiOutput: AISchemaOutput, 
  sceneName: string
): { inputSchema: InputSchemaCreate; outputSchema: OutputSchemaCreate } {
  
  // ========== 1. 组装 InputSchema ==========
  const inputSchema: InputSchemaCreate = {
    name: `${sceneName}输入变量`,
    variables: aiOutput.inputs.map(input => ({
      name: input.name,
      key: toCamelCase(input.name),                    // 代码生成
      type: input.type,
      required: input.required,
      datasetField: `ctx_${toSnakeCase(input.name)}`,  // 代码生成：ctx_ 前缀
    }))
  };

  // ========== 2. 组装 OutputSchema ==========
  const hasCriticalFields = aiOutput.outputs.some(o => o.critical);
  const fieldCount = aiOutput.outputs.length;
  
  const outputSchema: OutputSchemaCreate = {
    name: `${sceneName}输出结构`,
    parseMode: 'JSON_EXTRACT',                         // 固定值
    fields: aiOutput.outputs.map(output => ({
      name: output.name,
      key: toCamelCase(output.name),                   // 代码生成
      type: output.type,
      enumValues: output.values,                       // 仅 enum 有值
      required: true,
      evaluation: {
        evaluatorId: inferEvaluator(output.type),      // 代码推断
        expectedField: `exp_${toSnakeCase(output.name)}`,  // 代码生成：exp_ 前缀
        weight: 1 / fieldCount,                        // 代码均分
        isCritical: output.critical,
      }
    })),
    aggregation: {
      mode: hasCriticalFields ? 'critical_first' : 'weighted_average',  // 代码决定
      passThreshold: 0.7                               // 固定默认值
    }
  };

  return { inputSchema, outputSchema };
}

/**
 * 根据字段类型推断评估器
 */
function inferEvaluator(type: string): string {
  const evaluatorMap: Record<string, string> = {
    'enum': 'preset-exact-match',      // 枚举值必须精确匹配
    'boolean': 'preset-exact-match',   // 布尔值精确匹配
    'number': 'preset-exact-match',    // 数值精确匹配
    'string': 'preset-contains',       // 字符串包含匹配
    'array': 'preset-array-contains',  // 数组包含匹配
  };
  return evaluatorMap[type] || 'preset-contains';
}

/**
 * 中文转驼峰命名
 * "用户当前设备" → "userCurrentDevice"
 * "问题分类" → "problemType"
 */
function toCamelCase(chinese: string): string {
  // 简单实现：移除空格，首字母小写
  // 实际可用 pinyin 库转换
  const pinyin = chineseToPinyin(chinese);
  return pinyin.replace(/\s+/g, '');
}

/**
 * 中文转下划线命名
 * "用户当前设备" → "user_current_device"
 */
function toSnakeCase(chinese: string): string {
  const pinyin = chineseToPinyin(chinese);
  return pinyin.replace(/\s+/g, '_').toLowerCase();
}
```

#### API 响应（组装后）

```typescript
// 响应
{
  "code": 200,
  "data": {
    // AI 原始输出（供调试/重新生成）
    "aiRawOutput": {
      "inputs": [...],
      "outputs": [...]
    },
    
    // 组装后的完整 Schema（可直接使用或编辑）
    "inputSchema": {
      "name": "智能客服意图识别输入变量",
      "variables": [
        {
          "name": "用户当前设备",
          "key": "currentDevice",
          "type": "string",
          "required": true,
          "datasetField": "ctx_current_device"
        },
        {
          "name": "用户所有设备",
          "key": "allDevices", 
          "type": "array",
          "required": true,
          "datasetField": "ctx_all_devices"
        },
        // ...
      ]
    },
    "outputSchema": {
      "name": "智能客服意图识别输出结构",
      "parseMode": "JSON_EXTRACT",
      "fields": [
        {
          "name": "问题分类",
          "key": "problemType",
          "type": "enum",
          "enumValues": ["bluetooth", "wifi", "battery", "screen", "other"],
          "required": true,
          "evaluation": {
            "evaluatorId": "preset-exact-match",
            "expectedField": "exp_problem_type",
            "weight": 0.2,
            "isCritical": true
          }
        },
        // ...
      ],
      "aggregation": {
        "mode": "critical_first",
        "passThreshold": 0.7
      }
    },
    
    // 生成的模板列定义（用于下载）
    "templateColumns": [
      { "column": "ctx_current_device", "label": "输入-用户当前设备", "type": "string" },
      { "column": "ctx_all_devices", "label": "输入-用户所有设备", "type": "json_array" },
      { "column": "exp_problem_type", "label": "期望-问题分类", "type": "enum", "values": ["bluetooth", ...] },
      // ...
    ]
  }
}
```

### 6.5 AI 生成的 System Prompt（精简版）

```typescript
const AI_SCHEMA_GENERATOR_PROMPT = `你是配置助手。根据用户描述的测试场景，提取输入变量和输出字段的核心信息。

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

## 示例

用户描述："测试情感分析，输入是用户评论，输出是情感类别（正面/负面/中性）和置信度"

正确输出：
{
  "inputs": [
    { "name": "用户评论", "type": "string", "required": true }
  ],
  "outputs": [
    { "name": "情感类别", "type": "enum", "values": ["positive", "negative", "neutral"], "critical": true },
    { "name": "置信度", "type": "number", "critical": false }
  ]
}`;
```

### 6.6 方案对比

| 维度 | 原方案（AI全量输出） | 精简方案（AI+代码组装） |
|------|---------------------|------------------------|
| AI 输出字段数 | ~25个 | ~8个 |
| AI 判断逻辑 | 评估器、权重、聚合、命名规则 | 仅类型和关键性 |
| 输出 Token | ~500 | ~150 |
| 预估成功率 | 70-80% | 95%+ |
| 响应时间 | 3-5秒 | 1-2秒 |
| 可维护性 | 改规则需改 Prompt | 改规则只改代码 |
| 一致性 | 依赖 AI 遵守规则 | 代码保证一致 |

### 6.7 模板生成 API

```typescript
// POST /api/v1/schemas/generate-template
// 根据 Schema 生成数据集模板文件
{
  "inputSchemaId": "input-schema-xxx",
  "outputSchemaId": "output-schema-xxx",
  "format": "xlsx",                        // xlsx | csv
  "includeExamples": true                  // 是否包含示例数据行
}

// 响应: 文件流下载
```

---

## 七、数据集功能改造

### 7.1 改造范围

| 功能点 | 改造内容 |
|--------|---------|
| 模板下载 | 根据关联的 Schema 动态生成模板 |
| 上传流程 | 支持复杂字段类型（JSON数组、嵌套对象） |
| 字段映射 | 可视化映射数据集列与 Schema 变量/期望值 |
| 数据预览 | 支持展示和编辑复杂类型字段 |
| 数据校验 | 根据 Schema 校验数据类型和必填项 |

### 7.2 智能模板下载

**入口**：数据集列表页 → "下载模板" 按钮

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  下载数据集模板                                                    [关闭]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  选择模板类型:                                                              │
│                                                                             │
│  ○ 基础模板（仅 input/expected 两列）                                       │
│                                                                             │
│  ● 根据结构定义生成                                                         │
│                                                                             │
│    ┌───────────────────────────────────────────────────────────────────┐   │
│    │  选择输入结构:                                                     │   │
│    │  [智能客服输入变量 (4个变量)                                  ▼]   │   │
│    │                                                                    │   │
│    │  选择输出结构:                                                     │   │
│    │  [智能客服输出结构 (5个字段)                                  ▼]   │   │
│    └───────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  预览生成的列:                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  输入列:                                                             │   │
│  │  • ctx_current_device (string) - 当前设备                           │   │
│  │  • ctx_all_devices (json_array) - 所有设备                          │   │
│  │  • ctx_user_question (string) - 用户问题                            │   │
│  │  • ctx_dialog_history (json_array) - 对话历史                       │   │
│  │                                                                      │   │
│  │  期望值列:                                                           │   │
│  │  • exp_type (enum: bluetooth,wifi,battery,screen,other) - 问题分类  │   │
│  │  • exp_chg (boolean) - 设备更改                                     │   │
│  │  • exp_dev (string) - 型号提取                                      │   │
│  │  • exp_kw (string) - 检索关键词                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ☑ 包含示例数据行                                                          │
│  ☑ 包含列说明（作为第一行）                                                │
│                                                                             │
│                                          [下载 Excel]    [下载 CSV]        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 上传流程改造

**改造前**：简单的 input/expected 映射
**改造后**：完整的字段映射向导

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  上传数据集                                              Step 2/4: 字段映射 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  已上传文件: customer_service_test_data.xlsx (156 行)                       │
│                                                                             │
│  ┌─ 关联结构定义 ────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ○ 简单模式（仅映射 input/expected）                                   │ │
│  │                                                                        │ │
│  │  ● 结构化模式                                                          │ │
│  │    输入结构: [智能客服输入变量                                    ▼]   │ │
│  │    输出结构: [智能客服输出结构                                    ▼]   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ 输入变量映射 ────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌──────────────────┬─────────────────────┬────────────────────────┐  │ │
│  │  │ Schema 变量      │ 数据集列            │ 状态                   │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ current_device   │ [ctx_current_device ▼] │ ✓ 已映射            │  │ │
│  │  │ (string, 必填)   │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ all_devices      │ [ctx_all_devices   ▼] │ ✓ 已映射 (JSON数组)  │  │ │
│  │  │ (array, 必填)    │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ user_question    │ [ctx_user_question ▼] │ ✓ 已映射            │  │ │
│  │  │ (string, 必填)   │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ dialog_history   │ [ctx_dialog_history▼] │ ✓ 已映射 (JSON数组)  │  │ │
│  │  │ (array, 可选)    │                     │                        │  │ │
│  │  └──────────────────┴─────────────────────┴────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ 期望值映射 ──────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌──────────────────┬─────────────────────┬────────────────────────┐  │ │
│  │  │ 输出字段 (期望列) │ 数据集列            │ 状态                   │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ problem_type     │ [exp_type          ▼] │ ✓ 已映射 (enum)      │  │ │
│  │  │ (exp_type)       │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ device_change    │ [exp_chg           ▼] │ ✓ 已映射 (boolean)   │  │ │
│  │  │ (exp_chg)        │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ get_device       │ [exp_dev           ▼] │ ✓ 已映射            │  │ │
│  │  │ (exp_dev)        │                     │                        │  │ │
│  │  ├──────────────────┼─────────────────────┼────────────────────────┤  │ │
│  │  │ context          │ [exp_kw            ▼] │ ✓ 已映射            │  │ │
│  │  │ (exp_kw)         │                     │                        │  │ │
│  │  └──────────────────┴─────────────────────┴────────────────────────┘  │ │
│  │                                                                        │ │
│  │  ⚠️ thinking_process 字段无期望值列（将跳过该字段的期望值评估）        │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  映射状态: ✓ 所有必填字段已映射                                            │
│                                                                             │
│                                        [上一步]    [下一步: 数据预览 →]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.4 数据预览改造

支持复杂字段类型的展示和编辑：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  数据集详情 - 智能客服测试数据                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 数据预览 ────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  显示模式: ○ 表格视图  ● 卡片视图（推荐用于复杂数据）                   │ │
│  │                                                                        │ │
│  │  ┌─ 第 1 行 ────────────────────────────────────────── [编辑] [删除] ┐│ │
│  │  │                                                                    ││ │
│  │  │  输入变量:                                                         ││ │
│  │  │  ┌──────────────────┬────────────────────────────────────────────┐││ │
│  │  │  │ 当前设备         │ iPhone 15 Pro                              │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 所有设备         │ ["iPhone 15 Pro", "iPad Air", "MacBook"]   │││ │
│  │  │  │                  │ 📋 3 个元素                                 │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 用户问题         │ 我的手机连不上蓝牙耳机                      │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 对话历史         │ [] (空)                                    │││ │
│  │  │  └──────────────────┴────────────────────────────────────────────┘││ │
│  │  │                                                                    ││ │
│  │  │  期望输出:                                                         ││ │
│  │  │  ┌──────────────────┬────────────────────────────────────────────┐││ │
│  │  │  │ 问题分类         │ bluetooth                                  │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 设备更改         │ false                                      │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 型号提取         │ iPhone 15                                  │││ │
│  │  │  ├──────────────────┼────────────────────────────────────────────┤││ │
│  │  │  │ 检索关键词       │ iPhone 蓝牙连接故障                        │││ │
│  │  │  └──────────────────┴────────────────────────────────────────────┘││ │
│  │  │                                                                    ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                        │ │
│  │  ┌─ 第 2 行 ────────────────────────────────────────── [编辑] [删除] ┐│ │
│  │  │  ...                                                               ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                        │ │
│  │  [+ 新增数据行]                                  第 1-10 行，共 156 行 │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 数据集模板 API

```typescript
// GET /api/v1/datasets/template/download
// 下载数据集模板
{
  "inputSchemaId": "input-schema-xxx",    // 可选，简单模式不传
  "outputSchemaId": "output-schema-xxx",  // 可选，简单模式不传
  "format": "xlsx",                       // xlsx | csv
  "includeExamples": true,                // 包含示例数据
  "includeHeaders": true                  // 包含列说明
}

// 响应: 文件流

// 生成的 Excel 结构:
// Row 1 (说明行): "当前设备 (string, 必填)", "所有设备 (JSON数组)", ...
// Row 2 (示例行): "iPhone 15 Pro", "[\"iPhone 15 Pro\", \"iPad Air\"]", ...
// Row 3+: 空行供用户填写
```

```typescript
// POST /api/v1/datasets/:id/validate
// 根据 Schema 校验数据集
{
  "inputSchemaId": "input-schema-xxx",
  "outputSchemaId": "output-schema-xxx"
}

// 响应
{
  "code": 200,
  "data": {
    "valid": false,
    "totalRows": 156,
    "validRows": 150,
    "errors": [
      { "row": 23, "field": "ctx_all_devices", "error": "JSON 格式无效" },
      { "row": 45, "field": "exp_type", "error": "值 'blue' 不在枚举范围内" },
      // ...
    ]
  }
}
```

---

## 八、其他功能改造

### 8.1 快速测试改造

提示词详情页的"快速测试"功能需要支持结构化输入输出：

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
│  │  用户问题 (string):                                                    │ │
│  │  [我的手机连不上蓝牙耳机________________________________________]     │ │
│  │                                                                        │ │
│  │  对话历史 (array, 可选):                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │ []                                                              │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                                              [运行测试]     │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌─ 测试结果 ────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  状态: ✅ 成功    耗时: 1.2s    Tokens: 入 256 / 出 128               │ │
│  │                                                                        │ │
│  │  ┌─ 解析后的输出字段 ────────────────────────────────────────────────┐│ │
│  │  │                                                                    ││ │
│  │  │  thinking_process:                                                 ││ │
│  │  │  "用户提到蓝牙耳机连接问题，设备是 iPhone 15 Pro..."              ││ │
│  │  │                                                                    ││ │
│  │  │  problem_type: bluetooth                                           ││ │
│  │  │  device_change: false                                              ││ │
│  │  │  get_device: iPhone 15 Pro                                         ││ │
│  │  │  context: iPhone 蓝牙连接故障排查                                  ││ │
│  │  │                                                                    ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                        │ │
│  │  ┌─ 原始输出 ─────────────────────────────────────────────── [展开] ┐│ │
│  │  │ {"thinking_process": "...", "problem_type": "bluetooth", ...}     ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 创建任务流程改造

任务创建步骤需要适配结构化评估：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  创建任务                                          Step 2/5: 提示词与结构   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 选择提示词 ──────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  [智能客服意图识别 v2.1                                           ▼]  │ │
│  │                                                                        │ │
│  │  关联的结构定义:                                                       │ │
│  │  • 输入结构: 智能客服输入变量 (4个变量)                     [查看]    │ │
│  │  • 输出结构: 智能客服输出结构 (5个字段, 2个关键)            [查看]    │ │
│  │  • 聚合策略: 关键字段优先, 阈值 70%                                   │ │
│  │                                                                        │ │
│  │  ⚠️ 提示词已关联结构定义，数据集需要包含对应的字段                     │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌─ 选择数据集 ──────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  [智能客服测试数据 (156行)                                        ▼]  │ │
│  │                                                                        │ │
│  │  字段映射校验:                                                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ ✓ current_device → ctx_current_device                            │ │ │
│  │  │ ✓ all_devices → ctx_all_devices                                  │ │ │
│  │  │ ✓ user_question → ctx_user_question                              │ │ │
│  │  │ ✓ dialog_history → ctx_dialog_history                            │ │ │
│  │  │ ✓ exp_type (问题分类期望值)                                       │ │ │
│  │  │ ✓ exp_chg (设备更改期望值)                                        │ │ │
│  │  │ ✓ exp_dev (型号提取期望值)                                        │ │ │
│  │  │ ✓ exp_kw (检索关键词期望值)                                       │ │ │
│  │  │ ⚠️ thinking_process 无期望值（将使用 LLM 评估）                   │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ✅ 数据集与结构定义兼容                                               │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│                                        [上一步]    [下一步: 选择模型 →]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 结果导出改造

导出功能需要支持字段级评估结果：

```typescript
// GET /api/v1/tasks/:id/results/export
{
  "format": "xlsx",
  "includeFieldEvaluations": true,   // 新增：包含字段级评估
  "includeAggregation": true         // 新增：包含聚合详情
}

// 导出的 Excel 结构:
// Sheet 1: 结果概览
// - 行号, 输入摘要, 输出状态, 总体通过, 总体得分, 耗时

// Sheet 2: 字段级评估（新增）
// - 行号, 字段名, 实际值, 期望值, 评估器, 通过, 得分, 原因

// Sheet 3: 聚合详情（新增）
// - 行号, 聚合模式, 关键字段通过, 加权得分, 最终结果

// Sheet 4: 完整数据
// - 所有输入字段, 所有输出字段, 所有评估结果
```

---

## 九、UI/UX 设计

### 9.1 新增页面：Schema 管理

**路由**：`/schemas`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  结构定义管理                                          [+ 新建输入结构]     │
│                                                        [+ 新建输出结构]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 输入结构 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📥 智能客服输入变量                                             │  │  │
│  │  │    4 个变量 · 关联 2 个提示词                                   │  │  │
│  │  │    current_device, all_devices, user_question, dialog_history  │  │  │
│  │  │                                              [编辑] [复制] [删除]│  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📥 文档分析输入变量                                             │  │  │
│  │  │    2 个变量 · 关联 1 个提示词                                   │  │  │
│  │  │    document_content, analysis_type                             │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 输出结构 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📤 智能客服输出结构                                             │  │  │
│  │  │    5 个字段 · 2 个关键字段 · 关联 2 个提示词                    │  │  │
│  │  │    聚合模式: 关键字段优先                                       │  │  │
│  │  │                                              [编辑] [复制] [删除]│  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 OutputSchema 编辑器

**路由**：`/schemas/output/[id]` 或 `/schemas/output/new`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← 返回    输出结构编辑                                    [保存] [取消]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  基础信息                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 名称: [智能客服输出结构________________]                               │ │
│  │ 描述: [定义智能客服意图识别的输出字段___]                              │ │
│  │ 解析模式: ○ JSON  ● JSON提取  ○ 正则                                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  字段定义                                                      [+ 添加字段] │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │  ┌─ 字段 1 ──────────────────────────────────────────────────── ▼ ─┐ │ │
│  │  │                                                                  │ │ │
│  │  │  名称: [问题分类________]     Key: [problem_type____]            │ │ │
│  │  │                                                                  │ │ │
│  │  │  类型: ○ string  ○ number  ○ boolean  ● enum  ○ array           │ │ │
│  │  │  枚举值: [bluetooth_connection, wifi_issue, battery, ...]       │ │ │
│  │  │                                                                  │ │ │
│  │  │  ☑ 必填                                                          │ │ │
│  │  │                                                                  │ │ │
│  │  │  ── 评估配置 ──────────────────────────────────────────────────  │ │ │
│  │  │  评估器: [精确匹配_____________▼]                                │ │ │
│  │  │  期望值字段: [expected_problem_type__]  (数据集列名)             │ │ │
│  │  │  权重: [0.3___]                                                  │ │ │
│  │  │  ☑ 关键字段（必须通过）                                          │ │ │
│  │  │  条件: [______________________]  (可选，如 fields.xxx === true)  │ │ │
│  │  │                                                                  │ │ │
│  │  └──────────────────────────────────────────────────────── [删除] ─┘ │ │
│  │                                                                        │ │
│  │  ┌─ 字段 2 ──────────────────────────────────────────────────── ▼ ─┐ │ │
│  │  │  名称: [型号提取]  Key: [get_device]  类型: string               │ │ │
│  │  │  评估器: 包含匹配   期望值: expected_device   权重: 0.25         │ │ │
│  │  │  ☑ 关键字段   条件: fields.device_change === false              │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  ┌─ 字段 3 ─────────────────────────────────────────────── (收起) ─┐ │ │
│  │  │  思考过程 (thinking_process) · string · LLM评估 · 权重0.1       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  聚合配置                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 聚合模式:                                                              │ │
│  │ ○ 全部通过 - 所有字段必须通过                                         │ │
│  │ ○ 加权平均 - 加权得分 >= 阈值  通过阈值: [0.6__]                      │ │
│  │ ● 关键优先 - 关键字段必过，其他加权  通过阈值: [0.7__]                │ │
│  │ ○ 自定义   - 表达式: [____________________________]                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  预览                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ {                                                                      │ │
│  │   "problem_type": "bluetooth_connection",  // ★ 关键·精确匹配         │ │
│  │   "get_device": "iPhone 15 Pro",           // ★ 关键·包含匹配(条件)   │ │
│  │   "device_change": false,                  // 精确匹配                 │ │
│  │   "thinking_process": "...",               // LLM评估                  │ │
│  │   "context": "..."                         // 相似度匹配               │ │
│  │ }                                                                      │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 提示词详情页扩展

在提示词编辑页面增加 Schema 关联：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  提示词编辑 - 智能客服意图识别                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [基础信息]  [内容编辑]  [结构定义]  [版本历史]                             │
│                          ▲ 新增Tab                                          │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌─ 输入结构 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ○ 简单模式（使用 {{var}} 自动提取变量）                              │  │
│  │                                                                       │  │
│  │  ● 结构化模式（关联输入结构定义）                                     │  │
│  │    已关联: 智能客服输入变量 (4个变量)              [更换] [新建]       │  │
│  │                                                                       │  │
│  │    变量预览:                                                          │  │
│  │    • current_device (string) ← context_current_device                 │  │
│  │    • all_devices (array) ← context_all_devices                        │  │
│  │    • user_question (string) ← context_user_question                   │  │
│  │    • dialog_history (array) ← context_dialog_history                  │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 输出结构 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ○ 简单模式（单一文本输出）                                           │  │
│  │                                                                       │  │
│  │  ● 结构化模式（关联输出结构定义）                                     │  │
│  │    已关联: 智能客服输出结构 (5个字段)              [更换] [新建]       │  │
│  │                                                                       │  │
│  │    字段预览:                                                          │  │
│  │    • problem_type (enum) ★关键 → 精确匹配 → expected_problem_type    │  │
│  │    • get_device (string) ★关键 → 包含匹配 → expected_device          │  │
│  │    • device_change (boolean) → 精确匹配 → expected_device_change      │  │
│  │    • thinking_process (string) → LLM评估                              │  │
│  │    • context (string) → 相似度 → expected_context                     │  │
│  │                                                                       │  │
│  │    聚合: 关键字段优先，阈值 70%                                        │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 任务结果详情页扩展

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  测试结果 #127                                                              │
│  任务: 智能客服意图识别评测 v2.1                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 总体结果 ─────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │   状态: ✅ 通过        得分: 87%        耗时: 1.2s                  │   │
│  │                                                                     │   │
│  │   聚合模式: 关键字段优先                                            │   │
│  │   关键字段: 问题分类 ✅, 型号提取 ✅                                │   │
│  │   普通字段加权平均: 85%                                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 输入上下文 ───────────────────────────────────────────────────────┐   │
│  │  {                                                                  │   │
│  │    "current_device": "iPhone 15 Pro",                               │   │
│  │    "all_devices": ["iPhone 15 Pro", "iPad Air"],                    │   │
│  │    "user_question": "我的手机连不上蓝牙耳机",                        │   │
│  │    "dialog_history": []                                             │   │
│  │  }                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 字段评估详情 ─────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌──────────┬────────────────┬────────────────┬────────┬────────┐  │   │
│  │  │ 字段     │ 实际值         │ 期望值         │ 评估器 │ 结果   │  │   │
│  │  ├──────────┼────────────────┼────────────────┼────────┼────────┤  │   │
│  │  │★问题分类 │bluetooth_conn..│bluetooth_conn..│精确匹配│✅ 100% │  │   │
│  │  ├──────────┼────────────────┼────────────────┼────────┼────────┤  │   │
│  │  │★型号提取 │iPhone 15 Pro   │iPhone 15       │包含匹配│✅ 90%  │  │   │
│  │  │          │                │                │        │更精确  │  │   │
│  │  ├──────────┼────────────────┼────────────────┼────────┼────────┤  │   │
│  │  │ 设备更改 │false           │false           │精确匹配│✅ 100% │  │   │
│  │  ├──────────┼────────────────┼────────────────┼────────┼────────┤  │   │
│  │  │ 检索标题 │iPhone蓝牙连接..│iPhone蓝牙连接..│相似度  │✅ 95%  │  │   │
│  │  ├──────────┼────────────────┼────────────────┼────────┼────────┤  │   │
│  │  │ 思考过程 │(展开查看)      │-               │LLM评估 │✅ 85%  │  │   │
│  │  │          │                │                │        │推理清晰│  │   │
│  │  └──────────┴────────────────┴────────────────┴────────┴────────┘  │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 聚合计算明细 ──────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │  关键字段检查: 问题分类 ✅ + 型号提取 ✅ = 全部通过                 │  │
│  │                                                                      │  │
│  │  普通字段加权:                                                       │  │
│  │  ┌────────────┬────────┬────────┬────────────┐                      │  │
│  │  │ 字段       │ 权重   │ 得分   │ 贡献       │                      │  │
│  │  ├────────────┼────────┼────────┼────────────┤                      │  │
│  │  │ 设备更改   │ 0.20   │ 1.00   │ 0.200      │                      │  │
│  │  │ 检索标题   │ 0.15   │ 0.95   │ 0.143      │                      │  │
│  │  │ 思考过程   │ 0.10   │ 0.85   │ 0.085      │                      │  │
│  │  ├────────────┼────────┼────────┼────────────┤                      │  │
│  │  │ 合计       │ 0.45   │        │ 0.428      │                      │  │
│  │  └────────────┴────────┴────────┴────────────┘                      │  │
│  │                                                                      │  │
│  │  加权平均 = 0.428 / 0.45 = 95.1% ≥ 70% → 通过                       │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 原始输出 ──────────────────────────────────────────────────────────┐  │
│  │  ```json                                                             │  │
│  │  {                                                                   │  │
│  │    "thinking_process": "用户提到'蓝牙耳机连接问题'...",              │  │
│  │    "problem_type": "bluetooth_connection",                           │  │
│  │    "device_change": false,                                           │  │
│  │    "get_device": "iPhone 15 Pro",                                    │  │
│  │    "context": "iPhone蓝牙连接故障排查"                               │  │
│  │  }                                                                   │  │
│  │  ```                                                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.5 任务统计页扩展（字段级统计）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  任务统计 - 智能客服意图识别评测 v2.1                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [概览]  [字段分析]  [失败样本]  [模型对比]                                 │
│           ▲ 新增Tab                                                         │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  ┌─ 字段通过率 ───────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ★ 问题分类    ████████████████████████████████████████████  95%   │   │
│  │  ★ 型号提取    █████████████████████████████████░░░░░░░░░░░  82%   │   │
│  │    设备更改    ██████████████████████████████████████████████ 98%   │   │
│  │    检索标题    ██████████████████████████████░░░░░░░░░░░░░░░  76%   │   │
│  │    思考过程    ████████████████████████░░░░░░░░░░░░░░░░░░░░░  70%   │   │
│  │                                                                     │   │
│  │  ★ = 关键字段                                                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 字段详细统计 ─────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  ┌───────────┬────────┬────────┬────────┬────────┬────────────────┐│   │
│  │  │ 字段      │ 通过率 │ 平均分 │ 通过数 │ 失败数 │ 主要失败原因   ││   │
│  │  ├───────────┼────────┼────────┼────────┼────────┼────────────────┤│   │
│  │  │★问题分类  │ 95%    │ 0.96   │ 190    │ 10     │ 分类错误(10)   ││   │
│  │  │★型号提取  │ 82%    │ 0.85   │ 148    │ 32     │ 未提取(20)     ││   │
│  │  │           │        │        │        │ 跳过20 │ 不包含期望(12) ││   │
│  │  │ 设备更改  │ 98%    │ 0.98   │ 196    │ 4      │ 判断错误(4)    ││   │
│  │  │ 检索标题  │ 76%    │ 0.80   │ 152    │ 48     │ 相似度低(48)   ││   │
│  │  │ 思考过程  │ 70%    │ 0.75   │ 140    │ 60     │ 推理不完整(35) ││   │
│  │  │           │        │        │        │        │ 关键词缺失(25) ││   │
│  │  └───────────┴────────┴────────┴────────┴────────┴────────────────┘│   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ 字段得分分布 ─────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  问题分类                          型号提取                         │   │
│  │  ┌────────────────────────┐       ┌────────────────────────┐       │   │
│  │  │         ▓▓▓▓▓▓         │       │      ▓▓▓▓▓▓            │       │   │
│  │  │         ▓▓▓▓▓▓         │       │    ▓▓▓▓▓▓▓▓▓▓          │       │   │
│  │  │         ▓▓▓▓▓▓▓▓▓▓     │       │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │       │   │
│  │  │ ░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │       │░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░ │       │   │
│  │  └─0.0──0.5──0.8──1.0────┘       └─0.0──0.5──0.8──1.0────┘       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 十、分阶段实施计划

### Phase 1: 基础结构化能力（4-5 周）

**目标**：支持结构化输出定义、解析、字段级评估、数据集基础改造

#### 1.1 后端核心（Week 1-2）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 数据模型设计与迁移 | 3d | InputSchema, OutputSchema, FieldEvaluationResult |
| OutputSchema CRUD API | 2d | 创建/读取/更新/删除 |
| InputSchema CRUD API | 1d | 创建/读取/更新/删除 |
| JSON 输出解析器 | 2d | JSON / JSON_EXTRACT 模式 |
| Handlebars 模板引擎 | 1d | 支持嵌套变量、循环、条件 |
| 字段级评估引擎 | 3d | 遍历字段执行评估 |
| 基础聚合引擎 | 2d | all_pass / weighted_average |

#### 1.2 数据集改造（Week 2-3）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 模板生成 API | 2d | 根据 Schema 生成 Excel/CSV 模板 |
| 模板下载接口 | 1d | 支持选择 Schema、包含示例行 |
| 上传流程改造 | 3d | 支持复杂类型（JSON数组、嵌套对象） |
| 字段映射向导 API | 2d | 数据集列与 Schema 变量映射 |
| 数据校验 API | 2d | 根据 Schema 校验数据类型和必填项 |
| 数据预览改造 | 2d | 卡片视图、复杂类型展示 |

#### 1.3 任务执行改造（Week 3）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 任务执行器升级 | 3d | 集成解析器、评估引擎、聚合引擎 |
| 结果存储扩展 | 1d | outputParsed, expectedValues, fieldEvaluations |

#### 1.4 前端基础（Week 4-5）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| Schema 列表页 | 2d | 输入/输出结构管理 |
| OutputSchema 编辑器 | 3d | 字段定义、评估配置、聚合配置 |
| InputSchema 编辑器 | 2d | 变量定义、类型配置 |
| 提示词关联 Schema | 2d | Tab 页、选择器、预览 |
| 数据集模板下载弹窗 | 1d | Schema 选择、格式选择 |
| 数据集上传映射向导 | 3d | 步骤表单、映射配置、校验提示 |

**Phase 1 交付物**：
- ✅ 可创建/编辑输入输出结构定义
- ✅ 提示词可关联结构定义
- ✅ 数据集模板下载（根据 Schema 生成）
- ✅ 数据集上传支持字段映射
- ✅ 任务执行支持结构化输出解析和字段级评估
- ✅ 基础聚合（全部通过、加权平均）

---

### Phase 2: AI 配置助手 + 高级评估（3-4 周）

**目标**：AI 智能配置、条件评估、关键字段、完整结果展示

#### 2.1 AI 配置助手（Week 5-6）⭐ 核心功能

| 任务 | 工作量 | 说明 |
|------|--------|------|
| AI Schema 生成 API | 3d | 调用 LLM 生成结构定义 |
| 生成 Prompt 设计 | 1d | System Prompt 优化 |
| 模型选择器组件 | 1d | 复用现有模型下拉框 |
| AI 助手对话界面 | 3d | 步骤式引导、场景描述输入 |
| 结构预览与编辑 | 2d | AI 生成结果可调整 |
| 一键模板下载 | 1d | 生成后直接下载 |

#### 2.2 高级评估能力（Week 6-7）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 条件表达式求值器 | 2d | 安全沙箱执行 |
| 关键字段聚合策略 | 1d | critical_first 模式 |
| 自定义聚合表达式 | 2d | custom 模式 |
| FieldEvaluationResult API | 2d | 字段级结果查询 |
| 字段级统计 API | 2d | 按字段维度统计 |

#### 2.3 结果展示升级（Week 7-8）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 结果详情页升级 | 3d | 字段级评估表格、聚合详情 |
| 字段级统计页面 | 3d | 通过率柱状图、得分分布 |
| 条件配置 UI | 1d | 条件表达式输入 |
| 任务创建流程改造 | 2d | Schema 关联、映射校验 |

**Phase 2 交付物**：
- ✅ **AI 配置助手**（选择模型 → 描述场景 → 生成 Schema → 下载模板）
- ✅ 字段间条件依赖评估
- ✅ 关键字段优先聚合
- ✅ 字段级评估结果查看
- ✅ 字段级统计分析
- ✅ 任务创建流程适配

---

### Phase 3: 体验优化 + 生态完善（2-3 周）

**目标**：提升易用性、完善周边功能

#### 3.1 易用性优化（Week 9）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| Schema 模板库 | 2d | 常用场景模板（客服/文档/代码） |
| Schema 从输出推断 | 2d | 粘贴样本输出自动生成 |
| 快速测试（结构化） | 2d | 结构化输入表单、字段级结果 |
| AI 助手多轮对话 | 2d | 支持追问和调整 |

#### 3.2 导出与报告（Week 10）

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 结果导出增强 | 2d | 字段级评估 Sheet、聚合详情 Sheet |
| 字段级回归检测 | 3d | 检测特定字段通过率下降 |
| 监控告警扩展 | 2d | 字段级指标监控 |

**Phase 3 交付物**：
- ✅ 常用 Schema 模板
- ✅ 从样本输出自动推断 Schema
- ✅ 快速测试支持结构化
- ✅ 字段级导出报告
- ✅ 字段级回归检测

---

### 里程碑时间线

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            10 周实施计划                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: 基础结构化能力 (Week 1-5)
├── Week 1: 数据模型 + Schema API
├── Week 2: 解析器 + 评估引擎 + 数据集模板API
├── Week 3: 任务执行器 + 数据集上传改造
├── Week 4: Schema UI + 数据集映射向导
└── Week 5: 提示词关联 + 集成测试
    │
    ▼ 里程碑 1: 基础结构化评估可用
    
Phase 2: AI配置助手 + 高级评估 (Week 5-8)
├── Week 5-6: ⭐ AI 配置助手（模型选择+场景描述+Schema生成+模板下载）
├── Week 7: 条件评估 + 聚合策略 + 字段API
└── Week 8: 结果详情 + 统计页面 + 任务流程改造
    │
    ▼ 里程碑 2: AI 辅助配置上线，高级评估完整
    
Phase 3: 体验优化 (Week 9-10)
├── Week 9: 模板库 + 推断 + 快速测试
└── Week 10: 导出增强 + 回归检测 + 上线
    │
    ▼ 里程碑 3: 全功能上线
```

---

### 工作量统计

| Phase | 后端 | 前端 | 总计 |
|-------|------|------|------|
| Phase 1 | 22d | 13d | 35d (约5周) |
| Phase 2 | 13d | 12d | 25d (约4周) |
| Phase 3 | 9d | 4d | 13d (约2周) |
| **总计** | **44d** | **29d** | **73d (约10周)** |

---

### 关键依赖关系

```
数据模型 ──► Schema API ──► Schema UI
    │              │            │
    │              ▼            ▼
    │        模板生成API ──► 模板下载弹窗
    │              │
    ▼              ▼
解析器 ──► 任务执行器 ──► 结果存储
    │              │
    ▼              ▼
评估引擎 ──────────┘
    │
    ▼
聚合引擎 ──► 结果详情页 ──► 统计页面
                               │
AI生成API ──► AI助手UI ──────────┘
```

---

## 十一、向后兼容与迁移

### 8.1 兼容策略

**核心原则**：不配置结构定义 = 使用简单模式

```typescript
// 任务执行器判断逻辑
async function executeTask(task: Task) {
  const prompt = await getPromptWithSchema(task.promptId);
  
  if (prompt.outputSchemaId) {
    // 结构化模式：使用新流程
    return this.structuredExecutor.execute(task, prompt);
  } else {
    // 简单模式：使用原有流程
    return this.legacyExecutor.execute(task, prompt);
  }
}
```

### 8.2 数据库迁移

```sql
-- 新增表（不影响现有表）
CREATE TABLE input_schemas (...);
CREATE TABLE output_schemas (...);
CREATE TABLE field_evaluation_results (...);

-- 修改现有表（添加可选字段）
ALTER TABLE prompts ADD COLUMN input_schema_id UUID REFERENCES input_schemas(id);
ALTER TABLE prompts ADD COLUMN output_schema_id UUID REFERENCES output_schemas(id);

ALTER TABLE task_results ADD COLUMN output_raw TEXT;
ALTER TABLE task_results ADD COLUMN output_parsed JSONB;
ALTER TABLE task_results ADD COLUMN parse_success BOOLEAN DEFAULT true;
ALTER TABLE task_results ADD COLUMN expected_values JSONB;

-- 数据迁移（将现有 output 迁移到 output_raw）
UPDATE task_results SET output_raw = output WHERE output IS NOT NULL;
```

### 8.3 API 兼容

- 所有新字段为可选，不影响现有 API 调用
- 结果 API 返回格式扩展（新增字段），不删除原有字段
- 原有 `output`、`expected` 字段保留，同时提供新的 `outputParsed`、`expectedValues`

---

## 十二、测试策略

### 9.1 单元测试

| 模块 | 测试重点 |
|------|---------|
| TemplateEngine | Handlebars 语法、嵌套变量、循环/条件 |
| JsonOutputParser | JSON 解析、类型校验、枚举校验、错误处理 |
| ConditionEvaluator | 表达式求值、安全检查、边界情况 |
| FieldEvaluationEngine | 条件跳过、评估器调用、结果收集 |
| AggregationEngine | 各聚合模式、权重计算、临界值 |

### 9.2 集成测试

```typescript
describe('结构化评估集成测试', () => {
  it('应正确执行完整流程', async () => {
    // 准备
    const inputSchema = await createInputSchema({...});
    const outputSchema = await createOutputSchema({...});
    const prompt = await createPrompt({ inputSchemaId, outputSchemaId, ... });
    const dataset = await createDataset({...});
    
    // 执行
    const task = await createAndRunTask({ promptId, datasetId, ... });
    
    // 验证
    const results = await getTaskResults(task.id);
    expect(results[0].outputParsed).toBeDefined();
    expect(results[0].fieldEvaluations).toHaveLength(5);
    expect(results[0].aggregation.mode).toBe('critical_first');
  });
  
  it('应正确处理条件评估', async () => {
    // 字段 A = true 时跳过字段 B 的评估
    ...
  });
  
  it('应正确处理解析失败', async () => {
    // 模型返回非 JSON 时的处理
    ...
  });
});
```

### 9.3 E2E 测试

| 场景 | 验证点 |
|------|--------|
| 创建 OutputSchema | UI 操作、API 调用、数据持久化 |
| 关联提示词 | 选择器、保存、回显 |
| 执行结构化任务 | 进度、结果、字段评估 |
| 查看字段统计 | 数据准确性、图表渲染 |

---

## 十三、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 解析器无法处理复杂输出 | 高 | 提供多种解析模式，支持自定义正则 |
| 条件表达式执行不安全 | 高 | 沙箱执行，严格字符白名单 |
| 字段评估性能下降 | 中 | 并行评估，缓存评估器实例 |
| 用户理解成本高 | 中 | 提供模板、向导、文档 |
| 迁移导致数据丢失 | 高 | 充分测试迁移脚本，保留原字段 |

---

## 十四、成功指标

| 指标 | 目标 | 衡量方式 |
|------|------|---------|
| 结构化任务创建数 | 上线 1 月后 > 100 | 数据库统计 |
| 平均字段数 | > 3 | 数据库统计 |
| 用户满意度 | > 4.0/5.0 | 用户调研 |
| 字段级统计使用率 | > 50% | 页面访问统计 |
| 系统稳定性 | 错误率 < 1% | 监控告警 |

---

## 附录：数据结构速查

### A. InputVariableDefinition

```typescript
{
  name: string;           // 显示名称
  key: string;            // 变量键名
  type: string;           // string | number | boolean | array | object
  itemType?: string;      // 数组元素类型
  properties?: {...}[];   // object 嵌套属性
  required: boolean;
  defaultValue?: unknown;
  datasetField?: string;  // 数据集映射字段
}
```

### B. OutputFieldDefinition

```typescript
{
  name: string;           // 显示名称
  key: string;            // JSON key
  type: string;           // string | number | boolean | enum | array
  required: boolean;
  enumValues?: string[];  // enum 可选值
  evaluation: {
    evaluatorId?: string; // 评估器 ID
    expectedField?: string; // 期望值字段
    weight: number;       // 权重 0-1
    isCritical: boolean;  // 是否关键字段
    condition?: string;   // 条件表达式
  }
}
```

### C. AggregationConfig

```typescript
{
  mode: 'all_pass' | 'weighted_average' | 'critical_first' | 'custom';
  passThreshold?: number;      // 通过阈值（加权模式）
  customExpression?: string;   // 自定义表达式
}
```
