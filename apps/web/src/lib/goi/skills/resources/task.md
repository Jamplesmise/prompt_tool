---
name: task
description: 测试任务操作
triggers:
  - 任务
  - task
  - 测试
  - 执行
  - 运行
dependencies:
  - core
  - prompt
  - dataset
---

# 测试任务资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| task | 测试任务 | /tasks |
| task_result | 任务结果 | /tasks/{id}/results |

## 支持的操作

- **task**: create, view, pause, resume, stop
- **task_result**: view, export

## 字段说明

### task
- `name`: 任务名称（必填）
- `promptId`: 提示词 ID（必填）
- `datasetId`: 数据集 ID（必填）
- `modelIds`: 模型 ID 列表（必填）
- `evaluatorIds`: 评估器 ID 列表（可选）
- `status`: 状态（只读）

**status 枚举**：`DRAFT`, `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `PAUSED`

## 示例

### 创建测试任务（引用前序步骤）

```json
{
  "id": "4",
  "title": "创建测试任务",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "task" },
    "action": "create",
    "expectedState": {
      "name": "情感分析测试",
      "promptId": "$1.result.resourceId",
      "datasetId": "$2.result.results[0].id",
      "modelIds": ["$3.result.results[0].id"]
    }
  },
  "dependsOn": ["1", "2", "3"],
  "checkpoint": { "required": true, "type": "confirmation", "message": "确认创建此测试任务？" }
}
```

### 查询任务状态

```json
{
  "id": "1",
  "title": "查看任务状态",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "task",
      "resourceId": "$prev.result.resourceId",
      "fields": ["id", "name", "status", "progress", "totalItems", "completedItems"]
    }]
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```

## 多步骤示例

用户输入："用情感分析提示词测试数据集"

```json
{
  "goalAnalysis": "用户希望使用现有提示词和数据集创建测试任务",
  "items": [
    {
      "id": "1",
      "title": "查找情感分析提示词",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{ "resourceType": "prompt", "filters": { "name": { "contains": "情感" } }, "fields": ["id", "name"] }]
      },
      "dependsOn": [],
      "checkpoint": { "required": true, "type": "review" }
    },
    {
      "id": "2",
      "title": "查找数据集",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{ "resourceType": "dataset", "fields": ["id", "name", "rowCount"] }]
      },
      "dependsOn": [],
      "checkpoint": { "required": true, "type": "review" }
    },
    {
      "id": "3",
      "title": "获取可用模型",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{ "resourceType": "model", "filters": { "isActive": true }, "fields": ["id", "name"] }]
      },
      "dependsOn": [],
      "checkpoint": { "required": false }
    },
    {
      "id": "4",
      "title": "创建测试任务",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "task" },
        "action": "create",
        "expectedState": {
          "name": "情感分析测试",
          "promptId": "$1.result.results[0].id",
          "datasetId": "$2.result.results[0].id",
          "modelIds": ["$3.result.results[0].id"]
        }
      },
      "dependsOn": ["1", "2", "3"],
      "checkpoint": { "required": true, "type": "confirmation" }
    }
  ]
}
```
