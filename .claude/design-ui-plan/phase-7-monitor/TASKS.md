# Phase 7: 监控中心数据可视化 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P7-T1 | 创建 TimeRangeSelector 时间范围选择器 | 2 | ~60 行 | 📋 |
| P7-T2 | 创建 MonitorOverview 执行概览组件 | 2 | ~120 行 | 📋 |
| P7-T3 | 创建 ActiveAlerts 活跃告警组件 | 2 | ~100 行 | 📋 |
| P7-T4 | 创建 ModelPerformanceTable 模型性能表格 | 2 | ~120 行 | 📋 |
| P7-T5 | 创建 PassRateTrendChart 通过率趋势图 | 2 | ~150 行 | 📋 |
| P7-T6 | 创建 useMonitorStats Hook | 1 | ~100 行 | 📋 |
| P7-T7 | 重构监控中心页面集成组件 | 2 | ~150 行 | 📋 |

---

## P7-T1: 创建 TimeRangeSelector 时间范围选择器

### 任务描述
创建时间范围选择器组件，支持预设和自定义时间范围

### 文件清单
- `apps/web/src/components/monitor/TimeRangeSelector.tsx` (新增)
- `apps/web/src/components/monitor/index.ts` (新增导出)

### 组件接口
```typescript
type TimeRange = '24h' | '7d' | '30d' | 'custom';

type TimeRangeSelectorProps = {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}
```

### 布局结构
```
[24h] [7天] [30天] [自定义]
               ━━━━
```

### 选中态样式
```css
.time-range-btn.active {
  background: #E6F4FF;
  border-color: #1677FF;
  color: #1677FF;
}
```

### 验收标准
- [ ] 点击切换正常
- [ ] 选中态样式正确
- [ ] 自定义范围弹窗正常

---

## P7-T2: 创建 MonitorOverview 执行概览组件

### 任务描述
创建执行概览组件，展示统计数据和迷你趋势图

### 文件清单
- `apps/web/src/components/monitor/MonitorOverview.tsx` (新增)
- `apps/web/src/components/monitor/index.ts` (更新导出)

### 组件接口
```typescript
type MonitorOverviewProps = {
  data: {
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    passRate: number;
    trendData: { date: string; value: number }[];
  };
  loading?: boolean;
}
```

### 布局结构
```
┌──────────────────────────────────────────┐
│ 📊 执行概览                               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                          │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐ │
│  │ 256  │  │ 231  │  │ 25   │  │90.2% │ │
│  │ 执行 │  │ 成功 │  │ 失败 │  │通过率│ │
│  └──────┘  └──────┘  └──────┘  └──────┘ │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │     执行趋势 (迷你折线图)         │   │
│  └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

### 统计数字样式
- 数字字号: 28px
- 标签字号: 14px
- 成功数: 绿色
- 失败数: 红色

### 验收标准
- [ ] 统计数据展示正确
- [ ] 迷你趋势图渲染
- [ ] loading 状态

---

## P7-T3: 创建 ActiveAlerts 活跃告警组件

### 任务描述
创建活跃告警组件，展示当前未处理的告警

### 文件清单
- `apps/web/src/components/monitor/ActiveAlerts.tsx` (新增)
- `apps/web/src/components/monitor/index.ts` (更新导出)

### 组件接口
```typescript
type AlertLevel = 'critical' | 'warning' | 'info';

type Alert = {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  createdAt: string;
}

type ActiveAlertsProps = {
  alerts: Alert[];
  loading?: boolean;
  onViewAll?: () => void;
  onAlertClick?: (alertId: string) => void;
}
```

### 布局结构
```
┌────────────────────┐
│ 🔔 活跃告警       │
│ ━━━━━━━━━━━━━━━━ │
│                    │
│  🔴 通过率低于阈值│
│  分类模型评估     │
│  5分钟前          │
│  ─────────────────│
│  🟡 响应时间告警  │
│  GPT-4 API       │
│  1小时前         │
│                  │
│ [查看全部 →]     │
│                  │
└────────────────────┘
```

### 告警级别配置
```typescript
const ALERT_LEVEL_CONFIG = {
  critical: { icon: '🔴', color: '#FF4D4F', label: '严重' },
  warning: { icon: '🟡', color: '#FAAD14', label: '警告' },
  info: { icon: '🔵', color: '#1677FF', label: '信息' },
};
```

### 验收标准
- [ ] 告警列表显示正确
- [ ] 级别颜色区分
- [ ] 点击跳转详情
- [ ] 空状态提示

---

## P7-T4: 创建 ModelPerformanceTable 模型性能表格

### 任务描述
创建模型性能对比表格，展示各模型的关键指标

### 文件清单
- `apps/web/src/components/monitor/ModelPerformanceTable.tsx` (新增)
- `apps/web/src/components/monitor/index.ts` (更新导出)

### 组件接口
```typescript
type ModelPerformance = {
  modelId: string;
  modelName: string;
  providerName: string;
  callCount: number;
  successRate: number;     // 0-100
  avgLatency: number;      // 秒
  passRate: number;        // 0-100
  tokenUsage: number;      // K 为单位
}

type ModelPerformanceTableProps = {
  data: ModelPerformance[];
  loading?: boolean;
  onModelClick?: (modelId: string) => void;
}
```

### 表格列配置
| 列 | 宽度 | 说明 |
|-----|------|------|
| 模型 | 20% | 模型名称 + 提供商 |
| 调用次数 | 15% | 数字，千分位 |
| 成功率 | 15% | 百分比 + 进度条 |
| 平均延迟 | 15% | x.xs 格式 |
| 通过率 | 15% | 百分比 + 颜色 |
| Token 消耗 | 20% | x.xK 格式 |

### 成功率进度条
```tsx
<Progress
  percent={successRate}
  size="small"
  status={successRate >= 99 ? 'success' : successRate >= 95 ? 'normal' : 'exception'}
  showInfo={false}
/>
```

### 验收标准
- [ ] 数据展示正确
- [ ] 进度条颜色正确
- [ ] 排序功能
- [ ] 点击行跳转

---

## P7-T5: 创建 PassRateTrendChart 通过率趋势图

### 任务描述
创建通过率趋势图表组件，支持多模型对比

### 文件清单
- `apps/web/src/components/monitor/PassRateTrendChart.tsx` (新增)
- `apps/web/src/components/monitor/index.ts` (更新导出)

### 组件接口
```typescript
type TrendDataPoint = {
  date: string;
  [modelName: string]: number | string;  // 各模型的通过率
}

type PassRateTrendChartProps = {
  data: TrendDataPoint[];
  models: string[];        // 模型名称列表
  loading?: boolean;
  height?: number;
  onExpand?: () => void;
}
```

### 图表配置
```typescript
const chartConfig = {
  height: 300,
  xAxis: { dataKey: 'date' },
  yAxis: { domain: [0, 100], tickFormatter: (v) => `${v}%` },
  lines: models.map((model, index) => ({
    dataKey: model,
    stroke: CHART_COLORS[index],
    strokeWidth: 2,
  })),
  legend: { align: 'center', verticalAlign: 'bottom' },
  tooltip: { formatter: (v) => `${v}%` },
};
```

### 颜色配置
```typescript
const CHART_COLORS = [
  '#1677FF',  // GPT-4o
  '#52C41A',  // GPT-4o-mini
  '#722ED1',  // Claude-3.5
  '#FA8C16',  // 其他
  '#EB2F96',
];
```

### 验收标准
- [ ] 多线图正确渲染
- [ ] 图例显示正确
- [ ] 悬浮提示正确
- [ ] 展开按钮正常

---

## P7-T6: 创建 useMonitorStats Hook

### 任务描述
创建监控统计 Hook，封装多个 API 调用

### 文件清单
- `apps/web/src/hooks/useMonitorStats.ts` (新增)

### Hook 接口
```typescript
type MonitorStats = {
  overview: {
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    passRate: number;
    trendData: { date: string; value: number }[];
  };
  alerts: Alert[];
  modelPerformance: ModelPerformance[];
  passRateTrend: TrendDataPoint[];
}

type UseMonitorStatsOptions = {
  timeRange: TimeRange;
  customRange?: { start: Date; end: Date };
}

type UseMonitorStatsReturn = {
  stats: MonitorStats | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

function useMonitorStats(options: UseMonitorStatsOptions): UseMonitorStatsReturn
```

### API 调用
```typescript
// 并行请求所有数据
const [overview, alerts, models, trend] = await Promise.all([
  fetch(`/api/v1/monitor/overview?range=${timeRange}`),
  fetch(`/api/v1/alerts/active`),
  fetch(`/api/v1/monitor/models?range=${timeRange}`),
  fetch(`/api/v1/monitor/trend?range=${timeRange}`),
]);
```

### 验收标准
- [ ] 并行请求正常
- [ ] 时间范围切换刷新
- [ ] 错误处理完善
- [ ] loading 状态正确

---

## P7-T7: 重构监控中心页面集成组件

### 任务描述
重构监控中心页面，使用新的可视化组件

### 文件清单
- `apps/web/src/app/(dashboard)/monitor/page.tsx` (修改)
- `apps/web/src/styles/monitor.module.css` (新增，可选)

### 页面结构
```tsx
export default function MonitorPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { stats, loading, refresh } = useMonitorStats({ timeRange });

  return (
    <div className="monitor-page">
      <PageHeader
        title="🎯 监控中心"
        extra={
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
          />
        }
      />

      <Row gutter={[16, 16]}>
        {/* 执行概览 + 活跃告警 */}
        <Col span={16}>
          <MonitorOverview
            data={stats?.overview}
            loading={loading}
          />
        </Col>
        <Col span={8}>
          <ActiveAlerts
            alerts={stats?.alerts || []}
            loading={loading}
            onViewAll={() => router.push('/alerts')}
          />
        </Col>

        {/* 模型性能表格 */}
        <Col span={24}>
          <ModelPerformanceTable
            data={stats?.modelPerformance || []}
            loading={loading}
          />
        </Col>

        {/* 通过率趋势图 */}
        <Col span={24}>
          <PassRateTrendChart
            data={stats?.passRateTrend || []}
            models={['GPT-4o', 'GPT-4o-mini', 'Claude-3.5']}
            loading={loading}
          />
        </Col>
      </Row>
    </div>
  );
}
```

### 验收标准
- [ ] 布局协调
- [ ] 时间范围切换刷新所有数据
- [ ] 加载状态统一
- [ ] 空状态处理

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-04 | P7-T1 时间范围选择器 | ✅ 已有 | 复用已有的 TimeRangePicker 组件 |
| 2025-12-04 | P7-T2 执行概览组件 | ✅ 完成 | 新增 MonitorOverview.tsx，统计卡片+迷你趋势图 |
| 2025-12-04 | P7-T3 活跃告警组件 | ✅ 已有 | 复用已有的 AlertList 组件，修复 useActiveAlerts 调用 |
| 2025-12-04 | P7-T4 模型性能表格 | ✅ 完成 | 新增 ModelPerformanceTable.tsx，含输入/输出 Token 分列 |
| 2025-12-04 | P7-T5 通过率趋势图 | ✅ 已有 | 复用 TrendCharts 组件中的通过率趋势图 |
| 2025-12-04 | P7-T6 useMonitorStats | ⏭️ 跳过 | 复用 useTrends + useModelPerformance + useActiveAlerts |
| 2025-12-04 | P7-T7 页面集成 | ✅ 完成 | 重构 monitor/page.tsx 布局 |
| 2025-12-04 | 模型性能 API | ✅ 新增 | GET /api/v1/stats/models |
