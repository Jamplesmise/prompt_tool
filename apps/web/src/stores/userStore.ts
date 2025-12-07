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
  updateAvatar: (avatar: string | null) => void
  updateName: (name: string) => void
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

      updateAvatar: (avatar) =>
        set((state) => ({
          user: state.user ? { ...state.user, avatar } : null,
        })),

      updateName: (name) =>
        set((state) => ({
          user: state.user ? { ...state.user, name } : null,
        })),

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
