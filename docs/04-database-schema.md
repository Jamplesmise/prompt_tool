# 数据库设计

## 一、设计原则

1. **主键使用 UUID**：避免 ID 泄露顺序信息
2. **软删除可选**：MVP 阶段使用硬删除，简化逻辑
3. **JSONB 存储灵活配置**：评估器配置、任务配置等
4. **时间戳统一 UTC**：createdAt、updatedAt 使用 UTC
5. **索引策略**：高频查询字段建立索引

---

## 二、ER 图

```
┌─────────────────────────────────────────────────────────────────┐
│                           数据模型                               │
└─────────────────────────────────────────────────────────────────┘

User (用户)
  │
  ├──► Prompt (提示词)
  │       │
  │       └──► PromptVersion (版本)
  │
  ├──► Dataset (数据集)
  │       │
  │       └──► DatasetRow (数据行)
  │
  ├──► Provider (提供商)
  │       │
  │       └──► Model (模型)
  │
  ├──► Evaluator (评估器)
  │
  └──► Task (任务)
          │
          ├──► TaskResult (结果)
          │       │
          │       └──► EvaluationResult (评估结果)
          │
          └──► [Schedule] (定时任务 - V2)
```

---

## 三、Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// 用户模块
// ============================================

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  name         String
  avatar       String?
  role         UserRole  @default(USER)
  settings     Json      @default("{}")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // 关联
  prompts         Prompt[]
  promptVersions  PromptVersion[]
  datasets        Dataset[]
  evaluators      Evaluator[]
  tasks           Task[]

  @@map("users")
}

enum UserRole {
  ADMIN
  USER
}

// ============================================
// 提示词模块
// ============================================

model Prompt {
  id             String   @id @default(uuid())
  name           String
  description    String?
  content        String   // 当前草稿内容
  variables      Json     @default("[]") // [{name, type, default}]
  tags           String[] @default([])
  currentVersion Int      @default(0) @map("current_version")
  
  createdById    String   @map("created_by_id")
  createdBy      User     @relation(fields: [createdById], references: [id])
  
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // 关联
  versions       PromptVersion[]
  tasks          TaskPrompt[]

  @@index([createdById])
  @@index([name])
  @@map("prompts")
}

model PromptVersion {
  id        String   @id @default(uuid())
  promptId  String   @map("prompt_id")
  prompt    Prompt   @relation(fields: [promptId], references: [id], onDelete: Cascade)
  
  version   Int      // 版本号，从 1 开始递增
  content   String   // 版本内容快照
  variables Json     @default("[]")
  changeLog String?  @map("change_log")
  
  createdById String   @map("created_by_id")
  createdBy   User     @relation(fields: [createdById], references: [id])
  
  createdAt DateTime @default(now()) @map("created_at")

  // 关联
  taskResults TaskResult[]

  @@unique([promptId, version])
  @@index([promptId])
  @@map("prompt_versions")
}

// ============================================
// 数据集模块
// ============================================

model Dataset {
  id           String   @id @default(uuid())
  name         String
  description  String?
  schema       Json?    // [{name, type, required}]
  rowCount     Int      @default(0) @map("row_count")
  filePath     String?  @map("file_path")
  isPersistent Boolean  @default(false) @map("is_persistent")
  
  createdById  String   @map("created_by_id")
  createdBy    User     @relation(fields: [createdById], references: [id])
  
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 关联
  rows         DatasetRow[]
  tasks        Task[]

  @@index([createdById])
  @@map("datasets")
}

model DatasetRow {
  id        String   @id @default(uuid())
  datasetId String   @map("dataset_id")
  dataset   Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  rowIndex  Int      @map("row_index")
  data      Json     // 行数据

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 关联
  taskResults TaskResult[]

  @@unique([datasetId, rowIndex])
  @@index([datasetId])
  @@map("dataset_rows")
}

// ============================================
// 模型配置模块
// ============================================

model Provider {
  id       String       @id @default(uuid())
  name     String
  type     ProviderType
  baseUrl  String       @map("base_url")
  apiKey   String       @map("api_key") // 加密存储
  headers  Json         @default("{}") // 自定义请求头
  isActive Boolean      @default(true) @map("is_active")
  
  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

  // 关联
  models   Model[]

  @@map("providers")
}

enum ProviderType {
  OPENAI
  ANTHROPIC
  AZURE
  CUSTOM
}

model Model {
  id         String   @id @default(uuid())
  providerId String   @map("provider_id")
  provider   Provider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  
  name       String   // 显示名称
  modelId    String   @map("model_id") // 模型标识符
  config     Json     @default("{}") // {temperature, maxTokens, ...}
  pricing    Json     @default("{}") // {inputPer1k, outputPer1k}
  isActive   Boolean  @default(true) @map("is_active")
  
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // 关联
  taskResults TaskResult[]
  tasks       TaskModel[]

  @@index([providerId])
  @@map("models")
}

// ============================================
// 评估器模块
// ============================================

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

  // 关联
  evaluationResults EvaluationResult[]
  tasks             TaskEvaluator[]

  @@index([type])
  @@map("evaluators")
}

enum EvaluatorType {
  PRESET     // 预置评估器
  CODE       // 代码评估器
  LLM        // LLM 评估器
  COMPOSITE  // 组合评估器
}

// ============================================
// 任务模块
// ============================================

model Task {
  id          String     @id @default(uuid())
  name        String
  description String?
  type        TaskType   @default(PROMPT)
  status      TaskStatus @default(PENDING)
  
  // 配置（存储完整配置快照）
  config      Json       // 执行配置
  
  // 进度
  progress    Json       @default("{\"total\": 0, \"completed\": 0, \"failed\": 0}")
  
  // 统计结果
  stats       Json       @default("{}")
  
  error       String?
  
  startedAt   DateTime?  @map("started_at")
  completedAt DateTime?  @map("completed_at")
  
  // 关联数据集（用于外键）
  datasetId   String     @map("dataset_id")
  dataset     Dataset    @relation(fields: [datasetId], references: [id])
  
  createdById String     @map("created_by_id")
  createdBy   User       @relation(fields: [createdById], references: [id])
  
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  // 关联
  results    TaskResult[]
  prompts    TaskPrompt[]
  models     TaskModel[]
  evaluators TaskEvaluator[]

  @@index([status])
  @@index([createdById])
  @@index([createdAt])
  @@map("tasks")
}

enum TaskType {
  PROMPT   // 提示词测试
  AGENT    // Agent 测试
  API      // API 测试
  AB_TEST  // A/B 对比
}

enum TaskStatus {
  PENDING    // 待执行
  RUNNING    // 执行中
  COMPLETED  // 已完成
  FAILED     // 失败
  STOPPED    // 已终止
}

// 任务-提示词 多对多
model TaskPrompt {
  id              String        @id @default(uuid())
  taskId          String        @map("task_id")
  task            Task          @relation(fields: [taskId], references: [id], onDelete: Cascade)
  promptId        String        @map("prompt_id")
  prompt          Prompt        @relation(fields: [promptId], references: [id])
  promptVersionId String        @map("prompt_version_id")

  @@unique([taskId, promptId])
  @@map("task_prompts")
}

// 任务-模型 多对多
model TaskModel {
  id      String @id @default(uuid())
  taskId  String @map("task_id")
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  modelId String @map("model_id")
  model   Model  @relation(fields: [modelId], references: [id])

  @@unique([taskId, modelId])
  @@map("task_models")
}

// 任务-评估器 多对多
model TaskEvaluator {
  id          String    @id @default(uuid())
  taskId      String    @map("task_id")
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  evaluatorId String    @map("evaluator_id")
  evaluator   Evaluator @relation(fields: [evaluatorId], references: [id])

  @@unique([taskId, evaluatorId])
  @@map("task_evaluators")
}

// ============================================
// 测试结果模块
// ============================================

model TaskResult {
  id              String           @id @default(uuid())
  taskId          String           @map("task_id")
  task            Task             @relation(fields: [taskId], references: [id], onDelete: Cascade)
  
  datasetRowId    String           @map("dataset_row_id")
  datasetRow      DatasetRow       @relation(fields: [datasetRowId], references: [id])
  
  promptId        String           @map("prompt_id")
  promptVersionId String           @map("prompt_version_id")
  promptVersion   PromptVersion    @relation(fields: [promptVersionId], references: [id])
  
  modelId         String           @map("model_id")
  model           Model            @relation(fields: [modelId], references: [id])
  
  input           Json             // 实际输入
  output          String?          // 模型输出
  expected        String?          // 期望输出
  
  latencyMs       Int?             @map("latency_ms")
  tokens          Json             @default("{\"input\": 0, \"output\": 0, \"total\": 0}")
  cost            Decimal?         @db.Decimal(10, 6)
  
  status          ResultStatus     @default(PENDING)
  error           String?
  
  createdAt       DateTime         @default(now()) @map("created_at")

  // 关联
  evaluations     EvaluationResult[]

  @@index([taskId])
  @@index([taskId, status])
  @@map("task_results")
}

enum ResultStatus {
  PENDING  // 待执行
  SUCCESS  // 成功
  FAILED   // 调用失败
  TIMEOUT  // 超时
  ERROR    // 错误
}

model EvaluationResult {
  id           String     @id @default(uuid())
  taskResultId String     @map("task_result_id")
  taskResult   TaskResult @relation(fields: [taskResultId], references: [id], onDelete: Cascade)
  
  evaluatorId  String     @map("evaluator_id")
  evaluator    Evaluator  @relation(fields: [evaluatorId], references: [id])
  
  passed       Boolean
  score        Decimal?   @db.Decimal(5, 4) // 0.0000 - 1.0000
  reason       String?
  details      Json       @default("{}")
  
  latencyMs    Int?       @map("latency_ms")
  
  createdAt    DateTime   @default(now()) @map("created_at")

  @@index([taskResultId])
  @@map("evaluation_results")
}
```

---

## 四、JSONB 字段结构说明

### 4.1 Prompt.variables

```typescript
type PromptVariable = {
  name: string;       // 变量名
  type: 'string' | 'number' | 'boolean';
  default?: string;   // 默认值
};

// 示例
[
  { "name": "role", "type": "string", "default": "助手" },
  { "name": "question", "type": "string" }
]
```

### 4.2 Dataset.schema

```typescript
type DatasetSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
};

// 示例
[
  { "name": "input", "type": "string", "required": true },
  { "name": "expected", "type": "string", "required": false },
  { "name": "category", "type": "string" }
]
```

### 4.3 Evaluator.config

```typescript
// PRESET 类型
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

// CODE 类型
type CodeConfig = {
  language: 'nodejs' | 'python';
  code: string;
  timeout?: number;  // 执行超时，毫秒
};

// LLM 类型
type LLMConfig = {
  modelId: string;
  prompt: string;  // 评估提示词
  scoreRange?: { min: number; max: number };
};

// COMPOSITE 类型
type CompositeConfig = {
  evaluatorIds: string[];
  mode: 'parallel' | 'serial';
  aggregation: 'and' | 'or' | 'weighted_average';
  weights?: number[];  // weighted_average 时使用
};
```

### 4.4 Task.config

```typescript
type TaskConfig = {
  execution: {
    concurrency: number;     // 并发数，1-20
    timeoutSeconds: number;  // 超时秒数，10-300
    retryCount: number;      // 重试次数，0-5
  };
};
```

### 4.5 Task.progress

```typescript
type TaskProgress = {
  total: number;      // 总数
  completed: number;  // 已完成
  failed: number;     // 失败数
};
```

### 4.6 Task.stats

```typescript
type TaskStats = {
  passRate: number | null;     // 通过率，0-1
  avgLatencyMs: number | null; // 平均耗时
  totalTokens: number;         // 总 Token
  passCount: number;           // 通过数
  failCount: number;           // 失败数
  totalCost: number;           // 总费用
};
```

### 4.7 TaskResult.tokens

```typescript
type TokenUsage = {
  input: number;
  output: number;
  total: number;
};
```

### 4.8 Model.config

```typescript
type ModelConfig = {
  temperature?: number;  // 0-2
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};
```

### 4.9 Model.pricing

```typescript
type ModelPricing = {
  inputPer1k: number;   // 每 1K input token 价格（美元）
  outputPer1k: number;  // 每 1K output token 价格（美元）
};
```

---

## 五、索引设计

| 表 | 索引 | 类型 | 说明 |
|----|----|------|------|
| users | email | UNIQUE | 登录查询 |
| prompts | created_by_id | BTREE | 按用户筛选 |
| prompts | name | BTREE | 名称搜索 |
| prompt_versions | (prompt_id, version) | UNIQUE | 版本唯一 |
| prompt_versions | prompt_id | BTREE | 版本列表 |
| dataset_rows | (dataset_id, row_index) | UNIQUE | 行唯一 |
| dataset_rows | dataset_id | BTREE | 数据查询 |
| models | provider_id | BTREE | 提供商筛选 |
| evaluators | type | BTREE | 类型筛选 |
| tasks | status | BTREE | 状态筛选 |
| tasks | created_by_id | BTREE | 用户任务 |
| tasks | created_at | BTREE | 时间排序 |
| task_results | task_id | BTREE | 结果查询 |
| task_results | (task_id, status) | BTREE | 状态筛选 |
| evaluation_results | task_result_id | BTREE | 评估查询 |

---

## 六、初始数据

### 6.1 预置评估器

```sql
INSERT INTO evaluators (id, name, description, type, config, is_preset, created_at, updated_at)
VALUES
  ('preset-exact-match', '精确匹配', '输出与期望完全一致', 'PRESET', 
   '{"presetType": "exact_match", "params": {}}', true, NOW(), NOW()),
  
  ('preset-contains', '包含匹配', '输出包含期望内容', 'PRESET',
   '{"presetType": "contains", "params": {}}', true, NOW(), NOW()),
  
  ('preset-regex', '正则匹配', '输出匹配正则表达式', 'PRESET',
   '{"presetType": "regex", "params": {"pattern": "", "flags": "i"}}', true, NOW(), NOW()),
  
  ('preset-json-schema', 'JSON Schema', '输出符合 JSON Schema', 'PRESET',
   '{"presetType": "json_schema", "params": {"schema": {}}}', true, NOW(), NOW()),
  
  ('preset-similarity', '相似度匹配', '文本相似度超过阈值', 'PRESET',
   '{"presetType": "similarity", "params": {"threshold": 0.8}}', true, NOW(), NOW());
```

### 6.2 默认管理员

```sql
-- 密码需要哈希处理
INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
VALUES
  ('admin-user-id', 'admin@example.com', '<hashed_password>', '管理员', 'ADMIN', NOW(), NOW());
```

---

## 七、迁移策略

### 开发阶段

```bash
# 使用 db push 快速同步（不生成迁移文件）
pnpm prisma db push
```

### 生产阶段

```bash
# 生成迁移文件
pnpm prisma migrate dev --name <migration_name>

# 应用迁移
pnpm prisma migrate deploy
```
