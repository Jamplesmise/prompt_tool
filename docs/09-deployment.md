# 环境配置与部署

## 一、环境变量

### 1.1 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@localhost:5432/platform` |
| `REDIS_URL` | Redis 连接串 | `redis://localhost:6379` |
| `NEXTAUTH_SECRET` | NextAuth 密钥（32位随机字符串） | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 应用 URL | `http://localhost:3000` |

### 1.2 沙箱服务变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `SANDBOX_URL` | 沙箱服务地址 | `http://localhost:3001` |
| `SANDBOX_SECRET` | 沙箱通信密钥 | `your-sandbox-secret` |

### 1.3 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `PORT` | Web 服务端口 | `3000` |
| `SANDBOX_PORT` | 沙箱服务端口 | `3001` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 1.4 .env 示例

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_eval_platform"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-32-character-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Sandbox
SANDBOX_URL="http://localhost:3001"
SANDBOX_SECRET="sandbox-secret-key"

# Optional
NODE_ENV="development"
LOG_LEVEL="debug"
```

---

## 二、本地开发

### 2.1 前置要求

| 软件 | 版本要求 |
|------|----------|
| Node.js | ≥ 18.17 |
| pnpm | ≥ 8.0 |
| PostgreSQL | ≥ 15 |
| Redis | ≥ 7.0 |

### 2.2 快速启动

```bash
# 1. 克隆项目
git clone <repo-url>
cd ai-eval-platform

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp apps/web/.env.example apps/web/.env.local
# 编辑 .env.local 填入实际值

# 4. 初始化数据库
pnpm db:push
pnpm db:seed

# 5. 启动开发服务
pnpm dev
```

### 2.3 常用命令

```bash
# 开发
pnpm dev              # 启动所有服务
pnpm dev:web          # 仅启动 Web
pnpm dev:sandbox      # 仅启动沙箱

# 数据库
pnpm db:push          # 同步 Schema（开发用）
pnpm db:migrate       # 生成迁移（生产用）
pnpm db:seed          # 初始化数据
pnpm db:studio        # 打开 Prisma Studio

# 构建
pnpm build            # 构建所有
pnpm build:web        # 构建 Web
pnpm build:sandbox    # 构建沙箱

# 代码质量
pnpm lint             # ESLint 检查
pnpm type-check       # TypeScript 检查
pnpm test             # 运行测试
```

---

## 三、Docker 部署

### 3.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_eval_platform
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Web 应用
  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ai_eval_platform
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      SANDBOX_URL: http://sandbox:3001
      SANDBOX_SECRET: ${SANDBOX_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # 沙箱服务
  sandbox:
    build:
      context: .
      dockerfile: docker/sandbox.Dockerfile
    environment:
      SANDBOX_SECRET: ${SANDBOX_SECRET}
      NODE_ENV: production
    ports:
      - "3001:3001"
    # 安全限制
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    read_only: true
    tmpfs:
      - /tmp:size=100M

volumes:
  postgres_data:
  redis_data:
```

### 3.2 Web Dockerfile

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
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/evaluators/node_modules ./packages/evaluators/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

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

### 3.3 Sandbox Dockerfile

```dockerfile
# docker/sandbox.Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装 Python（如果需要 Python 评估器）
# RUN apk add --no-cache python3 py3-pip

COPY apps/sandbox/package.json ./
RUN npm install --production

COPY apps/sandbox/dist ./dist

# 创建非 root 用户
RUN addgroup -S sandbox && adduser -S sandbox -G sandbox
USER sandbox

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### 3.4 部署命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f web

# 停止服务
docker-compose down

# 清理数据
docker-compose down -v
```

---

## 四、生产环境配置

### 4.1 数据库配置

```bash
# 连接池配置（添加到 DATABASE_URL）
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

### 4.2 Redis 配置

```bash
# 带密码的 Redis
REDIS_URL="redis://:password@host:6379"

# Redis Sentinel
REDIS_URL="redis+sentinel://sentinel1:26379,sentinel2:26379,sentinel3:26379/mymaster"
```

### 4.3 反向代理（Nginx）

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

    # 文件上传大小限制
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
    location /api/v1/tasks/*/progress {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

### 4.4 健康检查

```bash
# Web 健康检查
curl http://localhost:3000/api/health

# Sandbox 健康检查
curl http://localhost:3001/health
```

---

## 五、监控与日志

### 5.1 日志格式

```typescript
// 统一日志格式
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "web",
  "message": "Task started",
  "taskId": "xxx",
  "userId": "xxx"
}
```

### 5.2 关键指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| API 响应时间 | P99 延迟 | > 2s |
| 任务队列长度 | 待处理任务数 | > 100 |
| 数据库连接数 | 活跃连接 | > 80% |
| 内存使用 | 进程内存 | > 80% |
| 错误率 | 5xx 错误比例 | > 1% |

---

## 六、备份策略

### 6.1 数据库备份

```bash
# 每日备份
0 2 * * * pg_dump -h localhost -U postgres ai_eval_platform | gzip > /backup/db_$(date +\%Y\%m\%d).sql.gz

# 保留最近 7 天
find /backup -name "db_*.sql.gz" -mtime +7 -delete
```

### 6.2 恢复流程

```bash
# 恢复数据库
gunzip -c /backup/db_20240115.sql.gz | psql -h localhost -U postgres ai_eval_platform
```
