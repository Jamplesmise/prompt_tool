# Phase 3: 上下文与可靠性 - 任务清单

## 阶段概览

| 属性 | 值 |
|------|-----|
| 预估周期 | 2 周 |
| 前置依赖 | Phase 2 完成 |
| 交付物 | 上下文管理 + 回滚机制 |
| 里程碑 | M4: 可靠性保障 |

---

## Week 9: 上下文管理与压缩

### Task 3.1.1: 上下文类型定义

**目标**：定义上下文管理相关的 TypeScript 类型

**任务清单**：
- [ ] 创建 `packages/shared/types/goi/context.ts`
- [ ] 定义 `ContextLayer` 枚举（system, session, working, instant）
- [ ] 定义 `ContextUsage` 类型（使用量统计）
- [ ] 定义 `CompressionLevel` 枚举
- [ ] 定义 `CompressionResult` 类型
- [ ] 定义 `ContextSummary` 类型（压缩后的摘要）

**类型定义**：
```typescript
type ContextLayer = 'system' | 'session' | 'working' | 'instant';

type ContextUsage = {
  totalTokens: number;
  maxTokens: number;
  usagePercent: number;
  layerBreakdown: Record<ContextLayer, number>;
};

type CompressionLevel = 'standard' | 'deep' | 'phase' | 'checkpoint';

type CompressionResult = {
  success: boolean;
  beforeTokens: number;
  afterTokens: number;
  compressionRatio: number;
  summary: ContextSummary;
  droppedInfo?: string[]; // 被丢弃的信息描述
};

type ContextSummary = {
  goal: string;
  completedPhases: Array<{ name: string; summary: string }>;
  currentState: {
    page: string;
    selectedResources: Array<{ type: string; id: string; name: string }>;
  };
  keyDecisions: string[];
  nextStep: string;
  constraints: string[];
};
```

**验收标准**：
- [ ] 类型定义完整
- [ ] TypeScript 编译通过

---

### Task 3.1.2: Token 计数器实现

**目标**：实现准确的 Token 计数

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/context/tokenCounter.ts`
- [ ] 实现 `countTokens(text)` - 计算文本 token 数
- [ ] 实现 `countContextTokens(context)` - 计算完整上下文
- [ ] 实现各层级的 token 计数
- [ ] 缓存计数结果（文本内容相同时复用）
- [ ] 添加批量计数支持

**实现要点**：
```typescript
// 使用 tiktoken 或简化估算
import { getEncoding } from 'tiktoken';

class TokenCounter {
  private encoder = getEncoding('cl100k_base');
  private cache = new Map<string, number>();

  countTokens(text: string): number {
    const cached = this.cache.get(text);
    if (cached !== undefined) return cached;

    const count = this.encoder.encode(text).length;
    this.cache.set(text, count);
    return count;
  }

  countContextUsage(context: GoiContext): ContextUsage {
    const layers = {
      system: this.countTokens(context.systemPrompt),
      session: this.countTokens(JSON.stringify(context.sessionData)),
      working: this.countTokens(JSON.stringify(context.workingData)),
      instant: this.countTokens(JSON.stringify(context.instantData)),
    };

    const total = Object.values(layers).reduce((a, b) => a + b, 0);
    const maxTokens = 128000; // Claude 上下文限制

    return {
      totalTokens: total,
      maxTokens,
      usagePercent: (total / maxTokens) * 100,
      layerBreakdown: layers,
    };
  }
}
```

**验收标准**：
- [ ] 计数准确率 > 95%
- [ ] 缓存生效，性能良好
- [ ] 支持各层级分别计数

---

### Task 3.1.3: 上下文管理器实现

**目标**：实现上下文的监控和管理

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/context/manager.ts`
- [ ] 实现 `getUsage(sessionId)` - 获取当前使用量
- [ ] 实现 `checkThreshold(usage)` - 检查是否达到阈值
- [ ] 实现 `shouldTriggerCompression(usage)` - 判断是否需要压缩
- [ ] 实现定期检查机制（每次 Agent Loop 前）
- [ ] 发布上下文相关事件

**阈值配置**：
```typescript
const thresholds = {
  warning: 70,      // 显示预警
  autoCompress: 85, // 自动压缩
  urgent: 90,       // 紧急压缩
  critical: 95,     // 必须压缩
};
```

**验收标准**：
- [ ] 使用量监控准确
- [ ] 阈值判断正确
- [ ] 事件发布正常

---

### Task 3.1.4: 压缩器实现

**目标**：实现上下文压缩逻辑

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/context/compressor.ts`
- [ ] 创建 `apps/web/src/lib/goi/context/templates.ts` - 摘要模板
- [ ] 实现 `compress(context, level)` - 执行压缩
- [ ] 实现 `generateSummary(context)` - 调用 LLM 生成摘要
- [ ] 实现 `preserveKeyInfo(context)` - 标记不可压缩的信息
- [ ] 实现各级别的压缩策略

**压缩 Prompt**：
```typescript
const compressionPrompt = `
你是一个上下文压缩专家。请将以下任务执行记录压缩为简洁的摘要。

## 压缩要求
1. 必须保留：用户目标、当前进度、已选资源ID、关键决策
2. 可以简化：操作详情改为一句话描述
3. 可以丢弃：中间查询结果、重复信息、调试日志

## 原始内容
${originalContext}

## 输出格式
{
  "goal": "用户目标",
  "completedPhases": [{ "name": "阶段名", "summary": "简短摘要" }],
  "currentState": { "page": "当前页面", "selectedResources": [...] },
  "keyDecisions": ["决策1", "决策2"],
  "nextStep": "下一步操作",
  "constraints": ["约束条件"]
}
`;
```

**验收标准**：
- [ ] 各级别压缩正常
- [ ] 关键信息不丢失
- [ ] 压缩后可继续执行

---

### Task 3.1.5: 上下文 UI 组件

**目标**：实现上下文相关的 UI 组件

**任务清单**：
- [ ] 创建 `apps/web/src/components/goi/ContextWarning.tsx`
  - 显示使用量百分比
  - 不同阈值不同颜色
  - 手动压缩按钮
- [ ] 创建 `apps/web/src/components/goi/CompressDialog.tsx`
  - 压缩确认弹窗
  - 显示预计压缩效果
  - 选择压缩级别
- [ ] 创建 `apps/web/src/app/api/goi/context/route.ts` - API
  - GET: 获取使用量
  - POST: 触发压缩

**验收标准**：
- [ ] 警告显示正确
- [ ] 压缩确认流程完整
- [ ] API 接口可用

---

## Week 10: 回滚机制与失败处理

### Task 3.2.1: 失败类型定义

**目标**：定义失败处理相关的 TypeScript 类型

**任务清单**：
- [ ] 创建 `packages/shared/types/goi/failure.ts`
- [ ] 定义 `FailureType` 枚举（temporary, data, logic, permission, system）
- [ ] 定义 `FailureInfo` 类型（失败详情）
- [ ] 定义 `FailureReport` 类型（用户可读的报告）
- [ ] 定义 `RecoveryOption` 类型（恢复选项）

**类型定义**：
```typescript
type FailureType =
  | 'temporary'   // 临时性：网络超时等
  | 'data'        // 数据性：资源不存在等
  | 'logic'       // 逻辑性：前置条件不满足
  | 'permission'  // 权限性：无权限
  | 'system';     // 系统性：服务崩溃

type FailureInfo = {
  type: FailureType;
  code: string;
  message: string;
  todoItemId: string;
  todoItemTitle: string;
  operation: GoiOperation;
  error: Error;
  timestamp: Date;
  retryable: boolean;
  context?: unknown;
};

type FailureReport = {
  location: {
    todoItem: string;
    phase: string;
    progress: string; // "第3项，共12项"
  };
  reason: {
    summary: string;
    possibleCauses: string[];
  };
  rollback: {
    actions: string[];
    restoredTo: string;
  };
  suggestions: RecoveryOption[];
};

type RecoveryOption = {
  id: string;
  label: string;
  description: string;
  action: 'retry' | 'modify' | 'skip' | 'replan' | 'abort' | 'takeover';
};
```

**验收标准**：
- [ ] 类型定义完整
- [ ] 覆盖所有失败场景

---

### Task 3.2.2: 失败分类器实现

**目标**：实现失败类型的自动分类

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/failure/classifier.ts`
- [ ] 实现 `classify(error)` - 根据错误分类
- [ ] 实现常见错误的模式匹配
- [ ] 实现 `isRetryable(failureInfo)` - 判断是否可重试
- [ ] 实现 `getRetrySuggestion(failureInfo)` - 获取重试建议

**分类规则**：
```typescript
class FailureClassifier {
  classify(error: Error, context: unknown): FailureType {
    // 网络/超时错误
    if (this.isNetworkError(error)) return 'temporary';

    // HTTP 状态码判断
    if (error instanceof HttpError) {
      if (error.status === 404) return 'data';
      if (error.status === 403) return 'permission';
      if (error.status >= 500) return 'system';
    }

    // 业务逻辑错误
    if (error.message.includes('not found')) return 'data';
    if (error.message.includes('permission')) return 'permission';
    if (error.message.includes('precondition')) return 'logic';

    // 默认为系统错误
    return 'system';
  }

  isRetryable(failure: FailureInfo): boolean {
    return failure.type === 'temporary' ||
      (failure.type === 'system' && failure.retryCount < 3);
  }
}
```

**验收标准**：
- [ ] 分类准确率 > 90%
- [ ] 重试判断正确

---

### Task 3.2.3: 回滚执行器实现

**目标**：实现状态回滚逻辑

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/failure/rollback.ts`
- [ ] 实现 `findRollbackTarget(sessionId, todoItemId)` - 找到回滚目标
- [ ] 实现 `executeRollback(snapshotId)` - 执行回滚
- [ ] 实现 `rollbackResources(resourceState)` - 回滚资源变更
  - 撤销创建：删除已创建的资源
  - 恢复修改：将资源恢复到修改前状态
  - 恢复删除：取消软删除
- [ ] 发布回滚事件
- [ ] 记录回滚日志

**回滚逻辑**：
```typescript
class RollbackExecutor {
  async executeRollback(snapshotId: string): Promise<RollbackResult> {
    const snapshot = await snapshotStore.getById(snapshotId);

    // 1. 回滚资源变更
    const resourceResult = await this.rollbackResources(snapshot.resourceState);

    // 2. 恢复 TODO 状态
    await this.restoreTodoState(snapshot.todoState);

    // 3. 发布事件
    await eventBus.publish({
      type: 'ROLLBACK_EXECUTED',
      payload: { snapshotId, resourceResult },
    });

    return {
      success: true,
      rollbackActions: resourceResult.actions,
      restoredTo: snapshot.createdAt,
    };
  }

  private async rollbackResources(resourceState: ResourceState) {
    const actions: string[] = [];

    // 撤销创建
    for (const resourceId of resourceState.createdResources) {
      await this.deleteResource(resourceId);
      actions.push(`撤销创建: ${resourceId}`);
    }

    // 恢复修改
    for (const [resourceId, changes] of Object.entries(resourceState.modifiedResources)) {
      await this.restoreResource(resourceId, changes.before);
      actions.push(`恢复修改: ${resourceId}`);
    }

    // 恢复删除（软删除场景）
    for (const deleted of resourceState.deletedResources) {
      await this.restoreDeletedResource(deleted.id);
      actions.push(`恢复删除: ${deleted.id}`);
    }

    return { actions };
  }
}
```

**验收标准**：
- [ ] 回滚成功率 > 95%
- [ ] 资源状态正确恢复
- [ ] 事件和日志完整

---

### Task 3.2.4: 失败报告生成器

**目标**：生成用户可读的失败报告

**任务清单**：
- [ ] 创建 `apps/web/src/lib/goi/failure/reporter.ts`
- [ ] 实现 `generateReport(failureInfo, rollbackResult)` - 生成报告
- [ ] 实现 `analyzePossibleCauses(failureInfo)` - 分析可能原因
- [ ] 实现 `suggestRecoveryOptions(failureInfo)` - 建议恢复选项
- [ ] 支持多语言（中英文）

**报告生成**：
```typescript
class FailureReporter {
  generateReport(failure: FailureInfo, rollback: RollbackResult): FailureReport {
    return {
      location: {
        todoItem: failure.todoItemTitle,
        phase: this.getPhase(failure),
        progress: this.getProgress(failure),
      },
      reason: {
        summary: this.getSummary(failure),
        possibleCauses: this.analyzePossibleCauses(failure),
      },
      rollback: {
        actions: rollback.rollbackActions,
        restoredTo: `恢复到"${this.getCheckpointName(rollback)}"完成后`,
      },
      suggestions: this.suggestRecoveryOptions(failure),
    };
  }

  private suggestRecoveryOptions(failure: FailureInfo): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    if (failure.retryable) {
      options.push({
        id: 'retry',
        label: '重新尝试',
        description: '使用相同参数重新执行',
        action: 'retry',
      });
    }

    options.push({
      id: 'modify',
      label: '修改参数',
      description: '修改操作参数后重试',
      action: 'modify',
    });

    options.push({
      id: 'takeover',
      label: '手动完成',
      description: '我来手动完成此步骤',
      action: 'takeover',
    });

    options.push({
      id: 'skip',
      label: '跳过此步',
      description: '跳过并继续后续任务',
      action: 'skip',
    });

    options.push({
      id: 'abort',
      label: '放弃任务',
      description: '取消整个任务',
      action: 'abort',
    });

    return options;
  }
}
```

**验收标准**：
- [ ] 报告内容清晰
- [ ] 原因分析合理
- [ ] 选项完整

---

### Task 3.2.5: 失败恢复 UI 和 API

**目标**：实现失败处理的 UI 和接口

**任务清单**：
- [ ] 创建 `apps/web/src/components/goi/FailureRecovery.tsx`
  - 显示失败报告
  - 显示恢复选项按钮
  - 处理用户选择
- [ ] 创建 `apps/web/src/app/api/goi/failure/report/route.ts`
  - 获取失败报告
- [ ] 创建 `apps/web/src/app/api/goi/failure/recover/route.ts`
  - 执行恢复操作
- [ ] 集成到 Agent Loop 的失败处理流程

**验收标准**：
- [ ] UI 显示正确
- [ ] 恢复操作正常执行
- [ ] 与 Agent Loop 集成

---

## 阶段验收

### M4 里程碑验收标准

**功能验收**：
- [ ] 上下文使用量可准确监控
- [ ] 压缩可自动触发，不丢失关键信息
- [ ] 失败可正确分类
- [ ] 回滚可恢复到安全状态
- [ ] 用户收到清晰的失败报告和选项

**场景测试**：
- [ ] 场景 1：上下文达到 85% 时自动压缩，压缩后继续执行
- [ ] 场景 2：资源不存在时正确分类为数据性失败
- [ ] 场景 3：失败后回滚，资源状态正确恢复
- [ ] 场景 4：用户选择重试后成功完成
- [ ] 场景 5：用户选择手动完成后控制权正确转移

**性能验收**：
- [ ] Token 计数准确率 > 95%
- [ ] 标准压缩后可继续执行成功率 > 90%
- [ ] 回滚成功率 > 95%
- [ ] 失败报告生成 < 2s

---

## 开发日志

<!-- 在此记录每日开发进度 -->

### YYYY-MM-DD
- 完成任务：
- 遇到问题：
- 解决方案：
- 下一步计划：
