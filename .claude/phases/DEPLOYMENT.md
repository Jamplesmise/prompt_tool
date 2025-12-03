# 部署与测试指南

> 本文档涵盖开发环境配置、Docker 部署、测试策略

---

## 一、开发环境配置

### 1.1 前置要求

| 软件 | 版本要求 | 安装命令 |
|------|----------|----------|
| Node.js | ≥ 18.17 | `nvm install 18` |
| pnpm | ≥ 8.0 | `npm install -g pnpm` |
| PostgreSQL | ≥ 15 | Docker 或本地安装 |
| Redis | ≥ 7.0 | Docker 或本地安装 |

### 1.2 快速启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd ai-eval-platform

# 2. 安装依赖
pnpm install

# 3. 启动基础设施（使用 Docker）
docker-compose -f docker/dev.yml up -d

# 4. 配置环境变量
cp apps/web/.env.example apps/web/.env.local
# 编辑 .env.local 填入实际值

# 5. 初始化数据库
pnpm db:push
pnpm db:seed

# 6. 启动开发服务
pnpm dev
```

### 1.3 开发用 Docker Compose

```yaml
# docker/dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_eval_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_dev:/data

volumes:
  postgres_dev:
  redis_dev:
```

### 1.4 环境变量配置

```bash
# .env.local
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_eval_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key-here"  # 使用 openssl rand -base64 32 生成
NEXTAUTH_URL="http://localhost:3000"

# Sandbox (如果使用)
SANDBOX_URL="http://localhost:3001"
SANDBOX_SECRET="sandbox-secret-key"

# 可选
NODE_ENV="development"
LOG_LEVEL="debug"
```

### 1.5 常用开发命令

```bash
# 开发
pnpm dev              # 启动所有服务
pnpm dev:web          # 仅启动 Web

# 数据库
pnpm db:push          # 同步 Schema（开发用）
pnpm db:migrate       # 生成迁移（生产用）
pnpm db:seed          # 初始化数据
pnpm db:studio        # 打开 Prisma Studio

# 构建
pnpm build            # 构建所有
pnpm build:web        # 构建 Web

# 代码质量
pnpm lint             # ESLint 检查
pnpm type-check       # TypeScript 检查
pnpm test             # 运行测试
pnpm test:unit        # 运行单元测试
pnpm test:integration # 运行集成测试
```

---

## 二、Docker 生产部署

### 2.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-ai_eval_platform}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Web 应用
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-ai_eval_platform}
      REDIS_URL: redis://:${REDIS_PASSWORD:-}@redis:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      SANDBOX_URL: http://sandbox:3001
      SANDBOX_SECRET: ${SANDBOX_SECRET}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # 沙箱服务（可选）
  sandbox:
    build:
      context: .
      dockerfile: docker/sandbox.Dockerfile
    environment:
      SANDBOX_SECRET: ${SANDBOX_SECRET}
      NODE_ENV: production
    ports:
      - "3001:3001"
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp:size=100M
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2.2 Web Dockerfile

```dockerfile
# docker/web.Dockerfile
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/evaluators/package.json ./packages/evaluators/
COPY apps/web/package.json ./apps/web/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN corepack enable pnpm && pnpm build:web

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

### 2.3 部署命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f web

# 数据库迁移
docker-compose exec web pnpm db:migrate

# 停止服务
docker-compose down

# 清理数据（谨慎）
docker-compose down -v
```

### 2.4 Nginx 反向代理

```nginx
upstream web {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # SSE 支持
    location ~ ^/api/v1/tasks/.*/progress$ {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

---

## 三、测试策略

### 3.1 测试分层

```
┌─────────────────────────────────────────┐
│             E2E Tests (少量)             │  用户完整流程
├─────────────────────────────────────────┤
│         Integration Tests (中量)         │  API + DB
├─────────────────────────────────────────┤
│           Unit Tests (大量)              │  纯函数/组件
└─────────────────────────────────────────┘
```

### 3.2 测试工具

| 类型 | 工具 |
|------|------|
| 单元测试 | Vitest |
| 组件测试 | React Testing Library |
| API 测试 | supertest |
| E2E 测试 | Playwright |

### 3.3 单元测试示例

```typescript
// __tests__/lib/template.test.ts
import { describe, it, expect } from 'vitest';
import { renderPrompt, extractVariables } from '@/lib/template';

describe('renderPrompt', () => {
  it('should replace single variable', () => {
    const result = renderPrompt('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('should replace multiple variables', () => {
    const result = renderPrompt('{{a}} and {{b}}', { a: '1', b: '2' });
    expect(result).toBe('1 and 2');
  });

  it('should keep unmatched variables', () => {
    const result = renderPrompt('Hello {{name}}!', {});
    expect(result).toBe('Hello {{name}}!');
  });
});

describe('extractVariables', () => {
  it('should extract variables', () => {
    const result = extractVariables('{{a}} {{b}} {{a}}');
    expect(result).toEqual(['a', 'b']);
  });

  it('should return empty array for no variables', () => {
    const result = extractVariables('no variables');
    expect(result).toEqual([]);
  });
});
```

### 3.4 集成测试示例

```typescript
// __tests__/api/prompts.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, cleanupDatabase } from '../helpers';

describe('Prompts API', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await server.close();
  });

  it('should create a prompt', async () => {
    const response = await server.request('/api/v1/prompts', {
      method: 'POST',
      body: {
        name: 'Test Prompt',
        content: 'Hello {{name}}!'
      }
    });

    expect(response.code).toBe(200);
    expect(response.data.name).toBe('Test Prompt');
    expect(response.data.currentVersion).toBe(1);
  });

  it('should list prompts', async () => {
    const response = await server.request('/api/v1/prompts');

    expect(response.code).toBe(200);
    expect(response.data.list).toBeInstanceOf(Array);
  });
});
```

### 3.5 测试覆盖率目标

| 模块 | 覆盖率目标 |
|------|------------|
| lib/ 工具函数 | ≥ 90% |
| packages/evaluators | ≥ 90% |
| API Routes | ≥ 80% |
| Components | ≥ 70% |
| 整体 | ≥ 80% |

### 3.6 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试（需要数据库）
pnpm test:integration

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监视模式
pnpm test:watch
```

---

## 四、健康检查与监控

### 4.1 健康检查端点

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;

    // 检查 Redis 连接
    await redis.ping();

    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        redis: 'ok'
      }
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

### 4.2 监控指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| API 响应时间 | P99 延迟 | > 2s |
| 错误率 | 5xx 错误比例 | > 1% |
| 数据库连接数 | 活跃连接 | > 80% |
| 内存使用 | 进程内存 | > 80% |
| 任务队列长度 | 待处理任务数 | > 100 |

### 4.3 日志格式

```typescript
// 统一日志格式
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "web",
  "message": "Task started",
  "taskId": "xxx",
  "userId": "xxx",
  "duration": 123
}
```

---

## 五、备份与恢复

### 5.1 数据库备份

```bash
# 每日备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/backup

# 备份数据库
pg_dump -h localhost -U postgres ai_eval_platform | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 保留最近 7 天
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

### 5.2 恢复流程

```bash
# 恢复数据库
gunzip -c /backup/db_20240115.sql.gz | psql -h localhost -U postgres ai_eval_platform

# 验证恢复
psql -h localhost -U postgres ai_eval_platform -c "SELECT COUNT(*) FROM users;"
```

---

## 六、常见问题

### Q1: 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 查看日志
docker-compose logs postgres

# 测试连接
psql -h localhost -U postgres -d ai_eval_platform
```

### Q2: Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose ps redis

# 测试连接
redis-cli ping
```

### Q3: 构建失败

```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
rm -rf .next

# 重新安装
pnpm install
pnpm build
```

### Q4: Prisma 迁移问题

```bash
# 重置数据库（开发环境）
pnpm prisma migrate reset

# 强制同步（开发环境）
pnpm prisma db push --force-reset
```
