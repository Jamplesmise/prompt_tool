# Phase 6: 高级评估器 - 上下文

> 前置依赖：Phase 0-5 完成
> 本阶段目标：实现 Python 代码评估器、LLM 评估器、组合评估器

---

## 一、阶段概述

本阶段扩展评估器能力，实现文档 `docs/05-evaluator-spec.md` 中规划的 V2 功能：

1. **Python 代码评估器** - 支持 Python 语言编写评估逻辑
2. **LLM 评估器** - 使用 LLM 模型评估输出质量
3. **组合评估器** - 多评估器组合，支持串行/并行执行和多种聚合逻辑
4. **代码沙箱服务** - 独立的 Python 执行环境

---

## 二、功能范围

### 2.1 Python 代码评估器

**功能**：
- 支持 Python 语言编写评估代码
- 提供安全的沙箱执行环境
- 支持常用 Python 库（json, re, math, collections, difflib）

**函数签名**：
```python
def evaluate(input: str, output: str, expected: str | None, metadata: dict) -> dict:
    return {
        "passed": True,
        "score": 1.0,
        "reason": "评估通过"
    }
```

**限制**：
- 执行超时：5 秒
- 内存限制：128 MB
- 禁止网络请求
- 禁止文件系统操作

### 2.2 LLM 评估器

**功能**：
- 使用配置的 LLM 模型评估输出质量
- 支持自定义评估提示词模板
- 自动解析 LLM 输出的 JSON 评分

**配置项**：
```typescript
{
  modelId: string;    // 评估模型 ID
  prompt: string;     // 评估提示词模板
  scoreRange?: {
    min: number;      // 最小分，默认 0
    max: number;      // 最大分，默认 10
  };
}
```

**提示词变量**：
- `{{input}}` - 原始输入
- `{{output}}` - 模型输出
- `{{expected}}` - 期望输出

### 2.3 组合评估器

**功能**：
- 组合多个评估器
- 支持并行/串行执行
- 支持多种聚合方式：AND、OR、加权平均

**配置项**：
```typescript
{
  evaluatorIds: string[];  // 子评估器 ID 列表
  mode: 'parallel' | 'serial';  // 执行模式
  aggregation: 'and' | 'or' | 'weighted_average';  // 聚合方式
  weights?: number[];  // 权重（weighted_average 时使用）
}
```

---

## 三、技术架构

### 3.1 代码沙箱服务

```
apps/sandbox/
├── Dockerfile
├── package.json
├── src/
│   ├── server.ts          # HTTP 服务
│   ├── runners/
│   │   ├── nodejs.ts      # Node.js 执行器
│   │   └── python.ts      # Python 执行器
│   └── security/
│       ├── jail.ts        # 资源限制
│       └── validator.ts   # 代码校验
└── python/
    ├── requirements.txt
    └── runner.py          # Python 执行入口
```

### 3.2 沙箱 API

**POST /execute**

```typescript
// 请求
{
  language: 'nodejs' | 'python';
  code: string;
  input: {
    input: string;
    output: string;
    expected: string | null;
    metadata: object;
  };
  timeout?: number;  // 毫秒，默认 5000
}

// 响应
{
  success: boolean;
  result?: {
    passed: boolean;
    score?: number;
    reason?: string;
  };
  error?: string;
  executionTime: number;
}
```

---

## 四、数据模型扩展

### 4.1 Evaluator 类型扩展

```prisma
enum EvaluatorType {
  PRESET
  CODE
  LLM        // 新增
  COMPOSITE  // 新增
}
```

### 4.2 评估器配置结构

**LLM 评估器配置**：
```typescript
{
  type: 'llm',
  config: {
    modelId: string;
    prompt: string;
    scoreRange: {
      min: number;
      max: number;
    };
    passThreshold: number;  // 归一化分数阈值，默认 0.6
  }
}
```

**组合评估器配置**：
```typescript
{
  type: 'composite',
  config: {
    evaluatorIds: string[];
    mode: 'parallel' | 'serial';
    aggregation: 'and' | 'or' | 'weighted_average';
    weights?: number[];
  }
}
```

---

## 五、页面变更

### 5.1 评估器编辑页增强

- 类型选择增加：LLM、组合
- LLM 类型显示：模型选择、提示词编辑器、评分范围配置
- 组合类型显示：子评估器多选、执行模式、聚合方式、权重配置

### 5.2 评估器测试运行

- 支持 Python 代码测试
- 支持 LLM 评估器测试（显示 token 消耗）
- 支持组合评估器测试（显示各子评估器结果）

---

## 六、依赖关系

### 6.1 外部依赖

- Docker（沙箱服务容器化）
- Python 3.11+（Python 评估器执行）

### 6.2 内部依赖

- Phase 1：模型配置（LLM 评估器需要）
- Phase 3：评估器核心库扩展

---

## 七、风险点

1. **Python 沙箱安全性** - 需要严格的资源隔离
2. **LLM 评估器成本** - 每次评估都调用 LLM，需要成本提示
3. **组合评估器循环依赖** - 需要检测并防止循环引用
4. **沙箱服务可用性** - 需要考虑服务不可用时的降级策略
