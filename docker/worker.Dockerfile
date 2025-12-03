# Worker Dockerfile
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

# 构建共享包
RUN corepack enable pnpm && pnpm --filter @platform/shared build
RUN corepack enable pnpm && pnpm --filter @platform/evaluators build

# 生成 Prisma Client
RUN cd apps/web && npx prisma generate

# 编译 Worker
RUN cd apps/web && npx tsc src/worker.ts src/lib/**/*.ts --outDir dist --esModuleInterop --module commonjs --target ES2020 --skipLibCheck || true

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# 复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/prisma ./apps/web/prisma
COPY --from=builder /app/apps/web/src ./apps/web/src

USER worker

# 使用 ts-node 运行 Worker
CMD ["npx", "ts-node", "--transpile-only", "apps/web/src/worker.ts"]
