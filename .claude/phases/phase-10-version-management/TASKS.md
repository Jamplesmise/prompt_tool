# Phase 10: 版本管理增强 - 任务清单

> 前置依赖：Phase 0-9 完成
> 预期产出：提示词分支管理 + 数据集版本管理

---

## 开发任务

### 10.1 数据模型扩展

**目标**：添加分支和版本相关数据模型

**任务项**：
- [ ] 更新 `prisma/schema.prisma` - 添加 PromptBranch 模型
- [ ] 更新 `prisma/schema.prisma` - 更新 PromptVersion 添加 branchId
- [ ] 更新 `prisma/schema.prisma` - 添加 DatasetVersion 模型
- [ ] 更新 `prisma/schema.prisma` - 添加 DatasetVersionRow 模型
- [ ] 执行 `pnpm db:push` 同步数据库
- [ ] 创建数据迁移脚本 - 为现有提示词创建默认 main 分支
- [ ] 更新 `packages/shared/types` - 添加相关类型定义

**验收标准**：
- [ ] 数据库表创建成功
- [ ] 现有数据迁移成功
- [ ] Prisma Client 生成成功

---

### 10.2 提示词分支 API

**目标**：实现分支管理 API

**任务项**：
- [ ] 创建 `api/v1/prompts/[id]/branches/route.ts` - GET, POST
- [ ] 创建 `api/v1/prompts/[id]/branches/[branchId]/route.ts` - GET, PUT, DELETE
- [ ] 创建 `api/v1/prompts/[id]/branches/[branchId]/merge/route.ts` - POST
- [ ] 创建 `api/v1/prompts/[id]/branches/[branchId]/archive/route.ts` - POST
- [ ] 创建 `api/v1/prompts/[id]/branches/diff/route.ts` - GET
- [ ] 创建 `lib/branch/branchService.ts` - 分支业务逻辑
- [ ] 创建 `lib/branch/mergeService.ts` - 合并逻辑
- [ ] 更新 `api/v1/prompts/[id]/versions/route.ts` - 支持分支参数

**分支创建逻辑**：
```typescript
async function createBranch(promptId: string, params: {
  name: string;
  description?: string;
  sourceVersionId: string;
  createdById: string;
}): Promise<PromptBranch> {
  // 1. 验证源版本存在
  const sourceVersion = await getVersion(params.sourceVersionId);

  // 2. 创建分支
  const branch = await prisma.promptBranch.create({
    data: {
      promptId,
      name: params.name,
      description: params.description,
      sourceVersionId: params.sourceVersionId,
      currentVersion: 1,
      isDefault: false,
      status: 'active',
      createdById: params.createdById,
    }
  });

  // 3. 创建分支的第一个版本（复制源版本内容）
  await prisma.promptVersion.create({
    data: {
      promptId,
      branchId: branch.id,
      version: 1,
      content: sourceVersion.content,
      variables: sourceVersion.variables,
      changeLog: `从 v${sourceVersion.version} 创建分支`,
      createdById: params.createdById,
    }
  });

  return branch;
}
```

**验收标准**：
- [ ] 分支 CRUD 正常
- [ ] 分支创建自动复制源版本内容
- [ ] 分支合并创建新版本
- [ ] 分支归档/删除正常

---

### 10.3 提示词分支 UI

**目标**：实现分支管理界面

**任务项**：
- [ ] 创建 `services/branches.ts` - API 封装
- [ ] 创建 `hooks/useBranches.ts` - React Query hooks
- [ ] 创建 `components/prompt/BranchSelector.tsx` - 分支选择器
- [ ] 创建 `components/prompt/BranchList.tsx` - 分支列表
- [ ] 创建 `components/prompt/CreateBranchModal.tsx` - 创建分支弹窗
- [ ] 创建 `components/prompt/MergeBranchModal.tsx` - 合并分支弹窗
- [ ] 创建 `components/prompt/BranchDiff.tsx` - 分支对比视图
- [ ] 更新 `app/(dashboard)/prompts/[id]/page.tsx` - 集成分支功能

**分支选择器**：
```tsx
function BranchSelector({ promptId, currentBranchId, onChange }) {
  const { branches } = useBranches(promptId);

  return (
    <Select value={currentBranchId} onChange={onChange}>
      {branches.map(branch => (
        <Select.Option key={branch.id} value={branch.id}>
          <Space>
            {branch.isDefault && <Tag color="blue">默认</Tag>}
            {branch.name}
            <Text type="secondary">v{branch.currentVersion}</Text>
            {branch.status === 'merged' && <Tag color="green">已合并</Tag>}
          </Space>
        </Select.Option>
      ))}
    </Select>
  );
}
```

**验收标准**：
- [ ] 分支选择器正常显示
- [ ] 创建分支弹窗正常
- [ ] 分支切换正常加载内容
- [ ] 合并分支功能正常
- [ ] 分支 Diff 对比正常显示

---

### 10.4 数据集版本 API

**目标**：实现数据集版本管理 API

**任务项**：
- [ ] 创建 `api/v1/datasets/[id]/versions/route.ts` - GET, POST
- [ ] 创建 `api/v1/datasets/[id]/versions/[vid]/route.ts` - GET
- [ ] 创建 `api/v1/datasets/[id]/versions/[vid]/rows/route.ts` - GET
- [ ] 创建 `api/v1/datasets/[id]/versions/[vid]/rollback/route.ts` - POST
- [ ] 创建 `api/v1/datasets/[id]/versions/diff/route.ts` - GET
- [ ] 创建 `lib/dataset/versionService.ts` - 版本业务逻辑
- [ ] 创建 `lib/dataset/diffService.ts` - 版本对比逻辑
- [ ] 创建 `lib/dataset/hashService.ts` - 行哈希计算

**版本创建逻辑**：
```typescript
async function createDatasetVersion(datasetId: string, params: {
  changeLog?: string;
  createdById: string;
}): Promise<DatasetVersion> {
  const dataset = await getDataset(datasetId);
  const rows = await getDatasetRows(datasetId);

  // 计算行哈希
  const rowHashes = rows.map(row => hashRow(row.data));

  // 创建版本
  const version = await prisma.datasetVersion.create({
    data: {
      datasetId,
      version: dataset.currentVersion + 1,
      rowCount: rows.length,
      changeLog: params.changeLog,
      columns: dataset.columns,
      rowHashes,
      createdById: params.createdById,
    }
  });

  // 创建行快照
  await prisma.datasetVersionRow.createMany({
    data: rows.map((row, index) => ({
      versionId: version.id,
      rowIndex: index,
      data: row.data,
      hash: rowHashes[index],
    }))
  });

  // 更新数据集当前版本号
  await prisma.dataset.update({
    where: { id: datasetId },
    data: { currentVersion: version.version }
  });

  return version;
}
```

**版本对比逻辑**：
```typescript
async function diffVersions(
  datasetId: string,
  versionA: number,
  versionB: number
): Promise<DatasetDiff> {
  const [verA, verB] = await Promise.all([
    getVersionWithRows(datasetId, versionA),
    getVersionWithRows(datasetId, versionB),
  ]);

  const hashMapA = new Map(verA.rows.map(r => [r.hash, r]));
  const hashMapB = new Map(verB.rows.map(r => [r.hash, r]));

  const added: number[] = [];
  const removed: number[] = [];
  const modified: ModifiedRow[] = [];

  // 找出新增和修改的行
  verB.rows.forEach((rowB, index) => {
    if (!hashMapA.has(rowB.hash)) {
      // 检查是否是修改（同位置但内容不同）
      const rowA = verA.rows[index];
      if (rowA && rowA.hash !== rowB.hash) {
        modified.push(diffRows(rowA, rowB, index));
      } else {
        added.push(index);
      }
    }
  });

  // 找出删除的行
  verA.rows.forEach((rowA, index) => {
    if (!hashMapB.has(rowA.hash) && !modified.some(m => m.index === index)) {
      removed.push(index);
    }
  });

  return {
    added,
    removed,
    modified,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: modified.length,
    }
  };
}
```

**验收标准**：
- [ ] 版本创建正常
- [ ] 版本列表查询正常
- [ ] 版本回滚正常
- [ ] 版本对比正确

---

### 10.5 数据集版本 UI

**目标**：实现数据集版本管理界面

**任务项**：
- [ ] 更新 `services/datasets.ts` - 添加版本相关 API
- [ ] 更新 `hooks/useDatasets.ts` - 添加版本相关 hooks
- [ ] 创建 `components/dataset/VersionHistory.tsx` - 版本历史列表
- [ ] 创建 `components/dataset/CreateVersionModal.tsx` - 创建版本弹窗
- [ ] 创建 `components/dataset/VersionDiff.tsx` - 版本对比视图
- [ ] 创建 `components/dataset/VersionCompareSelector.tsx` - 版本选择对比
- [ ] 更新 `app/(dashboard)/datasets/[id]/page.tsx` - 集成版本功能

**版本历史组件**：
```tsx
function VersionHistory({ datasetId }) {
  const { versions, isLoading } = useDatasetVersions(datasetId);
  const { mutate: rollback } = useRollbackVersion();

  const columns = [
    { title: '版本', dataIndex: 'version', render: v => `v${v}` },
    { title: '行数', dataIndex: 'rowCount' },
    { title: '创建时间', dataIndex: 'createdAt', render: formatDate },
    { title: '说明', dataIndex: 'changeLog' },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button onClick={() => rollback(record.id)}>回滚</Button>
          <Button onClick={() => openDiff(record.version)}>对比</Button>
        </Space>
      )
    }
  ];

  return <Table columns={columns} dataSource={versions} loading={isLoading} />;
}
```

**验收标准**：
- [ ] 版本历史列表正常
- [ ] 创建版本快照正常
- [ ] 版本回滚正常
- [ ] 版本对比视图正常

---

### 10.6 数据迁移

**目标**：为现有数据创建默认分支/版本

**任务项**：
- [ ] 创建 `scripts/migrate-branches.ts` - 提示词分支迁移脚本
- [ ] 创建 `scripts/migrate-dataset-versions.ts` - 数据集版本迁移脚本
- [ ] 更新 `prisma/seed.ts` - 集成迁移逻辑

**提示词迁移逻辑**：
```typescript
async function migratePromptBranches() {
  const prompts = await prisma.prompt.findMany({
    include: { versions: true }
  });

  for (const prompt of prompts) {
    // 检查是否已有默认分支
    const existingBranch = await prisma.promptBranch.findFirst({
      where: { promptId: prompt.id, isDefault: true }
    });

    if (!existingBranch) {
      // 创建默认 main 分支
      const mainBranch = await prisma.promptBranch.create({
        data: {
          promptId: prompt.id,
          name: 'main',
          sourceVersionId: prompt.versions[0].id,
          currentVersion: prompt.currentVersion,
          isDefault: true,
          status: 'active',
          createdById: prompt.createdById,
        }
      });

      // 更新所有版本关联到 main 分支
      await prisma.promptVersion.updateMany({
        where: { promptId: prompt.id },
        data: { branchId: mainBranch.id }
      });
    }
  }
}
```

**验收标准**：
- [ ] 所有现有提示词有默认 main 分支
- [ ] 现有版本正确关联到 main 分支
- [ ] 迁移脚本可重复执行（幂等）

---

## 单元测试

### UT-10.1 分支操作测试
- [ ] 创建分支正确
- [ ] 分支版本独立
- [ ] 合并创建新版本
- [ ] 归档状态正确

### UT-10.2 数据集版本测试
- [ ] 版本创建正确
- [ ] 行哈希计算正确
- [ ] 回滚恢复数据
- [ ] Diff 计算正确

### UT-10.3 迁移测试
- [ ] 迁移脚本幂等
- [ ] 数据完整性验证

---

## 集成测试

### IT-10.1 分支完整流程
- [ ] 创建分支 → 编辑 → 发布版本 → 合并 → 归档

### IT-10.2 数据集版本完整流程
- [ ] 创建版本 → 修改数据 → 创建新版本 → 对比 → 回滚

---

## 开发日志

### 模板

```markdown
#### [日期] - [开发者]

**完成任务**：
-

**遇到问题**：
-

**解决方案**：
-

**下一步**：
-
```

### 日志记录

（待开发时填写）

---

## 检查清单

完成本阶段前，确认以下事项：

- [ ] 所有任务项已完成
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 提示词分支管理正常
- [ ] 数据集版本管理正常
- [ ] 数据迁移成功
- [ ] 代码已提交并推送
- [ ] 开发日志已更新
