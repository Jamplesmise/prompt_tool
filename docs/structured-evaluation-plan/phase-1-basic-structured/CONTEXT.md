# Phase 1: 基础结构化能力 - 上下文

> 预计工期：4-5 周（35 工作日）
> 后端：22d | 前端：13d

## 目标概述

本阶段的核心目标是建立**结构化评估的基础架构**，使系统能够：
1. 定义和管理输入/输出结构（Schema）
2. 根据 Schema 解析模型输出
3. 执行字段级评估
4. 计算聚合结果
5. 改造数据集流程以支持结构化数据

## 问题背景

### 当前系统局限

当前平台基于简单三元组模型：
```
input(string) → LLM → output(string) → 对比 expected(string) → passed/failed
```

| 复杂场景特征 | 当前系统能力 | 差距 |
|-------------|-------------|------|
| 动态数量的输入上下文变量 | 静态 `{{var}}` 插槽 | 无法处理嵌套/动态结构 |
| 结构化多字段输出 | 单一 `output: string` | 无法拆分评估 |
| 每字段独立评估逻辑 | 整体评估器 | 无法配置字段级评估 |
| 字段间有依赖关系 | 无依赖支持 | 无法条件评估 |
| 字段重要性不同 | 简单 AND/OR | 无加权聚合 |

### 目标架构

```
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

## 新增数据模型

### InputSchema（输入结构定义）

```prisma
model InputSchema {
  id          String   @id @default(uuid())
  name        String
  description String?
  variables   Json     // InputVariableDefinition[]
  createdById String   @map("created_by_id")
  createdBy   User     @relation(...)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  prompts     Prompt[]

  @@map("input_schemas")
}
```

**InputVariableDefinition 类型**：
```typescript
type InputVariableDefinition = {
  name: string;              // 显示名称
  key: string;               // 变量键名
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  itemType?: 'string' | 'number' | 'boolean' | 'object';
  properties?: Array<{ key: string; type: string }>;
  required: boolean;
  defaultValue?: unknown;
  datasetField?: string;     // 映射到数据集的哪个字段
};
```

### OutputSchema（输出结构定义）

```prisma
model OutputSchema {
  id          String    @id @default(uuid())
  name        String
  description String?
  fields      Json      // OutputFieldDefinition[]
  parseMode   ParseMode @default(JSON)
  parseConfig Json      @default("{}")
  aggregation Json      @default("{}")  // AggregationConfig
  createdById String    @map("created_by_id")
  createdBy   User      @relation(...)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  prompts     Prompt[]

  @@map("output_schemas")
}

enum ParseMode {
  JSON           // 直接 JSON.parse
  JSON_EXTRACT   // 从文本中提取 JSON
  REGEX          // 正则表达式提取
  TEMPLATE       // 模板匹配
}
```

**OutputFieldDefinition 类型**：
```typescript
type OutputFieldDefinition = {
  name: string;              // 显示名称
  key: string;               // JSON key
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';
  required: boolean;
  enumValues?: string[];     // enum 可选值
  itemType?: string;
  evaluation: {
    evaluatorId?: string;    // 评估器 ID
    expectedField?: string;  // 期望值来源字段名
    weight: number;          // 权重 0-1
    isCritical: boolean;     // 是否关键字段
    condition?: string;      // 条件表达式（Phase 2）
  };
};
```

**AggregationConfig 类型**：
```typescript
type AggregationConfig = {
  mode: 'all_pass' | 'weighted_average' | 'critical_first' | 'custom';
  passThreshold?: number;      // 加权模式通过阈值
  customExpression?: string;   // 自定义表达式（Phase 2）
};
```

### FieldEvaluationResult（字段级评估结果）

```prisma
model FieldEvaluationResult {
  id              String     @id @default(uuid())
  taskResultId    String     @map("task_result_id")
  taskResult      TaskResult @relation(...)
  fieldName       String     @map("field_name")
  fieldKey        String     @map("field_key")
  fieldValue      Json?      @map("field_value")
  expectedValue   Json?      @map("expected_value")
  evaluatorId     String?    @map("evaluator_id")
  evaluatorName   String?    @map("evaluator_name")
  passed          Boolean
  score           Decimal?   @db.Decimal(5, 4)
  reason          String?
  details         Json       @default("{}")
  skipped         Boolean    @default(false)
  skipReason      String?    @map("skip_reason")
  latencyMs       Int?       @map("latency_ms")
  createdAt       DateTime   @default(now())

  @@index([taskResultId])
  @@index([fieldKey])
  @@map("field_evaluation_results")
}
```

### Prompt 模型修改

```prisma
model Prompt {
  // ... 现有字段 ...

  // 新增：关联输入结构定义（可选）
  inputSchemaId  String?  @map("input_schema_id")
  inputSchema    InputSchema? @relation(...)

  // 新增：关联输出结构定义（可选）
  outputSchemaId String?  @map("output_schema_id")
  outputSchema   OutputSchema? @relation(...)
}
```

### TaskResult 模型修改

```prisma
model TaskResult {
  // ... 现有字段 ...

  // 修改：输入输出存储
  input           Json             // 保持 Json 类型
  outputRaw       String?          @map("output_raw")    // 原始输出
  outputParsed    Json?            @map("output_parsed") // 解析后
  parseSuccess    Boolean          @default(true)
  parseError      String?          @map("parse_error")
  expectedValues  Json?            @map("expected_values")

  // 新增关联
  fieldEvaluations FieldEvaluationResult[]
}
```

## 核心引擎

### 1. 模板渲染引擎

引入 Handlebars 模板引擎，支持：
- `{{var}}` 简单变量
- `{{obj.prop}}` 嵌套属性
- `{{#each}}` 循环
- `{{#if}}` 条件
- `{{#with}}` 上下文切换

### 2. 输出解析引擎

根据 `parseMode` 解析模型输出：
- **JSON**: 直接 `JSON.parse()`
- **JSON_EXTRACT**: 从 markdown code block 或文本中提取 JSON

### 3. 字段级评估引擎

遍历 OutputSchema.fields，对每个字段：
1. 检查条件（Phase 2）
2. 获取对应评估器
3. 执行评估
4. 保存 FieldEvaluationResult

### 4. 聚合引擎

支持两种基础模式（Phase 1）：
- **all_pass**: 所有字段必须通过
- **weighted_average**: 加权平均 >= 阈值

## 任务执行流程

```
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
   │    │
   │    └─── 根据 OutputSchema.fields 映射期望值
   │
   ▼
3. 执行循环（每条数据）
   │
   ├─── 3.1 渲染提示词 (Handlebars)
   ├─── 3.2 调用模型
   ├─── 3.3 解析输出 (OutputParser)
   ├─── 3.4 字段级评估 (FieldEvaluationEngine)
   ├─── 3.5 聚合计算 (AggregationEngine)
   └─── 3.6 保存结果
   │
   ▼
4. 任务完成
   │
   └─── 计算统计（含字段级统计）
```

## 向后兼容

**核心原则**：不配置结构定义 = 使用简单模式

```typescript
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

## API 设计概览

### InputSchema API
- `POST /api/v1/input-schemas` - 创建
- `GET /api/v1/input-schemas` - 列表
- `GET /api/v1/input-schemas/:id` - 详情
- `PUT /api/v1/input-schemas/:id` - 更新
- `DELETE /api/v1/input-schemas/:id` - 删除

### OutputSchema API
- `POST /api/v1/output-schemas` - 创建
- `GET /api/v1/output-schemas` - 列表
- `GET /api/v1/output-schemas/:id` - 详情
- `PUT /api/v1/output-schemas/:id` - 更新
- `DELETE /api/v1/output-schemas/:id` - 删除

### 数据集模板 API
- `GET /api/v1/datasets/template/download` - 下载模板
- `POST /api/v1/datasets/:id/validate` - 校验数据集

### Prompt API 扩展
- `PUT /api/v1/prompts/:id` - 支持 `inputSchemaId`、`outputSchemaId`

## 前端页面

### 新增页面
1. **Schema 管理页** (`/schemas`) - 输入/输出结构列表
2. **OutputSchema 编辑器** (`/schemas/output/[id]`) - 字段定义、评估配置
3. **InputSchema 编辑器** (`/schemas/input/[id]`) - 变量定义

### 改造页面
1. **提示词详情页** - 新增"结构定义" Tab，关联 Schema
2. **数据集上传** - 字段映射向导
3. **模板下载弹窗** - 支持根据 Schema 生成

## 前置依赖

- 现有评估器系统正常运行
- 数据集上传/下载功能可用
- 提示词 CRUD 功能完整

## 技术选型

| 功能 | 技术方案 |
|------|---------|
| 模板引擎 | Handlebars |
| JSON Schema 校验 | 自实现（轻量） |
| 表格导出 | xlsx |
| 前端表单 | ProForm + 动态字段 |

## 风险与应对

| 风险 | 应对措施 |
|------|---------|
| 解析器无法处理复杂输出 | 提供多种解析模式，JSON_EXTRACT 兼容 markdown |
| 字段评估性能下降 | 并行评估，缓存评估器实例 |
| 用户理解成本高 | 提供向导、模板、文档 |
| 迁移导致数据丢失 | 充分测试迁移脚本，保留原字段 |

## 成功标准

- [ ] 可创建/编辑输入输出结构定义
- [ ] 提示词可关联结构定义
- [ ] 数据集模板下载（根据 Schema 生成）
- [ ] 数据集上传支持字段映射
- [ ] 任务执行支持结构化输出解析和字段级评估
- [ ] 基础聚合（全部通过、加权平均）正常工作
- [ ] 所有现有功能不受影响（向后兼容）
