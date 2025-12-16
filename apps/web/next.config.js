/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@platform/shared', '@platform/evaluators', 'antd', '@ant-design/icons', '@ant-design/pro-components'],
  eslint: {
    // 构建时忽略 ESLint 警告（生产环境建议开启，但有预先存在的警告）
    ignoreDuringBuilds: true,
  },
  // Next.js 15: serverComponentsExternalPackages 移到顶层
  serverExternalPackages: ['bullmq', 'ioredis', 'mongoose', 'mongodb'],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/pro-components'],
    // instrumentationHook 在 Next.js 15 中默认启用，无需配置
  },
  webpack: (config, { isServer }) => {
    // 仅服务端需要处理 mongoose/mongodb 的原生模块依赖
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
        'kerberos': 'commonjs kerberos',
        '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
        '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
        'snappy': 'commonjs snappy',
        'aws4': 'commonjs aws4',
      })
    }

    // Monaco Editor 本地化配置（解决 CDN 无法访问问题）
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }

    return config
  },
}

module.exports = nextConfig
