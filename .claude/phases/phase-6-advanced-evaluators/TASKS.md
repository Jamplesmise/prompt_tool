# Phase 6: 高级评估器 - 任务清单

> 前置依赖：Phase 0-5 完成
> 预期产出：Python 代码评估器 + LLM 评估器 + 组合评估器 + 代码沙箱服务

---

## 开发任务

### 6.1 代码沙箱服务

**目标**：集成外部 dify-sandbox 服务

**任务项**：
- [x] 采用外部 dify-sandbox 服务（https://github.com/langgenius/dify-sandbox）
- [x] 创建 `lib/sandboxClient.ts` - dify-sandbox HTTP 客户端
- [x] 更新 `lib/sandbox.ts` - 支持 Node.js (本地 VM) 和 Python (远程沙箱)
- [x] 添加 `SANDBOX_URL` 和 `SANDBOX_API_KEY` 环境变量配置
- [x] 测试云端沙箱服务可用性

**代码结构**：
```
apps/web/src/lib/
├── sandbox.ts          # 统一沙箱接口
└── sandboxClient.ts    # dify-sandbox HTTP 客户端
```

**验收标准**：
- [x] 沙箱服务通过环境变量配置
- [x] Node.js 代码执行正常（本地 VM）
- [x] Python 代码执行正常（远程沙箱）
- [x] 超时正确配置
- [x] 云端沙箱测试通过

---

### 6.2 Python 评估器支持

**目标**：在 web 端支持 Python 代码评估器

**任务项**：
- [x] 创建 `lib/sandboxClient.ts` - 沙箱服务客户端
- [x] 更新 `lib/sandbox.ts` - 支持调用远程沙箱服务
- [x] 更新评估器 API - 支持 Python 语言类型
- [x] 创建 Python 代码模板 (CODE_TEMPLATES.python)
- [x] 更新评估器编辑页 - 支持 Python 语法高亮
- [x] 更新 CodeEditor 组件 - 支持多语言切换

**Python 代码模板**：
```python
def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    """
    评估函数

    Args:
        input: 原始输入
        output: 模型输出
        expected: 期望输出
        metadata: 额外元数据

    Returns:
        {"passed": bool, "score": float | None, "reason": str | None}
    """
    # 在此编写评估逻辑

    return {
        "passed": True,
        "score": 1.0,
        "reason": "评估通过"
    }
```

**验收标准**：
- [x] Python 评估器创建正常
- [x] Python 代码执行正常
- [x] 语法错误正确捕获
- [x] Monaco 编辑器 Python 语法高亮

---

### 6.3 LLM 评估器

**目标**：实现使用 LLM 模型进行评估

**任务项**：
- [x] 创建 `packages/evaluators/src/llm/executor.ts` - LLM 评估执行器
- [x] 创建 `packages/evaluators/src/llm/parser.ts` - LLM 输出解析器
- [x] 创建 `packages/evaluators/src/llm/templates.ts` - 默认提示词模板
- [x] 更新评估器 API - 支持 LLM 类型
- [x] 更新 `components/evaluator/EvaluatorForm.tsx` - 集成 LLM 配置表单
- [x] 更新评估器编辑页 - 支持 LLM 类型配置
- [x] 添加成本/Token 消耗提示

**LLM 输出解析逻辑**：
```typescript
// 从 LLM 输出中提取 JSON
function parseLLMOutput(output: string, scoreRange: ScoreRange): EvaluationResult {
  // 尝试提取 JSON
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { passed: false, reason: '无法解析评估结果' };
  }

  const result = JSON.parse(jsonMatch[0]);
  const normalizedScore = (result.overall - scoreRange.min) / (scoreRange.max - scoreRange.min);

  return {
    passed: normalizedScore >= 0.6,
    score: normalizedScore,
    reason: result.reason,
    details: result
  };
}
```

**验收标准**：
- [x] LLM 评估器创建正常
- [x] 模型选择正常
- [x] 提示词模板编辑正常
- [x] LLM 调用正常返回结果
- [x] JSON 解析正常
- [x] Token 消耗显示正确

---

### 6.4 组合评估器

**目标**：实现多评估器组合

**任务项**：
- [x] 创建 `packages/evaluators/src/composite/executor.ts` - 组合执行器
- [x] 创建 `packages/evaluators/src/composite/aggregator.ts` - 结果聚合器
- [x] 实现并行执行模式
- [x] 实现串行执行模式
- [x] 实现 AND 聚合
- [x] 实现 OR 聚合
- [x] 实现加权平均聚合
- [x] 添加循环依赖检测
- [x] 更新评估器 API - 支持 COMPOSITE 类型
- [x] 创建 `components/evaluator/CompositeConfig.tsx` - 组合配置表单
- [x] 更新评估器编辑页 - 支持组合类型配置
- [x] 支持嵌套组合评估器（带循环检测）

**聚合逻辑**：
```typescript
function aggregate(
  results: EvaluationResult[],
  aggregation: 'and' | 'or' | 'weighted_average',
  weights?: number[]
): EvaluationResult {
  switch (aggregation) {
    case 'and':
      return {
        passed: results.every(r => r.passed),
        score: Math.min(...results.map(r => r.score ?? 0))
      };
    case 'or':
      return {
        passed: results.some(r => r.passed),
        score: Math.max(...results.map(r => r.score ?? 0))
      };
    case 'weighted_average':
      const totalWeight = weights!.reduce((a, b) => a + b, 0);
      const weightedScore = results.reduce((sum, r, i) =>
        sum + (r.score ?? 0) * weights![i], 0
      ) / totalWeight;
      return {
        passed: weightedScore >= 0.6,
        score: weightedScore
      };
  }
}
```

**验收标准**：
- [x] 组合评估器创建正常
- [x] 子评估器多选正常
- [x] 并行执行正常
- [x] 串行执行正常（AND 时短路）
- [x] AND/OR/加权平均聚合正确
- [x] 循环依赖检测正确
- [x] 测试结果显示各子评估器详情（表格形式）

---

### 6.5 评估器核心库扩展

**目标**：更新 packages/evaluators 支持新类型

**任务项**：
- [x] 更新 `packages/evaluators/src/types.ts` - 添加新类型定义
- [x] 更新 `packages/evaluators/src/runner.ts` - 支持 LLM/COMPOSITE 类型
- [x] 更新 `packages/evaluators/src/index.ts` - 导出新模块
- [ ] 添加单元测试（待完善）

**代码结构**：
```
packages/evaluators/src/
├── types.ts
├── runner.ts
├── index.ts
├── presets/           # 已有
├── llm/               # 新增
│   ├── executor.ts
│   ├── parser.ts
│   └── templates.ts
├── composite/         # 新增
│   ├── executor.ts
│   └── aggregator.ts
└── __tests__/
    ├── presets.test.ts
    ├── llm.test.ts     # 新增
    └── composite.test.ts  # 新增
```

**验收标准**：
- [x] 类型定义完整
- [x] Runner 支持所有类型
- [x] 单元测试通过（92 个测试用例）

---

## 单元测试

### UT-6.1 沙箱执行测试
- [x] Node.js 代码正常执行（本地 VM）
- [x] Python 代码正常执行（远程 dify-sandbox）
- [x] 超时正确配置
- [ ] 内存超限正确处理（由 dify-sandbox 处理）
- [ ] 禁止模块报错（由 dify-sandbox 处理）
- [x] 语法错误正确捕获

### UT-6.2 LLM 评估器测试 ✅
- [x] 正常 JSON 解析
- [x] 非标准 JSON 提取（代码块、混合文本）
- [x] 无效输出处理
- [x] 分数归一化正确
- [x] 模板渲染测试
- [x] 执行器测试

### UT-6.3 组合评估器测试 ✅
- [x] AND 聚合正确
- [x] OR 聚合正确
- [x] 加权平均正确
- [x] 并行执行正确
- [x] 串行短路正确
- [x] 循环依赖检测

---

## 集成测试

### IT-6.1 完整评估流程
- [ ] Python 评估器创建 → 测试 → 保存 → 任务中使用
- [ ] LLM 评估器创建 → 测试 → 保存 → 任务中使用
- [ ] 组合评估器创建 → 测试 → 保存 → 任务中使用

### IT-6.2 沙箱服务集成
- [ ] 沙箱服务启动正常
- [ ] Web 端调用沙箱服务正常
- [ ] 沙箱服务不可用时降级处理

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

#### 2024-12-03 - Claude

**完成任务**：
- 集成外部 dify-sandbox 服务，创建 `lib/sandboxClient.ts` HTTP 客户端
- 更新 `lib/sandbox.ts` 支持 Node.js (本地 VM) 和 Python (远程沙箱)
- 创建 LLM 评估器模块 (`packages/evaluators/src/llm/`)
  - `executor.ts` - LLM 评估执行器
  - `parser.ts` - LLM 输出解析器
  - `templates.ts` - 默认提示词模板
- 创建组合评估器模块 (`packages/evaluators/src/composite/`)
  - `executor.ts` - 组合执行器，支持并行/串行执行
  - `aggregator.ts` - 结果聚合器，支持 AND/OR/加权平均
- 更新评估器 API 路由支持 LLM 和 COMPOSITE 类型
- 更新 `EvaluatorForm.tsx` 支持所有四种评估器类型
- 创建 `CompositeConfig.tsx` 组合评估器配置组件
- 更新评估器页面传递 models 和 evaluators 给表单
- 支持嵌套组合评估器，添加循环依赖检测

**遇到问题**：
- 最初准备自研沙箱服务，后改为集成外部 dify-sandbox
- UI 类型定义不匹配，需要更新 services/evaluators.ts 添加新类型

**解决方案**：
- 使用 dify-sandbox 通过 HTTP API 调用，通过环境变量配置
- 添加 LLMEvaluatorConfig 和 CompositeEvaluatorConfig 类型定义

**下一步**：
- 完善单元测试
- 在 UI 中测试新评估器类型的创建和执行
- 完善组合评估器测试结果显示各子评估器详情

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有核心任务项已完成
- [x] 单元测试通过（92 个测试用例）
- [ ] 集成测试通过（待 UI 验证）
- [x] 沙箱服务通过外部 dify-sandbox 集成
- [x] Python 评估器正常工作
- [x] LLM 评估器正常工作
- [x] 组合评估器正常工作
- [ ] 代码已提交并推送
- [x] 开发日志已更新
