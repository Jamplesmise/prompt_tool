/**
 * MongoDB 连接兼容层
 * 注意：此文件不能在顶层导入 mongoose 相关模块，否则会导致构建时连接 MongoDB
 */

const FASTGPT_MONGODB_URI = process.env.FASTGPT_MONGODB_URI || ''
const ENABLE_FASTGPT_MODELS = process.env.ENABLE_FASTGPT_MODELS === 'true'

/**
 * 检查 FastGPT 是否启用
 * 这个函数不会触发 MongoDB 连接
 */
export function isFastGPTEnabled(): boolean {
  return ENABLE_FASTGPT_MODELS && !!FASTGPT_MONGODB_URI
}

/**
 * 连接到 FastGPT MongoDB
 * 使用动态导入避免构建时连接
 */
export async function connectToFastGPTMongo() {
  if (!isFastGPTEnabled()) {
    return null
  }

  // 动态导入，避免构建时执行
  const { connectMongo } = await import('./mongodb')
  return connectMongo()
}

/**
 * 检查 MongoDB 是否已连接
 * 使用动态导入避免构建时连接
 */
export async function isMongoConnected(): Promise<boolean> {
  if (!isFastGPTEnabled()) {
    return false
  }

  const { isMongoConnected: checkConnected } = await import('./mongodb')
  return checkConnected()
}
