# Phase 4: 数据集上传优化 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P4-T1 | 创建 DatasetUploadModal 上传弹窗组件 | 2 | ~150 行 | ✅ |
| P4-T2 | 创建 DatasetPreview 数据预览组件 | 2 | ~100 行 | ✅ |
| P4-T3 | 创建 FieldMapper 字段映射组件 | 2 | ~120 行 | ✅ |
| P4-T4 | 创建 DatasetCard 卡片组件 | 2 | ~80 行 | ✅ |
| P4-T5 | 创建 ViewToggle 视图切换组件 | 2 | ~50 行 | ✅ |
| P4-T6 | 创建 useDatasetUpload Hook | 1 | ~100 行 | ✅ (复用现有) |
| P4-T7 | 重构数据集列表页面集成组件 | 2 | ~120 行 | ✅ |

---

## P4-T1: 创建 DatasetUploadModal 上传弹窗组件

### 任务描述
创建数据集上传弹窗组件，包含拖拽上传、模板下载和存储选项

### 文件清单
- `apps/web/src/components/dataset/DatasetUploadModal.tsx` (新增)
- `apps/web/src/components/dataset/index.ts` (新增导出)

### 组件接口
```typescript
type DatasetUploadModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (dataset: DatasetInfo) => void;
}

type UploadStep = 'upload' | 'preview' | 'mapping' | 'confirm';
```

### 步骤流程
1. **upload**: 拖拽/点击上传文件
2. **preview**: 预览数据内容
3. **mapping**: 字段映射配置
4. **confirm**: 确认存储选项并提交

### 拖拽区域样式
```css
.upload-dragger {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  padding: 40px;
  text-align: center;
  transition: all 0.3s;
}

.upload-dragger:hover,
.upload-dragger.drag-over {
  border-color: #1677FF;
  background: #E6F4FF;
}
```

### 验收标准
- [ ] 拖拽上传功能正常
- [ ] 文件类型校验 (.xlsx, .csv)
- [ ] 文件大小校验 (50MB)
- [ ] 上传进度显示

---

## P4-T2: 创建 DatasetPreview 数据预览组件

### 任务描述
创建数据预览组件，展示上传文件的前 N 行数据

### 文件清单
- `apps/web/src/components/dataset/DatasetPreview.tsx` (新增)
- `apps/web/src/components/dataset/index.ts` (更新导出)

### 组件接口
```typescript
type DatasetPreviewProps = {
  data: Record<string, unknown>[];
  columns: string[];
  totalRows: number;
  previewRows?: number;  // 默认显示 5 行
}
```

### 布局结构
```
📊 数据预览 (共 100 行，显示前 5 行)

┌───────────────────────────────────────────────────────────────────┐
│  #  │ input                    │ expected       │ category       │
├───────────────────────────────────────────────────────────────────┤
│  1  │ 什么是人工智能？          │ AI是一种...    │ 科技          │
│  2  │ 如何学习编程？            │ 建议从...      │ 教育          │
│  3  │ ...                      │ ...            │ ...           │
└───────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 表格滚动正常
- [ ] 长文本省略显示
- [ ] 行号显示正确
- [ ] 空值标识清晰

---

## P4-T3: 创建 FieldMapper 字段映射组件

### 任务描述
创建字段映射组件，支持自动识别和手动调整

### 文件清单
- `apps/web/src/components/dataset/FieldMapper.tsx` (新增)
- `apps/web/src/components/dataset/index.ts` (更新导出)

### 组件接口
```typescript
type FieldMapping = {
  sourceField: string;
  targetField: string;
  autoDetected: boolean;
}

type FieldMapperProps = {
  sourceColumns: string[];
  value: FieldMapping[];
  onChange: (mappings: FieldMapping[]) => void;
}

// 系统字段定义
const SYSTEM_FIELDS = [
  { key: 'input', label: '输入 (input)', required: true },
  { key: 'expected', label: '期望输出 (expected)', required: false },
  { key: 'metadata', label: '元数据 (metadata)', required: false },
];
```

### 自动识别规则
```typescript
const AUTO_DETECT_RULES: Record<string, string[]> = {
  'input': ['input', 'prompt', 'question', 'text', '输入', '问题'],
  'expected': ['expected', 'output', 'answer', 'response', '期望', '答案'],
};
```

### 布局结构
```
📋 字段映射

┌─────────────────────────────────────────────────────────────────┐
│  原始字段          →          系统字段                           │
│  ─────────────────────────────────────────────────────────────   │
│  input            →          [input (输入) ▼]  ✅ 自动识别      │
│  expected         →          [expected (期望输出) ▼] ✅          │
│  category         →          [metadata.category ▼]              │
│  other            →          [忽略此字段 ▼]                     │
└─────────────────────────────────────────────────────────────────┘

⚠️ 提示: input 字段为必填项
```

### 验收标准
- [ ] 自动识别功能正常
- [ ] 手动调整下拉选择
- [ ] 必填字段校验
- [ ] 自动识别标记显示

---

## P4-T4: 创建 DatasetCard 卡片组件

### 任务描述
创建数据集卡片组件，用于卡片视图展示

### 文件清单
- `apps/web/src/components/dataset/DatasetCard.tsx` (新增)
- `apps/web/src/components/dataset/index.ts` (更新导出)

### 组件接口
```typescript
type DatasetCardProps = {
  id: string;
  name: string;
  rowCount: number;
  storageType: 'persistent' | 'temporary';
  updatedAt: string;
  onView?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}
```

### 布局结构
```
┌─────────────────┐
│ 📊 客服对话测试集│
│                 │
│ 行数: 1,234     │
│ 存储: 持久化 💾 │
│ 更新: 2小时前   │
│                 │
│ [查看] [导出]   │
└─────────────────┘
```

### 验收标准
- [ ] 卡片样式正确
- [ ] hover 效果
- [ ] 操作按钮正常
- [ ] 存储类型图标正确

---

## P4-T5: 创建 ViewToggle 视图切换组件

### 任务描述
创建视图切换组件，支持列表/卡片视图切换

### 文件清单
- `apps/web/src/components/dataset/ViewToggle.tsx` (新增)
- `apps/web/src/components/dataset/index.ts` (更新导出)

### 组件接口
```typescript
type ViewMode = 'list' | 'card';

type ViewToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}
```

### 布局结构
```
[☰ 列表视图] [▦ 卡片视图]
```

### 验收标准
- [ ] 切换状态正确
- [ ] 选中样式突出
- [ ] 过渡动画平滑

---

## P4-T6: 创建 useDatasetUpload Hook

### 任务描述
创建数据集上传 Hook，封装上传、解析和提交逻辑

### 文件清单
- `apps/web/src/hooks/useDatasetUpload.ts` (新增)

### Hook 接口
```typescript
type UploadState = {
  step: UploadStep;
  file: File | null;
  parseResult: {
    columns: string[];
    data: Record<string, unknown>[];
    totalRows: number;
  } | null;
  mappings: FieldMapping[];
  storageType: 'persistent' | 'temporary';
  uploading: boolean;
  error: Error | null;
}

type UseDatasetUploadReturn = {
  state: UploadState;
  handleFileSelect: (file: File) => Promise<void>;
  handleMappingChange: (mappings: FieldMapping[]) => void;
  handleStorageTypeChange: (type: 'persistent' | 'temporary') => void;
  handleSubmit: () => Promise<DatasetInfo>;
  handleReset: () => void;
}

function useDatasetUpload(): UseDatasetUploadReturn
```

### 文件解析逻辑
- 支持 .csv 解析 (使用 papaparse)
- 支持 .xlsx 解析 (使用 xlsx)
- 自动检测编码
- 错误处理

### 验收标准
- [ ] CSV 解析正确
- [ ] XLSX 解析正确
- [ ] 进度回调正常
- [ ] 错误处理完善

---

## P4-T7: 重构数据集列表页面集成组件

### 任务描述
重构数据集列表页面，支持卡片视图和优化的上传流程

### 文件清单
- `apps/web/src/app/(dashboard)/datasets/page.tsx` (修改)
- `apps/web/src/hooks/useDatasetList.ts` (修改，可选)

### 页面结构
```tsx
export default function DatasetsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const { datasets, loading, refresh } = useDatasetList();

  return (
    <div className="datasets-page">
      <PageHeader
        title="数据集管理"
        extra={
          <Space>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            <Button onClick={() => downloadTemplate('basic')}>
              下载模板
            </Button>
            <Button type="primary" onClick={() => setUploadModalOpen(true)}>
              上传数据集
            </Button>
          </Space>
        }
      />

      {viewMode === 'list' ? (
        <DatasetTable data={datasets} loading={loading} />
      ) : (
        <Row gutter={[16, 16]}>
          {datasets.map(dataset => (
            <Col key={dataset.id} span={6}>
              <DatasetCard {...dataset} />
            </Col>
          ))}
        </Row>
      )}

      <DatasetUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          setUploadModalOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
```

### 验收标准
- [ ] 视图切换正常
- [ ] 上传弹窗正常
- [ ] 刷新列表正常
- [ ] 空状态显示

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-04 | P4-T1~T7 | ✅ 全部完成 | 新增 5 个组件，重构数据集列表页面 |

### 实现说明

1. **DatasetUploadModal**: 新的上传弹窗，4 步流程（选择文件→预览→映射→确认）
2. **DatasetPreview**: 独立的数据预览组件，支持行号和空值标识
3. **FieldMapper**: 字段映射组件，支持自动识别 input/expected 字段
4. **DatasetCard**: 卡片视图组件，展示数据集概要信息
5. **ViewToggle**: 视图切换组件，使用 Ant Design Segmented
6. **useDatasetUpload Hook**: 复用现有 `useCreateDataset` 和 `useUploadDataset`
7. **数据集列表页面**: 集成视图切换、卡片视图和新的上传弹窗
