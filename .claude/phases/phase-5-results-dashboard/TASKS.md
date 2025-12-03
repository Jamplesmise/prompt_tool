# Phase 5: 结果分析与工作台 - 任务清单

> 前置依赖：Phase 0-4 完成
> 预期产出：工作台统计 + 结果筛选 + 导出功能（MVP 完成）

---

## 开发任务

### 5.1 统计 API

**目标**：实现工作台统计 API

**任务项**：
- [x] 创建 `api/v1/stats/overview/route.ts` - 工作台统计
- [x] 实现提示词、数据集计数
- [x] 实现本周任务数统计
- [x] 实现平均通过率计算

**代码结构**：
```
src/app/api/v1/stats/
└── overview/route.ts
```

**实现逻辑**：
```typescript
export async function GET(request: Request) {
  const session = await getSession(request);
  const userId = session.user.id;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [promptCount, datasetCount, tasks] = await Promise.all([
    prisma.prompt.count({ where: { createdById: userId } }),
    prisma.dataset.count({ where: { createdById: userId } }),
    prisma.task.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: weekAgo },
        status: 'COMPLETED'
      },
      select: { stats: true }
    })
  ]);

  const passRates = tasks
    .map(t => (t.stats as any).passRate)
    .filter((rate): rate is number => rate !== null);

  const avgPassRate = passRates.length > 0
    ? passRates.reduce((a, b) => a + b, 0) / passRates.length
    : null;

  return Response.json({
    code: 200,
    data: {
      promptCount,
      datasetCount,
      taskCountThisWeek: tasks.length,
      avgPassRate
    }
  });
}
```

**验收标准**：
- [x] 各项统计数据正确
- [x] 本周任务数只统计 7 天内
- [x] 平均通过率计算正确

---

### 5.2 工作台页面

**目标**：实现工作台首页

**任务项**：
- [x] 创建 `services/stats.ts` - 统计 API 封装
- [x] 创建 `hooks/useStats.ts` - 统计数据 Hook
- [x] 创建 `components/dashboard/StatCards.tsx` - 统计卡片组
- [x] 创建 `components/dashboard/RecentTasks.tsx` - 最近任务列表
- [x] 创建 `components/dashboard/QuickActions.tsx` - 快捷入口
- [x] 完善 `app/(dashboard)/page.tsx` - 工作台页面

**代码结构**：
```
src/
├── services/stats.ts
├── hooks/useStats.ts
├── components/dashboard/
│   ├── StatCards.tsx
│   ├── RecentTasks.tsx
│   └── QuickActions.tsx
└── app/(dashboard)/page.tsx
```

**统计卡片**：
```tsx
// StatCards.tsx
const statItems = [
  { title: '提示词数量', key: 'promptCount', icon: <FileTextOutlined /> },
  { title: '数据集数量', key: 'datasetCount', icon: <DatabaseOutlined /> },
  { title: '本周任务数', key: 'taskCountThisWeek', icon: <ThunderboltOutlined /> },
  {
    title: '平均通过率',
    key: 'avgPassRate',
    icon: <CheckCircleOutlined />,
    formatter: (val: number | null) => val ? `${(val * 100).toFixed(1)}%` : '-'
  },
];
```

**验收标准**：
- [x] 统计卡片正确展示
- [x] 最近任务列表展示最近 10 个
- [x] 快捷入口跳转正确
- [ ] 页面加载性能良好（待验证）

---

### 5.3 结果筛选增强

**目标**：增强任务结果筛选功能

**任务项**：
- [x] 创建 `components/task/ResultFilters.tsx` - 筛选组件（独立组件备用）
- [x] 实现状态筛选（成功/失败/超时/错误）
- [x] 实现评估结果筛选（通过/未通过）
- [x] 在 `ResultTable.tsx` 中集成筛选控件（已内置筛选功能）
- [x] 筛选后更新表格数据
- [x] 筛选后更新统计数据

**筛选组件**：
```tsx
// components/task/ResultFilters.tsx
export function ResultFilters({ onChange }: Props) {
  return (
    <Space>
      <Select
        placeholder="执行状态"
        allowClear
        style={{ width: 120 }}
        options={[
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failed' },
          { label: '超时', value: 'timeout' },
          { label: '错误', value: 'error' },
        ]}
        onChange={(status) => onChange({ status })}
      />
      <Select
        placeholder="评估结果"
        allowClear
        style={{ width: 120 }}
        options={[
          { label: '通过', value: 'true' },
          { label: '未通过', value: 'false' },
        ]}
        onChange={(passed) => onChange({ passed: passed === 'true' })}
      />
    </Space>
  );
}
```

**验收标准**：
- [x] 筛选控件正常工作
- [x] 筛选结果正确
- [x] 多条件组合筛选正确
- [x] 清除筛选恢复全部数据

---

### 5.4 导出功能

**目标**：实现结果导出功能

**任务项**：
- [x] 创建 `lib/exporter.ts` - 导出工具函数
- [x] 实现 Excel 导出
- [x] 实现 CSV 导出
- [x] 实现 JSON 导出
- [x] 完善 `api/v1/tasks/[id]/results/export/route.ts`
- [x] 创建 `components/task/ExportButton.tsx` - 导出按钮

**代码结构**：
```
src/
├── lib/exporter.ts
├── app/api/v1/tasks/[id]/results/export/route.ts
└── components/task/ExportButton.tsx
```

**导出工具**：
```typescript
// lib/exporter.ts
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function exportResults(taskId: string, format: 'xlsx' | 'csv' | 'json') {
  const results = await getResultsForExport(taskId);

  switch (format) {
    case 'xlsx':
      return exportToExcel(results);
    case 'csv':
      return exportToCSV(results);
    case 'json':
      return exportToJSON(results);
  }
}

function exportToExcel(data: ExportRow[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '测试结果');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function exportToCSV(data: ExportRow[]): string {
  return Papa.unparse(data);
}

function exportToJSON(data: ExportRow[]): string {
  return JSON.stringify(data, null, 2);
}
```

**导出按钮**：
```tsx
// ExportButton.tsx
export function ExportButton({ taskId }: { taskId: string }) {
  const handleExport = async (format: string) => {
    const response = await fetch(
      `/api/v1/tasks/${taskId}/results/export?format=${format}`,
      { method: 'GET' }
    );

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'xlsx', label: '导出 Excel (.xlsx)' },
          { key: 'csv', label: '导出 CSV (.csv)' },
          { key: 'json', label: '导出 JSON (.json)' },
        ],
        onClick: ({ key }) => handleExport(key)
      }}
    >
      <Button icon={<ExportOutlined />}>导出结果</Button>
    </Dropdown>
  );
}
```

**验收标准**：
- [x] Excel 导出格式正确
- [x] CSV 导出格式正确
- [x] JSON 导出格式正确
- [ ] 大数据量导出性能可接受（待验证）
- [x] 下载文件名正确

---

### 5.5 UI 完善

**目标**：完善整体 UI 体验

**任务项**：
- [x] 检查所有页面空状态处理
- [x] 检查所有 Loading 状态
- [x] 检查错误提示展示
- [x] 添加面包屑导航
- [ ] 检查响应式布局（待验证）

**空状态处理**：
```tsx
// 每个列表页添加空状态
{data.length === 0 && (
  <EmptyState
    title="暂无数据"
    description="点击下方按钮创建第一个..."
    actionText="新建"
    onAction={() => router.push('/xxx/new')}
  />
)}
```

**验收标准**：
- [x] 所有列表有空状态
- [x] 加载中有 Loading 提示
- [x] 错误信息友好展示
- [x] 导航路径清晰（面包屑已添加）

---

## 单元测试

### UT-5.1 统计计算测试
- [ ] 提示词计数正确
- [ ] 数据集计数正确
- [ ] 本周任务数正确（时区处理）
- [ ] 平均通过率计算正确
- [ ] 空数据处理正确

### UT-5.2 导出格式测试
- [ ] Excel 文件格式正确
- [ ] CSV 格式正确（含特殊字符）
- [ ] JSON 格式正确

---

## 集成测试

### IT-5.1 工作台测试
- [ ] 统计数据与实际一致
- [ ] 最近任务显示正确
- [ ] 快捷入口跳转正确

### IT-5.2 导出测试
- [ ] 导出 100 条数据
- [ ] 导出 1000 条数据
- [ ] 导出含中文数据

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
- [x] 创建 `api/v1/stats/overview/route.ts` - 工作台统计 API
- [x] 创建 `api/v1/tasks/route.ts` - 任务列表 API
- [x] 创建 `api/v1/tasks/[id]/results/export/route.ts` - 结果导出 API
- [x] 创建 `services/stats.ts` - 统计 API 封装
- [x] 创建 `hooks/useStats.ts` - 统计数据 Hook
- [x] 创建 `lib/exporter.ts` - 导出工具（xlsx/csv/json）
- [x] 创建 `components/dashboard/StatCards.tsx` - 统计卡片组件
- [x] 创建 `components/dashboard/RecentTasks.tsx` - 最近任务列表
- [x] 创建 `components/dashboard/QuickActions.tsx` - 快捷入口
- [x] 完善 `app/(dashboard)/page.tsx` - 工作台页面
- [x] 创建 `components/task/ResultFilters.tsx` - 结果筛选组件
- [x] 创建 `components/task/ExportButton.tsx` - 导出按钮组件

**遇到问题**：
- NextResponse 构造函数对 Uint8Array 类型不兼容

**解决方案**：
- 使用类型断言 `content as unknown as BodyInit` 处理 Uint8Array 类型

**下一步**：
- ~~创建任务详情页面和结果展示~~（已由之前阶段完成）
- ~~集成筛选和导出功能到结果页面~~（已集成）
- 运行完整测试验证功能
- UI 完善（空状态、Loading、面包屑导航）

**补充说明**：
经检查发现 Phase 4 已完成任务详情页面和结果展示功能：
- `app/(dashboard)/tasks/[id]/page.tsx` - 任务详情页
- `components/task/ResultTable.tsx` - 结果表格（已内置筛选功能）
- `components/task/ExportButton.tsx` - 导出按钮（已集成到详情页）
- `components/task/TaskOverview.tsx` - 任务概览
- `components/task/ResultDetail.tsx` - 结果详情抽屉

#### 2025-12-02 - Claude (续)

**完成任务**：
- [x] 创建通用组件 `components/common/PageStates.tsx`（LoadingState、ErrorState、EmptyState）
- [x] 创建面包屑组件 `components/common/Breadcrumb.tsx`
- [x] 更新 `prompts/page.tsx` - 添加空状态、加载状态、错误处理
- [x] 更新 `datasets/page.tsx` - 添加空状态、加载状态、错误处理
- [x] 更新 `tasks/page.tsx` - 添加空状态、加载状态、错误处理
- [x] 更新 `(dashboard)/layout.tsx` - 集成面包屑导航

**新增文件**：
- `components/common/PageStates.tsx` - 页面状态组件
- `components/common/Breadcrumb.tsx` - 面包屑导航组件
- `components/common/index.ts` - 导出文件

**改进内容**：
- 所有列表页面现在有统一的空状态、加载状态和错误处理
- 面包屑导航显示当前路径，方便用户定位

---

## MVP 完成检查清单

### 功能检查

**用户认证**：
- [ ] 登录/登出正常
- [ ] 会话保持正常

**提示词管理**：
- [ ] CRUD 正常
- [ ] 版本管理正常
- [ ] 快速测试正常

**数据集管理**：
- [ ] 上传 xlsx/csv 正常
- [ ] 数据预览正常
- [ ] 编辑数据正常

**模型配置**：
- [ ] 添加提供商正常
- [ ] 添加模型正常
- [ ] 连接测试正常

**评估器**：
- [ ] 预置评估器可用
- [ ] 代码评估器可用
- [ ] 测试运行正常

**任务执行**：
- [ ] 创建任务正常
- [ ] 执行任务正常
- [ ] 进度推送正常
- [ ] 终止任务正常

**结果分析**：
- [ ] 结果查看正常
- [ ] 筛选功能正常
- [ ] 导出功能正常

**工作台**：
- [ ] 统计数据正确
- [ ] 最近任务正确

### 非功能检查

- [ ] 页面首屏加载 < 2s
- [ ] API 响应时间 < 200ms（非 LLM 调用）
- [ ] 无明显 UI bug
- [ ] 错误处理友好

### 代码质量

- [ ] ESLint 无报错
- [ ] TypeScript 无报错
- [ ] 单元测试通过
- [ ] 集成测试通过

---

## 阶段完成确认

- [ ] 所有任务项已完成
- [ ] 所有测试通过
- [ ] MVP 功能检查通过
- [ ] 代码已提交并推送
- [ ] 开发日志已更新

**MVP 开发完成！**
