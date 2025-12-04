/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@platform/shared', '@platform/evaluators', 'antd', '@ant-design/icons', '@ant-design/pro-components'],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/pro-components'],
    // Next.js 14 使用这个配置名
    instrumentationHook: true,
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
}

module.exports = nextConfig
