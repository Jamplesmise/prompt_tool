/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署：生成 standalone 输出（精简依赖）
  output: 'standalone',
  transpilePackages: ['@platform/shared', '@platform/evaluators', 'antd', '@ant-design/icons', '@ant-design/pro-components'],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/pro-components'],
    // 构建时禁用 instrumentation（避免连接 Redis/PG）
    instrumentationHook: process.env.NEXT_PHASE !== 'phase-production-build',
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
}

module.exports = nextConfig
