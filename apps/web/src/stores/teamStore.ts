import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Team, TeamRole } from '@platform/shared'

type TeamWithRole = Team & {
  role: TeamRole
  memberCount: number
}

type TeamState = {
  currentTeam: TeamWithRole | null
  teams: TeamWithRole[]
  isLoading: boolean
}

type TeamActions = {
  setCurrentTeam: (team: TeamWithRole | null) => void
  setTeams: (teams: TeamWithRole[]) => void
  setLoading: (loading: boolean) => void
  addTeam: (team: TeamWithRole) => void
  updateTeam: (id: string, updates: Partial<TeamWithRole>) => void
  removeTeam: (id: string) => void
  reset: () => void
}

type TeamStore = TeamState & TeamActions

const initialState: TeamState = {
  currentTeam: null,
  teams: [],
  isLoading: true,
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentTeam: (team) => set({ currentTeam: team }),

      setTeams: (teams) => {
        const { currentTeam } = get()
        // 如果当前团队不在列表中，选择第一个
        if (
          teams.length > 0 &&
          (!currentTeam ||
            !teams.find((t) => t.id === currentTeam.id))
        ) {
          set({ teams, currentTeam: teams[0], isLoading: false })
        } else {
          set({ teams, isLoading: false })
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      addTeam: (team) => {
        const { teams } = get()
        set({ teams: [team, ...teams] })
      },

      updateTeam: (id, updates) => {
        const { teams, currentTeam } = get()
        const updatedTeams = teams.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        )
        const updatedCurrentTeam =
          currentTeam?.id === id
            ? { ...currentTeam, ...updates }
            : currentTeam
        set({ teams: updatedTeams, currentTeam: updatedCurrentTeam })
      },

      removeTeam: (id) => {
        const { teams, currentTeam } = get()
        const filteredTeams = teams.filter((t) => t.id !== id)
        const newCurrentTeam =
          currentTeam?.id === id
            ? filteredTeams[0] || null
            : currentTeam
        set({
          teams: filteredTeams,
          currentTeam: newCurrentTeam,
        })
      },

      reset: () => set(initialState),
    }),
    {
      name: 'team-storage',
      partialize: (state) => ({
        currentTeam: state.currentTeam,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = true // 需要重新加载团队列表
        }
      },
    }
  )
)

// 获取当前团队 ID 的便捷方法
export function getCurrentTeamId(): string | null {
  return useTeamStore.getState().currentTeam?.id || null
}
