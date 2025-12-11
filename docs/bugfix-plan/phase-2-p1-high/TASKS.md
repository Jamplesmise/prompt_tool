# Phase 2: P1 高优先级修复 - 任务清单

> 状态：🚧 待开始

---

## 任务列表

### P1-1: 拆分超大组件 (预估 4h)

- [ ] 创建 `settings/components/` 目录
- [ ] 提取 UserSettings 组件
- [ ] 提取 TeamSettings 组件
- [ ] 提取 TokenManagement 组件
- [ ] 提取 NotificationSettings 组件
- [ ] 提取 MemberManagement 组件
- [ ] 创建自定义 hooks
- [ ] 重构主页面为布局组件

**目标**: settings/page.tsx < 100 行

---

### P1-2: 完善输入验证 (预估 2h)

- [ ] 创建 `lib/validation.ts` 验证工具
- [ ] 添加分页参数验证
- [ ] 添加搜索关键词长度限制
- [ ] 应用到 prompts API
- [ ] 应用到 datasets API
- [ ] 应用到 tasks API
- [ ] 应用到 evaluators API
- [ ] 创建验证工具单元测试

**验证规则**:
```typescript
// 分页
page: Math.max(1, page)
pageSize: Math.min(100, Math.max(1, pageSize))

// 搜索
keyword.length <= 100

// ID
UUID 格式验证
```

---

### P1-3: 修复加密密钥硬编码 (预估 1h)

- [ ] 移除开发环境硬编码密钥
- [ ] 使用环境变量配置
- [ ] 更新 `.env.example`
- [ ] 更新 `.env.test`
- [ ] 添加启动时的密钥检查
- [ ] 更新部署文档

**环境变量**:
```bash
ENCRYPTION_KEY="your-32-character-secret-key"
ENCRYPTION_SALT="your-16-char-salt"
```

---

### P1-4: 增强会话安全 (预估 1h)

- [ ] Cookie sameSite 改为 'strict'
- [ ] Cookie 内容只存 token（不含 userId）
- [ ] 添加会话固定攻击防护
- [ ] 更新相关测试

**修改文件**:
- `apps/web/src/lib/auth.ts`

---

## 代码示例

### 验证工具

```typescript
// lib/validation.ts
import { NextResponse } from 'next/server'
import { badRequest } from './api'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const validators = {
  /**
   * 验证并规范化分页参数
   */
  pagination: (params: URLSearchParams) => {
    const page = parseInt(params.get('page') || '1', 10)
    const pageSize = parseInt(params.get('pageSize') || '20', 10)

    return {
      page: Number.isNaN(page) ? 1 : Math.max(1, page),
      pageSize: Number.isNaN(pageSize) ? 20 : Math.min(100, Math.max(1, pageSize)),
    }
  },

  /**
   * 验证搜索关键词
   */
  keyword: (value: string | null, maxLength = 100): string | undefined => {
    if (!value) return undefined
    const trimmed = value.trim()
    if (trimmed.length > maxLength) {
      throw new ValidationError(`搜索词最多 ${maxLength} 个字符`)
    }
    return trimmed || undefined
  },

  /**
   * 验证 UUID 格式
   */
  uuid: (value: string | null, fieldName = 'ID'): string => {
    if (!value) {
      throw new ValidationError(`${fieldName} 不能为空`)
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new ValidationError(`${fieldName} 格式无效`)
    }
    return value
  },
}

/**
 * 验证错误处理包装器
 */
export function withValidation<T>(
  fn: () => T
): T | NextResponse {
  try {
    return fn()
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(badRequest(err.message), { status: 400 })
    }
    throw err
  }
}
```

### 使用示例

```typescript
// prompts/route.ts
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams

    // 使用验证工具
    const { page, pageSize } = validators.pagination(params)
    const keyword = validators.keyword(params.get('keyword'))

    // 继续业务逻辑...
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(badRequest(err.message), { status: 400 })
    }
    // ...
  }
}
```

---

## 验证命令

```bash
# 运行验证工具测试
pnpm test src/__tests__/unit/validation.test.ts

# 检查组件行数
wc -l apps/web/src/app/\(dashboard\)/settings/page.tsx
# 目标: < 100 行

# 测试分页边界
curl "http://localhost:3000/api/v1/prompts?page=-1&pageSize=10000"
# 应该返回 page=1, pageSize=100
```

---

## 开发日志

| 日期 | 任务 | 完成人 | 备注 |
|------|------|--------|------|
| | | | |
