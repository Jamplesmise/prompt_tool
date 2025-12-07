/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@platform/shared', '@platform/evaluators', 'antd', '@ant-design/icons', '@ant-design/pro-components'],
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', '@ant-design/pro-components'],
    // Next.js 14 使用这个配置名
    instrumentationHook: true,
    serverComponentsExternalPackages: ['bullmq', 'ioredis', 'mongoose', 'mongodb'],
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
    return config
  },
}

module.exports = nextConfig
