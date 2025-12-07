/**
 * MongoDB 模块入口
 * 注意：不要在顶层导入 connection.ts，否则会导致构建时连接 MongoDB
 */

// 辅助函数（安全，不触发 mongoose）
export { AuthError, jsonResponse, errorResponse } from './helpers'

// 中间件（安全，使用动态导入）
export { getAuthContext, requireAuth, type AuthContext } from './middleware'

// 连接函数需要动态导入使用：
// const { connectMongo } = await import('@/lib/mongodb/connection')
// 或者通过以下异步函数：
export async function connectMongo() {
  const { connectMongo: connect } = await import('./connection')
  return connect()
}

export async function isMongoConnected() {
  const { isMongoConnected: check } = await import('./connection')
  return check()
}

export async function getMongoose() {
  const { mongoose } = await import('./connection')
  return mongoose
}
