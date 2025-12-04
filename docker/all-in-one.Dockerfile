# All-in-One Dockerfile (Web + Worker)
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

# 设置 Next.js 构建阶段标识（避免在构建时初始化 Worker）
ENV NEXT_PHASE=phase-production-build

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/evaluators/node_modules ./packages/evaluators/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

COPY . .

# 构建共享包
RUN corepack enable pnpm && pnpm --filter @platform/shared build
RUN corepack enable pnpm && pnpm --filter @platform/evaluators build

# 生成 Prisma Client
RUN cd apps/web && npx prisma generate

# 确保 public 目录存在（即使为空）
RUN mkdir -p apps/web/public

# 构建 Next.js
RUN corepack enable pnpm && pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN apk add --no-cache bash
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 Web 构建产物
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# 复制 Worker 所需文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder /app/apps/web/src ./apps/web/src

# 复制启动脚本
COPY --chown=nextjs:nodejs docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 使用启动脚本同时运行 Web 和 Worker
CMD ["/app/start.sh"]
