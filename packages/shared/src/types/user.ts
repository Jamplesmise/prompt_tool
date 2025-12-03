// 用户相关类型

export type UserRole = 'ADMIN' | 'USER'

export type User = {
  id: string
  email: string
  name: string
  avatar: string | null
  role: UserRole
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type CreateUserInput = {
  email: string
  password: string
  name: string
  avatar?: string
  role?: UserRole
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
  password?: string
}

export type UserSession = {
  id: string
  email: string
  name: string
  role: UserRole
}
