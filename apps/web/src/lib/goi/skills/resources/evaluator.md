---
name: evaluator
description: 评估器配置
triggers:
  - 评估器
  - evaluator
  - 评估
  - 打分
dependencies:
  - core
---

# 评估器资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| evaluator | 评估器 | /evaluators |

## 支持的操作

- **evaluator**: create, edit, delete, view

## 字段说明

### evaluator
- `name`: 评估器名称（必填）
- `type`: 类型枚举（必填）
- `description`: 描述（可选）
- `config`: 配置对象

**type 枚举**：
- `PRESET`: 预置评估器（精确匹配、包含检查等）
- `CODE`: 代码评估器（自定义 JavaScript）
- `LLM`: LLM 评估器（使用大模型评判）
- `COMPOSITE`: 组合评估器（多个评估器组合）

## 示例

### 创建代码评估器

```json
{
  "id": "1",
  "title": "创建关键词检查评估器",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "evaluator" },
    "action": "create",
    "expectedState": {
      "name": "关键词检查",
      "type": "CODE",
      "description": "检查输出是否包含指定关键词",
      "config": {
        "code": "return output.includes('关键词') ? { score: 1 } : { score: 0 }"
      }
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```

### 查找评估器

```json
{
  "id": "1",
  "title": "查找可用评估器",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "evaluator",
      "fields": ["id", "name", "type", "description"]
    }]
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
