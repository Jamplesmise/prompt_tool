---
name: prompt
description: 提示词资源操作
triggers:
  - 提示词
  - prompt
  - 系统提示
dependencies:
  - core
---

# 提示词资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| prompt | 提示词 | /prompts |
| prompt_version | 提示词版本 | /prompts/{id} |
| prompt_branch | 提示词分支 | /prompts/{id} |

## 支持的操作

- **prompt**: create, edit, delete, view
- **prompt_version**: create, view
- **prompt_branch**: create, edit, delete, view, merge

## 字段说明

### prompt
- `name`: 提示词名称（必填）
- `content`: 提示词内容（必填）
- `description`: 描述（可选）

变量占位符使用 `{{变量名}}` 格式。

## 示例

### 创建提示词

```json
{
  "id": "1",
  "title": "创建情感分析提示词",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "prompt" },
    "action": "create",
    "expectedState": {
      "name": "情感分析提示词",
      "content": "分析以下文本的情感倾向：\n\n{{input}}",
      "description": "用于识别文本情感"
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```

### 打开创建弹窗（目标模糊时）

```json
{
  "id": "1",
  "title": "打开创建提示词弹窗",
  "category": "access",
  "goiOperation": {
    "type": "access",
    "target": { "resourceType": "prompt" },
    "action": "create"
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
