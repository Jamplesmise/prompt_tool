---
name: schema
description: Schema 结构定义
triggers:
  - schema
  - 结构
  - 字段
  - 输入结构
  - 输出结构
dependencies:
  - core
---

# Schema 资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| input_schema | 输入 Schema | /schemas |
| output_schema | 输出 Schema | /schemas |

## 支持的操作

- **input_schema**: create, edit, delete, view
- **output_schema**: create, edit, delete, view

## 字段说明

### Schema 通用字段
- `name`: Schema 名称（必填）
- `description`: 描述（可选）
- `fields`: 字段定义数组

### 字段定义
```typescript
{
  name: string       // 字段名
  type: string       // 类型: string, number, boolean, array, object
  required: boolean  // 是否必填
  description: string // 字段描述
}
```

## 示例

### 创建输入 Schema

```json
{
  "id": "1",
  "title": "创建情感分析输入 Schema",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "input_schema" },
    "action": "create",
    "expectedState": {
      "name": "情感分析输入",
      "description": "用于情感分析任务的输入结构",
      "fields": [
        { "name": "text", "type": "string", "required": true, "description": "待分析文本" },
        { "name": "language", "type": "string", "required": false, "description": "语言" }
      ]
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```

### 创建输出 Schema

```json
{
  "id": "1",
  "title": "创建情感分析输出 Schema",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "output_schema" },
    "action": "create",
    "expectedState": {
      "name": "情感分析输出",
      "description": "情感分析结果结构",
      "fields": [
        { "name": "sentiment", "type": "string", "required": true, "description": "情感类型" },
        { "name": "confidence", "type": "number", "required": true, "description": "置信度" }
      ]
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
