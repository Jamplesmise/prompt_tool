/**
 * MongoDB 连接健康检查
 */
import { jsonResponse, errorResponse } from '@/lib/mongodb/helpers'

// 禁用静态生成
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 动态导入，避免构建时连接
    const { connectMongo } = await import('@/lib/mongodb/connection')
    const mongoose = await connectMongo()

    const status = mongoose.connection.readyState
    const statusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }

    return jsonResponse({
      status: statusMap[status] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
