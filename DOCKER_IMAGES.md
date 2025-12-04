# Docker 镜像使用说明

## 📦 镜像地址

单一镜像包含 Web + Worker 所有功能：

```
ghcr.io/jamplesmise/prompt_tool:latest
```

**镜像包含**：
- ✅ Next.js Web 应用（前端 + API）
- ✅ Worker 后台任务处理器
- ✅ 所有功能完整可用

---

## 🚀 快速开始

### 拉取镜像

```bash
docker pull ghcr.io/jamplesmise/prompt_tool:latest
```

### 运行容器

```bash
docker run -d \
  --name prompt-tool \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_URL="redis://host:6379" \
  -e NEXTAUTH_SECRET="your-secret-key" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  ghcr.io/jamplesmise/prompt_tool:latest
```

### 使用 docker-compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: prompt
      POSTGRES_PASSWORD: prompt123
      POSTGRES_DB: prompt_tool
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    image: ghcr.io/jamplesmise/prompt_tool:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://prompt:prompt123@postgres:5432/prompt_tool
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: change-this-to-a-random-secret
      NEXTAUTH_URL: http://localhost:3000
      RUN_MIGRATIONS: "true"  # 首次启动时运行数据库迁移
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

volumes:
  postgres_data:
```

启动：

```bash
docker-compose up -d
```

---

## 🔐 拉取镜像（私有仓库）

如果镜像是私有的，需要先登录：

```bash
# 创建 Personal Access Token (PAT)
# 访问：https://github.com/settings/tokens
# 权限：read:packages

# 登录
echo YOUR_PAT | docker login ghcr.io -u USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/jamplesmise/prompt_tool:latest
```

---

## 🏷️ 镜像标签说明

| 标签 | 示例 | 说明 |
|------|------|------|
| `latest` | `latest` | main 分支最新构建 |
| 分支名 | `v1.2.3` | 特定分支的最新构建 |
| 版本号 | `v1.2.3`, `1.2.3`, `1.2`, `1` | 语义化版本标签 |
| SHA | `main-abc1234` | 特定 commit 的构建 |

使用特定版本：

```bash
docker pull ghcr.io/jamplesmise/prompt_tool:v1.2.3
docker pull ghcr.io/jamplesmise/prompt_tool:1.2
```

---

## 🔧 环境变量配置

### 必需变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 数据库连接 | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis 连接 | `redis://host:6379` |
| `NEXTAUTH_SECRET` | NextAuth 密钥（随机字符串） | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | 应用访问 URL | `http://localhost:3000` |

### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `RUN_MIGRATIONS` | 启动时运行数据库迁移 | `false` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | Web 服务端口 | `3000` |

---

## 📊 查看构建状态

访问 GitHub Actions 页面：
```
https://github.com/Jamplesmise/prompt_tool/actions
```

---

## 🔄 更新镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/jamplesmise/prompt_tool:latest

# 停止旧容器
docker stop prompt-tool
docker rm prompt-tool

# 启动新容器
docker run -d \
  --name prompt-tool \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  ghcr.io/jamplesmise/prompt_tool:latest
```

或使用 docker-compose：

```bash
docker-compose pull
docker-compose up -d
```

---

## 🌍 多平台支持

镜像支持以下平台：
- ✅ `linux/amd64` (x86_64)
- ✅ `linux/arm64` (ARM64/Apple Silicon)

Docker 会自动选择适合您系统的镜像。

---

## 🛠️ 本地构建

如果需要本地构建镜像：

```bash
# 克隆仓库
git clone https://github.com/Jamplesmise/prompt_tool.git
cd prompt_tool

# 构建镜像
docker build -f docker/all-in-one.Dockerfile -t my-prompt-tool .

# 运行
docker run -d -p 3000:3000 \
  -e DATABASE_URL="..." \
  my-prompt-tool
```

---

## 📝 自动构建触发条件

GitHub Actions 会在以下情况自动构建镜像：

- ✅ 推送到 `main` 分支
- ✅ 推送到 `v*.*.*` 分支（如 v1.2.3）
- ✅ 创建 tag `v*`（如 v1.2.3）
- ✅ 向 `main` 分支提交 PR

---

## 🐛 故障排查

### 查看容器日志

```bash
docker logs prompt-tool

# 实时查看
docker logs -f prompt-tool
```

### 进入容器调试

```bash
docker exec -it prompt-tool sh
```

### 常见问题

#### 1. 数据库连接失败

```
Error: connect ECONNREFUSED
```

**解决**：
- 检查 `DATABASE_URL` 是否正确
- 确保 PostgreSQL 容器正在运行
- 检查网络连接

#### 2. Redis 连接失败

```
Error: Redis connection refused
```

**解决**：
- 检查 `REDIS_URL` 是否正确
- 确保 Redis 容器正在运行
- 检查网络连接

#### 3. 端口已被占用

```
Error: bind: address already in use
```

**解决**：
- 更换端口：`-p 3001:3000`
- 或停止占用 3000 端口的服务

#### 4. 数据库迁移失败

**解决**：
- 手动运行迁移：
  ```bash
  docker exec prompt-tool npx prisma migrate deploy
  ```

---

## 📋 健康检查

检查服务是否正常运行：

```bash
# 检查 Web 服务
curl http://localhost:3000/api/health

# 检查容器状态
docker ps | grep prompt-tool

# 查看容器资源使用
docker stats prompt-tool
```

---

## 🔗 相关链接

- **GitHub 仓库**: https://github.com/Jamplesmise/prompt_tool
- **GitHub Actions**: https://github.com/Jamplesmise/prompt_tool/actions
- **GitHub Packages**: https://github.com/Jamplesmise?tab=packages
- **镜像详情**: https://github.com/Jamplesmise/prompt_tool/pkgs/container/prompt_tool

---

## 💡 最佳实践

### 1. 使用环境变量文件

创建 `.env` 文件：

```env
DATABASE_URL=postgresql://user:pass@postgres:5432/db
REDIS_URL=redis://redis:6379
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

使用：

```bash
docker run -d --env-file .env ghcr.io/jamplesmise/prompt_tool:latest
```

### 2. 数据持久化

使用 volumes 持久化数据：

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - redis_data:/data
```

### 3. 资源限制

限制容器资源使用：

```bash
docker run -d \
  --memory="2g" \
  --cpus="1.5" \
  ghcr.io/jamplesmise/prompt_tool:latest
```

### 4. 反向代理

使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ⏱️ 构建时间预估

- **首次构建**: 10-15 分钟
- **后续构建**: 3-5 分钟（使用缓存）

---

**更新时间**: 2025-12-04
**版本**: v1.2.3
**镜像类型**: All-in-One (Web + Worker)
