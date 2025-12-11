# Phase 5: 结果分析与工作台 - 上下文

> 本阶段目标：完善结果分析功能 + 实现工作台统计

## 一、阶段概述

这是 MVP 的最后一个阶段，主要完成：
- **工作台**：统计概览、最近任务、快捷入口
- **结果筛选**：通过/失败筛选
- **统计概览**：通过率、耗时统计
- **结果导出**：xlsx/csv 导出

## 二、API 规格

### GET /api/v1/stats/overview

工作台统计概览

```typescript
// 响应
{
  code: 200,
  data: {
    promptCount: number;         // 提示词总数
    datasetCount: number;        // 数据集总数
    taskCountThisWeek: number;   // 本周任务数
    avgPassRate: number | null;  // 平均通过率
  }
}
```

### 任务统计（已在 Phase 4 实现）

任务详情 `GET /api/v1/tasks/:id` 返回的 stats：

```typescript
stats: {
  passRate: number | null;     // 通过率 0-1
  avgLatencyMs: number | null; // 平均耗时
  totalTokens: number;         // 总 Token
  passCount: number;           // 通过数
  failCount: number;           // 失败数
  totalCost: number;           // 总费用
}
```

### 结果筛选（已在 Phase 4 实现）

`GET /api/v1/tasks/:id/results` 支持的筛选参数：

```typescript
{
  status?: 'success' | 'failed' | 'timeout' | 'error';
  passed?: boolean;  // 评估是否通过
}
```

### 结果导出（已在 Phase 4 实现）

`GET /api/v1/tasks/:id/results/export?format=xlsx|csv|json`

## 三、页面规格

### 工作台 `/`

**布局**：统计卡片 + 列表

```
┌─────────────────────────────────────────────────────────────────┐
│                          工作台                                  │
├────────────────┬────────────────┬────────────────┬──────────────┤
│   提示词数量    │   数据集数量    │   本周任务数    │   平均通过率  │
│      12        │       8        │       25       │    85.6%     │
├────────────────┴────────────────┴────────────────┴──────────────┤
│                                                                  │
│  最近任务                                              [查看全部] │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 任务名称        状态      通过率     时间        操作    │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ 客服问答测试    已完成    92%      10分钟前    [查看]   │   │
│  │ 翻译质量测试    执行中    -        进行中      [查看]   │   │
│  │ 分类准确性测试  待执行    -        1小时前     [运行]   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  快捷入口                                                        │
│  [+ 新建任务]  [+ 上传数据集]  [+ 新建提示词]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**区块**：

| 区块 | 内容 |
|------|------|
| 统计卡片（4个） | 提示词数量、数据集数量、本周任务数、平均通过率 |
| 最近任务 | 最近 10 个任务，状态、时间、快捷操作 |
| 快捷入口 | 新建任务、上传数据集、新建提示词 |

**数据刷新**：进入页面时获取，无自动刷新

### 任务结果筛选

在 `/tasks/[id]` 页面的结果表格上方添加筛选：

```
┌─────────────────────────────────────────────────────────────────┐
│  筛选：状态 [全部 ▼]   评估结果 [全部 ▼]            [导出结果 ▼] │
├─────────────────────────────────────────────────────────────────┤
│  状态选项：全部 / 成功 / 失败 / 超时 / 错误                      │
│  评估结果选项：全部 / 通过 / 未通过                              │
│  导出选项：导出 xlsx / 导出 csv / 导出 json                     │
└─────────────────────────────────────────────────────────────────┘
```

### 统计概览卡片

在任务详情页 `/tasks/[id]` 展示：

```
┌─────────────────────────────────────────────────────────────────┐
│  任务名称：客服问答测试                          状态：已完成    │
├────────────┬────────────┬────────────┬────────────┬────────────┤
│   总数     │   通过     │   失败     │  通过率    │  平均耗时   │
│   500      │   460      │    40      │   92%      │  1.2s      │
├────────────┴────────────┴────────────┴────────────┴────────────┤
│  进度：████████████████████████████████████████████  100%       │
└─────────────────────────────────────────────────────────────────┘
```

## 四、UI 组件

### 统计卡片组件

```tsx
import { ProCard, StatisticCard } from '@ant-design/pro-components';

<ProCard gutter={16}>
  <StatisticCard
    title="提示词数量"
    value={stats.promptCount}
    icon={<FileTextOutlined />}
  />
  <StatisticCard
    title="数据集数量"
    value={stats.datasetCount}
    icon={<DatabaseOutlined />}
  />
  <StatisticCard
    title="本周任务数"
    value={stats.taskCountThisWeek}
    icon={<ThunderboltOutlined />}
  />
  <StatisticCard
    title="平均通过率"
    value={stats.avgPassRate ? `${(stats.avgPassRate * 100).toFixed(1)}%` : '-'}
    icon={<CheckCircleOutlined />}
    status={stats.avgPassRate >= 0.8 ? 'success' : 'warning'}
  />
</ProCard>
```

### 最近任务列表

```tsx
import { ProList } from '@ant-design/pro-components';

<ProList<Task>
  headerTitle="最近任务"
  toolBarRender={() => [
    <Button key="all" type="link" onClick={() => router.push('/tasks')}>
      查看全部
    </Button>
  ]}
  dataSource={recentTasks}
  metas={{
    title: { dataIndex: 'name' },
    subTitle: {
      render: (_, record) => <TaskStatusTag status={record.status} />
    },
    description: {
      render: (_, record) => (
        <Space>
          {record.stats.passRate && <span>通过率: {(record.stats.passRate * 100).toFixed(0)}%</span>}
          <span>{formatRelativeTime(record.createdAt)}</span>
        </Space>
      )
    },
    actions: {
      render: (_, record) => [
        <Button key="view" type="link" onClick={() => router.push(`/tasks/${record.id}`)}>
          查看
        </Button>
      ]
    }
  }}
/>
```

### 结果筛选组件

```tsx
<Space>
  <Select
    placeholder="状态"
    allowClear
    options={[
      { label: '成功', value: 'success' },
      { label: '失败', value: 'failed' },
      { label: '超时', value: 'timeout' },
      { label: '错误', value: 'error' },
    ]}
    onChange={setStatusFilter}
  />
  <Select
    placeholder="评估结果"
    allowClear
    options={[
      { label: '通过', value: true },
      { label: '未通过', value: false },
    ]}
    onChange={setPassedFilter}
  />
  <Dropdown
    menu={{
      items: [
        { key: 'xlsx', label: '导出 Excel' },
        { key: 'csv', label: '导出 CSV' },
        { key: 'json', label: '导出 JSON' },
      ],
      onClick: handleExport
    }}
  >
    <Button icon={<ExportOutlined />}>导出结果</Button>
  </Dropdown>
</Space>
```

## 五、统计计算

### 工作台统计计算

```typescript
async function getOverviewStats(userId: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [promptCount, datasetCount, tasks] = await Promise.all([
    prisma.prompt.count({ where: { createdById: userId } }),
    prisma.dataset.count({ where: { createdById: userId } }),
    prisma.task.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: weekAgo }
      },
      select: { stats: true }
    })
  ]);

  const taskCountThisWeek = tasks.length;

  // 计算平均通过率
  const passRates = tasks
    .map(t => (t.stats as TaskStats).passRate)
    .filter((rate): rate is number => rate !== null);

  const avgPassRate = passRates.length > 0
    ? passRates.reduce((a, b) => a + b, 0) / passRates.length
    : null;

  return {
    promptCount,
    datasetCount,
    taskCountThisWeek,
    avgPassRate
  };
}
```

### 任务统计计算（复用 Phase 4）

```typescript
async function calculateTaskStats(taskId: string): Promise<TaskStats> {
  const results = await prisma.taskResult.findMany({
    where: { taskId, status: 'SUCCESS' },
    include: { evaluations: true }
  });

  const passCount = results.filter(r =>
    r.evaluations.every(e => e.passed)
  ).length;

  const failCount = results.length - passCount;

  const totalLatency = results.reduce((sum, r) => sum + (r.latencyMs || 0), 0);
  const avgLatencyMs = results.length > 0 ? totalLatency / results.length : null;

  const totalTokens = results.reduce((sum, r) => {
    const tokens = r.tokens as { total: number };
    return sum + (tokens.total || 0);
  }, 0);

  const totalCost = results.reduce((sum, r) => sum + Number(r.cost || 0), 0);

  return {
    passRate: results.length > 0 ? passCount / results.length : null,
    avgLatencyMs,
    totalTokens,
    passCount,
    failCount,
    totalCost
  };
}
```

## 六、导出实现

### Excel 导出

```typescript
import * as XLSX from 'xlsx';

async function exportToExcel(taskId: string): Promise<Buffer> {
  const results = await prisma.taskResult.findMany({
    where: { taskId },
    include: {
      promptVersion: { include: { prompt: true } },
      model: true,
      evaluations: { include: { evaluator: true } }
    }
  });

  const data = results.map(r => ({
    '序号': r.rowIndex,
    '提示词': r.promptVersion.prompt.name,
    '版本': r.promptVersion.version,
    '模型': r.model.name,
    '输入': JSON.stringify(r.input),
    '输出': r.output,
    '期望输出': r.expected,
    '状态': r.status,
    '评估结果': r.evaluations.every(e => e.passed) ? '通过' : '未通过',
    '耗时(ms)': r.latencyMs,
    '错误': r.error
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '测试结果');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
```

### CSV 导出

```typescript
import Papa from 'papaparse';

async function exportToCSV(taskId: string): Promise<string> {
  const results = await getResultsForExport(taskId);
  return Papa.unparse(results);
}
```

### JSON 导出

```typescript
async function exportToJSON(taskId: string): Promise<string> {
  const results = await getResultsForExport(taskId);
  return JSON.stringify(results, null, 2);
}
```

## 七、依赖关系

**上游依赖**：
- Phase 0-4 全部完成

**本阶段是 MVP 最终阶段**

## 八、测试要点

### 单元测试
- 统计计算逻辑
- 导出格式正确性

### 集成测试
- 工作台数据正确
- 结果筛选功能
- 导出下载正常
