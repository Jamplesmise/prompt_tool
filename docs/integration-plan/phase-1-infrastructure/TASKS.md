# Phase 1: 基础设施 - 任务清单

## 任务列表

### 1.1 安装依赖

- [x] 安装 mongoose（已在项目中安装 v9.0.1）
  ```bash
  cd apps/web && pnpm add mongoose
  ```

### 1.2 创建 MongoDB 连接模块

- [x] 创建 `apps/web/src/lib/mongodb/connection.ts`

```typescript
/**
 * MongoDB 连接管理
 * 参考: dev-admin/src/packages/service/common/mongo/index.ts
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('请在环境变量中配置 MONGODB_URI');
}

// 全局缓存，避免开发模式热重载时重复连接
declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('[MongoDB] 连接成功');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export { mongoose };
```

### 1.3 创建认证适配中间件

- [x] 创建 `apps/web/src/lib/mongodb/middleware.ts`（适配本项目的 Session 认证）

```typescript
/**
 * MongoDB API 认证适配中间件
 * 复用本项目的 Session 认证
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectMongo } from './connection';

export type AuthContext = {
  userId: string;
  teamId: string;
  tmbId: string;
  isOwner: boolean;
};

/**
 * 获取认证上下文
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  // 确保 MongoDB 已连接
  await connectMongo();

  return {
    userId: session.user.id,
    teamId: session.user.currentTeamId || '',
    tmbId: session.user.currentMemberId || '',
    isOwner: session.user.isTeamOwner || false,
  };
}

/**
 * 认证守卫 - 未登录返回 401
 */
export async function requireAuth(): Promise<AuthContext> {
  const context = await getAuthContext();

  if (!context) {
    throw new AuthError('未登录或登录已过期', 401);
  }

  if (!context.teamId) {
    throw new AuthError('请先选择团队', 400);
  }

  return context;
}

/**
 * 认证错误类
 */
export class AuthError extends Error {
  code: number;

  constructor(message: string, code: number = 401) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

/**
 * API 响应辅助函数
 */
export function jsonResponse<T>(data: T, code: number = 200, message: string = 'success') {
  return Response.json({ code, message, data }, { status: code >= 400 ? code : 200 });
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return jsonResponse(null, error.code, error.message);
  }

  console.error('[API Error]', error);
  const message = error instanceof Error ? error.message : '服务器内部错误';
  return jsonResponse(null, 500, message);
}
```

### 1.4 创建模块入口

- [x] 创建 `apps/web/src/lib/mongodb/index.ts`

```typescript
/**
 * MongoDB 模块入口
 */
export { connectMongo, mongoose } from './connection';
export {
  getAuthContext,
  requireAuth,
  AuthError,
  jsonResponse,
  errorResponse,
  type AuthContext,
} from './middleware';

// Schema 将在后续 Phase 添加
// export * from './schemas';
```

### 1.5 创建 Schema 目录结构

- [x] 创建 `apps/web/src/lib/mongodb/schemas/index.ts`

```typescript
/**
 * MongoDB Schemas 导出入口
 * 后续 Phase 会逐步添加
 */

// Phase 2: 成员分组
// export * from './memberGroup';
// export * from './groupMember';

// Phase 3: 组织架构
// export * from './org';
// export * from './orgMember';

// Phase 4: 协作者权限
// export * from './resourcePermission';
```

### 1.6 更新环境变量模板

- [x] 更新 `apps/web/.env.example`

```bash
# 新增 MongoDB 配置
MONGODB_URI="mongodb://localhost:27017/prompt_tool?authSource=admin"
```

### 1.7 创建连接测试 API

- [x] 创建 `apps/web/src/app/api/health/mongodb/route.ts`

```typescript
/**
 * MongoDB 连接健康检查
 */
import { connectMongo } from '@/lib/mongodb';
import { jsonResponse, errorResponse } from '@/lib/mongodb';

export async function GET() {
  try {
    const mongoose = await connectMongo();

    const status = mongoose.connection.readyState;
    const statusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return jsonResponse({
      status: statusMap[status] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
```

### 1.8 验证测试

- [x] TypeScript 编译通过
- [ ] 启动开发服务器
- [ ] 访问 `/api/health/mongodb` 验证连接
- [ ] 检查控制台无重复连接日志
- [ ] 热重载后验证连接复用

### 1.9 额外工作

- [x] 将旧的 `mongodb.ts` 重命名为 `mongodbCompat.ts`，作为兼容层
- [x] 更新所有引用旧文件的地方（fastgptModelService.ts 等）

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 1.1-1.9 全部完成 | 复用 FASTGPT_MONGODB_URI 环境变量，创建兼容层保持向后兼容 |
