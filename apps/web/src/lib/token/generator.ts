// API Token 生成和验证
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const TOKEN_PREFIX = 'sk-'
const SALT_ROUNDS = 10

// 生成 API Token
export async function generateApiToken(): Promise<{
  token: string
  tokenHash: string
  tokenPrefix: string
}> {
  // 生成随机 Token
  const randomPart = crypto.randomBytes(32).toString('hex')
  const token = `${TOKEN_PREFIX}${randomPart}`

  // 哈希存储
  const tokenHash = await bcrypt.hash(token, SALT_ROUNDS)

  // 前缀用于显示（sk-xxxxxxxx...）
  const tokenPrefix = token.slice(0, 10) + '...'

  return { token, tokenHash, tokenPrefix }
}

// 验证 API Token
export async function validateApiToken(token: string): Promise<{
  valid: boolean
  userId?: string
  scopes?: string[]
}> {
  // 检查格式
  if (!token.startsWith(TOKEN_PREFIX)) {
    return { valid: false }
  }

  // 查找所有未过期的 Token
  const apiTokens = await prisma.apiToken.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
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
        valid: true,
        userId: apiToken.userId,
        scopes: apiToken.scopes as string[],
      }
    }
  }

  return { valid: false }
}

// 检查 Token 是否有指定权限
export function hasTokenScope(scopes: string[], requiredScope: string): boolean {
  // admin 权限包含所有
  if (scopes.includes('admin')) return true

  // 检查具体权限
  if (scopes.includes(requiredScope)) return true

  // write 权限包含 read
  if (requiredScope === 'read' && scopes.includes('write')) return true

  // execute 权限
  if (requiredScope === 'execute' && scopes.includes('execute')) return true

  return false
}
