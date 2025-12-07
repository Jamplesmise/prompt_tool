# Phase 5: FastGPT 协作者 API - 任务清单

## 任务列表

### 5.1 创建 FastGPT 格式转换工具

- [x] 创建 `apps/web/src/lib/permission/fastgpt.ts`

```typescript
/**
 * FastGPT 权限格式转换
 */
import { Permission } from './controller';

export type FastGPTPermission = {
  value: number;
  isOwner: boolean;
  hasReadPer: boolean;
  hasWritePer: boolean;
  hasManagePer: boolean;
};

export function toFastGPTPermission(permission: Permission): FastGPTPermission {
  return {
    value: permission.rawValue,
    isOwner: permission.isOwner,
    hasReadPer: permission.canRead,
    hasWritePer: permission.canWrite,
    hasManagePer: permission.canManage,
  };
}

export type FastGPTCollaboratorItem = {
  tmbId?: string;
  groupId?: string;
  orgId?: string;
  name: string;
  avatar: string;
  permission: FastGPTPermission;
};
```

### 5.2 创建 FastGPT 协作者服务

- [x] 创建 `apps/web/src/services/fastgptCollaborator.ts`

```typescript
/**
 * FastGPT 协作者服务
 */
import { connectMongo } from '@/lib/mongodb';
import { ResourcePermissionModel, MemberGroupModel, OrgModel } from '@/lib/mongodb/schemas';
import { Permission, toFastGPTPermission, type FastGPTCollaboratorItem, type ResourceType } from '@/lib/permission';
import { prisma } from '@/lib/prisma';

export async function getFastGPTCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string
): Promise<FastGPTCollaboratorItem[]> {
  await connectMongo();

  const permissions = await ResourcePermissionModel.find({ resourceType, resourceId, teamId }).lean();
  const result: FastGPTCollaboratorItem[] = [];

  for (const perm of permissions) {
    const permission = new Permission(perm.permission);

    if (perm.tmbId) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { id: perm.tmbId },
        include: { user: { select: { name: true, avatar: true } } },
      });
      if (teamMember) {
        result.push({
          tmbId: perm.tmbId,
          name: teamMember.user.name,
          avatar: teamMember.user.avatar || '',
          permission: toFastGPTPermission(permission),
        });
      }
    } else if (perm.groupId) {
      const group = await MemberGroupModel.findById(perm.groupId).lean();
      if (group) {
        result.push({
          groupId: perm.groupId.toString(),
          name: group.name,
          avatar: group.avatar || '',
          permission: toFastGPTPermission(permission),
        });
      }
    } else if (perm.orgId) {
      const org = await OrgModel.findById(perm.orgId).lean();
      if (org) {
        result.push({
          orgId: perm.orgId.toString(),
          name: org.name,
          avatar: org.avatar || '',
          permission: toFastGPTPermission(permission),
        });
      }
    }
  }

  return result;
}

export async function updateFastGPTCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string,
  collaborators: Array<{ tmbId?: string; groupId?: string; orgId?: string; permission: number }>
): Promise<void> {
  await connectMongo();

  for (const clb of collaborators) {
    const filter: any = { resourceType, resourceId, teamId };
    if (clb.tmbId) filter.tmbId = clb.tmbId;
    else if (clb.groupId) filter.groupId = clb.groupId;
    else if (clb.orgId) filter.orgId = clb.orgId;
    else continue;

    await ResourcePermissionModel.findOneAndUpdate(
      filter,
      { $set: { permission: clb.permission }, $setOnInsert: { createTime: new Date() } },
      { upsert: true }
    );
  }
}

export async function deleteFastGPTCollaborator(
  resourceType: ResourceType,
  resourceId: string,
  collaboratorId: { tmbId?: string; groupId?: string; orgId?: string }
): Promise<boolean> {
  await connectMongo();

  const filter: any = { resourceType, resourceId };
  if (collaboratorId.tmbId) filter.tmbId = collaboratorId.tmbId;
  else if (collaboratorId.groupId) filter.groupId = collaboratorId.groupId;
  else if (collaboratorId.orgId) filter.orgId = collaboratorId.orgId;
  else return false;

  const result = await ResourcePermissionModel.deleteOne(filter);
  return result.deletedCount > 0;
}
```

### 5.3 创建应用协作者 API

- [x] 创建 `apps/web/src/app/api/core/app/collaborator/list/route.ts`

```typescript
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { getFastGPTCollaborators } from '@/services/fastgptCollaborator';

export async function GET(req: Request) {
  try {
    const { teamId } = await requireAuth();
    const appId = new URL(req.url).searchParams.get('appId');
    if (!appId) return jsonResponse(null, 400, '缺少 appId');

    const clbs = await getFastGPTCollaborators('app', appId, teamId);
    return jsonResponse({ clbs });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [x] 创建 `apps/web/src/app/api/core/app/collaborator/update/route.ts`

```typescript
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { updateFastGPTCollaborators } from '@/services/fastgptCollaborator';

export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth();
    const body = await req.json();
    if (!body.appId) return jsonResponse(null, 400, '缺少 appId');
    if (!body.collaborators?.length) return jsonResponse(null, 400, '请提供协作者列表');

    await updateFastGPTCollaborators('app', body.appId, teamId, body.collaborators);
    return jsonResponse({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [x] 创建 `apps/web/src/app/api/core/app/collaborator/delete/route.ts`

```typescript
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb';
import { deleteFastGPTCollaborator } from '@/services/fastgptCollaborator';

export async function DELETE(req: Request) {
  try {
    await requireAuth();
    const params = new URL(req.url).searchParams;
    const appId = params.get('appId');
    if (!appId) return jsonResponse(null, 400, '缺少 appId');

    const collaboratorId = params.get('tmbId')
      ? { tmbId: params.get('tmbId')! }
      : params.get('groupId')
        ? { groupId: params.get('groupId')! }
        : params.get('orgId')
          ? { orgId: params.get('orgId')! }
          : null;

    if (!collaboratorId) return jsonResponse(null, 400, '请指定协作者');

    const deleted = await deleteFastGPTCollaborator('app', appId, collaboratorId);
    return deleted ? jsonResponse({ success: true }) : jsonResponse(null, 404, '协作者不存在');
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 5.4 创建数据集协作者 API

- [x] 创建 `apps/web/src/app/api/core/dataset/collaborator/list/route.ts`
- [x] 创建 `apps/web/src/app/api/core/dataset/collaborator/update/route.ts`
- [x] 创建 `apps/web/src/app/api/core/dataset/collaborator/delete/route.ts`

（结构与应用协作者相同，将 `appId` 替换为 `datasetId`，资源类型为 `'dataset'`）

### 5.5 创建模型协作者 API

- [x] 创建 `apps/web/src/app/api/system/model/collaborator/list/route.ts`
- [x] 创建 `apps/web/src/app/api/system/model/collaborator/update/route.ts`

（结构与应用协作者相同，将 `appId` 替换为 `modelId`，资源类型为 `'model'`）

### 5.6 验证测试

- [ ] 测试应用协作者 API (list/update/delete)
- [ ] 测试数据集协作者 API (list/update/delete)
- [ ] 测试模型协作者 API (list/update)
- [ ] 验证响应格式与 FastGPT 官方一致

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 5.1 FastGPT 格式转换工具 | 创建 fastgpt.ts，导出 FastGPT 兼容格式 |
| 2025-12-07 | 5.2 FastGPT 协作者服务 | 创建 fastgptCollaborator.ts，复用 Phase 4 权限模型 |
| 2025-12-07 | 5.3 应用协作者 API | GET/POST/DELETE /api/core/app/collaborator/* |
| 2025-12-07 | 5.4 数据集协作者 API | GET/POST/DELETE /api/core/dataset/collaborator/* |
| 2025-12-07 | 5.5 模型协作者 API | GET/POST /api/system/model/collaborator/* |
