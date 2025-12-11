# Phase 10: 版本管理增强 - 任务清单

> 前置依赖：Phase 0-9 完成
> 预期产出：提示词分支管理 + 数据集版本管理

---

## 开发任务

### 10.1 数据模型扩展 ✅

**目标**：添加分支和版本相关数据模型

**任务项**：
- [x] 更新 `prisma/schema.prisma` - 添加 PromptBranch 模型
- [x] 更新 `prisma/schema.prisma` - 更新 PromptVersion 添加 branchId
- [x] 更新 `prisma/schema.prisma` - 添加 DatasetVersion 模型
- [x] 更新 `prisma/schema.prisma` - 添加 DatasetVersionRow 模型
- [x] 执行 `pnpm db:push` 同步数据库
- [x] 创建数据迁移脚本 - 为现有提示词创建默认 main 分支
- [x] 更新 `packages/shared/types` - 添加相关类型定义

**验收标准**：
- [x] 数据库表创建成功
- [x] 现有数据迁移成功
- [x] Prisma Client 生成成功

---

### 10.2 提示词分支 API ✅

**目标**：实现分支管理 API

**任务项**：
- [x] 创建 `api/v1/prompts/[id]/branches/route.ts` - GET, POST
- [x] 创建 `api/v1/prompts/[id]/branches/[branchId]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/prompts/[id]/branches/[branchId]/merge/route.ts` - POST
- [x] 创建 `api/v1/prompts/[id]/branches/[branchId]/archive/route.ts` - POST
- [x] 创建 `api/v1/prompts/[id]/branches/[branchId]/diff/route.ts` - GET
- [x] 创建 `lib/branch/branchService.ts` - 分支业务逻辑
- [x] 创建 `lib/branch/mergeService.ts` - 合并逻辑
- [x] 创建 `api/v1/prompts/[id]/branches/[branchId]/versions/route.ts` - 发布版本到分支

**验收标准**：
- [x] 分支 CRUD 正常
- [x] 分支创建自动复制源版本内容
- [x] 分支合并创建新版本
- [x] 分支归档/删除正常

---

### 10.3 提示词分支 UI ✅

**目标**：实现分支管理界面

**任务项**：
- [x] 更新 `services/prompts.ts` - 添加分支 API 封装
- [x] 更新 `hooks/usePrompts.ts` - 添加分支 React Query hooks
- [x] 创建 `components/prompt/BranchSelector.tsx` - 分支选择器
- [x] 创建 `components/prompt/BranchList.tsx` - 分支列表
- [x] 创建 `components/prompt/CreateBranchModal.tsx` - 创建分支弹窗
- [x] 创建 `components/prompt/MergeBranchModal.tsx` - 合并分支弹窗
- [x] 创建 `components/prompt/BranchDiffModal.tsx` - 分支对比视图

**验收标准**：
- [x] 分支选择器正常显示
- [x] 创建分支弹窗正常
- [x] 分支切换正常加载内容
- [x] 合并分支功能正常
- [x] 分支 Diff 对比正常显示

---

### 10.4 数据集版本 API ✅

**目标**：实现数据集版本管理 API

**任务项**：
- [x] 创建 `api/v1/datasets/[id]/versions/route.ts` - GET, POST
- [x] 创建 `api/v1/datasets/[id]/versions/[vid]/route.ts` - GET
- [x] 创建 `api/v1/datasets/[id]/versions/[vid]/rows/route.ts` - GET
- [x] 创建 `api/v1/datasets/[id]/versions/[vid]/rollback/route.ts` - POST
- [x] 创建 `api/v1/datasets/[id]/versions/diff/route.ts` - GET
- [x] 创建 `lib/dataset/versionService.ts` - 版本业务逻辑
- [x] 创建 `lib/dataset/diffService.ts` - 版本对比逻辑（含行哈希计算）

**验收标准**：
- [x] 版本创建正常
- [x] 版本列表查询正常
- [x] 版本回滚正常
- [x] 版本对比正确

---

### 10.5 数据集版本 UI ✅

**目标**：实现数据集版本管理界面

**任务项**：
- [x] 更新 `services/datasets.ts` - 添加版本相关 API
- [x] 更新 `hooks/useDatasets.ts` - 添加版本相关 hooks
- [x] 创建 `components/dataset/VersionHistory.tsx` - 版本历史列表
- [x] 创建 `components/dataset/CreateVersionModal.tsx` - 创建版本弹窗
- [x] 创建 `components/dataset/VersionDiffModal.tsx` - 版本对比视图
- [x] 创建 `components/dataset/VersionRowsModal.tsx` - 查看版本数据
- [x] 更新 `app/(dashboard)/datasets/[id]/page.tsx` - 集成版本功能

**验收标准**：
- [x] 版本历史列表正常
- [x] 创建版本快照正常
- [x] 版本回滚正常
- [x] 版本对比视图正常

---

### 10.6 数据迁移 ✅

**目标**：为现有数据创建默认分支/版本

**任务项**：
- [x] 创建 `scripts/migrate-branches.ts` - 提示词分支迁移脚本
- [x] 执行迁移脚本 - 为现有提示词创建默认 main 分支

**迁移结果**：
- 迁移了 2 个提示词
- 创建了 2 个 main 分支
- 关联了 4 个版本到 main 分支

**验收标准**：
- [x] 所有现有提示词有默认 main 分支
- [x] 现有版本正确关联到 main 分支
- [x] 迁移脚本可重复执行（幂等）

---

## 单元测试 ✅

### UT-10.1 分支操作测试 ✅
- [x] 创建分支正确
- [x] 分支状态管理正确
- [x] 合并创建新版本
- [x] 归档状态正确
- [x] 分支对比逻辑正确

**测试文件**: `src/lib/__tests__/branchManagement.test.ts` (24 tests)

### UT-10.2 数据集版本测试 ✅
- [x] 版本创建正确
- [x] 行哈希计算正确
- [x] 回滚恢复数据
- [x] Diff 计算正确
- [x] 空数据集处理正确

**测试文件**: `src/lib/__tests__/datasetVersion.test.ts` (24 tests)

---

## 集成测试 ✅

### IT-10.1 分支完整流程 ✅
- [x] 创建分支 → 编辑 → 发布版本 → 合并 → 归档
- [x] 分支切换与版本管理
- [x] 分支删除与级联删除

**测试文件**: `src/__tests__/integration/branchFlow.test.ts` (24 tests)

### IT-10.2 数据集版本完整流程 ✅
- [x] 创建版本 → 修改数据 → 创建新版本 → 对比 → 回滚
- [x] API 验证
- [x] 大数据集处理

**测试文件**: `src/__tests__/integration/datasetVersionFlow.test.ts` (29 tests)

---

## 测试统计

| 类型 | 测试文件 | 测试数量 | 状态 |
|------|----------|----------|------|
| 单元测试 | branchManagement.test.ts | 24 | ✅ |
| 单元测试 | datasetVersion.test.ts | 24 | ✅ |
| 集成测试 | branchFlow.test.ts | 24 | ✅ |
| 集成测试 | datasetVersionFlow.test.ts | 29 | ✅ |
| **总计** | **4 文件** | **101** | **✅ 全部通过** |

---

## 开发日志

### 2024-12-04 - Claude

**完成任务**：
- Phase 10 全部开发任务完成
- 数据模型扩展：PromptBranch、PromptBranchStatus、DatasetVersion、DatasetVersionRow
- 提示词分支 API：完整 CRUD + 合并 + 归档 + Diff + 发布版本
- 提示词分支 UI：BranchSelector、BranchList、CreateBranchModal、MergeBranchModal、BranchDiffModal
- 数据集版本 API：创建、列表、详情、行数据、回滚、Diff
- 数据集版本 UI：VersionHistory、CreateVersionModal、VersionDiffModal、VersionRowsModal
- 数据迁移：为 2 个现有提示词创建默认 main 分支，关联 4 个版本
- 单元测试：48 个测试全部通过
- 集成测试：53 个测试全部通过

**遇到问题**：
- Prisma 客户端缓存导致新模型未被识别
- 中文引号在 JSX 中导致语法错误
- lucide-react 依赖未安装

**解决方案**：
- 重启 Next.js 开发服务器并清除 .next 缓存
- 将中文引号「」替换掉
- 用户手动安装 lucide-react 依赖

**技术细节**：
- 使用 MD5 哈希计算数据行内容，用于快速对比
- 分支合并使用事务确保数据一致性
- 版本回滚创建新版本记录，保留完整历史

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成
- [x] 单元测试通过 (48/48)
- [x] 集成测试通过 (53/53)
- [x] 提示词分支管理正常
- [x] 数据集版本管理正常
- [x] 数据迁移成功
- [ ] 代码已提交并推送
- [x] 开发日志已更新

---

## 文件清单

### 新增文件

**Prisma Schema 更新**:
- `prisma/schema.prisma` - 添加 PromptBranch、DatasetVersion、DatasetVersionRow 模型

**类型定义**:
- `packages/shared/src/types/prompt.ts` - PromptBranch、PromptBranchStatus、PromptDiff 类型
- `packages/shared/src/types/dataset.ts` - DatasetVersion、DatasetVersionRow、DatasetDiff 类型

**分支服务层**:
- `src/lib/branch/branchService.ts` - 分支 CRUD 操作
- `src/lib/branch/mergeService.ts` - 分支合并与对比

**数据集版本服务层**:
- `src/lib/dataset/versionService.ts` - 版本创建、回滚
- `src/lib/dataset/diffService.ts` - 版本对比

**API 路由**:
- `src/app/api/v1/prompts/[id]/branches/route.ts`
- `src/app/api/v1/prompts/[id]/branches/[branchId]/route.ts`
- `src/app/api/v1/prompts/[id]/branches/[branchId]/merge/route.ts`
- `src/app/api/v1/prompts/[id]/branches/[branchId]/archive/route.ts`
- `src/app/api/v1/prompts/[id]/branches/[branchId]/diff/route.ts`
- `src/app/api/v1/prompts/[id]/branches/[branchId]/versions/route.ts`
- `src/app/api/v1/datasets/[id]/versions/route.ts`
- `src/app/api/v1/datasets/[id]/versions/[vid]/route.ts`
- `src/app/api/v1/datasets/[id]/versions/[vid]/rows/route.ts`
- `src/app/api/v1/datasets/[id]/versions/[vid]/rollback/route.ts`
- `src/app/api/v1/datasets/[id]/versions/diff/route.ts`

**UI 组件**:
- `src/components/prompt/BranchSelector.tsx`
- `src/components/prompt/BranchList.tsx`
- `src/components/prompt/CreateBranchModal.tsx`
- `src/components/prompt/MergeBranchModal.tsx`
- `src/components/prompt/BranchDiffModal.tsx`
- `src/components/dataset/VersionHistory.tsx`
- `src/components/dataset/CreateVersionModal.tsx`
- `src/components/dataset/VersionDiffModal.tsx`
- `src/components/dataset/VersionRowsModal.tsx`

**迁移脚本**:
- `scripts/migrate-branches.ts`

**测试文件**:
- `src/lib/__tests__/branchManagement.test.ts`
- `src/lib/__tests__/datasetVersion.test.ts`
- `src/__tests__/integration/branchFlow.test.ts`
- `src/__tests__/integration/datasetVersionFlow.test.ts`

### 修改文件

- `src/services/prompts.ts` - 添加分支 API
- `src/services/datasets.ts` - 添加版本 API
- `src/hooks/usePrompts.ts` - 添加分支 hooks
- `src/hooks/useDatasets.ts` - 添加版本 hooks
- `src/components/dataset/index.ts` - 导出版本组件
- `src/app/(dashboard)/datasets/[id]/page.tsx` - 集成版本历史
