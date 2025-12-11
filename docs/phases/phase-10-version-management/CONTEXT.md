# Phase 10: 版本管理增强 - 上下文

> 前置依赖：Phase 0-9 完成
> 本阶段目标：实现提示词分支管理、数据集版本管理

---

## 一、阶段概述

本阶段实现 `docs/01-product-scope.md` 中规划但尚未实现的版本管理功能：

1. **提示词分支管理** - 支持实验分支，独立演进，可合并回主线
2. **数据集版本管理** - 数据集快照，支持版本回溯

---

## 二、功能范围

### 2.1 提示词分支管理

**功能**：
- 从任意版本创建实验分支
- 分支独立编辑和版本迭代
- 分支间 Diff 对比
- 分支合并回主线
- 分支删除

**分支模型**：
```typescript
type PromptBranch = {
  id: string;
  promptId: string;
  name: string;              // 分支名称，如 "experiment-v2", "feature-streaming"
  description?: string;
  sourceVersionId: string;   // 创建分支的源版本
  currentVersion: number;    // 分支内的当前版本号
  isDefault: boolean;        // 是否为默认分支（主线）
  status: 'active' | 'merged' | 'archived';
  mergedAt?: Date;
  mergedBy?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};
```

**分支工作流**：
```
主线 (main)
  v1 ──► v2 ──► v3 ──────────────► v4 (合并后)
              │                    ▲
              └──► 实验分支         │
                   v1 ──► v2 ──────┘ (合并)
```

**分支操作**：
- `创建分支`: 从指定版本创建新分支
- `切换分支`: 在不同分支间切换查看/编辑
- `合并分支`: 将分支合并回目标分支（创建新版本）
- `归档分支`: 标记分支为已归档，保留历史
- `删除分支`: 彻底删除分支（需确认）

### 2.2 数据集版本管理

**功能**：
- 创建数据集版本（快照）
- 版本列表和详情查看
- 版本回滚
- 版本间 Diff 对比（行数变化、内容差异）

**版本模型**：
```typescript
type DatasetVersion = {
  id: string;
  datasetId: string;
  version: number;
  rowCount: number;
  changeLog?: string;
  snapshot: {
    columns: string[];
    rowHashes: string[];    // 用于快速对比
  };
  createdById: string;
  createdAt: Date;
};
```

**版本存储策略**：
- 完整快照：每个版本独立存储所有行数据
- 增量存储：仅存储与上一版本的差异（可选优化）

---

## 三、技术架构

### 3.1 提示词分支数据模型

```prisma
model PromptBranch {
  id              String   @id @default(cuid())
  promptId        String
  prompt          Prompt   @relation(fields: [promptId], references: [id], onDelete: Cascade)

  name            String
  description     String?

  sourceVersionId String
  sourceVersion   PromptVersion @relation("SourceVersion", fields: [sourceVersionId], references: [id])

  currentVersion  Int      @default(1)
  isDefault       Boolean  @default(false)
  status          String   @default("active")  // active, merged, archived

  mergedAt        DateTime?
  mergedById      String?
  mergedBy        User?    @relation("MergedBy", fields: [mergedById], references: [id])
  mergedToId      String?  // 合并到的目标分支 ID

  versions        PromptVersion[] @relation("BranchVersions")

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([promptId, name])
}

// 更新 PromptVersion，添加分支关联
model PromptVersion {
  // ... 现有字段

  branchId        String?
  branch          PromptBranch? @relation("BranchVersions", fields: [branchId], references: [id])

  // 作为源版本创建的分支
  derivedBranches PromptBranch[] @relation("SourceVersion")
}
```

### 3.2 数据集版本数据模型

```prisma
model DatasetVersion {
  id              String   @id @default(cuid())
  datasetId       String
  dataset         Dataset  @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  version         Int
  rowCount        Int
  changeLog       String?

  // 快照元数据
  columns         Json     // string[]
  rowHashes       Json     // string[] - 用于快速对比

  // 关联的数据行快照
  rows            DatasetVersionRow[]

  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])
  createdAt       DateTime @default(now())

  @@unique([datasetId, version])
}

model DatasetVersionRow {
  id              String   @id @default(cuid())
  versionId       String
  version         DatasetVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)

  rowIndex        Int
  data            Json
  hash            String   // 内容哈希，用于对比

  @@index([versionId, rowIndex])
}
```

### 3.3 分支合并逻辑

```typescript
async function mergeBranch(
  sourceBranchId: string,
  targetBranchId: string,
  userId: string
): Promise<PromptVersion> {
  const sourceBranch = await getBranch(sourceBranchId);
  const targetBranch = await getBranch(targetBranchId);

  // 获取源分支最新版本内容
  const sourceVersion = await getLatestVersion(sourceBranchId);

  // 在目标分支创建新版本
  const newVersion = await createVersion(targetBranch.promptId, {
    branchId: targetBranchId,
    content: sourceVersion.content,
    variables: sourceVersion.variables,
    changeLog: `合并自分支 "${sourceBranch.name}"`,
    createdById: userId,
  });

  // 更新源分支状态
  await updateBranch(sourceBranchId, {
    status: 'merged',
    mergedAt: new Date(),
    mergedById: userId,
    mergedToId: targetBranchId,
  });

  return newVersion;
}
```

### 3.4 数据集 Diff 算法

```typescript
type DatasetDiff = {
  added: number[];      // 新增行索引
  removed: number[];    // 删除行索引
  modified: Array<{
    index: number;
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
};

function diffDatasetVersions(
  versionA: DatasetVersion,
  versionB: DatasetVersion
): DatasetDiff {
  // 使用行哈希快速识别变化
  const hashSetA = new Set(versionA.rowHashes);
  const hashSetB = new Set(versionB.rowHashes);

  // 计算差异
  // ...
}
```

---

## 四、页面设计

### 4.1 提示词分支管理

```
┌─────────────────────────────────────────────────────────────────┐
│ 提示词详情                                                       │
├─────────────────────────────────────────────────────────────────┤
│ 分支: [main ▼]  [+ 创建分支]                                     │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ main (默认)           v5    ✓ 当前                          │ │
│ │ experiment-streaming  v3    活跃                            │ │
│ │ feature-json-output   v2    已合并 → main                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [编辑] [发布版本] [合并到 main] [归档]                           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 分支 Diff 对比

```
┌─────────────────────────────────────────────────────────────────┐
│ 分支对比: experiment-streaming vs main                          │
├────────────────────────────────┬────────────────────────────────┤
│ experiment-streaming (v3)      │ main (v5)                      │
├────────────────────────────────┼────────────────────────────────┤
│ 你是一个{{role}}助手。         │ 你是一个{{role}}助手。         │
│                                │                                │
│ + 请使用流式输出回复。         │                                │
│                                │                                │
│ 请回答以下问题:                │ 请回答以下问题:                │
│ {{question}}                   │ {{question}}                   │
└────────────────────────────────┴────────────────────────────────┘
```

### 4.3 数据集版本管理

```
┌─────────────────────────────────────────────────────────────────┐
│ 数据集详情                                    [+ 创建版本快照]   │
├─────────────────────────────────────────────────────────────────┤
│ 版本历史                                                         │
│ ┌────────┬────────┬────────────┬──────────────┬────────┐        │
│ │ 版本   │ 行数   │ 创建时间   │ 说明         │ 操作   │        │
│ ├────────┼────────┼────────────┼──────────────┼────────┤        │
│ │ v3     │ 150    │ 今天 10:00 │ 新增50条边界 │ 当前   │        │
│ │ v2     │ 100    │ 昨天 15:00 │ 修复错误数据 │ 回滚   │        │
│ │ v1     │ 100    │ 3天前      │ 初始版本     │ 回滚   │        │
│ └────────┴────────┴────────────┴──────────────┴────────┘        │
│                                                                  │
│ [对比版本 v2 vs v3]                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、API 设计

### 5.1 提示词分支 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/prompts/:id/branches` | 获取分支列表 |
| POST | `/api/v1/prompts/:id/branches` | 创建分支 |
| GET | `/api/v1/prompts/:id/branches/:branchId` | 获取分支详情 |
| PUT | `/api/v1/prompts/:id/branches/:branchId` | 更新分支信息 |
| DELETE | `/api/v1/prompts/:id/branches/:branchId` | 删除分支 |
| POST | `/api/v1/prompts/:id/branches/:branchId/merge` | 合并分支 |
| POST | `/api/v1/prompts/:id/branches/:branchId/archive` | 归档分支 |
| GET | `/api/v1/prompts/:id/branches/diff` | 分支对比 |

### 5.2 数据集版本 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/datasets/:id/versions` | 获取版本列表 |
| POST | `/api/v1/datasets/:id/versions` | 创建版本快照 |
| GET | `/api/v1/datasets/:id/versions/:vid` | 获取版本详情 |
| GET | `/api/v1/datasets/:id/versions/:vid/rows` | 获取版本数据行 |
| POST | `/api/v1/datasets/:id/versions/:vid/rollback` | 回滚到指定版本 |
| GET | `/api/v1/datasets/:id/versions/diff` | 版本对比 |

---

## 六、依赖关系

### 6.1 外部依赖

- diff（文本差异对比库）
- crypto（哈希计算）

### 6.2 内部依赖

- Phase 2：提示词和数据集基础模块
- Phase 5：Diff 展示组件

---

## 七、风险点

1. **数据集版本存储空间** - 完整快照会占用较多存储，需考虑清理策略
2. **分支合并冲突** - 当前设计为覆盖合并，不支持复杂冲突解决
3. **性能影响** - 大数据集版本创建/对比可能较慢
4. **迁移兼容** - 现有提示词需要创建默认 main 分支
