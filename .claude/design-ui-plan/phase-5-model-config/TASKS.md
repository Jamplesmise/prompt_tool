x
# Phase 5: 模型配置优化 - 任务清单

## 任务概览

| 任务 ID | 任务名称 | 改动文件数 | 代码量 | 状态 |
|---------|----------|-----------|--------|------|
| P5-T1 | 创建 ConnectionStatus 连接状态组件 | 2 | ~90 行 | ✅ |
| P5-T2 | 创建 ModelCard 模型卡片组件 | 2 | ~145 行 | ✅ |
| P5-T3 | 创建 ProviderGroup 提供商分组组件 | 2 | ~200 行 | ✅ |
| P5-T4 | 创建 TestResultModal 测试结果弹窗 | 2 | ~170 行 | ✅ |
| P5-T5 | 创建 useModelTest Hook | 1 | ~85 行 | ✅ |
| P5-T6 | 重构模型配置页面集成组件 | 3 | ~240 行 | ✅ |

---

## P5-T1: 创建 ConnectionStatus 连接状态组件

### 任务描述
创建连接状态指示组件，根据状态显示不同颜色和文案

### 文件清单
- `apps/web/src/components/model/ConnectionStatus.tsx` (新增)
- `apps/web/src/components/model/index.ts` (新增导出)

### 组件接口
```typescript
type ConnectionState = 'connected' | 'slow' | 'failed' | 'unknown' | 'testing';

type ConnectionStatusProps = {
  status: ConnectionState;
  latency?: number;      // 毫秒
  error?: string;        // 错误信息
  lastTestTime?: string; // 最后测试时间
  size?: 'small' | 'default';
}
```

### 状态映射
```typescript
const STATUS_CONFIG: Record<ConnectionState, { color: string; icon: string; text: string }> = {
  connected: { color: '#52C41A', icon: '✅', text: '已连接' },
  slow: { color: '#FAAD14', icon: '⚠️', text: '连接慢' },
  failed: { color: '#FF4D4F', icon: '❌', text: '连接失败' },
  unknown: { color: '#8c8c8c', icon: '❓', text: '未测试' },
  testing: { color: '#1677FF', icon: '🔄', text: '测试中' },
};
```

### 验收标准
- [ ] 状态颜色正确
- [ ] 延迟显示正确
- [ ] 错误 tooltip 显示
- [ ] 加载状态动画

---

## P5-T2: 创建 ModelCard 模型卡片组件

### 任务描述
创建模型卡片组件，展示模型信息和操作按钮

### 文件清单
- `apps/web/src/components/model/ModelCard.tsx` (新增)
- `apps/web/src/components/model/index.ts` (更新导出)

### 组件接口
```typescript
type ModelCardProps = {
  id: string;
  name: string;
  status: ConnectionState;
  latency?: number;
  lastTestTime?: string;
  defaultParams?: {
    temperature?: number;
    maxTokens?: number;
  };
  onTest?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}
```

### 布局结构
```
┌──────────────────────┐
│ gpt-4o               │
│ ─────────────────── │
│ ✅ 已连接            │
│ 延迟: 1.2s           │
│ ─────────────────── │
│ Temperature: 0.7     │
│ Max Tokens: 4096     │
│ ─────────────────── │
│ 最后测试: 5分钟前    │
│ ─────────────────── │
│ [测试] [编辑] [删除] │
└──────────────────────┘
```

### 验收标准
- [ ] 信息展示完整
- [ ] hover 效果正确
- [ ] 操作按钮正常
- [ ] 状态组件集成

---

## P5-T3: 创建 ProviderGroup 提供商分组组件

### 任务描述
创建提供商分组组件，支持折叠展开和批量操作

### 文件清单
- `apps/web/src/components/model/ProviderGroup.tsx` (新增)
- `apps/web/src/components/model/index.ts` (更新导出)

### 组件接口
```typescript
type ProviderGroupProps = {
  id: string;
  name: string;                // OpenAI, Anthropic, etc.
  status: ConnectionState;
  baseUrl: string;
  apiKey: string;              // 脱敏显示
  error?: string;
  models: ModelInfo[];
  defaultExpanded?: boolean;
  onEdit?: () => void;
  onTest?: () => void;
  onAddModel?: () => void;
  onModelTest?: (modelId: string) => void;
  onModelEdit?: (modelId: string) => void;
  onModelDelete?: (modelId: string) => void;
}
```

### 布局结构
```
┌─────────────────────────────────────────────────────────────────────┐
│ ▼ 🟢 OpenAI                                       [编辑] [测试]    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Base URL: https://api.openai.com/v1                                │
│ API Key: sk-****************************1234                      │
│                                                                    │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│   │ ModelCard    │  │ ModelCard    │  │ + 添加模型   │            │
│   └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 折叠状态
```
┌────────────────────────────────────────────────────────────────────┐
│ ▶ 🟢 OpenAI (3个模型)                             [编辑] [测试]   │
└────────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 折叠展开正常
- [ ] 状态指示正确
- [ ] API Key 脱敏显示
- [ ] 模型卡片布局正确

---

## P5-T4: 创建 TestResultModal 测试结果弹窗

### 任务描述
创建测试结果弹窗组件，展示连接测试详情

### 文件清单
- `apps/web/src/components/model/TestResultModal.tsx` (新增)
- `apps/web/src/components/model/index.ts` (更新导出)

### 组件接口
```typescript
type TestResult = {
  success: boolean;
  latency: number;         // 毫秒
  tokenUsage?: {
    input: number;
    output: number;
  };
  response?: string;       // 模型响应内容
  error?: string;
}

type TestResultModalProps = {
  open: boolean;
  modelName: string;
  providerName: string;
  result: TestResult | null;
  loading?: boolean;
  onClose: () => void;
  onRetry?: () => void;
}
```

### 成功状态布局
```
┌───────────────────────────────────────────────────────────────────┐
│  连接测试结果                                                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  模型: gpt-4o                                                     │
│  提供商: OpenAI                                                   │
│                                                                   │
│  ✅ 连接成功                                                      │
│                                                                   │
│  响应延迟: 1.23 秒                                                │
│  Token 消耗: 15 (input) + 8 (output) = 23                         │
│                                                                   │
│  测试响应:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Hello! I'm an AI assistant. How can I help you today?      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                                              [关闭]               │
└───────────────────────────────────────────────────────────────────┘
```

### 失败状态布局
```
┌───────────────────────────────────────────────────────────────────┐
│  连接测试结果                                                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  模型: gpt-4o                                                     │
│  提供商: OpenAI                                                   │
│                                                                   │
│  ❌ 连接失败                                                      │
│                                                                   │
│  错误信息:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ API Key 无效或已过期                                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│                                    [重试]  [关闭]                 │
└───────────────────────────────────────────────────────────────────┘
```

### 验收标准
- [ ] 成功/失败状态正确
- [ ] 信息展示完整
- [ ] 加载状态正确
- [ ] 重试按钮正常

---

## P5-T5: 创建 useModelTest Hook

### 任务描述
创建模型测试 Hook，封装测试 API 调用

### 文件清单
- `apps/web/src/hooks/useModelTest.ts` (新增)

### Hook 接口
```typescript
type UseModelTestReturn = {
  testing: boolean;
  result: TestResult | null;
  testProvider: (providerId: string) => Promise<TestResult>;
  testModel: (modelId: string) => Promise<TestResult>;
  clearResult: () => void;
}

function useModelTest(): UseModelTestReturn
```

### 测试请求
```typescript
// 测试提供商
POST /api/v1/providers/:id/test
Response: { success: boolean, latency: number, error?: string }

// 测试单个模型
POST /api/v1/models/:id/test
Response: { success: boolean, latency: number, tokenUsage: {...}, response: string, error?: string }
```

### 验收标准
- [ ] 测试请求正常
- [ ] 结果解析正确
- [ ] 错误处理完善
- [ ] loading 状态正确

---

## P5-T6: 重构模型配置页面集成组件

### 任务描述
重构模型配置页面，使用新的分组布局

### 文件清单
- `apps/web/src/app/(dashboard)/models/page.tsx` (修改)
- `apps/web/src/hooks/useProviderList.ts` (修改，可选)

### 页面结构
```tsx
export default function ModelsPage() {
  const { providers, loading, refresh } = useProviderList();
  const { testing, result, testProvider, testModel, clearResult } = useModelTest();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<{ model: string; provider: string } | null>(null);

  const handleProviderTest = async (providerId: string, providerName: string) => {
    const testResult = await testProvider(providerId);
    // 更新提供商状态
  };

  const handleModelTest = async (modelId: string, modelName: string, providerName: string) => {
    setCurrentTest({ model: modelName, provider: providerName });
    setTestModalOpen(true);
    await testModel(modelId);
  };

  return (
    <div className="models-page">
      <PageHeader
        title="模型配置"
        extra={
          <Button type="primary" onClick={() => setAddProviderOpen(true)}>
            + 添加提供商
          </Button>
        }
      />

      <div className="provider-list">
        {providers.map(provider => (
          <ProviderGroup
            key={provider.id}
            {...provider}
            onTest={() => handleProviderTest(provider.id, provider.name)}
            onModelTest={(modelId) => handleModelTest(modelId, ...)}
          />
        ))}
      </div>

      <TestResultModal
        open={testModalOpen}
        modelName={currentTest?.model}
        providerName={currentTest?.provider}
        result={result}
        loading={testing}
        onClose={() => {
          setTestModalOpen(false);
          clearResult();
        }}
      />
    </div>
  );
}
```

### 验收标准
- [ ] 分组布局正确
- [ ] 测试功能正常
- [ ] 刷新状态正确
- [ ] 空状态显示

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-04 | P5-T1 | ✅ | ConnectionStatus 组件完成，支持 5 种状态显示 |
| 2025-12-04 | P5-T2 | ✅ | ModelCard 组件重构完成，集成 ConnectionStatus |
| 2025-12-04 | P5-T3 | ✅ | ProviderGroup 组件完成，支持折叠展开 |
| 2025-12-04 | P5-T4 | ✅ | TestResultModal 组件完成，支持成功/失败状态展示 |
| 2025-12-04 | P5-T5 | ✅ | useModelTest Hook 完成，新增 provider test API |
| 2025-12-04 | P5-T6 | ✅ | models/page.tsx 重构完成，集成所有新组件 |

### 新增文件
- `apps/web/src/components/model/ConnectionStatus.tsx`
- `apps/web/src/components/model/ProviderGroup.tsx`
- `apps/web/src/components/model/TestResultModal.tsx`
- `apps/web/src/hooks/useModelTest.ts`
- `apps/web/src/app/api/v1/providers/[id]/test/route.ts`

### 修改文件
- `apps/web/src/components/model/ModelCard.tsx` - 重构增强
- `apps/web/src/components/model/index.ts` - 新增导出
- `apps/web/src/services/models.ts` - 新增 provider test 和扩展 TestResult 类型
- `apps/web/src/app/(dashboard)/models/page.tsx` - 使用新的 ProviderGroup 布局
