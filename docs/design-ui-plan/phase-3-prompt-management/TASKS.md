# Phase 3: 提示词管理优化 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P3-T1 | 创建 PromptFilters 筛选器组件 | 2 | ~100 行 | ✅ |
| P3-T2 | 创建 TagSelect 标签选择器组件 | 2 | ~80 行 | ✅ |
| P3-T3 | 创建 PromptTable 提示词表格组件 | 2 | ~180 行 | ✅ |
| P3-T4 | 创建 PromptPreviewCard 预览卡片组件 | 2 | ~120 行 | ✅ |
| P3-T5 | 创建 PromptBatchActions 批量操作组件 | 2 | ~80 行 | ✅ |
| P3-T6 | 新增批量删除/导出 API | 2 | ~80 行 | ✅ |
| P3-T7 | 重构提示词列表页面集成组件 | 2 | ~150 行 | ✅ |

---

## P3-T1: 创建 PromptFilters 筛选器组件

### 任务描述
创建提示词筛选器组件，包含搜索框和标签筛选

### 文件清单
- `apps/web/src/components/prompt/PromptFilters.tsx` (新增)
- `apps/web/src/components/prompt/index.ts` (新增导出)

### 组件接口
```typescript
type PromptFiltersValue = {
  search?: string;
  tags?: string[];
}

type PromptFiltersProps = {
  value: PromptFiltersValue;
  onChange: (value: PromptFiltersValue) => void;
  onCreatePrompt?: () => void;
  availableTags: string[];  // 可选标签列表
}
```

### 布局结构
```
┌───────────────────────────────────────────────────────────────────┐
│  🔍 搜索提示词名称或内容...          │ [标签筛选 ▼] │ + 新建提示词 │
└───────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 搜索框支持防抖
- [ ] 标签筛选多选
- [ ] 新建按钮使用渐变样式
- [ ] 响应式布局

---

## P3-T2: 创建 TagSelect 标签选择器组件

### 任务描述
创建彩色标签选择器组件，支持多选

### 文件清单
- `apps/web/src/components/prompt/TagSelect.tsx` (新增)
- `apps/web/src/components/prompt/index.ts` (更新导出)

### 组件接口
```typescript
type TagSelectProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
  options: string[];
  mode?: 'single' | 'multiple';
  placeholder?: string;
}
```

### 标签颜色映射
```typescript
const TAG_COLORS: Record<string, string> = {
  '生产': '#52C41A',
  '测试': '#FAAD14',
  '开发': '#1677FF',
  '归档': '#8c8c8c',
  // 默认颜色
  'default': '#1677FF',
};
```

### 验收标准
- [ ] 标签颜色正确显示
- [ ] 多选功能正常
- [ ] 下拉面板样式正确
- [ ] 已选标签可移除

---

## P3-T3: 创建 PromptTable 提示词表格组件

### 任务描述
创建提示词表格组件，支持多选、hover 操作、行展开

### 文件清单
- `apps/web/src/components/prompt/PromptTable.tsx` (新增)
- `apps/web/src/components/prompt/index.ts` (更新导出)

### 组件接口
```typescript
type PromptItem = {
  id: string;
  name: string;
  description?: string;
  version: number;
  tags: string[];
  updatedAt: string;
  createdBy: string;
}

type PromptTableProps = {
  data: PromptItem[];
  loading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit?: (id: string) => void;
  onTest?: (id: string) => void;
  onCopy?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPreview?: (id: string) => void;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
}
```

### 表格列配置
| 列 | 宽度 | 说明 |
|-----|------|------|
| 选择 | 50px | 复选框 |
| 名称 | 25% | 可点击展开预览 |
| 描述 | 30% | 文本溢出省略 |
| 版本 | 80px | v1, v2... |
| 标签 | 15% | 彩色标签 |
| 更新时间 | 15% | 相对时间 |

### hover 操作行
```
│   │ ──────────────────────────────────────────────────────────────│
│   │ 快捷操作: [编辑] [测试] [复制] [删除]                          │
```

### 验收标准
- [ ] 多选功能正常
- [ ] hover 时显示操作行
- [ ] 点击名称展开预览
- [ ] 分页功能正常

---

## P3-T4: 创建 PromptPreviewCard 预览卡片组件

### 任务描述
创建提示词预览卡片组件，展示详细内容

### 文件清单
- `apps/web/src/components/prompt/PromptPreviewCard.tsx` (新增)
- `apps/web/src/components/prompt/index.ts` (更新导出)

### 组件接口
```typescript
type PromptPreviewCardProps = {
  id: string;
  name: string;
  version: number;
  tags: string[];
  systemPrompt: string;
  userPromptTemplate?: string;
  variables: string[];
  defaultModel?: string;
  createdBy: string;
  updatedAt: string;
  onViewDetail?: () => void;
  onTest?: () => void;
  onClose?: () => void;
}
```

### 布局结构
```
┌───────────────────────────────────────────────────────────────────────────┐
│ GPT-4 通用助手                                          v3 │ 🟢生产      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ System Prompt:                                                            │
│ ┌─────────────────────────────────────────────────────────────────────┐  │
│ │ 你是一个专业的 AI 助手，能够帮助用户解答各种问题。                     │  │
│ │ 请始终保持礼貌、专业的态度...                                        │  │
│ └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│ 变量: {{user_name}}, {{context}}                                          │
│ 模型: gpt-4o                                                              │
│ 创建者: 张三                    更新时间: 2024-01-15 10:30               │
│                                                                           │
│                               [查看详情] [立即测试]                       │
└───────────────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 内容展示完整
- [ ] 长文本可滚动
- [ ] 变量高亮显示
- [ ] 操作按钮正常

---

## P3-T5: 创建 PromptBatchActions 批量操作组件

### 任务描述
创建批量操作组件，显示选中数量和操作按钮

### 文件清单
- `apps/web/src/components/prompt/PromptBatchActions.tsx` (新增)
- `apps/web/src/components/prompt/index.ts` (更新导出)

### 组件接口
```typescript
type PromptBatchActionsProps = {
  total: number;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
  loading?: boolean;
}
```

### 布局结构
```
□ 全选    已选择 3 项    [批量删除] [批量导出]    共 25 项
```

### 验收标准
- [ ] 选中数量实时更新
- [ ] 全选/反选功能正常
- [ ] 批量操作触发确认弹窗
- [ ] 无选中时按钮禁用

---

## P3-T6: 新增批量删除/导出 API

### 任务描述
新增批量删除和导出的 API 接口

### 文件清单
- `apps/web/src/app/api/v1/prompts/batch/route.ts` (新增)
- `apps/web/src/services/prompts.ts` (修改)

### API 设计

**批量删除**
```typescript
// DELETE /api/v1/prompts/batch
// Body: { ids: string[] }
// Response: { code: 200, message: "删除成功", data: { deleted: number } }
```

**批量导出**
```typescript
// GET /api/v1/prompts/export?ids=id1,id2,id3
// Response: 下载 JSON 文件
```

### 验收标准
- [ ] 批量删除事务处理
- [ ] 导出格式正确
- [ ] 错误处理完善

---

## P3-T7: 重构提示词列表页面集成组件

### 任务描述
重构提示词列表页面，集成所有新组件

### 文件清单
- `apps/web/src/app/(dashboard)/prompts/page.tsx` (修改)
- `apps/web/src/hooks/usePromptList.ts` (修改)

### 页面结构
```tsx
export default function PromptsPage() {
  const [filters, setFilters] = useState<PromptFiltersValue>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { prompts, loading, pagination, refresh } = usePromptList({ filters });
  const { data: previewData } = usePromptDetail(previewId);

  return (
    <div className="prompts-page">
      <PageHeader title="提示词管理" />

      <PromptFilters
        value={filters}
        onChange={setFilters}
        onCreatePrompt={() => router.push('/prompts/new')}
        availableTags={['生产', '测试', '开发', '归档']}
      />

      <PromptTable
        data={prompts}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onPreview={setPreviewId}
        pagination={pagination}
      />

      {previewId && (
        <PromptPreviewCard
          {...previewData}
          onClose={() => setPreviewId(null)}
        />
      )}

      <PromptBatchActions
        total={pagination.total}
        selectedCount={selectedIds.length}
        onBatchDelete={handleBatchDelete}
        onBatchExport={handleBatchExport}
      />
    </div>
  );
}
```

### 验收标准
- [ ] 页面布局符合设计
- [ ] 所有功能正常工作
- [ ] 预览卡片正确显示
- [ ] 批量操作正常

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2024-12-04 | P3-T1 ~ P3-T7 | ✅ 全部完成 | Phase 3 提示词管理优化已完成 |

### 完成的功能

1. **PromptFilters 筛选器组件**
   - 支持搜索框防抖
   - 标签多选筛选
   - 渐变样式新建按钮

2. **TagSelect 标签选择器**
   - 彩色标签显示（生产/测试/开发/归档）
   - 单选/多选模式

3. **PromptTable 表格组件**
   - 多选复选框
   - hover 时展开快捷操作行
   - 相对时间显示
   - 点击名称触发预览

4. **PromptPreviewCard 预览卡片**
   - 弹窗式预览
   - 显示 System Prompt、变量、模型等信息
   - 查看详情/立即测试按钮

5. **PromptBatchActions 批量操作**
   - 全选/反选
   - 批量删除（带确认弹窗）
   - 批量导出 JSON

6. **API 增强**
   - `DELETE /api/v1/prompts/batch` 批量删除
   - `GET /api/v1/prompts/batch?ids=...` 批量导出
   - 列表 API 支持标签筛选
