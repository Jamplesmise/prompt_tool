# Phase 2: 成员分组 - 任务清单

## 任务列表

### 2.1 创建 MemberGroup Schema

- [x] 创建 `apps/web/src/lib/mongodb/schemas/memberGroup.ts`（直接复制 dev-admin 代码）

```typescript
/**
 * 成员分组 Schema
 * 参考: dev-admin/src/packages/global/support_user_team/group/
 */
import { Schema, model, models, type Document } from 'mongoose';

export type MemberGroupDocument = Document & {
  teamId: string;
  name: string;
  avatar?: string;
  createTime: Date;
  updateTime: Date;
};

const MemberGroupSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
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
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime',
    },
  }
);

// 复合索引：同一团队内分组名唯一
MemberGroupSchema.index({ teamId: 1, name: 1 }, { unique: true });

export const MemberGroupModel =
  models.MemberGroup || model<MemberGroupDocument>('MemberGroup', MemberGroupSchema, 'member_groups');
```

### 2.2 创建 GroupMember Schema

- [x] 创建 `apps/web/src/lib/mongodb/schemas/groupMember.ts`（直接复制 dev-admin 代码）

```typescript
/**
 * 分组成员关系 Schema
 */
import { Schema, model, models, type Document, type Types } from 'mongoose';

export const GroupMemberRoleEnum = {
  owner: 'owner',
  member: 'member',
} as const;

export type GroupMemberRole = (typeof GroupMemberRoleEnum)[keyof typeof GroupMemberRoleEnum];

export type GroupMemberDocument = Document & {
  teamId: string;
  groupId: Types.ObjectId;
  tmbId: string;
  role: GroupMemberRole;
  createTime: Date;
};

const GroupMemberSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'MemberGroup',
      required: true,
      index: true,
    },
    tmbId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(GroupMemberRoleEnum),
      default: GroupMemberRoleEnum.member,
    },
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: false,
    },
  }
);

// 复合索引：同一分组内成员唯一
GroupMemberSchema.index({ groupId: 1, tmbId: 1 }, { unique: true });

export const GroupMemberModel =
  models.GroupMember || model<GroupMemberDocument>('GroupMember', GroupMemberSchema, 'group_members');
```

### 2.3 更新 Schema 导出

- [x] 更新 `apps/web/src/lib/mongodb/schemas/index.ts`

```typescript
export { MemberGroupModel, type MemberGroupDocument } from './memberGroup';
export {
  GroupMemberModel,
  GroupMemberRoleEnum,
  type GroupMemberDocument,
  type GroupMemberRole,
} from './groupMember';
```

### 2.4 创建分组服务层

- [x] 创建 `apps/web/src/services/memberGroup.ts`（基于 dev-admin controller 扩展）

```typescript
/**
 * 成员分组服务
 */
import { connectMongo } from '@/lib/mongodb';
import {
  MemberGroupModel,
  GroupMemberModel,
  GroupMemberRoleEnum,
  type MemberGroupDocument,
} from '@/lib/mongodb/schemas';
import { prisma } from '@/lib/prisma';

// ============ 分组 CRUD ============

export async function getGroups(teamId: string) {
  await connectMongo();

  const groups = await MemberGroupModel.find({ teamId })
    .sort({ createTime: -1 })
    .lean();

  // 统计每个分组的成员数
  const groupIds = groups.map((g) => g._id);
  const memberCounts = await GroupMemberModel.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $group: { _id: '$groupId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]));

  return groups.map((g) => ({
    ...g,
    _id: g._id.toString(),
    memberCount: countMap.get(g._id.toString()) || 0,
  }));
}

export async function getGroupById(groupId: string, teamId: string) {
  await connectMongo();

  const group = await MemberGroupModel.findOne({
    _id: groupId,
    teamId,
  }).lean();

  if (!group) return null;

  // 获取成员列表
  const members = await getGroupMembers(groupId, teamId);

  return {
    ...group,
    _id: group._id.toString(),
    members,
  };
}

export async function createGroup(teamId: string, data: { name: string; avatar?: string }) {
  await connectMongo();

  const group = await MemberGroupModel.create({
    teamId,
    name: data.name,
    avatar: data.avatar || '',
  });

  return {
    ...group.toObject(),
    _id: group._id.toString(),
  };
}

export async function updateGroup(
  groupId: string,
  teamId: string,
  data: { name?: string; avatar?: string }
) {
  await connectMongo();

  const group = await MemberGroupModel.findOneAndUpdate(
    { _id: groupId, teamId },
    { $set: data },
    { new: true }
  ).lean();

  if (!group) return null;

  return {
    ...group,
    _id: group._id.toString(),
  };
}

export async function deleteGroup(groupId: string, teamId: string) {
  await connectMongo();

  // 删除分组
  const result = await MemberGroupModel.deleteOne({ _id: groupId, teamId });

  if (result.deletedCount > 0) {
    // 删除关联的成员关系
    await GroupMemberModel.deleteMany({ groupId });
  }

  return result.deletedCount > 0;
}

// ============ 分组成员管理 ============

export async function getGroupMembers(groupId: string, teamId: string) {
  await connectMongo();

  const members = await GroupMemberModel.find({ groupId, teamId }).lean();

  // 从 PostgreSQL 获取成员详情
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
      role: m.role,
    };
  });
}

export async function addGroupMember(
  groupId: string,
  teamId: string,
  tmbId: string,
  role: string = 'member'
) {
  await connectMongo();

  // 检查成员是否存在于团队中
  const teamMember = await prisma.teamMember.findFirst({
    where: { id: tmbId, teamId },
  });

  if (!teamMember) {
    throw new Error('成员不存在于该团队');
  }

  const member = await GroupMemberModel.findOneAndUpdate(
    { groupId, tmbId },
    { $setOnInsert: { teamId, role, createTime: new Date() } },
    { upsert: true, new: true }
  ).lean();

  return member;
}

export async function removeGroupMember(groupId: string, tmbId: string) {
  await connectMongo();

  const result = await GroupMemberModel.deleteOne({ groupId, tmbId });
  return result.deletedCount > 0;
}

export async function updateGroupMemberRole(groupId: string, tmbId: string, role: string) {
  await connectMongo();

  const member = await GroupMemberModel.findOneAndUpdate(
    { groupId, tmbId },
    { $set: { role } },
    { new: true }
  ).lean();

  return member;
}

// ============ 权限检查 ============

export async function isGroupOwner(groupId: string, tmbId: string): Promise<boolean> {
  await connectMongo();

  const member = await GroupMemberModel.findOne({
    groupId,
    tmbId,
    role: GroupMemberRoleEnum.owner,
  });

  return !!member;
}
```

### 2.5 创建分组 API - 列表和创建

- [x] 创建 `apps/web/src/app/api/team/groups/route.ts`

```typescript
/**
 * 分组列表 / 创建分组
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getGroups, createGroup } from '@/services/memberGroup';

// GET /api/team/groups - 获取分组列表
export async function GET() {
  try {
    const { teamId } = await requireAuth();
    const groups = await getGroups(teamId);
    return jsonResponse(groups);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/team/groups - 创建分组
export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();

    if (!body.name?.trim()) {
      return jsonResponse(null, 400, '分组名称不能为空');
    }

    const group = await createGroup(teamId, {
      name: body.name.trim(),
      avatar: body.avatar,
    });

    return jsonResponse(group);
  } catch (error: any) {
    if (error.code === 11000) {
      return jsonResponse(null, 400, '分组名称已存在');
    }
    return errorResponse(error);
  }
}
```

### 2.6 创建分组 API - 单个操作

- [x] 创建 `apps/web/src/app/api/team/groups/[id]/route.ts`

```typescript
/**
 * 分组详情 / 更新 / 删除
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getGroupById, updateGroup, deleteGroup, isGroupOwner } from '@/services/memberGroup';

type Params = { params: { id: string } };

// GET /api/team/groups/[id] - 获取分组详情
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const group = await getGroupById(params.id, teamId);

    if (!group) {
      return jsonResponse(null, 404, '分组不存在');
    }

    return jsonResponse(group);
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/team/groups/[id] - 更新分组
export async function PUT(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth();

    // 检查是否是分组 Owner
    const canEdit = await isGroupOwner(params.id, tmbId);
    if (!canEdit) {
      return jsonResponse(null, 403, '无权编辑此分组');
    }

    const body = await req.json();
    const group = await updateGroup(params.id, teamId, {
      name: body.name?.trim(),
      avatar: body.avatar,
    });

    if (!group) {
      return jsonResponse(null, 404, '分组不存在');
    }

    return jsonResponse(group);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/team/groups/[id] - 删除分组
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth();

    const canDelete = await isGroupOwner(params.id, tmbId);
    if (!canDelete) {
      return jsonResponse(null, 403, '无权删除此分组');
    }

    const deleted = await deleteGroup(params.id, teamId);

    if (!deleted) {
      return jsonResponse(null, 404, '分组不存在');
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 2.7 创建分组成员 API

- [x] 创建 `apps/web/src/app/api/team/groups/[id]/members/route.ts`

```typescript
/**
 * 分组成员列表 / 添加成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getGroupMembers, addGroupMember, isGroupOwner } from '@/services/memberGroup';

type Params = { params: { id: string } };

// GET /api/team/groups/[id]/members - 获取成员列表
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth();
    const members = await getGroupMembers(params.id, teamId);
    return jsonResponse(members);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/team/groups/[id]/members - 添加成员
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth();

    const canEdit = await isGroupOwner(params.id, tmbId);
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组');
    }

    const body = await req.json();

    if (!body.tmbId) {
      return jsonResponse(null, 400, '请选择要添加的成员');
    }

    const member = await addGroupMember(
      params.id,
      teamId,
      body.tmbId,
      body.role || 'member'
    );

    return jsonResponse(member);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [x] 创建 `apps/web/src/app/api/team/groups/[id]/members/[tmbId]/route.ts`

```typescript
/**
 * 移除成员 / 更新成员角色
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { removeGroupMember, updateGroupMemberRole, isGroupOwner } from '@/services/memberGroup';

type Params = { params: { id: string; tmbId: string } };

// DELETE /api/team/groups/[id]/members/[tmbId] - 移除成员
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { tmbId: currentTmbId } = await requireAuth();

    const canEdit = await isGroupOwner(params.id, currentTmbId);
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组');
    }

    const removed = await removeGroupMember(params.id, params.tmbId);

    if (!removed) {
      return jsonResponse(null, 404, '成员不存在');
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/team/groups/[id]/members/[tmbId] - 更新成员角色
export async function PUT(req: Request, { params }: Params) {
  try {
    const { tmbId: currentTmbId } = await requireAuth();

    const canEdit = await isGroupOwner(params.id, currentTmbId);
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组');
    }

    const body = await req.json();

    if (!body.role) {
      return jsonResponse(null, 400, '请指定角色');
    }

    const member = await updateGroupMemberRole(params.id, params.tmbId, body.role);

    if (!member) {
      return jsonResponse(null, 404, '成员不存在');
    }

    return jsonResponse(member);
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 2.8 创建 React Query Hooks

- [x] 创建 `apps/web/src/hooks/useMemberGroups.ts`（使用 fetch 风格适配项目）

```typescript
/**
 * 成员分组 Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const QUERY_KEY = 'memberGroups';

// 分组列表
export function useMemberGroups() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => api.get('/api/team/groups').then((res) => res.data),
  });
}

// 分组详情
export function useMemberGroup(groupId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, groupId],
    queryFn: () => api.get(`/api/team/groups/${groupId}`).then((res) => res.data),
    enabled: !!groupId,
  });
}

// 创建分组
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; avatar?: string }) =>
      api.post('/api/team/groups', data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 更新分组
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; avatar?: string }) =>
      api.put(`/api/team/groups/${id}`, data).then((res) => res.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

// 删除分组
export function useDeleteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/team/groups/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

// 添加成员
export function useAddGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, tmbId, role }: { groupId: string; tmbId: string; role?: string }) =>
      api.post(`/api/team/groups/${groupId}/members`, { tmbId, role }).then((res) => res.data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
  });
}

// 移除成员
export function useRemoveGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, tmbId }: { groupId: string; tmbId: string }) =>
      api.delete(`/api/team/groups/${groupId}/members/${tmbId}`).then((res) => res.data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
  });
}
```

### 2.9 验证测试

- [x] TypeScript 编译通过
- [ ] 使用 API 客户端测试所有接口
- [ ] 验证分组 CRUD 功能
- [ ] 验证成员添加/移除功能
- [ ] 验证权限控制（只有 Owner 能编辑）
- [ ] 验证删除分组时成员关系自动清理

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 2.1-2.8 全部完成 | Schema 和 Service 直接复制 dev-admin 代码，Hooks 适配项目 fetch 风格 |
