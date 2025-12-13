# Phase 3: 意图理解增强

## 阶段目标

提升 AI 对用户输入的理解能力，实现 L1 级别的意图识别。

## L1 意图理解标准

| 维度 | 达标标准 |
|------|---------|
| 意图识别 | 单一明确意图准确率 > 95% |
| 实体识别 | 资源名称识别准确率 > 90% |
| 模糊匹配 | 支持别名、同义词、部分名称 |
| 不确定处理 | 低置信度时主动追问 |

## 当前问题

### 1. 意图分类不清晰

当前系统没有明确的意图分类，直接让 LLM 生成 GOI 操作。

问题：
- LLM 可能生成不存在的操作类型
- 相似意图处理不一致
- 无法统计意图分布

### 2. 实体识别薄弱

当前只有简单的 `resourceTypeAliases` 映射，没有：
- 资源名称模糊匹配
- 多实体识别
- 上下文关联

### 3. 无置信度评估

当前系统没有置信度概念：
- 不确定也强行执行
- 用户不知道 AI 的理解是否正确
- 没有澄清机制

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/agent/planner.ts` | 意图规划 |
| `apps/web/src/lib/goi/agent/gatherer.ts` | 信息收集 |
| `apps/web/src/lib/goi/prompts/planPrompt.ts` | 规划提示词 |
| `apps/web/src/lib/goi/executor/shared.ts` | 资源别名 |

## 设计方案

### 1. 意图分类体系

```typescript
export type IntentCategory =
  | 'navigation'     // 导航到某页面
  | 'creation'       // 创建资源
  | 'modification'   // 修改资源
  | 'deletion'       // 删除资源
  | 'query'          // 查询信息
  | 'execution'      // 执行操作（如运行任务）
  | 'clarification'  // 需要澄清
  | 'unknown'        // 无法理解

export type ParsedIntent = {
  category: IntentCategory
  confidence: number          // 0-1
  resourceType?: ResourceType
  resourceId?: string
  resourceName?: string       // 用户提到的名称（可能模糊）
  action?: string             // 具体动作
  parameters?: Record<string, unknown>
  alternatives?: ParsedIntent[] // 可能的其他解释
}
```

### 2. 实体识别增强

```typescript
export type EntityMatch = {
  type: 'resource' | 'action' | 'parameter'
  value: string               // 识别出的值
  originalText: string        // 原始文本
  confidence: number
  candidates?: Array<{        // 候选项（模糊匹配时）
    id: string
    name: string
    score: number
  }>
}
```

### 3. 模糊匹配算法

使用多种策略：
1. **精确匹配** - 名称完全一致
2. **前缀匹配** - 以输入开头的名称
3. **包含匹配** - 包含输入的名称
4. **拼音匹配** - 拼音首字母匹配（中文）
5. **编辑距离** - Levenshtein 距离 < 3

### 4. 置信度阈值

```typescript
const CONFIDENCE_THRESHOLDS = {
  AUTO_EXECUTE: 0.9,    // 自动执行
  CONFIRM_ONCE: 0.7,    // 确认一次
  CLARIFY: 0.5,         // 需要澄清
  REJECT: 0.3,          // 无法理解
}
```

## 验收标准

1. [ ] 意图分类准确率 > 90%（基于 50 个测试用例）
2. [ ] 资源名称模糊匹配成功率 > 80%
3. [ ] 低置信度时（< 0.7）触发澄清对话
4. [ ] 多实体场景能正确识别所有实体

## 测试用例示例

| 输入 | 期望意图 | 期望实体 |
|------|---------|---------|
| "打开模型配置" | navigation | model |
| "创建一个情感分析的prompt" | creation | prompt (name: 情感分析) |
| "用GPT4测试一下" | execution | model (name: GPT4) |
| "删掉那个旧的数据集" | deletion + clarification | dataset (需要确认哪个) |
| "帮我看看" | clarification | - |

## 依赖

- Phase 1 完成（别名映射）
- Phase 2 完成（资源类型全覆盖）

## 下一阶段

完成本阶段后，进入 Phase 4：计划展示优化
