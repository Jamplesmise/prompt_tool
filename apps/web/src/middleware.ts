import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js 中间件
 * 用于全局请求处理（速率限制、安全头等）
 *
 * 注意：由于 Edge Runtime 限制，这里只做基础检查
 * 详细的速率限制在各 API 路由中通过 withRateLimit 实现
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // 添加安全响应头
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // API 路由添加额外的安全头
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0')
  }

  return response
}

export const config = {
  matcher: [
    // 匹配所有 API 路由
    '/api/:path*',
    // 匹配页面路由（排除静态资源）
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
