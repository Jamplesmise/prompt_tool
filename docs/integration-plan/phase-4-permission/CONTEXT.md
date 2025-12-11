# Phase 4: 协作者权限

## 目标

实现基于位运算的细粒度权限系统，支持为资源（应用、数据集、模型）分配协作者权限。

## 前置条件

- Phase 1 完成（MongoDB 连接就绪）
- Phase 2 完成（成员分组可用）
- Phase 3 完成（组织架构可用）

## 业务背景

### 什么是协作者权限

协作者权限允许资源拥有者将资源分享给其他人，并控制他们的操作权限：

- **资源**：应用 (App)、数据集 (Dataset)、模型 (Model)
- **协作者**：可以是个人 (tmbId)、分组 (groupId)、组织 (orgId)
- **权限**：读取 (read)、写入 (write)、管理 (manage)

### 权限位运算

使用位运算高效存储和计算权限：

```typescript
// 权限位定义
read:   0b100  // 4 - 读取
write:  0b010  // 2 - 写入
manage: 0b001  // 1 - 管理

// 组合权限
只读:     0b100 = 4
读写:     0b110 = 6
全部:     0b111 = 7
Owner:    ~0 >>> 0 = 4294967295 (全1)
```

### 权限继承

用户的最终权限 = 直接权限 | 分组权限 | 组织权限（取并集）：

```
用户张三:
  - 直接权限: read (4)
  - 所属分组"开发组"权限: write (2)
  - 所属组织"研发部"权限: 无

最终权限: 4 | 2 = 6 (read + write)
```

### 协作者类型

```typescript
type CollaboratorIdType =
  | { tmbId: string }      // 个人
  | { groupId: string }    // 分组
  | { orgId: string };     // 组织
```

## 数据模型

### ResourcePermission（资源协作者权限）

```typescript
type ResourcePermissionSchema = {
  _id: ObjectId;
  teamId: string;
  resourceType: 'app' | 'dataset' | 'model';
  resourceId: string;

  // 协作者（三选一）
  tmbId?: string;
  groupId?: ObjectId;
  orgId?: ObjectId;

  // 权限值（位运算）
  permission: number;

  createTime: Date;
  updateTime: Date;
};
```

## 权限常量

```typescript
// lib/permission/constant.ts

export const PermissionBits = {
  read:   0b100,  // 4
  write:  0b010,  // 2
  manage: 0b001   // 1
} as const;

export const NullPermission = 0;
export const OwnerPermission = ~0 >>> 0;  // 4294967295

// 预设角色
export const RolePermissions = {
  viewer:  0b100,  // 4  - 只读
  editor:  0b110,  // 6  - 读写
  manager: 0b111   // 7  - 全部
} as const;

export type PermissionValue = number;
export type RoleKey = keyof typeof RolePermissions;
```

## Permission 类

```typescript
// lib/permission/controller.ts

export class Permission {
  private value: number;

  constructor(value: number = 0) {
    this.value = value;
  }

  // Getters
  get isOwner(): boolean {
    return this.value === OwnerPermission;
  }

  get canRead(): boolean {
    return this.isOwner || (this.value & PermissionBits.read) !== 0;
  }

  get canWrite(): boolean {
    return this.isOwner || (this.value & PermissionBits.write) !== 0;
  }

  get canManage(): boolean {
    return this.isOwner || (this.value & PermissionBits.manage) !== 0;
  }

  get rawValue(): number {
    return this.value;
  }

  // 权限操作
  add(perm: number): this {
    if (!this.isOwner) this.value |= perm;
    return this;
  }

  remove(perm: number): this {
    if (!this.isOwner) this.value &= ~perm;
    return this;
  }

  check(perm: number): boolean {
    if (perm === OwnerPermission) return this.isOwner;
    return (this.value & perm) === perm;
  }

  // 序列化
  toJSON() {
    return {
      value: this.value,
      isOwner: this.isOwner,
      canRead: this.canRead,
      canWrite: this.canWrite,
      canManage: this.canManage,
    };
  }
}
```

## 核心算法

### 计算用户对资源的最终权限

```typescript
async function getResourcePermission(
  resourceType: string,
  resourceId: string,
  tmbId: string,
  teamId: string
): Promise<Permission> {
  // 1. 查询用户直接权限
  const directPerm = await ResourcePermissionModel.findOne({
    resourceType,
    resourceId,
    tmbId,
  });

  // 2. 查询用户所在分组
  const groupMemberships = await GroupMemberModel.find({ tmbId });
  const groupIds = groupMemberships.map((m) => m.groupId);

  // 3. 查询分组权限
  const groupPerms = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    groupId: { $in: groupIds },
  });

  // 4. 查询用户所在组织
  const orgMembership = await OrgMemberModel.findOne({ teamId, tmbId });

  // 5. 查询组织权限（包括上级组织）
  let orgPerms: any[] = [];
  if (orgMembership) {
    const org = await OrgModel.findById(orgMembership.orgId);
    if (org) {
      // 查询当前组织及所有上级组织的权限
      const pathParts = org.pathId.split('.');
      const ancestorPathIds = pathParts.map((_, i) =>
        pathParts.slice(0, i + 1).join('.')
      );
      const ancestorOrgs = await OrgModel.find({
        teamId,
        pathId: { $in: ancestorPathIds },
      });
      const ancestorOrgIds = ancestorOrgs.map((o) => o._id);

      orgPerms = await ResourcePermissionModel.find({
        resourceType,
        resourceId,
        orgId: { $in: ancestorOrgIds },
      });
    }
  }

  // 6. 合并权限（取并集）
  let finalValue = directPerm?.permission ?? 0;
  for (const p of groupPerms) {
    finalValue |= p.permission;
  }
  for (const p of orgPerms) {
    finalValue |= p.permission;
  }

  return new Permission(finalValue);
}
```

## API 设计

### 通用协作者 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/permission/[type]/[id]/collaborators` | 获取资源协作者列表 |
| POST | `/api/permission/[type]/[id]/collaborators` | 添加/更新协作者 |
| DELETE | `/api/permission/[type]/[id]/collaborators` | 删除协作者 |

其中 `[type]` 为资源类型：`app`、`dataset`、`model`

### 请求/响应格式

**获取协作者列表**：
```typescript
// GET /api/permission/app/[appId]/collaborators
{
  code: 200,
  data: {
    collaborators: [
      {
        tmbId: 'uuid',
        name: '张三',
        avatar: '...',
        permission: { value: 6, canRead: true, canWrite: true, canManage: false }
      },
      {
        groupId: 'objectId',
        name: '开发组',
        avatar: '...',
        permission: { value: 4, canRead: true, canWrite: false, canManage: false }
      }
    ]
  }
}
```

**添加/更新协作者**：
```typescript
// POST /api/permission/app/[appId]/collaborators
{
  collaborators: [
    { tmbId: 'uuid', permission: 6 },
    { groupId: 'objectId', permission: 4 }
  ]
}
```

**删除协作者**：
```typescript
// DELETE /api/permission/app/[appId]/collaborators
{
  tmbId: 'uuid'  // 或 groupId / orgId
}
```

## 文件结构

```
apps/web/src/
├── lib/
│   ├── mongodb/schemas/
│   │   └── resourcePermission.ts
│   │
│   └── permission/
│       ├── constant.ts           # 权限常量
│       ├── controller.ts         # Permission 类
│       ├── utils.ts              # 工具函数
│       └── index.ts              # 导出
│
├── app/api/permission/
│   └── [type]/[id]/collaborators/
│       └── route.ts              # GET/POST/DELETE
│
├── services/
│   └── permission.ts             # 权限服务
│
└── hooks/
    └── useCollaborators.ts       # React Query hooks
```

## 参考实现

- dev-admin 权限常量: `/home/sinocare/dev/dev-admin/src/packages/global/support/permission/constant.ts`
- dev-admin Permission 类: `/home/sinocare/dev/dev-admin/src/packages/global/support/permission/controller.ts`
- dev-admin 协作者类型: `/home/sinocare/dev/dev-admin/src/packages/global/support/permission/collaborator.d.ts`

## 验收标准

1. Permission 类正确实现位运算逻辑
2. 可以为资源添加个人/分组/组织协作者
3. 权限值正确存储和读取
4. 用户最终权限正确合并（直接 | 分组 | 组织）
5. 删除协作者正常工作
6. API 响应格式符合规范
