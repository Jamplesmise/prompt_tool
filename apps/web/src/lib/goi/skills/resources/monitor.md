---
name: monitor
description: 监控告警相关资源
triggers:
  - 监控
  - 告警
  - 定时
  - 通知
  - 调度
  - cron
dependencies:
  - core
---

# 监控资源

## 资源类型

| 类型 | 说明 | 页面 |
|------|------|------|
| scheduled_task | 定时任务 | /scheduled |
| alert_rule | 告警规则 | /monitor/alerts |
| notify_channel | 通知渠道 | /monitor/alerts |

## 支持的操作

- **scheduled_task**: create, edit, delete, view, toggle
- **alert_rule**: create, edit, delete, view, toggle
- **notify_channel**: create, edit, delete, view, **test**

## 字段说明

### scheduled_task（定时任务）
- `name`: 任务名称（必填）
- `taskId`: 关联的测试任务 ID（必填）
- `cronExpression`: Cron 表达式（必填）
- `isActive`: 是否启用

**常用 Cron 表达式**：
- `0 9 * * *`: 每天 9 点
- `0 0 * * 1`: 每周一凌晨
- `0 */6 * * *`: 每 6 小时

### alert_rule（告警规则）
- `name`: 规则名称（必填）
- `taskId`: 关联的任务 ID
- `condition`: 触发条件
- `severity`: 严重程度

**severity 枚举**：`INFO`, `WARNING`, `ERROR`, `CRITICAL`

### notify_channel（通知渠道）
- `name`: 渠道名称（必填）
- `type`: 类型枚举（必填）
- `config`: 配置对象

**type 枚举**：`EMAIL`, `WEBHOOK`, `SLACK`, `DINGTALK`

## 示例

### 创建定时任务

```json
{
  "id": "1",
  "title": "创建每日定时测试",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "scheduled_task" },
    "action": "create",
    "expectedState": {
      "name": "每日情感分析测试",
      "taskId": "$prev.result.resourceId",
      "cronExpression": "0 9 * * *",
      "isActive": true
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": true, "type": "confirmation" }
}
```

### 创建 Webhook 通知

```json
{
  "id": "1",
  "title": "创建 Webhook 通知渠道",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "notify_channel" },
    "action": "create",
    "expectedState": {
      "name": "告警 Webhook",
      "type": "WEBHOOK",
      "config": {
        "url": "https://example.com/webhook"
      }
    }
  },
  "dependsOn": [],
  "checkpoint": { "required": true, "type": "confirmation", "message": "请确认 Webhook URL" }
}
```

### 测试通知渠道

```json
{
  "id": "1",
  "title": "测试通知渠道",
  "category": "access",
  "goiOperation": {
    "type": "access",
    "target": { "resourceType": "notify_channel", "resourceId": "xxx" },
    "action": "test"
  },
  "dependsOn": [],
  "checkpoint": { "required": false }
}
```
