/**
 * MongoDB API 辅助函数
 * 这个文件不导入 mongoose，可以安全地在任何地方使用
 */

/**
 * 认证错误类
 */
export class AuthError extends Error {
  code: number

  constructor(message: string, code: number = 401) {
    super(message)
    this.code = code
    this.name = 'AuthError'
  }
}

/**
 * API 响应辅助函数
 */
export function jsonResponse<T>(data: T, code: number = 200, message: string = 'success') {
  return Response.json({ code, message, data }, { status: code >= 400 ? code : 200 })
}

export function errorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return jsonResponse(null, error.code, error.message)
  }

  console.error('[API Error]', error)
  const message = error instanceof Error ? error.message : '服务器内部错误'
  return jsonResponse(null, 500, message)
}
