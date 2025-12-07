import crypto from 'crypto'

// 加密配置
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 从环境变量获取加密密钥，生产环境必须配置
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    // 开发环境使用默认密钥
    if (process.env.NODE_ENV === 'development') {
      return crypto.scryptSync('dev-secret-key', 'salt', KEY_LENGTH)
    }
    throw new Error('ENCRYPTION_KEY environment variable is required in production')
  }
  // 使用 scrypt 派生固定长度的密钥
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

// 加密 API Key
export function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // 格式：iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// 解密 API Key
export function decryptApiKey(encryptedData: string): string {
  const key = getEncryptionKey()
  const parts = encryptedData.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// 脱敏显示 API Key（显示 sk-****xxxx 格式，共10字符）
export function maskApiKey(encryptedApiKey: string): string {
  try {
    // 先解密获取原始 key
    const originalKey = decryptApiKey(encryptedApiKey)
    if (!originalKey || originalKey.length < 4) {
      return '****'
    }
    // 显示格式：前缀 + **** + 后4位，如 sk-****a1b2
    const suffix = originalKey.slice(-4)
    const prefix = originalKey.slice(0, 3) // 取前3位如 sk-
    return `${prefix}****${suffix}`
  } catch {
    // 解密失败，返回通用脱敏
    return '****'
  }
}

// 检查是否已加密（通过格式判断）
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  if (parts.length !== 3) {
    return false
  }
  // 检查 IV 长度（32 hex = 16 bytes）
  // 检查 authTag 长度（32 hex = 16 bytes）
  return parts[0].length === IV_LENGTH * 2 && parts[1].length === AUTH_TAG_LENGTH * 2
}
