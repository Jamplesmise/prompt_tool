# Phase 2: P1 高优先级修复 - 上下文

> 前置依赖：Phase 1 完成
> 状态：🚧 待开始

---

## 一、阶段概述

本阶段修复 4 个 P1 高优先级问题：

1. **超大组件难维护** - settings/page.tsx 806 行
2. **输入验证不完善** - API 路由缺乏边界检查
3. **加密密钥硬编码** - 开发环境使用固定密钥
4. **会话安全配置** - Cookie 安全性不够严格

---

## 二、问题详情

### 2.1 超大组件难维护

**位置**: `apps/web/src/app/(dashboard)/settings/page.tsx`

**现状**:
- 806 行单文件
- 40+ useState
- 多个业务逻辑混杂（用户、团队、Token、通知）

**风险**:
- 难以维护和理解
- 难以测试
- 重渲染性能差

**修复方案**:
```
settings/
├── page.tsx                    # 主布局，< 100 行
├── components/
│   ├── UserSettings.tsx        # 用户设置
│   ├── TeamSettings.tsx        # 团队设置
│   ├── TokenManagement.tsx     # Token 管理
│   ├── NotificationSettings.tsx # 通知设置
│   └── MemberManagement.tsx    # 成员管理
└── hooks/
    ├── useUserSettings.ts
    ├── useTeamSettings.ts
    └── useTokens.ts
```

---

### 2.2 输入验证不完善

**位置**: 多个 API 路由

**问题 1 - 搜索关键词无长度限制**:
```typescript
// apps/web/src/app/api/v1/prompts/route.ts:31
if (keyword) {
  conditions.push({ name: { contains: keyword } })
}
// ❌ keyword 可以是任意长度
```

**问题 2 - 分页参数无边界验证**:
```typescript
const page = parseInt(searchParams.get('page') || '1', 10)
const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
// ❌ 可能为 0、负数、超大数
```

**修复方案**:
```typescript
// 创建通用验证工具
// lib/validation.ts
export function validatePagination(page: number, pageSize: number) {
  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), 100),
  }
}

export function validateSearchKeyword(keyword: string, maxLength = 100) {
  if (keyword.length > maxLength) {
    throw new ValidationError(`搜索词最多 ${maxLength} 个字符`)
  }
  return keyword.trim()
}
```

---

### 2.3 加密密钥硬编码

**位置**: `apps/web/src/lib/encryption.ts`

**问题代码**:
```typescript
if (process.env.NODE_ENV === 'development') {
  return crypto.scryptSync('dev-secret-key', 'salt', KEY_LENGTH)
  // ❌ 硬编码密钥 + 固定 salt
}
```

**风险**:
- 开发环境数据不安全
- Salt 固定降低加密强度

**修复方案**:
```typescript
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }

  // 使用环境变量中的 salt，或生成随机 salt
  const salt = process.env.ENCRYPTION_SALT || crypto.randomBytes(16)
  return crypto.scryptSync(key, salt, KEY_LENGTH)
}
```

**环境变量更新**:
```bash
# .env.example
ENCRYPTION_KEY="your-32-character-secret-key-here"
ENCRYPTION_SALT="your-16-character-salt"
```

---

### 2.4 会话安全配置

**位置**: `apps/web/src/lib/auth.ts`

**问题代码**:
```typescript
cookieStore.set(SESSION_COOKIE_NAME, `${userId}:${token}`, {
  sameSite: 'lax',  // ⚠️ 应该用 'strict'
})
// ⚠️ Cookie 格式暴露 userId
```

**修复方案**:
```typescript
cookieStore.set(SESSION_COOKIE_NAME, token, {  // 只存 token
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',  // 改为 strict
  maxAge: SESSION_MAX_AGE,
  path: '/',
})
```

---

## 三、技术方案

### 3.1 组件拆分策略

**原则**:
- 每个组件 < 200 行
- 单一职责
- 状态提升到 hooks

**步骤**:
1. 提取各业务模块为独立组件
2. 提取共享逻辑为自定义 hooks
3. 主页面只负责布局和路由

### 3.2 输入验证中间件

创建统一的验证层：

```typescript
// lib/validation.ts
export const validators = {
  pagination: (params: URLSearchParams) => ({
    page: Math.max(1, parseInt(params.get('page') || '1')),
    pageSize: Math.min(100, Math.max(1, parseInt(params.get('pageSize') || '20'))),
  }),

  keyword: (value: string | null, maxLength = 100) => {
    if (!value) return undefined
    if (value.length > maxLength) {
      throw new ValidationError(`搜索词最多 ${maxLength} 个字符`)
    }
    return value.trim()
  },
}
```

---

## 四、验收标准

- [ ] settings/page.tsx 拆分为 < 100 行
- [ ] 所有 API 路由添加输入验证
- [ ] 移除硬编码的加密密钥
- [ ] Cookie sameSite 改为 strict
- [ ] 新增验证工具单元测试
