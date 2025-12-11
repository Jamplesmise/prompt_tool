# Phase 4: 协作者权限 - 任务清单

## 任务列表

### 4.1 创建权限常量

- [x] 创建 `apps/web/src/lib/permission/constant.ts`

```typescript
/**
 * 权限常量定义
 * 参考: dev-admin/src/packages/global/support/permission/constant.ts
 */

// 权限位定义
export const PermissionBits = {
  read: 0b100,   // 4 - 读取
  write: 0b010,  // 2 - 写入
  manage: 0b001, // 1 - 管理
} as const;

// 特殊权限值
export const NullPermission = 0;
export const OwnerPermission = ~0 >>> 0; // 4294967295 (全1)

// 预设角色权限
export const RolePermissions = {
  viewer: 0b100,  // 4 - 只读
  editor: 0b110,  // 6 - 读写
  manager: 0b111, // 7 - 全部
} as const;

// 角色名称映射
export const RoleNames: Record<number, string> = {
  [RolePermissions.viewer]: '查看者',
  [RolePermissions.editor]: '编辑者',
  [RolePermissions.manager]: '管理者',
};

// 资源类型
export const ResourceTypes = {
  app: 'app',
  dataset: 'dataset',
  model: 'model',
} as const;

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes];
export type PermissionValue = number;
export type RoleKey = keyof typeof RolePermissions;
```

### 4.2 创建 Permission 类

- [x] 创建 `apps/web/src/lib/permission/controller.ts`

```typescript
/**
 * Permission 权限控制类
 * 参考: dev-admin/src/packages/global/support/permission/controller.ts
 */
import { PermissionBits, NullPermission, OwnerPermission, RoleNames } from './constant';

export type PermissionJSON = {
  value: number;
  isOwner: boolean;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  roleName: string;
};

export class Permission {
  private value: number;

  constructor(value: number = NullPermission) {
    this.value = value;
  }

  // ============ Getters ============

  get rawValue(): number {
    return this.value;
  }

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

  get roleName(): string {
    if (this.isOwner) return '所有者';
    return RoleNames[this.value] || '自定义';
  }

  // ============ 权限操作 ============

  /**
   * 添加权限
   */
  add(...perms: number[]): this {
    if (this.isOwner) return this;
    for (const perm of perms) {
      this.value |= perm;
    }
    return this;
  }

  /**
   * 移除权限
   */
  remove(...perms: number[]): this {
    if (this.isOwner) return this;
    for (const perm of perms) {
      this.value &= ~perm;
    }
    return this;
  }

  /**
   * 检查是否拥有指定权限
   */
  check(perm: number): boolean {
    if (perm === OwnerPermission) {
      return this.isOwner;
    }
    return (this.value & perm) === perm;
  }

  /**
   * 合并另一个权限（取并集）
   */
  merge(other: Permission | number): this {
    if (this.isOwner) return this;
    const otherValue = other instanceof Permission ? other.rawValue : other;
    this.value |= otherValue;
    return this;
  }

  // ============ 序列化 ============

  toJSON(): PermissionJSON {
    return {
      value: this.value,
      isOwner: this.isOwner,
      canRead: this.canRead,
      canWrite: this.canWrite,
      canManage: this.canManage,
      roleName: this.roleName,
    };
  }

  // ============ 静态方法 ============

  static fromValue(value: number): Permission {
    return new Permission(value);
  }

  static owner(): Permission {
    return new Permission(OwnerPermission);
  }

  static viewer(): Permission {
    return new Permission(PermissionBits.read);
  }

  static editor(): Permission {
    return new Permission(PermissionBits.read | PermissionBits.write);
  }

  static manager(): Permission {
    return new Permission(PermissionBits.read | PermissionBits.write | PermissionBits.manage);
  }
}
```

### 4.3 创建权限工具函数

- [x] 创建 `apps/web/src/lib/permission/utils.ts`

```typescript
/**
 * 权限工具函数
 */
import { PermissionBits, RolePermissions } from './constant';

/**
 * 合并多个权限值
 */
export function mergePermissions(...values: number[]): number {
  return values.reduce((acc, val) => acc | val, 0);
}

/**
 * 检查权限值是否包含指定权限
 */
export function hasPermission(value: number, perm: number): boolean {
  return (value & perm) === perm;
}

/**
 * 根据权限值获取角色名称
 */
export function getRoleName(value: number): string {
  if (value === RolePermissions.viewer) return '查看者';
  if (value === RolePermissions.editor) return '编辑者';
  if (value === RolePermissions.manager) return '管理者';
  return '自定义';
}

/**
 * 将权限值转换为权限位数组
 */
export function permissionToBits(value: number): string[] {
  const bits: string[] = [];
  if (value & PermissionBits.read) bits.push('read');
  if (value & PermissionBits.write) bits.push('write');
  if (value & PermissionBits.manage) bits.push('manage');
  return bits;
}

/**
 * 将权限位数组转换为权限值
 */
export function bitsToPermission(bits: string[]): number {
  let value = 0;
  if (bits.includes('read')) value |= PermissionBits.read;
  if (bits.includes('write')) value |= PermissionBits.write;
  if (bits.includes('manage')) value |= PermissionBits.manage;
  return value;
}
```

### 4.4 创建权限模块导出

- [x] 更新 `apps/web/src/lib/permission/index.ts`（整合到现有权限模块）

```typescript
/**
 * 权限模块导出
 */
export * from './constant';
export { Permission, type PermissionJSON } from './controller';
export * from './utils';
```

### 4.5 创建 ResourcePermission Schema

- [x] 创建 `apps/web/src/lib/mongodb/schemas/resourcePermission.ts`

```typescript
/**
 * 资源协作者权限 Schema
 */
import { Schema, model, models, type Document, type Types } from 'mongoose';
import { ResourceTypes } from '@/lib/permission';

export type ResourcePermissionDocument = Document & {
  teamId: string;
  resourceType: string;
  resourceId: string;
  tmbId?: string;
  groupId?: Types.ObjectId;
  orgId?: Types.ObjectId;
  permission: number;
  createTime: Date;
  updateTime: Date;
};

const ResourcePermissionSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: Object.values(ResourceTypes),
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    // 协作者（三选一）
    tmbId: {
      type: String,
      sparse: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'MemberGroup',
      sparse: true,
      index: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Org',
      sparse: true,
      index: true,
    },
    // 权限值
    permission: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime',
    },
  }
);

// 复合唯一索引：同一资源的同一协作者只能有一条记录
ResourcePermissionSchema.index(
  { resourceType: 1, resourceId: 1, tmbId: 1 },
  { unique: true, sparse: true }
);
ResourcePermissionSchema.index(
  { resourceType: 1, resourceId: 1, groupId: 1 },
  { unique: true, sparse: true }
);
ResourcePermissionSchema.index(
  { resourceType: 1, resourceId: 1, orgId: 1 },
  { unique: true, sparse: true }
);

export const ResourcePermissionModel =
  models.ResourcePermission ||
  model<ResourcePermissionDocument>('ResourcePermission', ResourcePermissionSchema, 'resource_permissions');
```

### 4.6 更新 Schema 导出

- [x] 更新 `apps/web/src/lib/mongodb/schemas/index.ts`

```typescript
// Phase 2
export { MemberGroupModel, type MemberGroupDocument } from './memberGroup';
export { GroupMemberModel, GroupMemberRoleEnum, type GroupMemberDocument, type GroupMemberRole } from './groupMember';

// Phase 3
export { OrgModel, type OrgDocument } from './org';
export { OrgMemberModel, type OrgMemberDocument } from './orgMember';

// Phase 4
export { ResourcePermissionModel, type ResourcePermissionDocument } from './resourcePermission';
```

### 4.7 创建权限服务层

- [x] 创建 `apps/web/src/services/resourcePermission.ts`

```typescript
/**
 * 权限服务
 */
import { connectMongo } from '@/lib/mongodb';
import {
  ResourcePermissionModel,
  GroupMemberModel,
  OrgMemberModel,
  OrgModel,
  MemberGroupModel,
} from '@/lib/mongodb/schemas';
import { Permission, type ResourceType } from '@/lib/permission';
import { prisma } from '@/lib/prisma';

// ============ 类型定义 ============

type CollaboratorIdType =
  | { tmbId: string; groupId?: never; orgId?: never }
  | { tmbId?: never; groupId: string; orgId?: never }
  | { tmbId?: never; groupId?: never; orgId: string };

type CollaboratorInput = CollaboratorIdType & { permission: number };

type CollaboratorDetail = CollaboratorIdType & {
  name: string;
  avatar: string;
  permission: ReturnType<Permission['toJSON']>;
};

// ============ 获取资源协作者 ============

export async function getResourceCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string
): Promise<CollaboratorDetail[]> {
  await connectMongo();

  const permissions = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    teamId,
  }).lean();

  const result: CollaboratorDetail[] = [];

  for (const perm of permissions) {
    const permission = new Permission(perm.permission);

    if (perm.tmbId) {
      // 个人协作者
      const teamMember = await prisma.teamMember.findFirst({
        where: { id: perm.tmbId },
        include: { user: { select: { name: true, avatar: true } } },
      });

      if (teamMember) {
        result.push({
          tmbId: perm.tmbId,
          name: teamMember.user.name,
          avatar: teamMember.user.avatar || '',
          permission: permission.toJSON(),
        });
      }
    } else if (perm.groupId) {
      // 分组协作者
      const group = await MemberGroupModel.findById(perm.groupId).lean();
      if (group) {
        result.push({
          groupId: perm.groupId.toString(),
          name: group.name,
          avatar: group.avatar || '',
          permission: permission.toJSON(),
        });
      }
    } else if (perm.orgId) {
      // 组织协作者
      const org = await OrgModel.findById(perm.orgId).lean();
      if (org) {
        result.push({
          orgId: perm.orgId.toString(),
          name: org.name,
          avatar: org.avatar || '',
          permission: permission.toJSON(),
        });
      }
    }
  }

  return result;
}

// ============ 更新资源协作者 ============

export async function updateResourceCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string,
  collaborators: CollaboratorInput[]
): Promise<void> {
  await connectMongo();

  for (const clb of collaborators) {
    const filter: any = { resourceType, resourceId, teamId };

    if (clb.tmbId) {
      filter.tmbId = clb.tmbId;
    } else if (clb.groupId) {
      filter.groupId = clb.groupId;
    } else if (clb.orgId) {
      filter.orgId = clb.orgId;
    } else {
      continue;
    }

    await ResourcePermissionModel.findOneAndUpdate(
      filter,
      {
        $set: { permission: clb.permission },
        $setOnInsert: { createTime: new Date() },
      },
      { upsert: true }
    );
  }
}

// ============ 删除资源协作者 ============

export async function deleteResourceCollaborator(
  resourceType: ResourceType,
  resourceId: string,
  collaboratorId: CollaboratorIdType
): Promise<boolean> {
  await connectMongo();

  const filter: any = { resourceType, resourceId };

  if (collaboratorId.tmbId) {
    filter.tmbId = collaboratorId.tmbId;
  } else if (collaboratorId.groupId) {
    filter.groupId = collaboratorId.groupId;
  } else if (collaboratorId.orgId) {
    filter.orgId = collaboratorId.orgId;
  } else {
    return false;
  }

  const result = await ResourcePermissionModel.deleteOne(filter);
  return result.deletedCount > 0;
}

// ============ 计算用户对资源的最终权限 ============

export async function getUserResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  tmbId: string,
  teamId: string
): Promise<Permission> {
  await connectMongo();

  // 1. 直接权限
  const directPerm = await ResourcePermissionModel.findOne({
    resourceType,
    resourceId,
    tmbId,
  });

  // 2. 用户所在分组
  const groupMemberships = await GroupMemberModel.find({ tmbId });
  const groupIds = groupMemberships.map((m) => m.groupId);

  // 3. 分组权限
  const groupPerms = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    groupId: { $in: groupIds },
  });

  // 4. 用户所在组织
  const orgMembership = await OrgMemberModel.findOne({ teamId, tmbId });

  // 5. 组织权限（包括上级组织）
  let orgPerms: any[] = [];
  if (orgMembership) {
    const org = await OrgModel.findById(orgMembership.orgId);
    if (org) {
      const pathParts = org.pathId.split('.');
      const ancestorPathIds = pathParts.map((_, i) => pathParts.slice(0, i + 1).join('.'));
      const ancestorOrgs = await OrgModel.find({ teamId, pathId: { $in: ancestorPathIds } });
      const ancestorOrgIds = ancestorOrgs.map((o) => o._id);

      orgPerms = await ResourcePermissionModel.find({
        resourceType,
        resourceId,
        orgId: { $in: ancestorOrgIds },
      });
    }
  }

  // 6. 合并权限
  const permission = new Permission(directPerm?.permission ?? 0);

  for (const p of groupPerms) {
    permission.merge(p.permission);
  }
  for (const p of orgPerms) {
    permission.merge(p.permission);
  }

  return permission;
}

// ============ 删除资源的所有权限 ============

export async function deleteAllResourcePermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<void> {
  await connectMongo();
  await ResourcePermissionModel.deleteMany({ resourceType, resourceId });
}
```

### 4.8 创建协作者 API

- [x] 创建 `apps/web/src/app/api/permission/[type]/[id]/collaborators/route.ts`

```typescript
/**
 * 资源协作者 API
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { ResourceTypes, type ResourceType } from '@/lib/permission';
import {
  getResourceCollaborators,
  updateResourceCollaborators,
  deleteResourceCollaborator,
} from '@/services/permission';

type Params = { params: { type: string; id: string } };

function validateResourceType(type: string): type is ResourceType {
  return Object.values(ResourceTypes).includes(type as ResourceType);
}

// GET /api/permission/[type]/[id]/collaborators
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();

    if (!validateResourceType(params.type)) {
      return jsonResponse(null, 400, '无效的资源类型');
    }

    const collaborators = await getResourceCollaborators(
      params.type,
      params.id,
      teamId
    );

    return jsonResponse({ collaborators });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/permission/[type]/[id]/collaborators
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();

    if (!validateResourceType(params.type)) {
      return jsonResponse(null, 400, '无效的资源类型');
    }

    const body = await req.json();

    if (!Array.isArray(body.collaborators) || body.collaborators.length === 0) {
      return jsonResponse(null, 400, '请提供协作者列表');
    }

    await updateResourceCollaborators(
      params.type,
      params.id,
      teamId,
      body.collaborators
    );

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/permission/[type]/[id]/collaborators
export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireAuth();

    if (!validateResourceType(params.type)) {
      return jsonResponse(null, 400, '无效的资源类型');
    }

    const body = await req.json();

    const collaboratorId = body.tmbId
      ? { tmbId: body.tmbId }
      : body.groupId
        ? { groupId: body.groupId }
        : body.orgId
          ? { orgId: body.orgId }
          : null;

    if (!collaboratorId) {
      return jsonResponse(null, 400, '请指定要删除的协作者');
    }

    const deleted = await deleteResourceCollaborator(
      params.type,
      params.id,
      collaboratorId as any
    );

    if (!deleted) {
      return jsonResponse(null, 404, '协作者不存在');
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 4.9 创建 React Query Hooks

- [x] 创建 `apps/web/src/hooks/useCollaborators.ts`

```typescript
/**
 * 协作者管理 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ResourceType } from '@/lib/permission';

const QUERY_KEY = 'collaborators';

type CollaboratorInput =
  | { tmbId: string; permission: number }
  | { groupId: string; permission: number }
  | { orgId: string; permission: number };

// 获取协作者列表
export function useCollaborators(resourceType: ResourceType, resourceId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, resourceType, resourceId],
    queryFn: () =>
      api.get(`/api/permission/${resourceType}/${resourceId}/collaborators`).then((res) => res.data),
    enabled: !!resourceType && !!resourceId,
  });
}

// 更新协作者
export function useUpdateCollaborators() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resourceType,
      resourceId,
      collaborators,
    }: {
      resourceType: ResourceType;
      resourceId: string;
      collaborators: CollaboratorInput[];
    }) =>
      api
        .post(`/api/permission/${resourceType}/${resourceId}/collaborators`, { collaborators })
        .then((res) => res.data),
    onSuccess: (_, { resourceType, resourceId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, resourceType, resourceId] });
    },
  });
}

// 删除协作者
export function useDeleteCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resourceType,
      resourceId,
      ...collaboratorId
    }: {
      resourceType: ResourceType;
      resourceId: string;
    } & ({ tmbId: string } | { groupId: string } | { orgId: string })) =>
      api
        .delete(`/api/permission/${resourceType}/${resourceId}/collaborators`, {
          data: collaboratorId,
        })
        .then((res) => res.data),
    onSuccess: (_, { resourceType, resourceId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, resourceType, resourceId] });
    },
  });
}
```

### 4.10 验证测试

- [ ] 测试 Permission 类的位运算逻辑
- [ ] 添加个人协作者
- [ ] 添加分组协作者
- [ ] 添加组织协作者
- [ ] 验证权限值正确存储
- [ ] 验证 getUserResourcePermission 正确合并权限
- [ ] 删除协作者
- [ ] 验证 API 响应格式

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 4.1-4.9 全部完成 | 复制 dev-admin 权限位运算逻辑，整合到现有 RBAC 权限模块，服务文件命名为 resourcePermission.ts 避免冲突 |
