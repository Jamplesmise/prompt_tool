# Phase 1: 基础设施

## 目标

为 MongoDB 集成建立基础设施，包括连接管理、Schema 基类、认证适配中间件。

## 前置条件

- 本项目已有完整的用户认证系统 (PostgreSQL + Prisma)
- Redis 已配置用于 Session 和队列
- 环境变量管理机制已就绪

## 技术背景

### 为什么需要 MongoDB

dev-admin 项目使用 MongoDB 存储 FastGPT 相关的业务数据（分组、组织、协作者权限等）。为保持与 FastGPT 官方数据结构兼容，我们选择双数据库共存方案：

- **PostgreSQL**：本项目核心数据（User, Team, Prompt, Task 等）
- **MongoDB**：FastGPT 扩展数据（Group, Org, ResourcePermission 等）

### 连接管理策略

Next.js 在开发模式下会频繁热重载，需要避免重复创建连接：

```typescript
// 全局缓存连接实例
declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}
```

### ID 关联策略

MongoDB 文档通过字符串存储 PostgreSQL 的 UUID：

```typescript
// MongoDB Schema
{
  teamId: String,  // PostgreSQL Team.id (UUID)
  tmbId: String,   // PostgreSQL TeamMember.id (UUID)
}
```

## 架构设计

```
apps/web/src/lib/mongodb/
├── index.ts              # 连接管理 + 导出
├── connection.ts         # MongoDB 连接逻辑
├── middleware.ts         # API 认证适配中间件
└── schemas/
    └── index.ts          # Schema 导出入口
```

## 关键依赖

```json
{
  "mongoose": "^9.0.0"
}
```

## 环境变量

```bash
# MongoDB 连接字符串
MONGODB_URI="mongodb://username:password@host:port/database?authSource=admin"
```

## 参考实现

dev-admin 的 MongoDB 连接：
- `/home/sinocare/dev/dev-admin/src/packages/service/common/mongo/index.ts`

## 验收标准

1. MongoDB 连接成功建立
2. 开发模式热重载不会创建多余连接
3. 认证中间件能正确获取当前用户的 userId/teamId/tmbId
4. 环境变量缺失时有明确错误提示
