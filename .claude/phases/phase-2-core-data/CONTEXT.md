# Phase 2: 核心数据层 - 上下文

> 本阶段目标：实现提示词管理 + 数据集管理（前后端齐头并进）

## 一、阶段概述

核心数据层包含测试任务的两大输入：
- **提示词管理**：创建/编辑/版本控制/快速测试
- **数据集管理**：上传/预览/编辑/导出

## 二、数据模型

### Prompt & PromptVersion 模型
```prisma
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

  taskResults TaskResult[]

  @@unique([promptId, version])
  @@index([promptId])
  @@map("prompt_versions")
}
```

### Dataset & DatasetRow 模型
```prisma
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

  taskResults TaskResult[]

  @@unique([datasetId, rowIndex])
  @@index([datasetId])
  @@map("dataset_rows")
}
```

### JSONB 结构说明

**Prompt.variables**：
```typescript
type PromptVariable = {
  name: string;       // 变量名
  type: 'string' | 'number' | 'boolean';
  default?: string;   // 默认值
};
// 示例: [{ "name": "role", "type": "string", "default": "助手" }]
```

**Dataset.schema**：
```typescript
type DatasetSchema = {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
};
// 示例: [{ "name": "input", "type": "string", "required": true }]
```

## 三、API 规格

### 提示词 API

#### GET /api/v1/prompts
```typescript
// 查询参数
{ page?: number; pageSize?: number; keyword?: string; }

// 响应
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      currentVersion: number;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

#### POST /api/v1/prompts
```typescript
// 请求
{ name: string; description?: string; content: string; }

// 响应 - 自动创建 v1 版本
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    content: string;
    variables: Array<{name: string; type: string}>;
    currentVersion: number;  // 初始为 1
    createdAt: string;
    updatedAt: string;
  }
}
```

#### GET /api/v1/prompts/:id
获取提示词详情（含草稿内容）

#### PUT /api/v1/prompts/:id
更新提示词（保存草稿，不创建版本）

#### DELETE /api/v1/prompts/:id
删除提示词（级联删除版本）

#### GET /api/v1/prompts/:id/versions
获取版本列表

#### POST /api/v1/prompts/:id/versions
发布新版本
```typescript
// 请求
{ changeLog?: string; }

// 响应
{
  code: 200,
  data: {
    id: string;
    version: number;
    content: string;
    variables: Array<{name: string; type: string}>;
    changeLog: string | null;
    createdAt: string;
  }
}
```

#### GET /api/v1/prompts/:id/versions/:versionId
获取指定版本详情

#### POST /api/v1/prompts/:id/versions/:versionId/rollback
回滚到指定版本（创建新版本）

#### GET /api/v1/prompts/:id/versions/diff?v1=xxx&v2=xxx
版本对比

#### POST /api/v1/prompts/:id/test
快速测试
```typescript
// 请求
{
  modelId: string;
  versionId?: string;  // 不传则使用草稿
  variables: Record<string, string>;
}

// 响应
{
  code: 200,
  data: {
    output: string;
    latencyMs: number;
    tokens: { input: number; output: number; total: number; };
  }
}
```

### 数据集 API

#### GET /api/v1/datasets
获取数据集列表

#### POST /api/v1/datasets
创建数据集元信息

#### POST /api/v1/datasets/:id/upload
上传数据文件
```typescript
// Content-Type: multipart/form-data
// 字段：file (xlsx/csv), isPersistent ('true'|'false'), fieldMapping (JSON字符串)

// fieldMapping 格式
{ input: string; expected: string; }  // 字段映射

// 响应
{
  code: 200,
  data: {
    id: string;
    rowCount: number;
    schema: Array<{ name: string; type: string; }>;
  }
}
```

#### GET /api/v1/datasets/:id
获取数据集详情

#### GET /api/v1/datasets/:id/rows
获取数据行（分页，默认 50 条）

#### PUT /api/v1/datasets/:id/rows/:rowId
更新单条数据

#### POST /api/v1/datasets/:id/rows
新增数据行

#### DELETE /api/v1/datasets/:id/rows/:rowId
删除数据行

#### GET /api/v1/datasets/:id/download?format=xlsx|csv
下载数据集

#### GET /api/v1/datasets/templates/:type
下载模板（type: basic | with-expected）

## 四、页面规格

### 提示词列表页 `/prompts`

**布局**：工具栏 + 表格

**工具栏**：
- 搜索框（按名称搜索）
- 新建按钮

**表格列**：
| 列名 | 字段 | 宽度 | 排序 |
|------|------|------|------|
| 名称 | name | 200px | 否 |
| 描述 | description | auto | 否 |
| 当前版本 | currentVersion | 100px | 否 |
| 更新时间 | updatedAt | 180px | 是 |
| 操作 | - | 150px | 否 |

**操作列**：编辑、快速测试、删除

### 提示词详情页 `/prompts/[id]`

**布局**：左右分栏

```
┌─────────────────────────────────────────────────────────────────┐
│ [返回] 提示词名称                            [保存草稿] [发布]  │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│         编辑器区域              │           侧边栏               │
│                                │                                │
│  ┌──────────────────────────┐  │  ┌──────────────────────────┐  │
│  │                          │  │  │ 版本历史                 │  │
│  │     Monaco Editor        │  │  │ - v3 (当前) 2024-01-15  │  │
│  │                          │  │  │ - v2 2024-01-10         │  │
│  │                          │  │  │ - v1 2024-01-05         │  │
│  │                          │  │  └──────────────────────────┘  │
│  └──────────────────────────┘  │                                │
│                                │  ┌──────────────────────────┐  │
│  变量列表：                     │  │ 快速测试                 │  │
│  - role (string)               │  │ 模型: [选择 ▼]           │  │
│  - question (string)           │  │ 变量输入...              │  │
│                                │  │ [运行测试]               │  │
│                                │  └──────────────────────────┘  │
└────────────────────────────────┴────────────────────────────────┘
```

**编辑器功能**：
- Monaco Editor，语言 markdown/plaintext
- 高亮 `{{变量}}` 语法
- 自动提取变量列表

**按钮逻辑**：
- 保存草稿：保存到 content 字段，不创建版本
- 发布：创建新版本，需填写变更说明

### 数据集列表页 `/datasets`

**工具栏**：
- 搜索框
- 下载模板（下拉：基础模板、带期望输出模板）
- 上传数据集

**表格列**：
| 列名 | 字段 | 宽度 |
|------|------|------|
| 名称 | name | 200px |
| 描述 | description | auto |
| 行数 | rowCount | 100px |
| 存储方式 | isPersistent | 100px |
| 更新时间 | updatedAt | 180px |
| 操作 | - | 120px |

**上传流程**：
1. 选择文件（xlsx/csv）
2. 解析预览（显示前 5 行）
3. 字段映射（自动识别 input/expected）
4. 选择存储方式（临时/持久化）
5. 确认上传

### 数据集详情页 `/datasets/[id]`

**布局**：信息卡片 + 数据表格

**信息卡片**：名称、描述、行数、创建时间、编辑、导出、删除

**数据表格**：
- 动态列（根据 schema 生成）
- 可编辑单元格（双击编辑）
- 新增行按钮
- 删除行按钮
- 分页：每页 50 条

## 五、变量插槽规则

提示词中使用 `{{变量名}}` 格式：
```
你是一个{{role}}助手。

用户问题：{{question}}

请用{{language}}回答。
```

**变量提取正则**：
```typescript
const extractVariables = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = [...content.matchAll(regex)];
  return [...new Set(matches.map(m => m[1]))];
};
```

**保留变量**：
- `{{input}}` - 数据集单输入字段自动映射
- `{{expected}}` - 期望输出字段（用于评估）

## 六、UI 组件参考

### Monaco Editor 封装
```tsx
import Editor from '@monaco-editor/react';

<Editor
  height={600}
  language="markdown"
  value={content}
  onChange={(val) => setContent(val || '')}
  options={{
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    wordWrap: 'on',
  }}
  theme="vs-dark"
/>
```

### 文件上传
```tsx
import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

<Upload
  accept=".xlsx,.csv"
  beforeUpload={(file) => {
    handleFileSelect(file);
    return false;  // 阻止自动上传
  }}
>
  <Button icon={<UploadOutlined />}>选择文件</Button>
</Upload>
```

### 可编辑表格
```tsx
import { EditableProTable } from '@ant-design/pro-components';

<EditableProTable
  rowKey="id"
  value={dataSource}
  onChange={setDataSource}
  columns={columns}
  editable={{
    type: 'multiple',
    editableKeys,
    onSave: async (rowKey, data) => {
      await api.updateRow(datasetId, rowKey, data);
    },
  }}
/>
```

## 七、错误码

| 错误码 | 说明 |
|--------|------|
| 501001 | 提示词不存在 |
| 501002 | 提示词版本不存在 |
| 502001 | 数据集不存在 |
| 502002 | 数据集解析失败 |

## 八、依赖关系

**上游依赖**：
- Phase 0: 数据库、共享类型
- Phase 1: 用户认证

**下游影响**：
- Phase 4 任务执行需要提示词和数据集

## 九、测试要点

### 单元测试
- 变量提取函数
- 文件解析（xlsx/csv）
- 字段映射逻辑

### 集成测试
- 提示词 CRUD + 版本管理
- 数据集上传/下载
- 快速测试调用 LLM
