# API 规格说明

## 一、通用约定

### 1.1 基础路径

```
/api/v1
```

### 1.2 请求格式

- Content-Type: `application/json`
- 认证: `Cookie` (Session) 或 `Authorization: Bearer <token>`

### 1.3 响应格式

```typescript
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": T
}

// 错误响应
{
  "code": 400xxx,
  "message": "错误描述",
  "data": null
}
```

### 1.4 分页请求

```typescript
// 请求参数
{
  page?: number;      // 页码，从 1 开始，默认 1
  pageSize?: number;  // 每页条数，默认 20，最大 100
  sortBy?: string;    // 排序字段
  sortOrder?: 'asc' | 'desc';  // 排序方向
}

// 响应格式
{
  "code": 200,
  "data": {
    "list": T[],
    "total": number,
    "page": number,
    "pageSize": number
  }
}
```

### 1.5 错误码定义

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400001 | 参数校验失败 |
| 400002 | 参数格式错误 |
| 401001 | 未登录 |
| 401002 | Token 过期 |
| 403001 | 无权限 |
| 404001 | 资源不存在 |
| 500001 | 服务器内部错误 |
| 501001 | 提示词不存在 |
| 501002 | 提示词版本不存在 |
| 502001 | 数据集不存在 |
| 502002 | 数据集解析失败 |
| 503001 | 评估器不存在 |
| 503002 | 评估器执行失败 |
| 504001 | 任务不存在 |
| 504002 | 任务状态不允许该操作 |
| 505001 | 模型配置不存在 |
| 505002 | 模型连接失败 |

---

## 二、认证 API

### POST /api/v1/auth/login

登录

**请求体**：
```typescript
{
  email: string;     // 邮箱
  password: string;  // 密码
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      avatar: string | null;
    }
  }
}
```

### POST /api/v1/auth/logout

登出

**响应**：
```typescript
{
  code: 200,
  data: null
}
```

### GET /api/v1/auth/me

获取当前用户信息

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    role: 'admin' | 'user';
  }
}
```

---

## 三、提示词 API

### GET /api/v1/prompts

获取提示词列表

**查询参数**：
```typescript
{
  page?: number;
  pageSize?: number;
  keyword?: string;  // 按名称搜索
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      currentVersion: number;
      createdAt: string;  // ISO 8601
      updatedAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### POST /api/v1/prompts

创建提示词

**请求体**：
```typescript
{
  name: string;              // 名称，1-200字符
  description?: string;      // 描述
  content: string;           // 内容
}
```

**响应**：
```typescript
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

### GET /api/v1/prompts/:id

获取提示词详情

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    content: string;              // 当前草稿内容
    variables: Array<{name: string; type: string}>;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
  }
}
```

### PUT /api/v1/prompts/:id

更新提示词（保存草稿）

**请求体**：
```typescript
{
  name?: string;
  description?: string;
  content?: string;
}
```

**响应**：同 GET /api/v1/prompts/:id

### DELETE /api/v1/prompts/:id

删除提示词

**响应**：
```typescript
{
  code: 200,
  data: null
}
```

### GET /api/v1/prompts/:id/versions

获取版本列表

**响应**：
```typescript
{
  code: 200,
  data: Array<{
    id: string;
    version: number;
    changeLog: string | null;
    createdAt: string;
    createdBy: {
      id: string;
      name: string;
    };
  }>
}
```

### POST /api/v1/prompts/:id/versions

发布新版本

**请求体**：
```typescript
{
  changeLog?: string;  // 变更说明
}
```

**响应**：
```typescript
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

### GET /api/v1/prompts/:id/versions/:versionId

获取指定版本详情

**响应**：
```typescript
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

### POST /api/v1/prompts/:id/versions/:versionId/rollback

回滚到指定版本

**响应**：
```typescript
{
  code: 200,
  data: {
    newVersion: number;  // 回滚后创建的新版本号
  }
}
```

### GET /api/v1/prompts/:id/versions/diff

版本对比

**查询参数**：
```typescript
{
  v1: string;  // 版本ID 1
  v2: string;  // 版本ID 2
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    v1: {
      version: number;
      content: string;
    };
    v2: {
      version: number;
      content: string;
    };
  }
}
```

### POST /api/v1/prompts/:id/test

快速测试

**请求体**：
```typescript
{
  modelId: string;
  versionId?: string;  // 不传则使用草稿
  variables: Record<string, string>;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    output: string;
    latencyMs: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
  }
}
```

---

## 四、数据集 API

### GET /api/v1/datasets

获取数据集列表

**查询参数**：
```typescript
{
  page?: number;
  pageSize?: number;
  keyword?: string;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      name: string;
      description: string | null;
      rowCount: number;
      isPersistent: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### POST /api/v1/datasets

创建数据集（元信息）

**请求体**：
```typescript
{
  name: string;
  description?: string;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    schema: null;
    rowCount: 0;
    isPersistent: false;
    createdAt: string;
    updatedAt: string;
  }
}
```

### POST /api/v1/datasets/:id/upload

上传数据文件

**请求**：
- Content-Type: `multipart/form-data`
- 字段：
  - `file`: 文件 (xlsx/csv)
  - `isPersistent`: 'true' | 'false'
  - `fieldMapping`: JSON 字符串，字段映射

**fieldMapping 格式**：
```typescript
{
  input: string;     // 映射到 input 的字段名
  expected: string;  // 映射到 expected 的字段名
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    rowCount: number;
    schema: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean';
    }>;
  }
}
```

### GET /api/v1/datasets/:id

获取数据集详情

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    schema: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean';
    }>;
    rowCount: number;
    isPersistent: boolean;
    createdAt: string;
    updatedAt: string;
  }
}
```

### GET /api/v1/datasets/:id/rows

获取数据行（分页）

**查询参数**：
```typescript
{
  page?: number;
  pageSize?: number;  // 默认 50
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      rowIndex: number;
      data: Record<string, any>;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### PUT /api/v1/datasets/:id/rows/:rowId

更新单条数据

**请求体**：
```typescript
{
  data: Record<string, any>;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    rowIndex: number;
    data: Record<string, any>;
  }
}
```

### POST /api/v1/datasets/:id/rows

新增数据行

**请求体**：
```typescript
{
  data: Record<string, any>;
}
```

**响应**：同 PUT

### DELETE /api/v1/datasets/:id/rows/:rowId

删除数据行

**响应**：
```typescript
{
  code: 200,
  data: null
}
```

### GET /api/v1/datasets/:id/download

下载数据集

**查询参数**：
```typescript
{
  format?: 'xlsx' | 'csv';  // 默认 xlsx
}
```

**响应**：文件流

### GET /api/v1/datasets/templates/:type

下载模板

**路径参数**：
- type: `basic` | `with-expected`

**响应**：文件流

---

## 五、模型配置 API

### GET /api/v1/providers

获取提供商列表

**响应**：
```typescript
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    type: 'openai' | 'anthropic' | 'azure' | 'custom';
    baseUrl: string;
    isActive: boolean;
    models: Array<{
      id: string;
      name: string;
      modelId: string;
      isActive: boolean;
    }>;
  }>
}
```

### POST /api/v1/providers

添加提供商

**请求体**：
```typescript
{
  name: string;
  type: 'openai' | 'anthropic' | 'azure' | 'custom';
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    type: string;
    baseUrl: string;
    isActive: boolean;
  }
}
```

### PUT /api/v1/providers/:id

更新提供商

**请求体**：
```typescript
{
  name?: string;
  baseUrl?: string;
  apiKey?: string;  // 传空字符串表示不修改
  headers?: Record<string, string>;
  isActive?: boolean;
}
```

### DELETE /api/v1/providers/:id

删除提供商（同时删除其下所有模型）

### GET /api/v1/models

获取所有模型列表（扁平化）

**响应**：
```typescript
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    modelId: string;
    provider: {
      id: string;
      name: string;
      type: string;
    };
    config: {
      temperature?: number;
      maxTokens?: number;
    };
    isActive: boolean;
  }>
}
```

### POST /api/v1/providers/:providerId/models

添加模型

**请求体**：
```typescript
{
  name: string;
  modelId: string;
  config?: {
    temperature?: number;
    maxTokens?: number;
  };
}
```

### PUT /api/v1/models/:id

更新模型

### DELETE /api/v1/models/:id

删除模型

### POST /api/v1/models/:id/test

测试模型连接

**响应**：
```typescript
{
  code: 200,
  data: {
    success: boolean;
    message: string;
    latencyMs: number;
  }
}
```

---

## 六、评估器 API

### GET /api/v1/evaluators

获取评估器列表

**查询参数**：
```typescript
{
  type?: 'preset' | 'code' | 'llm' | 'composite';
}
```

**响应**：
```typescript
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

获取预置评估器列表（只读）

**响应**：
```typescript
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    description: string;
    type: 'preset';
    config: {
      presetType: 'exact_match' | 'contains' | 'regex' | 'json_schema' | 'similarity';
      params: Record<string, any>;
    };
  }>
}
```

### POST /api/v1/evaluators

创建评估器

**请求体**：
```typescript
{
  name: string;
  description?: string;
  type: 'code' | 'llm' | 'composite';
  config: {
    // code 类型
    language?: 'nodejs' | 'python';
    code?: string;
    
    // llm 类型
    modelId?: string;
    prompt?: string;
    
    // composite 类型
    evaluatorIds?: string[];
    mode?: 'parallel' | 'serial';
    aggregation?: 'and' | 'or' | 'weighted_average';
    weights?: number[];
  };
}
```

### GET /api/v1/evaluators/:id

获取评估器详情

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    type: 'preset' | 'code' | 'llm' | 'composite';
    config: Record<string, any>;
    isPreset: boolean;
    createdAt: string;
    updatedAt: string;
  }
}
```

### PUT /api/v1/evaluators/:id

更新评估器（预置评估器不可更新）

### DELETE /api/v1/evaluators/:id

删除评估器（预置评估器不可删除）

### POST /api/v1/evaluators/:id/test

测试评估器

**请求体**：
```typescript
{
  input: string;
  output: string;
  expected: string;
  metadata?: Record<string, any>;
}
```

**响应**：
```typescript
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

---

## 七、任务 API

### GET /api/v1/tasks

获取任务列表

**查询参数**：
```typescript
{
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  keyword?: string;
  startDate?: string;  // ISO 8601
  endDate?: string;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      name: string;
      status: string;
      progress: {
        total: number;
        completed: number;
        failed: number;
      };
      stats: {
        passRate: number | null;
        avgLatencyMs: number | null;
      };
      createdAt: string;
      startedAt: string | null;
      completedAt: string | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### POST /api/v1/tasks

创建任务

**请求体**：
```typescript
{
  name: string;
  description?: string;
  config: {
    promptIds: string[];
    promptVersionIds: string[];  // 与 promptIds 一一对应
    modelIds: string[];
    datasetId: string;
    evaluatorIds: string[];
    execution: {
      concurrency: number;       // 1-20
      timeoutSeconds: number;    // 10-300
      retryCount: number;        // 0-5
    };
  };
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    status: 'pending';
    config: Record<string, any>;
    createdAt: string;
  }
}
```

### GET /api/v1/tasks/:id

获取任务详情

**响应**：
```typescript
{
  code: 200,
  data: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    config: {
      prompts: Array<{id: string; name: string; version: number}>;
      models: Array<{id: string; name: string}>;
      dataset: {id: string; name: string; rowCount: number};
      evaluators: Array<{id: string; name: string}>;
      execution: Record<string, number>;
    };
    progress: {
      total: number;
      completed: number;
      failed: number;
    };
    stats: {
      passRate: number | null;
      avgLatencyMs: number | null;
      totalTokens: number;
      passCount: number;
      failCount: number;
    };
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  }
}
```

### POST /api/v1/tasks/:id/run

执行任务

**前置条件**：status 为 `pending`

**响应**：
```typescript
{
  code: 200,
  data: {
    status: 'running';
  }
}
```

### POST /api/v1/tasks/:id/stop

终止任务

**前置条件**：status 为 `running`

**响应**：
```typescript
{
  code: 200,
  data: {
    status: 'stopped';
  }
}
```

### POST /api/v1/tasks/:id/retry

重试失败用例

**前置条件**：status 为 `completed` 或 `failed`

### DELETE /api/v1/tasks/:id

删除任务

### GET /api/v1/tasks/:id/results

获取测试结果

**查询参数**：
```typescript
{
  page?: number;
  pageSize?: number;
  status?: 'success' | 'failed' | 'timeout' | 'error';
  passed?: boolean;
}
```

**响应**：
```typescript
{
  code: 200,
  data: {
    list: Array<{
      id: string;
      rowIndex: number;
      promptId: string;
      promptVersion: number;
      modelId: string;
      input: Record<string, any>;
      output: string;
      expected: string | null;
      status: string;
      latencyMs: number;
      tokens: {
        input: number;
        output: number;
        total: number;
      };
      evaluations: Array<{
        evaluatorId: string;
        evaluatorName: string;
        passed: boolean;
        score: number | null;
        reason: string | null;
      }>;
      error: string | null;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }
}
```

### GET /api/v1/tasks/:id/results/:resultId

获取单条结果详情

### GET /api/v1/tasks/:id/results/export

导出结果

**查询参数**：
```typescript
{
  format?: 'xlsx' | 'csv' | 'json';
}
```

**响应**：文件流

### GET /api/v1/tasks/:id/progress

获取执行进度（SSE）

**响应**：Server-Sent Events

```
event: progress
data: {"total": 100, "completed": 50, "failed": 2}

event: completed
data: {"status": "completed", "stats": {...}}
```

---

## 八、统计 API

### GET /api/v1/stats/overview

获取概览统计

**响应**：
```typescript
{
  code: 200,
  data: {
    promptCount: number;
    datasetCount: number;
    taskCountThisWeek: number;
    avgPassRate: number | null;
  }
}
```
