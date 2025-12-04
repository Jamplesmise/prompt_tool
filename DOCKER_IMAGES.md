# Docker 镜像使用说明

## 📦 镜像地址

所有镜像都推送到 GitHub Container Registry (ghcr.io)：

```
ghcr.io/jamplesmise/prompt_tool/web:latest
ghcr.io/jamplesmise/prompt_tool/worker:latest
```

> **注意**: Sandbox 服务使用云端服务，不需要构建镜像

## 🚀 查看构建状态

1. 访问 GitHub Actions 页面：
   ```
   https://github.com/Jamplesmise/prompt_tool/actions
   ```

2. 查看 "Build and Push Docker Images" 工作流

3. 点击最新的构建查看详细日志

## 📋 自动构建触发条件

GitHub Actions 会在以下情况自动构建镜像：

- ✅ 推送到 `main` 分支
- ✅ 推送到 `v*.*.*` 分支（如 v1.2.3）
- ✅ 创建 tag `v*`（如 v1.2.3）
- ✅ 向 `main` 分支提交 PR

## 🏷️ 镜像标签说明

每次构建会生成多个标签：

| 标签类型 | 示例 | 说明 |
|---------|------|------|
| `latest` | `latest` | 最新的 main 分支构建 |
| 分支名 | `main`, `v1.2.3` | 对应分支的最新构建 |
| 版本号 | `v1.2.3`, `1.2.3`, `1.2`, `1` | 语义化版本标签 |
| SHA | `main-abc1234` | 特定 commit 的构建 |

## 🔐 拉取镜像

### 公开镜像（推荐）

如果仓库设置为公开包，可以直接拉取：

```bash
docker pull ghcr.io/jamplesmise/prompt_tool/web:latest
docker pull ghcr.io/jamplesmise/prompt_tool/worker:latest
```

### 私有镜像（需要认证）

如果镜像是私有的，需要先登录：

```bash
# 创建 Personal Access Token (PAT)
# 访问：https://github.com/settings/tokens
# 权限：read:packages

# 登录
echo YOUR_PAT | docker login ghcr.io -u USERNAME --password-stdin

# 拉取镜像
docker pull ghcr.io/jamplesmise/prompt_tool/web:latest
```

## 🎯 使用镜像

### 方式 1：使用 docker-compose（推荐）

更新 `docker/docker-compose.yml`：

```yaml
services:
  web:
    image: ghcr.io/jamplesmise/prompt_tool/web:latest
    # ... 其他配置

  worker:
    image: ghcr.io/jamplesmise/prompt_tool/worker:latest
    # ... 其他配置

  # sandbox 使用云端服务，无需本地部署
```

启动：

```bash
cd docker
docker-compose up -d
```

### 方式 2：直接运行

```bash
# Web 服务
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="your_db_url" \
  -e REDIS_URL="your_redis_url" \
  ghcr.io/jamplesmise/prompt_tool/web:latest

# Worker 服务
docker run -d \
  -e DATABASE_URL="your_db_url" \
  -e REDIS_URL="your_redis_url" \
  ghcr.io/jamplesmise/prompt_tool/worker:latest

# Sandbox 使用云端服务，无需部署
```

## 🔄 更新镜像

```bash
# 拉取最新镜像
docker-compose pull

# 重启服务
docker-compose up -d
```

## 🌍 多平台支持

镜像支持以下平台：
- ✅ `linux/amd64` (x86_64)
- ✅ `linux/arm64` (ARM64/Apple Silicon)

Docker 会自动选择适合您系统的镜像。

## 📊 查看镜像信息

```bash
# 查看镜像详情
docker image inspect ghcr.io/jamplesmise/prompt_tool/web:latest

# 查看镜像大小
docker images | grep prompt_tool

# 查看镜像层
docker history ghcr.io/jamplesmise/prompt_tool/web:latest
```

## 🛠️ 本地构建（开发者）

如果需要本地构建镜像：

```bash
# 构建 web 镜像
docker build -f docker/web.Dockerfile -t my-prompt-tool-web .

# 构建 worker 镜像
docker build -f docker/worker.Dockerfile -t my-prompt-tool-worker .

# sandbox 使用云端服务，无需构建
```

## 📝 注意事项

1. **首次构建时间**：首次构建可能需要 10-15 分钟
2. **缓存加速**：后续构建使用 GitHub Actions 缓存，通常 3-5 分钟
3. **镜像可见性**：默认镜像继承仓库可见性
   - 如需公开镜像，在 GitHub 包设置中修改
4. **存储配额**：GitHub 免费账户有存储和传输限制
   - 公开仓库：无限存储和传输
   - 私有仓库：500MB 存储，1GB/月 传输

## 🔗 相关链接

- **GitHub Actions**: https://github.com/Jamplesmise/prompt_tool/actions
- **GitHub Packages**: https://github.com/Jamplesmise?tab=packages
- **镜像详情**: https://github.com/Jamplesmise/prompt_tool/pkgs/container/prompt_tool%2Fweb

## 🐛 故障排查

### 构建失败

1. 查看 Actions 日志找到错误信息
2. 常见问题：
   - 依赖安装失败：检查 package.json
   - 构建超时：考虑优化 Dockerfile
   - 权限问题：确保 `GITHUB_TOKEN` 有 `packages: write` 权限

### 拉取失败

1. 检查镜像名称是否正确
2. 如果是私有镜像，确保已登录
3. 检查网络连接

### 运行失败

1. 检查环境变量是否正确配置
2. 检查端口是否已被占用
3. 查看容器日志：`docker logs <container_id>`

---

**更新时间**: 2025-12-04
**版本**: v1.2.3
