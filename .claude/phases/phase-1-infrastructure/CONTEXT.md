# Phase 1: 基础设施层 - 上下文

> 本阶段目标：实现用户认证系统 + 模型配置管理（前后端齐头并进）

## 一、阶段概述

基础设施层是所有业务模块的底层依赖：
- **用户认证**：登录/登出/会话管理
- **模型配置**：提供商管理/模型管理/连接测试

## 二、数据模型

### User 模型
```prisma
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
  @@map("users")
}

enum UserRole {
  ADMIN
  USER
}
```

### Provider & Model 模型
```prisma
model Provider {
  id       String       @id @default(uuid())
  name     String
  type     ProviderType
  baseUrl  String       @map("base_url")
  apiKey   String       @map("api_key")  // 加密存储
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
  config     Json     @default("{}")  // {temperature, maxTokens, ...}
  pricing    Json     @default("{}")  // {inputPer1k, outputPer1k}
  isActive   Boolean  @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  @@index([providerId])
  @@map("models")
}
```

## 三、API 规格

### 认证 API

#### POST /api/v1/auth/login
```typescript
// 请求
{ email: string; password: string; }

// 响应
{
  code: 200,
  data: {
    user: { id: string; email: string; name: string; avatar: string | null; }
  }
}
```

#### POST /api/v1/auth/logout
```typescript
// 响应
{ code: 200, data: null }
```

#### GET /api/v1/auth/me
```typescript
// 响应
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

### 模型配置 API

#### GET /api/v1/providers
```typescript
// 响应
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

#### POST /api/v1/providers
```typescript
// 请求
{
  name: string;
  type: 'openai' | 'anthropic' | 'azure' | 'custom';
  baseUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
}

// 响应
{
  code: 200,
  data: { id: string; name: string; type: string; baseUrl: string; isActive: boolean; }
}
```

#### PUT /api/v1/providers/:id
```typescript
// 请求
{
  name?: string;
  baseUrl?: string;
  apiKey?: string;  // 空字符串表示不修改
  headers?: Record<string, string>;
  isActive?: boolean;
}
```

#### DELETE /api/v1/providers/:id
删除提供商（级联删除其下所有模型）

#### GET /api/v1/models
```typescript
// 响应 - 扁平化模型列表
{
  code: 200,
  data: Array<{
    id: string;
    name: string;
    modelId: string;
    provider: { id: string; name: string; type: string; };
    config: { temperature?: number; maxTokens?: number; };
    isActive: boolean;
  }>
}
```

#### POST /api/v1/providers/:providerId/models
```typescript
// 请求
{
  name: string;
  modelId: string;
  config?: { temperature?: number; maxTokens?: number; };
}
```

#### PUT /api/v1/models/:id
更新模型配置

#### DELETE /api/v1/models/:id
删除模型

#### POST /api/v1/models/:id/test
```typescript
// 响应
{
  code: 200,
  data: {
    success: boolean;
    message: string;
    latencyMs: number;
  }
}
```

## 四、页面规格

### 登录页 `/login`

**布局**：居中卡片，无侧边栏

**表单字段**：
| 字段 | 类型 | 必填 | 校验 |
|------|------|------|------|
| 邮箱 | email | 是 | 邮箱格式 |
| 密码 | password | 是 | 最少6位 |

**交互**：
- 登录成功跳转 `/`
- 登录失败显示错误提示

### 模型配置页 `/models`

**布局**：提供商分组 + 模型卡片

```
┌─────────────────────────────────────────────────────────────────┐
│ [添加提供商]                                                    │
├─────────────────────────────────────────────────────────────────┤
│ OpenAI                                                   [编辑] │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │ gpt-4o      │ │ gpt-4o-mini │ │ + 添加模型  │                │
│ │ ✓ 已连接    │ │ ✓ 已连接    │ │             │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ Anthropic                                                [编辑] │
│ ┌─────────────┐ ┌─────────────┐                                │
│ │ claude-3.5  │ │ + 添加模型  │                                │
│ │ ✓ 已连接    │ │             │                                │
│ └─────────────┘ └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

**添加提供商弹窗字段**：
| 字段 | 类型 | 必填 |
|------|------|------|
| 名称 | text | 是 |
| 类型 | select (openai/anthropic/azure/custom) | 是 |
| Base URL | url | 是 |
| API Key | password | 是 |
| 自定义请求头 | key-value 列表 | 否 |

**添加模型弹窗字段**：
| 字段 | 类型 | 必填 |
|------|------|------|
| 显示名称 | text | 是 |
| 模型 ID | text | 是 |
| 默认 Temperature | number (0-2) | 否 |
| 默认 Max Tokens | number | 否 |

## 五、UI 组件参考

### 登录表单
```tsx
import { ProForm, ProFormText } from '@ant-design/pro-components';

<ProForm onFinish={handleLogin}>
  <ProFormText
    name="email"
    label="邮箱"
    rules={[
      { required: true, message: '请输入邮箱' },
      { type: 'email', message: '请输入有效的邮箱' }
    ]}
  />
  <ProFormText.Password
    name="password"
    label="密码"
    rules={[
      { required: true, message: '请输入密码' },
      { min: 6, message: '密码至少6位' }
    ]}
  />
</ProForm>
```

### 提供商卡片
```tsx
import { ProCard } from '@ant-design/pro-components';
import { Card, Tag, Button, Space } from 'antd';

<ProCard title="OpenAI" extra={<Button type="link">编辑</Button>}>
  <Space wrap>
    {models.map(model => (
      <Card key={model.id} size="small">
        <div>{model.name}</div>
        <Tag color={model.isActive ? 'success' : 'default'}>
          {model.isActive ? '已连接' : '未连接'}
        </Tag>
      </Card>
    ))}
  </Space>
</ProCard>
```

## 六、安全要求

- **密码存储**：使用 bcrypt 哈希，salt rounds ≥ 10
- **API Key 存储**：加密存储，界面脱敏显示（仅显示后4位）
- **会话管理**：使用 NextAuth.js 或 iron-session

## 七、错误码

| 错误码 | 说明 |
|--------|------|
| 401001 | 未登录 |
| 401002 | Token 过期 |
| 403001 | 无权限 |
| 505001 | 模型配置不存在 |
| 505002 | 模型连接失败 |

## 八、依赖关系

**上游依赖**：
- Phase 0: 项目脚手架、数据库、共享类型

**下游影响**：
- 所有其他模块都依赖认证系统
- 任务执行依赖模型配置

## 九、测试要点

### 单元测试
- 密码哈希/验证
- API Key 加密/解密
- 表单校验逻辑

### 集成测试
- 登录流程端到端
- 模型连接测试
- 会话持久化
