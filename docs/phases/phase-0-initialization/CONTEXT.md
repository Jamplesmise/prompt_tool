# Phase 0: 项目初始化 - 上下文

> 本阶段目标：搭建项目脚手架、配置开发环境、初始化数据库

## 一、项目概述

**产品定位**：面向 AI 开发团队的提示词测试与模型评估平台

**核心功能**：
- 提示词版本管理
- 批量测试执行
- 灵活评估器
- 结果分析导出

## 二、技术栈

| 层级 | 技术 | 版本要求 |
|------|------|----------|
| 前端 | Next.js + React + TypeScript | Next.js 14, React 18 |
| UI | Ant Design + ProComponents | 5.x |
| 后端 | Next.js API Routes + Prisma | - |
| 队列 | BullMQ | - |
| 数据库 | PostgreSQL | ≥ 15 |
| 缓存 | Redis | ≥ 7.0 |
| 状态管理 | Zustand + React Query | - |
| 运行时 | Node.js | ≥ 18.17 |
| 包管理 | pnpm | ≥ 8.0 |

## 三、项目结构

```
ai-eval-platform/
├── packages/                   # 共享包
│   ├── shared/                 # @platform/shared - 类型、常量、纯函数
│   └── evaluators/             # @platform/evaluators - 评估器核心逻辑
├── apps/
│   ├── web/                    # 主 Next.js 应用
│   └── sandbox/                # 代码沙箱服务
├── docs/                       # 设计文档
├── docker/                     # Docker 配置
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

### apps/web 结构
```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证页面组
│   │   ├── (dashboard)/        # 主应用页面组
│   │   └── api/v1/             # API 路由
│   ├── components/             # UI 组件
│   ├── hooks/                  # React Hooks
│   ├── stores/                 # Zustand Stores
│   ├── services/               # API 调用封装
│   ├── lib/                    # 工具函数
│   └── workers/                # 后台 Worker
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 初始数据
└── next.config.js
```

## 四、数据库 Schema（完整）

```prisma
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
  content        String
  variables      Json     @default("[]")
  tags           String[] @default([])
  currentVersion Int      @default(0) @map("current_version")

  createdById    String   @map("created_by_id")
  createdBy      User     @relation(fields: [createdById], references: [id])

  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

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

  version   Int
  content   String
  variables Json     @default("[]")
  changeLog String?  @map("change_log")

  createdById String   @map("created_by_id")
  createdBy   User     @relation(fields: [createdById], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

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
  schema       Json?
  rowCount     Int      @default(0) @map("row_count")
  filePath     String?  @map("file_path")
  isPersistent Boolean  @default(false) @map("is_persistent")

  createdById  String   @map("created_by_id")
  createdBy    User     @relation(fields: [createdById], references: [id])

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

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
  data      Json

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

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
  apiKey   String       @map("api_key")
  headers  Json         @default("{}")
  isActive Boolean      @default(true) @map("is_active")

  createdAt DateTime    @default(now()) @map("created_at")
  updatedAt DateTime    @updatedAt @map("updated_at")

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

  name       String
  modelId    String   @map("model_id")
  config     Json     @default("{}")
  pricing    Json     @default("{}")
  isActive   Boolean  @default(true) @map("is_active")

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

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
  config      Json
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
  PRESET
  CODE
  LLM
  COMPOSITE
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
  config      Json
  progress    Json       @default("{\"total\": 0, \"completed\": 0, \"failed\": 0}")
  stats       Json       @default("{}")
  error       String?

  startedAt   DateTime?  @map("started_at")
  completedAt DateTime?  @map("completed_at")

  datasetId   String     @map("dataset_id")
  dataset     Dataset    @relation(fields: [datasetId], references: [id])

  createdById String     @map("created_by_id")
  createdBy   User       @relation(fields: [createdById], references: [id])

  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

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
  PROMPT
  AGENT
  API
  AB_TEST
}

enum TaskStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  STOPPED
}

model TaskPrompt {
  id              String @id @default(uuid())
  taskId          String @map("task_id")
  task            Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  promptId        String @map("prompt_id")
  prompt          Prompt @relation(fields: [promptId], references: [id])
  promptVersionId String @map("prompt_version_id")

  @@unique([taskId, promptId])
  @@map("task_prompts")
}

model TaskModel {
  id      String @id @default(uuid())
  taskId  String @map("task_id")
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  modelId String @map("model_id")
  model   Model  @relation(fields: [modelId], references: [id])

  @@unique([taskId, modelId])
  @@map("task_models")
}

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
  id              String        @id @default(uuid())
  taskId          String        @map("task_id")
  task            Task          @relation(fields: [taskId], references: [id], onDelete: Cascade)

  datasetRowId    String        @map("dataset_row_id")
  datasetRow      DatasetRow    @relation(fields: [datasetRowId], references: [id])

  promptId        String        @map("prompt_id")
  promptVersionId String        @map("prompt_version_id")
  promptVersion   PromptVersion @relation(fields: [promptVersionId], references: [id])

  modelId         String        @map("model_id")
  model           Model         @relation(fields: [modelId], references: [id])

  input           Json
  output          String?
  expected        String?

  latencyMs       Int?          @map("latency_ms")
  tokens          Json          @default("{\"input\": 0, \"output\": 0, \"total\": 0}")
  cost            Decimal?      @db.Decimal(10, 6)

  status          ResultStatus  @default(PENDING)
  error           String?

  createdAt       DateTime      @default(now()) @map("created_at")

  evaluations     EvaluationResult[]

  @@index([taskId])
  @@index([taskId, status])
  @@map("task_results")
}

enum ResultStatus {
  PENDING
  SUCCESS
  FAILED
  TIMEOUT
  ERROR
}

model EvaluationResult {
  id           String     @id @default(uuid())
  taskResultId String     @map("task_result_id")
  taskResult   TaskResult @relation(fields: [taskResultId], references: [id], onDelete: Cascade)

  evaluatorId  String     @map("evaluator_id")
  evaluator    Evaluator  @relation(fields: [evaluatorId], references: [id])

  passed       Boolean
  score        Decimal?   @db.Decimal(5, 4)
  reason       String?
  details      Json       @default("{}")

  latencyMs    Int?       @map("latency_ms")

  createdAt    DateTime   @default(now()) @map("created_at")

  @@index([taskResultId])
  @@map("evaluation_results")
}
```

## 五、环境变量

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_eval_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Sandbox
SANDBOX_URL="http://localhost:3001"
SANDBOX_SECRET="sandbox-secret-key"

# Optional
NODE_ENV="development"
LOG_LEVEL="debug"
```

## 六、开发规范

### 命名规范
- 文件：`camelCase.ts`
- 组件：`PascalCase.tsx`
- 类型：`PascalCaseType`
- 枚举：`PascalCaseEnum`
- 常量：`UPPER_SNAKE_CASE`

### TypeScript 规范
- 使用 `type` 而非 `interface`
- 使用 `import type` 导入类型
- 禁止 `any`，使用 `unknown`

### API 响应格式
```typescript
// 成功
{ code: 200, message: "success", data: T }

// 错误
{ code: 4xxxxx, message: "错误描述", data: null }
```

### Git 提交规范
```
feat: 新功能
fix: 修复
docs: 文档
refactor: 重构
chore: 杂项
```

## 七、常用命令

```bash
pnpm dev              # 启动开发
pnpm build            # 构建
pnpm db:push          # 同步数据库
pnpm db:seed          # 初始化数据
pnpm lint             # 代码检查
pnpm type-check       # 类型检查
```

## 八、本阶段依赖

- 无上游依赖，这是项目起点

## 九、本阶段产出

完成后，后续阶段可使用：
- 项目脚手架
- 数据库连接
- 基础配置
- 共享类型包
