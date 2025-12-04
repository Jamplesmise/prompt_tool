// 团队上下文工具
import { cookies } from 'next/headers'

const TEAM_COOKIE_KEY = 'current_team_id'

// 从 Cookie 获取当前团队 ID
export async function getCurrentTeamId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(TEAM_COOKIE_KEY)?.value || null
}

// 从请求头获取团队 ID（用于 API 请求）
export function getTeamIdFromHeader(request: Request): string | null {
  return request.headers.get('X-Team-Id')
}

// 获取团队 ID（优先从请求头，其次从 Cookie）
export async function getTeamId(request?: Request): Promise<string | null> {
  if (request) {
    const headerTeamId = getTeamIdFromHeader(request)
    if (headerTeamId) {
      return headerTeamId
    }
  }
  return getCurrentTeamId()
}
