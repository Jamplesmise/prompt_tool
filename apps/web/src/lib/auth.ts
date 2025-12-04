import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { prisma } from './prisma'
import type { UserSession } from '@platform/shared'

const SALT_ROUNDS = 10
const SESSION_COOKIE_NAME = 'session_token'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 天（秒）

// API Token 认证结果
export type ApiTokenAuth = {
  type: 'api_token'
  userId: string
  scopes: string[]
}

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// 验证密码
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// 生成会话 token
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// 创建会话
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

  // 存储到数据库（使用 User 的 settings 字段临时存储，或后续可扩展 Session 表）
  // 这里简化处理：直接使用 token 作为会话标识，存储在 cookie 中
  // 实际生产环境建议使用 Redis 或数据库 Session 表

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, `${userId}:${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return token
}

// 获取当前会话（支持 Cookie Session 和 Bearer Token）
export async function getSession(): Promise<UserSession | null> {
  // 1. 先检查 Bearer Token
  const headerStore = await headers()
  const authHeader = headerStore.get('authorization')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const tokenAuth = await validateBearerToken(token)
    if (tokenAuth) {
      return tokenAuth
    }
  }

  // 2. 回退到 Cookie Session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  const [userId] = sessionCookie.value.split(':')
  if (!userId) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserSession['role'],
    }
  } catch {
    return null
  }
}

// 验证 Bearer Token
async function validateBearerToken(token: string): Promise<UserSession | null> {
  // 检查格式
  if (!token.startsWith('sk-')) {
    return null
  }

  try {
    // 查找所有未过期的 Token
    const apiTokens = await prisma.apiToken.findMany({
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // 逐个验证（因为我们存储的是哈希值）
    for (const apiToken of apiTokens) {
      const isMatch = await bcrypt.compare(token, apiToken.tokenHash)
      if (isMatch) {
        // 更新最后使用时间
        await prisma.apiToken.update({
          where: { id: apiToken.id },
          data: { lastUsedAt: new Date() },
        })

        return {
          id: apiToken.user.id,
          email: apiToken.user.email,
          name: apiToken.user.name,
          role: apiToken.user.role as UserSession['role'],
        }
      }
    }

    return null
  } catch {
    return null
  }
}

// 清除会话
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// 验证登录凭据
export async function validateCredentials(
  email: string,
  password: string
): Promise<UserSession | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  })

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserSession['role'],
  }
}

// 获取当前用户（带完整信息）
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return user
}
