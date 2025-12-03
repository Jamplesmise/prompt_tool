'use client'

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/stores/userStore'
import { authService } from '@/services/auth'

export function useAuth() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout: clearUser } = useUserStore()

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authService.me()
      if (response.code === 200 && response.data) {
        setUser(response.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [setUser, setLoading])

  // 登录
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authService.login(email, password)
      if (response.code === 200 && response.data) {
        setUser(response.data.user)
        router.push('/')
        return { success: true }
      }
      return { success: false, message: response.message }
    },
    [setUser, router]
  )

  // 登出
  const logout = useCallback(async () => {
    await authService.logout()
    clearUser()
    router.push('/login')
  }, [clearUser, router])

  // 初始化时检查认证状态
  useEffect(() => {
    if (!user) {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
  }
}

// 认证守卫 hook - 未登录重定向到登录页
export function useRequireAuth() {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  return { isLoading, isAuthenticated }
}

// 已登录守卫 hook - 已登录重定向到首页
export function useRedirectIfAuth() {
  const { isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, router])

  return { isLoading, isAuthenticated }
}
