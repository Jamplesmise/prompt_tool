/**
 * MongoDB 连接管理
 * 参考: dev-admin/src/packages/service/common/mongo/index.ts
 */
import mongoose from 'mongoose'

const MONGODB_URI = process.env.FASTGPT_MONGODB_URI || process.env.MONGODB_URI

// 全局缓存，避免开发模式热重载时重复连接
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

let cached = global.mongooseCache

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null }
}

/**
 * 安全地打印连接字符串（隐藏密码）
 */
function getSafeUri(uri: string): string {
  try {
    const url = new URL(uri)
    if (url.password) {
      url.password = '****'
    }
    return url.toString()
  } catch {
    return uri.replace(/:[^:@]+@/, ':****@')
  }
}

/**
 * 确保连接字符串包含 authSource
 * root 用户通常需要 authSource=admin
 */
function ensureAuthSource(uri: string): string {
  try {
    const url = new URL(uri)
    // 如果没有 authSource 参数，添加 authSource=admin
    if (!url.searchParams.has('authSource')) {
      url.searchParams.set('authSource', 'admin')
      console.log('[MongoDB] 自动添加 authSource=admin')
    }
    return url.toString()
  } catch {
    // URL 解析失败，手动添加
    if (!uri.includes('authSource=')) {
      const separator = uri.includes('?') ? '&' : '?'
      return `${uri}${separator}authSource=admin`
    }
    return uri
  }
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error('请在环境变量中配置 MONGODB_URI 或 FASTGPT_MONGODB_URI')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }

    // 确保有 authSource 参数
    const finalUri = ensureAuthSource(MONGODB_URI)
    console.log('[MongoDB] 连接中...', getSafeUri(finalUri))

    cached.promise = mongoose.connect(finalUri, opts).then((mongooseInstance) => {
      console.log('[MongoDB] 连接成功')
      return mongooseInstance
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error('[MongoDB] 连接失败:', e)
    throw e
  }

  return cached.conn
}

export function isMongoConnected(): boolean {
  return cached.conn !== null && mongoose.connection.readyState === 1
}

export { mongoose }
