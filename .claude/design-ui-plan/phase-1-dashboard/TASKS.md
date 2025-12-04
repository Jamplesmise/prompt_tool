# Phase 1: 工作台重构 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P1-T1 | 创建 StatCard 统计卡片组件 | 2 | ~80 行 | 📋 |
| P1-T2 | 创建 QuickStart 快速开始组件 | 2 | ~100 行 | 📋 |
| P1-T3 | 创建 RecentTasks 最近任务组件 | 2 | ~120 行 | 📋 |
| P1-T4 | 创建 TrendChart 趋势图表组件 | 2 | ~150 行 | 📋 |
| P1-T5 | 创建 useDashboardStats Hook | 1 | ~60 行 | 📋 |
| P1-T6 | 重构工作台页面集成所有组件 | 2 | ~100 行 | 📋 |

---

## P1-T1: 创建 StatCard 统计卡片组件

### 任务描述
创建可复用的统计卡片组件，支持图标、数值、趋势、对比数据展示

### 文件清单
- `apps/web/src/components/dashboard/StatCard.tsx` (新增)
- `apps/web/src/components/dashboard/index.ts` (新增导出)

### 组件接口
```typescript
type StatCardProps = {
  icon: ReactNode;
  title: string;
  value: number | string;
  trend?: {
    value: number;
    type: 'up' | 'down';
    period: string; // "本周" | "较上周"
  };
  footer?: string;
  onClick?: () => void;
  loading?: boolean;
}
```

### 视觉规格
- 卡片圆角: 8px
- 内边距: 20px 24px
- 图标容器: 48x48, 圆角 8px, 渐变背景
- 数值字号: 28px, font-weight: 600
- 趋势字号: 12px
- hover 效果: translateY(-2px), box-shadow 增强

### 验收标准
- [ ] 组件可独立渲染
- [ ] 支持 loading 状态
- [ ] hover 动效流畅
- [ ] 趋势箭头颜色正确

---

## P1-T2: 创建 QuickStart 快速开始组件

### 任务描述
创建快速开始区域组件，包含主操作按钮和次要快捷入口

### 文件清单
- `apps/web/src/components/dashboard/QuickStart.tsx` (新增)
- `apps/web/src/components/dashboard/index.ts` (更新导出)

### 组件接口
```typescript
type QuickStartProps = {
  onNewTask?: () => void;
  onNewPrompt?: () => void;
  onUploadDataset?: () => void;
  onAddModel?: () => void;
  onConfigEvaluator?: () => void;
}
```

### 布局结构
```
┌───────────────────────────────────────┐
│ 🚀 快速开始                           │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │  + 新建测试任务                  │  │  ← 主按钮 (渐变背景)
│ │    选择提示词、模型、数据集       │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌────────────┐ ┌────────────┐       │  ← 次要按钮 (描边)
│ │ 📝 新建提示词│ │ 📊 上传数据 │       │
│ └────────────┘ └────────────┘       │
│                                       │
│ ┌────────────┐ ┌────────────┐       │
│ │ 🔧 添加模型 │ │ ⚙️ 配置评估器│       │
│ └────────────┘ └────────────┘       │
└───────────────────────────────────────┘
```

### 验收标准
- [ ] 主按钮使用渐变背景
- [ ] 次要按钮使用描边样式
- [ ] 按钮点击触发对应回调
- [ ] 响应式布局适配

---

## P1-T3: 创建 RecentTasks 最近任务组件

### 任务描述
创建最近任务列表组件，展示最近 5 条任务及其实时状态

### 文件清单
- `apps/web/src/components/dashboard/RecentTasks.tsx` (新增)
- `apps/web/src/components/dashboard/index.ts` (更新导出)

### 组件接口
```typescript
type RecentTaskItem = {
  id: string;
  name: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING';
  progress?: number; // 0-100
  total?: number;
  passed?: number;
  passRate?: number;
  updatedAt: string;
}

type RecentTasksProps = {
  tasks: RecentTaskItem[];
  loading?: boolean;
  onViewAll?: () => void;
  onTaskClick?: (id: string) => void;
}
```

### 状态图标
- RUNNING: 🔄 蓝色 + 进度条
- COMPLETED: ✅ 绿色 + 通过率
- FAILED: ❌ 红色 + 通过率
- PENDING: ⏳ 灰色

### 空状态设计
```
┌───────────────────────────────┐
│        📝                     │
│   暂无测试任务                 │
│   创建你的第一个测试任务吧     │
│   [+ 创建任务]                │
└───────────────────────────────┘
```

### 验收标准
- [ ] 正确显示各状态图标和颜色
- [ ] 运行中任务显示进度条
- [ ] 空状态有引导按钮
- [ ] 点击任务可跳转详情

---

## P1-T4: 创建 TrendChart 趋势图表组件

### 任务描述
创建执行趋势图表组件，基于 Recharts 实现折线图

### 文件清单
- `apps/web/src/components/dashboard/TrendChart.tsx` (新增)
- `apps/web/src/components/dashboard/index.ts` (更新导出)

### 依赖安装
```bash
pnpm add recharts
```

### 组件接口
```typescript
type TrendDataPoint = {
  date: string;       // "12/01"
  executed: number;   // 执行数
  passed: number;     // 通过数
  failed: number;     // 失败数
}

type TrendChartProps = {
  data: TrendDataPoint[];
  timeRange: '7d' | '30d';
  onTimeRangeChange?: (range: '7d' | '30d') => void;
  loading?: boolean;
  height?: number;
}
```

### 图表配置
- 折线颜色：执行(#1677FF)、通过(#52C41A)、失败(#FF4D4F)
- X轴：日期
- Y轴：数量
- 悬浮提示：显示详细数据
- 图例：底部居中

### 验收标准
- [ ] 图表正确渲染三条折线
- [ ] 时间范围切换正常
- [ ] 悬浮提示显示详情
- [ ] 响应式宽度适配

---

## P1-T5: 创建 useDashboardStats Hook

### 任务描述
创建工作台统计数据 Hook，封装 API 调用和数据处理

### 文件清单
- `apps/web/src/hooks/useDashboardStats.ts` (新增)

### Hook 接口
```typescript
type DashboardStats = {
  // 统计卡片数据
  promptCount: number;
  promptTrend: number;  // 较上周增量
  datasetCount: number;
  datasetTrend: number;
  weeklyTaskCount: number;
  weeklyTaskTrend: number;
  passRate: number;
  passRateTrend: number;

  // 最近任务
  recentTasks: RecentTaskItem[];

  // 趋势数据
  trendData: TrendDataPoint[];
}

type UseDashboardStatsReturn = {
  stats: DashboardStats | null;
  loading: boolean;
  error: Error | null;
  timeRange: '7d' | '30d';
  setTimeRange: (range: '7d' | '30d') => void;
  refresh: () => void;
}

function useDashboardStats(): UseDashboardStatsReturn
```

### API 调用
```typescript
// 统计数据
GET /api/v1/stats/dashboard

// 趋势数据
GET /api/v1/stats/trend?range=7d
```

### 验收标准
- [ ] 数据正确获取和解析
- [ ] loading 状态正确
- [ ] 错误处理完善
- [ ] 时间范围切换触发重新请求

---

## P1-T6: 重构工作台页面集成所有组件

### 任务描述
重构工作台页面，集成所有新组件，替换原有实现

### 文件清单
- `apps/web/src/app/(dashboard)/page.tsx` (修改)
- `apps/web/src/styles/dashboard.module.css` (新增，可选)

### 页面结构
```tsx
export default function DashboardPage() {
  const { stats, loading, timeRange, setTimeRange } = useDashboardStats();
  const router = useRouter();

  return (
    <div className="dashboard-page">
      {/* 统计卡片行 */}
      <Row gutter={[16, 16]}>
        <Col span={4}><StatCard ... /></Col>
        <Col span={4}><StatCard ... /></Col>
        <Col span={4}><StatCard ... /></Col>
        <Col span={4}><StatCard ... /></Col>
        <Col span={8}><MiniTrendChart /></Col>
      </Row>

      {/* 快速开始 + 最近任务 */}
      <Row gutter={[16, 16]}>
        <Col span={12}><QuickStart ... /></Col>
        <Col span={12}><RecentTasks ... /></Col>
      </Row>

      {/* 趋势图表 */}
      <TrendChart
        data={stats?.trendData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    </div>
  );
}
```

### 验收标准
- [ ] 页面布局符合设计稿
- [ ] 所有组件正确渲染
- [ ] 路由跳转正常
- [ ] 加载状态展示正确

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| | | | |
