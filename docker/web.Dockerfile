# Web Dockerfile - 多阶段构建
FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
# 添加 libc6-compat 和 openssl（Prisma 需要）
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

# 启用 pnpm
RUN corepack enable pnpm

# 复制 package.json 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/evaluators/package.json ./packages/evaluators/
COPY apps/web/package.json ./apps/web/

# 安装所有依赖，允许运行 postinstall 脚本
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app

# 添加 openssl（Prisma 需要）
RUN apk add --no-cache libc6-compat openssl openssl-dev

# 启用 pnpm
RUN corepack enable pnpm

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/evaluators/node_modules ./packages/evaluators/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# 复制所有源代码
COPY . .

# 确保 public 目录存在（即使为空）
RUN mkdir -p apps/web/public

# 生成 Prisma Client（不需要数据库连接）
RUN cd apps/web && npx prisma generate

# 设置构建时环境变量（占位符，仅用于构建）
# 注意：这些只是构建时的占位符，运行时会被实际环境变量覆盖
# 队列使用延迟初始化模式，构建时不会尝试连接外部服务
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXTAUTH_SECRET="build-time-placeholder-secret-32"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV REDIS_URL="redis://localhost:6379"
ENV ENCRYPTION_KEY="build-time-placeholder-key-32ch"

# 构建 Next.js 应用
RUN cd apps/web && pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app

# 添加 openssl（Prisma 运行时需要）
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 创建必要的目录
RUN mkdir -p apps/web/public apps/web/node_modules/.prisma apps/web/node_modules/@prisma

# 复制静态资源（如果存在）
COPY --from=builder /app/apps/web/public ./apps/web/public

# 复制 standalone 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# 复制 Prisma schema 和生成的客户端（运行时需要）
# Prisma Client 在 monorepo 中会被安装到根 node_modules
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 设置权限
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
