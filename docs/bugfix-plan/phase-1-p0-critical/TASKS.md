# Phase 1: P0 严重问题修复 - 任务清单

> 状态：✅ 已完成

---

## 任务列表

### P0-1: 修复空 catch 块 ✅

- [x] 定位所有空 catch 块
- [x] 添加错误消息显示
- [x] 测试错误反馈正常

**修改文件**: `apps/web/src/app/(dashboard)/settings/page.tsx`

**修改内容**:
```typescript
// 修复前
} catch { }

// 修复后
} catch (err) {
  message.error(err instanceof Error ? err.message : '操作失败')
}
```

---

### P0-2: 添加 API 速率限制 ✅

- [x] 创建速率限制模块
- [x] 实现 Redis 滑动窗口算法
- [x] 定义预设配置
- [x] 应用到登录接口
- [x] 应用到 Token 接口
- [x] 创建全局安全中间件

**新增文件**:
- `apps/web/src/lib/rateLimit.ts`
- `apps/web/src/middleware.ts`

**修改文件**:
- `apps/web/src/app/api/v1/auth/login/route.ts`
- `apps/web/src/app/api/v1/tokens/route.ts`

---

### P0-3: 补充关键测试 ✅

- [x] 创建速率限制单元测试
- [x] 创建认证流程集成测试
- [x] 测试速率限制边界情况
- [x] 测试 Redis 降级策略

**新增文件**:
- `apps/web/src/__tests__/unit/rateLimit.test.ts`
- `apps/web/src/__tests__/integration/authFlow.test.ts`

---

## 验证命令

```bash
# 运行速率限制测试
pnpm test src/__tests__/unit/rateLimit.test.ts

# 运行认证流程测试
pnpm test src/__tests__/integration/authFlow.test.ts

# 测试速率限制效果（需要 Redis）
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\n%{http_code}\n"
done
# 第 6 次应该返回 429
```

---

## 开发日志

| 日期 | 任务 | 完成人 | 备注 |
|------|------|--------|------|
| 2025-12-09 | P0-1 空 catch 修复 | Claude | 5 处修复 |
| 2025-12-09 | P0-2 速率限制 | Claude | 新增模块 + 中间件 |
| 2025-12-09 | P0-3 测试补充 | Claude | 2 个测试文件 |
