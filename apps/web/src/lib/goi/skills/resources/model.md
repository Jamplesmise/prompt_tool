---
name: model
description: 模型和供应商配置
triggers:
  - 模型
  - model
  - 供应商
  - provider
  - API
dependencies:
  - core
---

# 模型资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| provider | 模型供应商 | /models |
| model | 模型配置 | /models |

**注意**：两者共用 `/models` 页面，但弹窗不同。

## 支持的操作

- **provider**: create, edit, delete, view（**不支持 test**）
- **model**: create, edit, delete, view, **test**

## 字段说明

### provider（模型供应商）
- `name`: 供应商名称（必填）
- `type`: 类型枚举（必填）
- `baseUrl`: API 地址（必填）
- `apiKey`: API 密钥（必填）
- `headers`: 自定义请求头（可选）
- `isActive`: 是否启用

**type 枚举**：`OPENAI`, `ANTHROPIC`, `AZURE`, `CUSTOM`（必须大写）

**注意**：provider **没有 description 字段**。

### model（模型）
- `name`: 模型名称（必填）
- `providerId`: 供应商 ID（必填）
- `modelId`: 模型标识符，如 `gpt-4`（必填）
- `description`: 描述（可选）
- `isActive`: 是否启用
- `maxTokens`: 最大 Token 数
- `temperature`: 温度参数

## 示例

### 创建供应商

```json
{
  "id": "1",
  "title": "创建 OpenAI 供应商",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "provider" },
    "action": "create",
    "expectedState": {
      "name": "OpenAI",
      "type": "OPENAI",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "",
      "isActive": true
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": true, "type": "confirmation", "message": "请填写 API Key" }
}
```

### 获取可用模型

```json
{
  "id": "1",
  "title": "获取已启用的模型",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "model",
      "filters": { "isActive": true },
      "fields": ["id", "name", "modelId"]
    }]
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```

### 测试模型连通性

```json
{
  "id": "1",
  "title": "测试模型连接",
  "category": "access",
  "goiOperation": {
    "type": "access",
    "target": { "resourceType": "model", "resourceId": "xxx" },
    "action": "test"
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
