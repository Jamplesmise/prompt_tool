---
name: dataset
description: 数据集资源操作
triggers:
  - 数据集
  - dataset
  - 测试数据
  - 样本
dependencies:
  - core
---

# 数据集资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| dataset | 数据集 | /datasets |
| dataset_version | 数据集版本 | /datasets/{id} |

## 支持的操作

- **dataset**: create, edit, delete, view, upload
- **dataset_version**: create, view, rollback

## 字段说明

### dataset
- `name`: 数据集名称（必填）
- `description`: 描述（可选）
- `rowCount`: 数据行数（只读）

### dataset_version
- `versionNumber`: 版本号
- `description`: 版本描述

## 示例

### 查找数据集

```json
{
  "id": "1",
  "title": "查找测试数据集",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "dataset",
      "filters": { "name": { "contains": "测试" } },
      "fields": ["id", "name", "rowCount"]
    }]
  },
  "dependsOn": [],
  "checkpoint": { "required": true, "type": "review", "message": "找到以下数据集，请确认使用哪个" }
}
```

### 上传数据集

```json
{
  "id": "1",
  "title": "打开上传数据集弹窗",
  "category": "access",
  "goiOperation": {
    "type": "access",
    "target": { "resourceType": "dataset" },
    "action": "create"
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
