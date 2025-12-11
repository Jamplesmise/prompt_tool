# Phase 3: 组织架构 - 任务清单

## 任务列表

### 3.1 创建 Org Schema

- [x] 创建 `apps/web/src/lib/mongodb/schemas/org.ts`

```typescript
/**
 * 组织/部门 Schema
 * 参考: dev-admin/src/packages/service/support_permission/org/orgSchema.ts
 */
import { Schema, model, models, type Document } from 'mongoose';

export type OrgDocument = Document & {
  teamId: string;
  pathId: string;
  path: string;
  name: string;
  avatar: string;
  description?: string;
  updateTime: Date;
};

const OrgSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    pathId: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      maxlength: 200,
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: 'updateTime',
    },
  }
);

// 复合索引
OrgSchema.index({ teamId: 1, pathId: 1 }, { unique: true });
OrgSchema.index({ teamId: 1, path: 1 });

export const OrgModel = models.Org || model<OrgDocument>('Org', OrgSchema, 'orgs');
```

### 3.2 创建 OrgMember Schema

- [x] 创建 `apps/web/src/lib/mongodb/schemas/orgMember.ts`

```typescript
/**
 * 组织成员 Schema
 */
import { Schema, model, models, type Document, type Types } from 'mongoose';

export type OrgMemberDocument = Document & {
  teamId: string;
  orgId: Types.ObjectId;
  tmbId: string;
};

const OrgMemberSchema = new Schema({
  teamId: {
    type: String,
    required: true,
    index: true,
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Org',
    required: true,
    index: true,
  },
  tmbId: {
    type: String,
    required: true,
    index: true,
  },
});

// 复合索引：同一组织内成员唯一
OrgMemberSchema.index({ orgId: 1, tmbId: 1 }, { unique: true });
// 一个成员只能在一个组织（同一团队内）
OrgMemberSchema.index({ teamId: 1, tmbId: 1 }, { unique: true });

export const OrgMemberModel =
  models.OrgMember || model<OrgMemberDocument>('OrgMember', OrgMemberSchema, 'org_members');
```

### 3.3 更新 Schema 导出

- [x] 更新 `apps/web/src/lib/mongodb/schemas/index.ts`

```typescript
// Phase 2
export { MemberGroupModel, type MemberGroupDocument } from './memberGroup';
export {
  GroupMemberModel,
  GroupMemberRoleEnum,
  type GroupMemberDocument,
  type GroupMemberRole,
} from './groupMember';

// Phase 3
export { OrgModel, type OrgDocument } from './org';
export { OrgMemberModel, type OrgMemberDocument } from './orgMember';
```

### 3.4 创建组织服务层

- [x] 创建 `apps/web/src/services/org.ts`

```typescript
/**
 * 组织架构服务
 */
import { connectMongo } from '@/lib/mongodb';
import { OrgModel, OrgMemberModel, type OrgDocument } from '@/lib/mongodb/schemas';
import { prisma } from '@/lib/prisma';

// ============ 类型定义 ============

export type OrgTreeNode = OrgDocument & {
  children: OrgTreeNode[];
  memberCount: number;
};

// ============ 路径工具 ============

/**
 * 生成下一个 pathId
 */
export function generateNextPathId(parentPathId: string, siblingCount: number): string {
  const nextNum = (siblingCount + 1).toString().padStart(3, '0');
  return parentPathId ? `${parentPathId}.${nextNum}` : nextNum;
}

/**
 * 获取父级 pathId
 */
export function getParentPathId(pathId: string): string {
  const parts = pathId.split('.');
  return parts.slice(0, -1).join('.');
}

/**
 * 构建树形结构
 */
export function buildOrgTree(orgs: any[], memberCounts: Map<string, number>): OrgTreeNode[] {
  const sorted = [...orgs].sort((a, b) => a.pathId.localeCompare(b.pathId));

  const root: OrgTreeNode[] = [];
  const pathMap = new Map<string, OrgTreeNode>();

  for (const org of sorted) {
    const node: OrgTreeNode = {
      ...org,
      _id: org._id.toString(),
      children: [],
      memberCount: memberCounts.get(org._id.toString()) || 0,
    };

    pathMap.set(org.pathId, node);

    const parentPathId = getParentPathId(org.pathId);

    if (parentPathId && pathMap.has(parentPathId)) {
      pathMap.get(parentPathId)!.children.push(node);
    } else {
      root.push(node);
    }
  }

  return root;
}

// ============ 组织 CRUD ============

export async function getOrgs(teamId: string) {
  await connectMongo();

  const orgs = await OrgModel.find({ teamId }).lean();

  // 统计每个组织的成员数
  const orgIds = orgs.map((o) => o._id);
  const memberCounts = await OrgMemberModel.aggregate([
    { $match: { orgId: { $in: orgIds } } },
    { $group: { _id: '$orgId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]));

  return buildOrgTree(orgs, countMap);
}

export async function getOrgById(orgId: string, teamId: string) {
  await connectMongo();

  const org = await OrgModel.findOne({ _id: orgId, teamId }).lean();
  if (!org) return null;

  const members = await getOrgMembers(orgId, teamId);

  return {
    ...org,
    _id: org._id.toString(),
    members,
  };
}

export async function createOrg(
  teamId: string,
  data: { name: string; parentPathId?: string; avatar?: string; description?: string }
) {
  await connectMongo();

  const parentPathId = data.parentPathId || '';

  // 计算同级组织数量
  const siblingPattern = parentPathId ? new RegExp(`^${parentPathId}\\.[^.]+$`) : /^[^.]+$/;
  const siblingCount = await OrgModel.countDocuments({
    teamId,
    pathId: siblingPattern,
  });

  const pathId = generateNextPathId(parentPathId, siblingCount);

  // 构建 path
  let path = data.name;
  if (parentPathId) {
    const parent = await OrgModel.findOne({ teamId, pathId: parentPathId });
    if (parent) {
      path = `${parent.path}/${data.name}`;
    }
  }

  const org = await OrgModel.create({
    teamId,
    pathId,
    path,
    name: data.name,
    avatar: data.avatar || '',
    description: data.description,
  });

  return {
    ...org.toObject(),
    _id: org._id.toString(),
  };
}

export async function updateOrg(
  orgId: string,
  teamId: string,
  data: { name?: string; avatar?: string; description?: string }
) {
  await connectMongo();

  const org = await OrgModel.findOne({ _id: orgId, teamId });
  if (!org) return null;

  // 如果修改了名称，需要更新 path
  if (data.name && data.name !== org.name) {
    const parentPathId = getParentPathId(org.pathId);
    let newPath = data.name;

    if (parentPathId) {
      const parent = await OrgModel.findOne({ teamId, pathId: parentPathId });
      if (parent) {
        newPath = `${parent.path}/${data.name}`;
      }
    }

    // 更新自身
    org.name = data.name;
    org.path = newPath;

    // 更新所有子组织的 path
    const oldPathPrefix = org.path;
    await OrgModel.updateMany(
      { teamId, pathId: { $regex: `^${org.pathId}\\.` } },
      [
        {
          $set: {
            path: {
              $replaceOne: {
                input: '$path',
                find: oldPathPrefix,
                replacement: newPath,
              },
            },
          },
        },
      ]
    );
  }

  if (data.avatar !== undefined) org.avatar = data.avatar;
  if (data.description !== undefined) org.description = data.description;

  await org.save();

  return {
    ...org.toObject(),
    _id: org._id.toString(),
  };
}

export async function deleteOrg(orgId: string, teamId: string) {
  await connectMongo();

  const org = await OrgModel.findOne({ _id: orgId, teamId });
  if (!org) return false;

  // 删除自身和所有子组织
  const deleteResult = await OrgModel.deleteMany({
    teamId,
    $or: [{ _id: orgId }, { pathId: { $regex: `^${org.pathId}\\.` } }],
  });

  // 删除相关成员关系
  const deletedOrgIds = [orgId];
  const childOrgs = await OrgModel.find({
    teamId,
    pathId: { $regex: `^${org.pathId}\\.` },
  }).select('_id');
  deletedOrgIds.push(...childOrgs.map((o) => o._id.toString()));

  await OrgMemberModel.deleteMany({ orgId: { $in: deletedOrgIds } });

  return deleteResult.deletedCount > 0;
}

export async function moveOrg(orgId: string, teamId: string, newParentPathId: string) {
  await connectMongo();

  const org = await OrgModel.findOne({ _id: orgId, teamId });
  if (!org) return null;

  const oldPathId = org.pathId;
  const oldPath = org.path;

  // 计算新的 pathId
  const siblingPattern = newParentPathId
    ? new RegExp(`^${newParentPathId}\\.[^.]+$`)
    : /^[^.]+$/;
  const siblingCount = await OrgModel.countDocuments({
    teamId,
    pathId: siblingPattern,
  });

  const newPathId = generateNextPathId(newParentPathId, siblingCount);

  // 构建新的 path
  let newPath = org.name;
  if (newParentPathId) {
    const newParent = await OrgModel.findOne({ teamId, pathId: newParentPathId });
    if (newParent) {
      newPath = `${newParent.path}/${org.name}`;
    }
  }

  // 更新自身
  org.pathId = newPathId;
  org.path = newPath;
  await org.save();

  // 更新所有子组织
  await OrgModel.updateMany(
    { teamId, pathId: { $regex: `^${oldPathId}\\.` } },
    [
      {
        $set: {
          pathId: {
            $replaceOne: { input: '$pathId', find: oldPathId, replacement: newPathId },
          },
          path: {
            $replaceOne: { input: '$path', find: oldPath, replacement: newPath },
          },
        },
      },
    ]
  );

  return {
    ...org.toObject(),
    _id: org._id.toString(),
  };
}

// ============ 组织成员管理 ============

export async function getOrgMembers(orgId: string, teamId: string) {
  await connectMongo();

  const members = await OrgMemberModel.find({ orgId, teamId }).lean();

  const tmbIds = members.map((m) => m.tmbId);
  const teamMembers = await prisma.teamMember.findMany({
    where: { id: { in: tmbIds } },
    include: { user: { select: { name: true, avatar: true } } },
  });

  const tmbMap = new Map(teamMembers.map((t) => [t.id, t]));

  return members.map((m) => {
    const tmb = tmbMap.get(m.tmbId);
    return {
      tmbId: m.tmbId,
      name: tmb?.user.name || '未知用户',
      avatar: tmb?.user.avatar || '',
    };
  });
}

export async function addOrgMember(orgId: string, teamId: string, tmbId: string) {
  await connectMongo();

  // 检查成员是否存在
  const teamMember = await prisma.teamMember.findFirst({
    where: { id: tmbId, teamId },
  });

  if (!teamMember) {
    throw new Error('成员不存在于该团队');
  }

  // 一个成员只能在一个组织，先移除旧的
  await OrgMemberModel.deleteOne({ teamId, tmbId });

  const member = await OrgMemberModel.create({ teamId, orgId, tmbId });
  return member;
}

export async function removeOrgMember(orgId: string, tmbId: string) {
  await connectMongo();

  const result = await OrgMemberModel.deleteOne({ orgId, tmbId });
  return result.deletedCount > 0;
}

// ============ 查询工具 ============

/**
 * 获取成员所在的组织
 */
export async function getMemberOrg(teamId: string, tmbId: string) {
  await connectMongo();

  const membership = await OrgMemberModel.findOne({ teamId, tmbId }).populate('orgId');
  return membership?.orgId || null;
}
```

### 3.5 创建组织 API - 列表和创建

- [x] 创建 `apps/web/src/app/api/team/orgs/route.ts`

```typescript
/**
 * 组织列表 / 创建组织
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getOrgs, createOrg } from '@/services/org';

// GET /api/team/orgs - 获取组织列表（树形）
export async function GET() {
  try {
    const { teamId } = await requireAuth();
    const orgs = await getOrgs(teamId);
    return jsonResponse(orgs);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/team/orgs - 创建组织
export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();

    if (!body.name?.trim()) {
      return jsonResponse(null, 400, '组织名称不能为空');
    }

    const org = await createOrg(teamId, {
      name: body.name.trim(),
      parentPathId: body.parentPathId,
      avatar: body.avatar,
      description: body.description,
    });

    return jsonResponse(org);
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 3.6 创建组织 API - 单个操作

- [x] 创建 `apps/web/src/app/api/team/orgs/[id]/route.ts`

```typescript
/**
 * 组织详情 / 更新 / 删除
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getOrgById, updateOrg, deleteOrg } from '@/services/org';

type Params = { params: { id: string } };

// GET /api/team/orgs/[id]
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const org = await getOrgById(params.id, teamId);

    if (!org) {
      return jsonResponse(null, 404, '组织不存在');
    }

    return jsonResponse(org);
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/team/orgs/[id]
export async function PUT(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();

    const org = await updateOrg(params.id, teamId, {
      name: body.name?.trim(),
      avatar: body.avatar,
      description: body.description,
    });

    if (!org) {
      return jsonResponse(null, 404, '组织不存在');
    }

    return jsonResponse(org);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/team/orgs/[id]
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const deleted = await deleteOrg(params.id, teamId);

    if (!deleted) {
      return jsonResponse(null, 404, '组织不存在');
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 3.7 创建组织移动 API

- [x] 移动功能已合并到 `apps/web/src/app/api/team/orgs/[id]/route.ts` 的 PATCH 方法

```typescript
/**
 * 移动组织位置
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { moveOrg } from '@/services/org';

type Params = { params: { id: string } };

// POST /api/team/orgs/[id]/move
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();

    const org = await moveOrg(params.id, teamId, body.parentPathId || '');

    if (!org) {
      return jsonResponse(null, 404, '组织不存在');
    }

    return jsonResponse(org);
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 3.8 创建组织成员 API

- [x] 创建 `apps/web/src/app/api/team/orgs/[id]/members/route.ts`

```typescript
/**
 * 组织成员列表 / 添加成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getOrgMembers, addOrgMember } from '@/services/org';

type Params = { params: { id: string } };

// GET /api/team/orgs/[id]/members
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const members = await getOrgMembers(params.id, teamId);
    return jsonResponse(members);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/team/orgs/[id]/members
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();

    if (!body.tmbId) {
      return jsonResponse(null, 400, '请选择要添加的成员');
    }

    const member = await addOrgMember(params.id, teamId, body.tmbId);
    return jsonResponse(member);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [x] 创建 `apps/web/src/app/api/team/orgs/[id]/members/[tmbId]/route.ts`

```typescript
/**
 * 移除组织成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { removeOrgMember } from '@/services/org';

type Params = { params: { id: string; tmbId: string } };

// DELETE /api/team/orgs/[id]/members/[tmbId]
export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireAuth();

    const removed = await removeOrgMember(params.id, params.tmbId);

    if (!removed) {
      return jsonResponse(null, 404, '成员不存在');
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 3.9 创建 React Query Hooks

- [x] 创建 `apps/web/src/hooks/useOrgs.ts`

```typescript
/**
 * 组织架构 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const QUERY_KEY = 'orgs';

// 组织列表（树形）
export function useOrgs() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api.get('/api/team/orgs').then((res) => res.data),
  });
}

// 组织详情
export function useOrg(orgId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, orgId],
    queryFn: () => api.get(`/api/team/orgs/${orgId}`).then((res) => res.data),
    enabled: !!orgId,
  });
}

// 创建组织
export function useCreateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; parentPathId?: string; avatar?: string; description?: string }) =>
      api.post('/api/team/orgs', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 更新组织
export function useUpdateOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; avatar?: string; description?: string }) =>
      api.put(`/api/team/orgs/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 删除组织
export function useDeleteOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/team/orgs/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 移动组织
export function useMoveOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentPathId }: { id: string; parentPathId: string }) =>
      api.post(`/api/team/orgs/${id}/move`, { parentPathId }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 添加成员
export function useAddOrgMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, tmbId }: { orgId: string; tmbId: string }) =>
      api.post(`/api/team/orgs/${orgId}/members`, { tmbId }).then((res) => res.data),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
    },
  });
}

// 移除成员
export function useRemoveOrgMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, tmbId }: { orgId: string; tmbId: string }) =>
      api.delete(`/api/team/orgs/${orgId}/members/${tmbId}`).then((res) => res.data),
    onSuccess: (_, { orgId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
    },
  });
}
```

### 3.10 验证测试

- [ ] 创建根组织
- [ ] 创建子组织（多级）
- [ ] 验证树形结构返回正确
- [ ] 移动组织到其他父级
- [ ] 验证 pathId 和 path 自动更新
- [ ] 删除组织，验证子组织和成员一并删除
- [ ] 添加/移除组织成员
- [ ] 验证成员只能在一个组织

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 3.1-3.9 全部完成 | 直接复制 dev-admin 代码，使用 path 路径结构（非 pathId 编号），API 合并移动功能到 PATCH 方法 |
