# Phase 6: 评估器展示增强 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P6-T1 | 创建 EvaluatorTypeTag 类型标签组件 | 2 | ~110 行 | ✅ |
| P6-T2 | 创建 PresetEvaluatorCard 预置评估器卡片 | 2 | ~100 行 | ✅ |
| P6-T3 | 创建 EvaluatorDetailModal 详情弹窗 | 2 | ~145 行 | ✅ |
| P6-T4 | 创建 EvaluatorEmptyState 空状态组件 | 2 | ~95 行 | ✅ |
| P6-T5 | 添加评估器常量定义 | 1 | ~115 行 | ✅ |
| P6-T6 | 重构评估器页面集成组件 | 1 | ~115 行 | ✅ |

---

## P6-T1: 创建 EvaluatorTypeTag 类型标签组件

### 任务描述
创建评估器类型标签组件，根据类型显示不同图标和颜色

### 文件清单
- `apps/web/src/components/evaluator/EvaluatorTypeTag.tsx` (新增)
- `apps/web/src/components/evaluator/index.ts` (新增导出)

### 组件接口
```typescript
type EvaluatorType =
  | 'exact_match'
  | 'contains'
  | 'regex'
  | 'json_schema'
  | 'similarity'
  | 'llm_judge'
  | 'code'
  | 'composite';

type EvaluatorTypeTagProps = {
  type: EvaluatorType;
  size?: 'small' | 'default' | 'large';
  showLabel?: boolean;
}
```

### 类型配置
```typescript
const EVALUATOR_TYPE_CONFIG: Record<EvaluatorType, { icon: string; color: string; label: string }> = {
  exact_match: { icon: '✅', color: '#52C41A', label: '精确匹配' },
  contains: { icon: '🔍', color: '#1677FF', label: '包含匹配' },
  regex: { icon: '📝', color: '#722ED1', label: '正则匹配' },
  json_schema: { icon: '📋', color: '#13C2C2', label: 'JSON Schema' },
  similarity: { icon: '📊', color: '#FA8C16', label: '相似度' },
  llm_judge: { icon: '🤖', color: '#EB2F96', label: 'LLM 评估' },
  code: { icon: '💻', color: '#2F54EB', label: '代码评估' },
  composite: { icon: '🔗', color: '#52C41A', label: '组合评估' },
};
```

### 验收标准
- [ ] 图标颜色正确
- [ ] 支持不同尺寸
- [ ] 可选显示文字标签

---

## P6-T2: 创建 PresetEvaluatorCard 预置评估器卡片

### 任务描述
创建预置评估器卡片组件，展示评估器信息和适用场景

### 文件清单
- `apps/web/src/components/evaluator/PresetEvaluatorCard.tsx` (新增)
- `apps/web/src/components/evaluator/index.ts` (更新导出)

### 组件接口
```typescript
type PresetEvaluatorCardProps = {
  id: string;
  type: EvaluatorType;
  name: string;
  description: string;
  useCases: string[];   // 适用场景
  onClick?: () => void;
}
```

### 布局结构
```
┌─────────────────┐
│ ✅ 精确匹配      │  ← 图标 + 名称
│                 │
│ exact_match     │  ← 类型标识
│                 │
│ 输出与期望值    │  ← 描述
│ 完全一致        │
│                 │
│ 适用: 分类任务  │  ← 适用场景
│ ─────────────── │
│ [查看详情 →]    │  ← 操作入口
└─────────────────┘
```

### 样式规格
- 卡片宽度: 自适应，最小 200px
- 圆角: 8px
- hover: 上移 2px，阴影增强
- 点击区域: 整个卡片可点击

### 验收标准
- [ ] 卡片样式正确
- [ ] hover 效果
- [ ] 点击触发回调
- [ ] 适用场景显示

---

## P6-T3: 创建 EvaluatorDetailModal 详情弹窗

### 任务描述
创建评估器详情弹窗，展示完整配置和使用说明

### 文件清单
- `apps/web/src/components/evaluator/EvaluatorDetailModal.tsx` (新增)
- `apps/web/src/components/evaluator/index.ts` (更新导出)

### 组件接口
```typescript
type EvaluatorDetailModalProps = {
  open: boolean;
  evaluator: {
    id: string;
    type: EvaluatorType;
    name: string;
    description: string;
    useCases: string[];
    config?: Record<string, unknown>;
    example?: {
      input: string;
      expected: string;
      output: string;
      result: boolean;
    };
  } | null;
  onClose: () => void;
  onUse?: () => void;
}
```

### 布局结构
```
┌───────────────────────────────────────────────────────────────────┐
│  精确匹配 (exact_match)                                 [关闭 ×] │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ 精确匹配                                                      │
│                                                                   │
│  描述:                                                            │
│  判断模型输出是否与期望值完全一致，区分大小写。                    │
│                                                                   │
│  适用场景:                                                        │
│  • 分类任务 (输出固定类别)                                        │
│  • 是/否判断                                                      │
│  • 选项选择                                                       │
│                                                                   │
│  示例:                                                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 输入: "这段话的情感是正面还是负面?"                          │  │
│  │ 期望: "正面"                                                │  │
│  │ 输出: "正面"                                                │  │
│  │ 结果: ✅ 通过                                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  配置选项:                                                        │
│  • ignore_case: 忽略大小写 (默认: false)                          │
│  • trim: 去除首尾空格 (默认: true)                               │
│                                                                   │
│                                              [在任务中使用]       │
└───────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 详情展示完整
- [ ] 示例展示正确
- [ ] 使用按钮正常

---

## P6-T4: 创建 EvaluatorEmptyState 空状态组件

### 任务描述
创建自定义评估器空状态组件，提供引导内容

### 文件清单
- `apps/web/src/components/evaluator/EvaluatorEmptyState.tsx` (新增)
- `apps/web/src/components/evaluator/index.ts` (更新导出)

### 组件接口
```typescript
type EvaluatorEmptyStateProps = {
  onCreateEvaluator?: () => void;
  onViewDocs?: () => void;
}
```

### 布局结构
```
╭───────────────────────────────────────────────╮
│                  🔧                           │
│                                               │
│         还没有自定义评估器                     │
│                                               │
│   自定义评估器可以编写代码实现复杂的评估逻辑    │
│                                               │
│   支持的评估器类型:                            │
│   • Node.js 代码评估器                        │
│   • LLM 评估器                                │
│   • 组合评估器                                │
│                                               │
│   ┌─────────────────────────────────────┐     │
│   │        + 创建第一个评估器            │     │
│   └─────────────────────────────────────┘     │
│                                               │
│   📖 查看代码评估器文档                        │
│                                               │
╰───────────────────────────────────────────────╯
```

### 验收标准
- [ ] 引导文案清晰
- [ ] 创建按钮正常
- [ ] 文档链接正确

---

## P6-T5: 添加评估器常量定义

### 任务描述
添加评估器类型常量和预置评估器配置

### 文件清单
- `apps/web/src/constants/evaluators.ts` (新增)

### 常量定义
```typescript
// 评估器类型配置
export const EVALUATOR_TYPE_CONFIG = {
  exact_match: { icon: '✅', color: '#52C41A', label: '精确匹配' },
  contains: { icon: '🔍', color: '#1677FF', label: '包含匹配' },
  regex: { icon: '📝', color: '#722ED1', label: '正则匹配' },
  json_schema: { icon: '📋', color: '#13C2C2', label: 'JSON Schema' },
  similarity: { icon: '📊', color: '#FA8C16', label: '相似度' },
  llm_judge: { icon: '🤖', color: '#EB2F96', label: 'LLM 评估' },
  code: { icon: '💻', color: '#2F54EB', label: '代码评估' },
  composite: { icon: '🔗', color: '#52C41A', label: '组合评估' },
} as const;

// 预置评估器列表
export const PRESET_EVALUATORS = [
  {
    id: 'exact_match',
    type: 'exact_match',
    name: '精确匹配',
    description: '输出与期望值完全一致',
    useCases: ['分类任务', '是否判断', '选项选择'],
  },
  {
    id: 'contains',
    type: 'contains',
    name: '包含匹配',
    description: '输出包含期望内容',
    useCases: ['关键词检测', '要点提取'],
  },
  // ... 其他预置评估器
];
```

### 验收标准
- [ ] 常量定义完整
- [ ] 类型导出正确

---

## P6-T6: 重构评估器页面集成组件

### 任务描述
重构评估器页面，使用新的卡片和空状态组件

### 文件清单
- `apps/web/src/app/(dashboard)/evaluators/page.tsx` (修改)
- `apps/web/src/hooks/useEvaluatorList.ts` (修改，可选)

### 页面结构
```tsx
export default function EvaluatorsPage() {
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  const [detailEvaluator, setDetailEvaluator] = useState<PresetEvaluator | null>(null);

  const { evaluators, loading } = useEvaluatorList();

  return (
    <div className="evaluators-page">
      <PageHeader
        title="评估器"
        extra={
          <Button type="primary" onClick={() => router.push('/evaluators/new')}>
            + 新建评估器
          </Button>
        }
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="预置评估器" key="preset">
          <Alert
            type="info"
            message="预置评估器开箱即用，选择后可直接应用于测试任务"
            style={{ marginBottom: 16 }}
          />
          <Row gutter={[16, 16]}>
            {PRESET_EVALUATORS.map(evaluator => (
              <Col key={evaluator.id} span={6}>
                <PresetEvaluatorCard
                  {...evaluator}
                  onClick={() => setDetailEvaluator(evaluator)}
                />
              </Col>
            ))}
          </Row>
        </TabPane>

        <TabPane tab="自定义评估器" key="custom">
          {evaluators.length === 0 ? (
            <EvaluatorEmptyState
              onCreateEvaluator={() => router.push('/evaluators/new')}
            />
          ) : (
            <EvaluatorTable data={evaluators} loading={loading} />
          )}
        </TabPane>
      </Tabs>

      <EvaluatorDetailModal
        open={!!detailEvaluator}
        evaluator={detailEvaluator}
        onClose={() => setDetailEvaluator(null)}
      />
    </div>
  );
}
```

### 验收标准
- [ ] Tab 切换正常
- [ ] 预置评估器展示
- [ ] 空状态显示
- [ ] 详情弹窗正常

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-04 | P6-T1 | ✅ | EvaluatorTypeTag 组件完成，支持 8 种类型显示 |
| 2025-12-04 | P6-T2 | ✅ | PresetEvaluatorCard 组件完成，支持适用场景显示 |
| 2025-12-04 | P6-T3 | ✅ | EvaluatorDetailModal 组件完成，支持示例和配置展示 |
| 2025-12-04 | P6-T4 | ✅ | EvaluatorEmptyState 组件完成，引导创建评估器 |
| 2025-12-04 | P6-T5 | ✅ | 评估器常量定义完成，6 个预置评估器配置 |
| 2025-12-04 | P6-T6 | ✅ | 评估器页面重构完成，集成所有新组件 |

### 新增文件
- `apps/web/src/components/evaluator/EvaluatorTypeTag.tsx`
- `apps/web/src/components/evaluator/PresetEvaluatorCard.tsx`
- `apps/web/src/components/evaluator/EvaluatorDetailModal.tsx`
- `apps/web/src/components/evaluator/EvaluatorEmptyState.tsx`
- `apps/web/src/constants/evaluators.ts`

### 修改文件
- `apps/web/src/components/evaluator/index.ts` - 新增导出
- `apps/web/src/app/(dashboard)/evaluators/page.tsx` - 重构使用新组件
