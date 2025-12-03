import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserRole = 'admin' | 'user'

type UserInfo = {
  id: string
  email: string
  name: string
  avatar: string | null
  role: UserRole
}

type UserState = {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
}

type UserActions = {
  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

type UserStore = UserState & UserActions

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user
          state.isLoading = false
        }
      },
    }
  )
)
