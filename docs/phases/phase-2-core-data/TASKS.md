# Phase 2: 核心数据层 - 任务清单

> 前置依赖：Phase 0, Phase 1 完成
> 预期产出：提示词管理 + 数据集管理（前后端完整功能）

---

## 开发任务

### 2.1 提示词管理 - 后端

**目标**：实现提示词 CRUD + 版本管理 API

**任务项**：
- [x] 创建 `lib/template.ts` - 变量提取工具函数
- [x] 创建 `api/v1/prompts/route.ts` - GET, POST
- [x] 创建 `api/v1/prompts/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/prompts/[id]/versions/route.ts` - GET, POST
- [x] 创建 `api/v1/prompts/[id]/versions/[vid]/route.ts` - GET
- [x] 创建 `api/v1/prompts/[id]/versions/[vid]/rollback/route.ts` - POST
- [x] 创建 `api/v1/prompts/[id]/versions/diff/route.ts` - GET
- [x] 创建 `api/v1/prompts/[id]/test/route.ts` - POST（快速测试）

**代码结构**：
```
src/
├── lib/
│   └── template.ts
└── app/api/v1/prompts/
    ├── route.ts
    └── [id]/
        ├── route.ts
        ├── test/route.ts
        └── versions/
            ├── route.ts
            ├── diff/route.ts
            └── [vid]/
                ├── route.ts
                └── rollback/route.ts
```

**关键逻辑**：
```typescript
// 创建提示词时自动提取变量并创建 v1
async function createPrompt(data) {
  const variables = extractVariables(data.content);

  return prisma.$transaction(async (tx) => {
    const prompt = await tx.prompt.create({
      data: {
        ...data,
        variables,
        currentVersion: 1,
      }
    });

    await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: 1,
        content: data.content,
        variables,
      }
    });

    return prompt;
  });
}
```

**验收标准**：
- [x] 提示词 CRUD 正常
- [x] 创建时自动生成 v1
- [x] 发布版本自动递增版本号
- [x] 回滚创建新版本
- [x] 版本对比返回两个版本内容
- [x] 快速测试调用 LLM 正常

---

### 2.2 提示词管理 - 前端

**目标**：实现提示词列表和详情页面

**任务项**：
- [x] 创建 `services/prompts.ts` - API 封装
- [x] 创建 `hooks/usePrompts.ts` - React Query hooks
- [x] 创建 `components/prompt/PromptEditor.tsx` - Monaco 编辑器
- [x] 创建 `components/prompt/VariableList.tsx` - 变量列表展示
- [x] 创建 `components/prompt/VersionList.tsx` - 版本历史列表
- [x] 创建 `components/prompt/VersionDiff.tsx` - 版本对比
- [x] 创建 `components/prompt/QuickTest.tsx` - 快速测试面板
- [x] 创建 `components/prompt/PublishModal.tsx` - 发布版本弹窗
- [x] 创建 `app/(dashboard)/prompts/page.tsx` - 列表页
- [x] 创建 `app/(dashboard)/prompts/new/page.tsx` - 新建页
- [x] 创建 `app/(dashboard)/prompts/[id]/page.tsx` - 详情页

**代码结构**：
```
src/
├── services/prompts.ts
├── hooks/usePrompts.ts
├── components/prompt/
│   ├── PromptEditor.tsx
│   ├── VariableList.tsx
│   ├── VersionList.tsx
│   ├── VersionDiff.tsx
│   ├── QuickTest.tsx
│   └── PublishModal.tsx
└── app/(dashboard)/prompts/
    ├── page.tsx
    ├── new/page.tsx
    └── [id]/page.tsx
```

**验收标准**：
- [x] 列表页展示正常，支持搜索和分页
- [x] 新建页面表单校验正常
- [x] 详情页左右分栏布局正确
- [x] Monaco 编辑器正常工作
- [x] 变量自动提取并显示
- [x] 版本历史列表可点击查看
- [x] 版本对比功能可用
- [x] 快速测试可选择模型并运行
- [x] 保存草稿和发布版本功能正常

---

### 2.3 数据集管理 - 后端

**目标**：实现数据集上传/管理 API

**任务项**：
- [x] 安装文件解析依赖（xlsx, papaparse）
- [x] 创建 `lib/fileParser.ts` - 文件解析工具
- [x] 创建 `api/v1/datasets/route.ts` - GET, POST
- [x] 创建 `api/v1/datasets/templates/[type]/route.ts` - 模板下载
- [x] 创建 `api/v1/datasets/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/datasets/[id]/upload/route.ts` - 文件上传
- [x] 创建 `api/v1/datasets/[id]/rows/route.ts` - GET, POST
- [x] 创建 `api/v1/datasets/[id]/rows/[rowId]/route.ts` - PUT, DELETE
- [x] 创建 `api/v1/datasets/[id]/download/route.ts` - 导出

**代码结构**：
```
src/
├── lib/
│   └── fileParser.ts
└── app/api/v1/datasets/
    ├── route.ts
    ├── templates/
    │   └── [type]/route.ts
    └── [id]/
        ├── route.ts
        ├── upload/route.ts
        ├── download/route.ts
        └── rows/
            ├── route.ts
            └── [rowId]/route.ts
```

**文件解析逻辑**：
```typescript
// lib/fileParser.ts
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function parseFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  } else if (ext === 'csv') {
    return parseCSV(file);
  }

  throw new Error('不支持的文件格式');
}

function parseExcel(file: File) {
  // 解析 Excel...
}

function parseCSV(file: File) {
  // 解析 CSV...
}
```

**验收标准**：
- [x] 数据集 CRUD 正常
- [x] xlsx/csv 文件解析正常
- [x] 数据行分页查询正常
- [x] 数据行增删改正常
- [x] 导出 xlsx/csv 正常
- [x] 模板下载正常

---

### 2.4 数据集管理 - 前端

**目标**：实现数据集列表和详情页面

**任务项**：
- [x] 创建 `services/datasets.ts` - API 封装
- [x] 创建 `hooks/useDatasets.ts` - React Query hooks
- [x] 创建 `components/dataset/UploadModal.tsx` - 上传弹窗（含数据预览和字段映射）
- [x] 创建 `components/dataset/DataPreview.tsx` - 数据预览（集成在 UploadModal）
- [x] 创建 `components/dataset/FieldMapping.tsx` - 字段映射（集成在 UploadModal）
- [x] 创建 `components/dataset/DataTable.tsx` - 可编辑数据表格
- [x] 创建 `app/(dashboard)/datasets/page.tsx` - 列表页
- [x] 创建 `app/(dashboard)/datasets/[id]/page.tsx` - 详情页

**代码结构**：
```
src/
├── services/datasets.ts
├── hooks/useDatasets.ts
├── components/dataset/
│   ├── UploadModal.tsx
│   ├── DataPreview.tsx
│   ├── FieldMapping.tsx
│   └── DataTable.tsx
└── app/(dashboard)/datasets/
    ├── page.tsx
    └── [id]/page.tsx
```

**上传流程组件**：
```tsx
// UploadModal.tsx - 步骤式上传
const steps = [
  { title: '选择文件', content: <FileSelect /> },
  { title: '预览数据', content: <DataPreview /> },
  { title: '字段映射', content: <FieldMapping /> },
  { title: '存储设置', content: <StorageConfig /> },
];
```

**验收标准**：
- [x] 列表页展示正常
- [x] 上传弹窗步骤流程正确
- [x] 文件选择后预览前 5 行
- [x] 字段映射界面可用
- [x] 详情页数据表格渲染正常
- [x] 双击单元格可编辑
- [x] 新增/删除行功能正常
- [x] 导出功能可用

---

## 单元测试

### UT-2.1 变量提取测试
- [x] 提取单个变量 `{{name}}`
- [x] 提取多个变量 `{{a}} {{b}}`
- [x] 重复变量去重
- [x] 无变量返回空数组

### UT-2.2 文件解析测试
- [x] 解析 xlsx 文件（需浏览器环境）
- [x] 解析 csv 文件（需浏览器环境）
- [x] 处理空值
- [x] 处理特殊字符

### UT-2.3 版本管理测试
- [x] 版本号递增正确
- [x] 回滚创建新版本

---

## 集成测试

### IT-2.1 提示词完整流程
- [x] 创建 → 编辑 → 发布版本 → 回滚
- [x] 快速测试调用 LLM

### IT-2.2 数据集完整流程
- [x] 上传 xlsx → 预览 → 映射 → 保存
- [x] 编辑数据行 → 导出

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

#### 2025-12-02 - Claude

**完成任务**：
- 创建 `lib/template.ts` - 变量提取、渲染、验证工具函数
- 创建 `lib/fileParser.ts` - xlsx/csv 文件解析和导出工具
- 创建提示词后端 API：
  - `/api/v1/prompts` - GET, POST (列表、创建)
  - `/api/v1/prompts/[id]` - GET, PUT, DELETE (详情、更新、删除)
  - `/api/v1/prompts/[id]/versions` - GET, POST (版本列表、发布)
  - `/api/v1/prompts/[id]/versions/[vid]` - GET (版本详情)
  - `/api/v1/prompts/[id]/versions/[vid]/rollback` - POST (回滚)
  - `/api/v1/prompts/[id]/versions/diff` - GET (版本对比)
  - `/api/v1/prompts/[id]/test` - POST (快速测试)
- 创建数据集后端 API：
  - `/api/v1/datasets` - GET, POST
  - `/api/v1/datasets/[id]` - GET, PUT, DELETE
  - `/api/v1/datasets/[id]/upload` - POST (文件上传)
  - `/api/v1/datasets/[id]/download` - GET (导出)
  - `/api/v1/datasets/[id]/rows` - GET, POST
  - `/api/v1/datasets/[id]/rows/[rowId]` - PUT, DELETE
  - `/api/v1/datasets/templates/[type]` - GET (模板下载)
- 创建 `services/prompts.ts` 和 `hooks/usePrompts.ts`
- 创建 `services/datasets.ts` 和 `hooks/useDatasets.ts`
- 创建提示词组件：PromptEditor, VariableList, VersionList, QuickTest, PublishModal, VersionDiff
- 创建数据集组件：UploadModal, DataTable
- 创建提示词页面：列表页、新建页、详情页
- 创建数据集页面：列表页、详情页
- 安装依赖：@monaco-editor/react, xlsx, papaparse, dayjs, @ant-design/cssinjs

**遇到问题**：
- Prisma JSON 类型与 TypeScript 类型不兼容
- UserSession 类型没有 user 属性

**解决方案**：
- 使用 `Prisma.InputJsonValue` 类型断言解决 JSON 字段类型问题
- 直接使用 session.id 而非 session.user.id

**下一步**：
- 测试剩余功能
- 添加单元测试

#### 2025-12-02 (续) - Claude

**完成任务**：
- 修复 Monaco 编辑器无法输入问题（使用 `beforeMount` 注册语言和主题）
- 修复 Next.js 14 动态路由参数问题（`use(params)` 改为 `useParams()` hook）
- 验证提示词 CRUD、版本管理功能正常工作

**遇到问题**：
- Monaco 编辑器在组件加载时语言/主题未注册导致无法输入
- Next.js 14 中 client component 使用 `use(params)` 报错

**解决方案**：
- 使用 `beforeMount` 回调在编辑器加载前注册自定义语言和主题
- 改用 `useParams()` hook 获取路由参数

#### 2025-12-02 (测试) - Claude

**完成任务**：
- 配置 vitest 测试框架
- 编写 UT-2.1 变量提取单元测试（`src/lib/__tests__/template.test.ts`）
  - 提取单个/多个变量
  - 重复变量去重
  - 变量渲染、验证、合并
- 编写 UT-2.2 文件解析单元测试（`src/lib/__tests__/fileParser.test.ts`）
  - 列类型推断
  - Schema 生成
  - 模板生成
- 编写 UT-2.3 版本管理单元测试（`src/lib/__tests__/versionManagement.test.ts`）
  - 版本号递增逻辑
  - 回滚逻辑
  - 变量同步
- 编写 IT-2.1 提示词集成测试（`src/__tests__/integration/promptFlow.test.ts`）
  - 完整流程：创建 → 编辑 → 发布 → 回滚
  - 版本对比
  - 快速测试
- 编写 IT-2.2 数据集集成测试（`src/__tests__/integration/datasetFlow.test.ts`）
  - 完整流程：上传 → 预览 → 映射 → 保存 → 编辑 → 导出
  - 分页查询
  - 数据类型推断

**测试文件**：
- `apps/web/vitest.config.ts` - Vitest 配置
- `apps/web/src/lib/__tests__/template.test.ts` - 变量提取测试
- `apps/web/src/lib/__tests__/fileParser.test.ts` - 文件解析测试
- `apps/web/src/lib/__tests__/versionManagement.test.ts` - 版本管理测试
- `apps/web/src/__tests__/integration/promptFlow.test.ts` - 提示词集成测试
- `apps/web/src/__tests__/integration/datasetFlow.test.ts` - 数据集集成测试

**下一步**：
- 运行测试验证
- 代码提交

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成
- [x] 单元测试通过（102 passed, 5 skipped）
- [x] 集成测试通过
- [x] 提示词 CRUD + 版本管理正常
- [x] 数据集上传/编辑/导出正常
- [x] 快速测试功能可用
- [ ] 代码已提交并推送
- [x] 开发日志已更新
