# Phase 5: FastGPT 协作者 API

## 目标

实现与 FastGPT 官方兼容的协作者管理 API，供 FastGPT 前端调用。

## 前置条件

- Phase 1-4 完成（MongoDB、分组、组织、权限系统就绪）
- 了解 FastGPT 官方 API 规范

## 业务背景

### FastGPT 协作者 API

FastGPT 前端需要调用以下 API 来管理资源的协作者：

- **应用协作者**：管理 AI 应用的访问权限
- **数据集协作者**：管理知识库的访问权限
- **模型协作者**：管理自定义模型的访问权限

### API 路径规范

与 FastGPT 官方保持一致：

```
/api/core/app/collaborator/*        # 应用协作者
/api/core/dataset/collaborator/*    # 数据集协作者
/api/system/model/collaborator/*    # 模型协作者
```

### 请求/响应格式

**获取协作者列表**：
```typescript
// GET /api/core/app/collaborator/list?appId=xxx
// Response
{
  code: 200,
  data: {
    clbs: [
      {
        tmbId: 'uuid',
        name: '张三',
        avatar: '...',
        permission: {
          value: 6,
          isOwner: false,
          hasReadPer: true,
          hasWritePer: true,
          hasManagePer: false
        }
      }
    ]
  }
}
```

**更新协作者**：
```typescript
// POST /api/core/app/collaborator/update
// Request
{
  appId: 'xxx',
  collaborators: [
    { tmbId: 'uuid', permission: 6 },
    { groupId: 'objectId', permission: 4 }
  ]
}
```

**删除协作者**：
```typescript
// DELETE /api/core/app/collaborator/delete
// Query: appId=xxx&tmbId=xxx 或 groupId=xxx 或 orgId=xxx
```

## API 设计

### 应用协作者 (App Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/core/app/collaborator/list` | 获取应用协作者列表 |
| POST | `/api/core/app/collaborator/update` | 添加/更新协作者 |
| DELETE | `/api/core/app/collaborator/delete` | 删除协作者 |

### 数据集协作者 (Dataset Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/core/dataset/collaborator/list` | 获取数据集协作者列表 |
| POST | `/api/core/dataset/collaborator/update` | 添加/更新协作者 |
| DELETE | `/api/core/dataset/collaborator/delete` | 删除协作者 |

### 模型协作者 (Model Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/system/model/collaborator/list` | 获取模型协作者列表 |
| POST | `/api/system/model/collaborator/update` | 添加/更新协作者 |

## 响应格式详解

### Permission 对象（FastGPT 格式）

```typescript
type FastGPTPermission = {
  value: number;
  isOwner: boolean;
  hasReadPer: boolean;   // FastGPT 用 hasReadPer 而非 canRead
  hasWritePer: boolean;
  hasManagePer: boolean;
};
```

### 协作者项（FastGPT 格式）

```typescript
type CollaboratorItem = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  name: string;
  avatar: string;
  permission: FastGPTPermission;
};
```

## 文件结构

```
apps/web/src/app/api/
├── core/
│   ├── app/collaborator/
│   │   ├── list/route.ts
│   │   ├── update/route.ts
│   │   └── delete/route.ts
│   │
│   └── dataset/collaborator/
│       ├── list/route.ts
│       ├── update/route.ts
│       └── delete/route.ts
│
└── system/model/collaborator/
    ├── list/route.ts
    └── update/route.ts
```

## 参考实现

- dev-admin 应用协作者: `/home/sinocare/dev/dev-admin/pages/api/core/app/collaborator/`
- dev-admin 数据集协作者: `/home/sinocare/dev/dev-admin/pages/api/core/dataset/collaborator/`
- dev-admin 模型协作者: `/home/sinocare/dev/dev-admin/pages/api/system/model/collaborator/`

## 验收标准

1. API 路径与 FastGPT 官方一致
2. 请求/响应格式与 FastGPT 官方一致
3. Permission 对象使用 `hasReadPer`/`hasWritePer`/`hasManagePer` 命名
4. 所有 API 正确复用 Phase 4 的权限服务
