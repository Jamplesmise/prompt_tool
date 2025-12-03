// 项目上下文工具
import { cookies } from 'next/headers'

const PROJECT_COOKIE_KEY = 'current_project_id'

// 从 Cookie 获取当前项目 ID
export async function getCurrentProjectId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(PROJECT_COOKIE_KEY)?.value || null
}

// 从请求头获取项目 ID（用于 API 请求）
export function getProjectIdFromHeader(request: Request): string | null {
  return request.headers.get('X-Project-Id')
}

// 获取项目 ID（优先从请求头，其次从 Cookie）
export async function getProjectId(request?: Request): Promise<string | null> {
  if (request) {
    const headerProjectId = getProjectIdFromHeader(request)
    if (headerProjectId) {
      return headerProjectId
    }
  }
  return getCurrentProjectId()
}
