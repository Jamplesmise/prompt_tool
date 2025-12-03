import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectRole } from '@platform/shared'

type ProjectWithRole = Project & {
  role: ProjectRole
  memberCount: number
}

type ProjectState = {
  currentProject: ProjectWithRole | null
  projects: ProjectWithRole[]
  isLoading: boolean
}

type ProjectActions = {
  setCurrentProject: (project: ProjectWithRole | null) => void
  setProjects: (projects: ProjectWithRole[]) => void
  setLoading: (loading: boolean) => void
  addProject: (project: ProjectWithRole) => void
  updateProject: (id: string, updates: Partial<ProjectWithRole>) => void
  removeProject: (id: string) => void
  reset: () => void
}

type ProjectStore = ProjectState & ProjectActions

const initialState: ProjectState = {
  currentProject: null,
  projects: [],
  isLoading: true,
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentProject: (project) => set({ currentProject: project }),

      setProjects: (projects) => {
        const { currentProject } = get()
        // 如果当前项目不在列表中，选择第一个
        if (
          projects.length > 0 &&
          (!currentProject ||
            !projects.find((p) => p.id === currentProject.id))
        ) {
          set({ projects, currentProject: projects[0], isLoading: false })
        } else {
          set({ projects, isLoading: false })
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      addProject: (project) => {
        const { projects } = get()
        set({ projects: [project, ...projects] })
      },

      updateProject: (id, updates) => {
        const { projects, currentProject } = get()
        const updatedProjects = projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        )
        const updatedCurrentProject =
          currentProject?.id === id
            ? { ...currentProject, ...updates }
            : currentProject
        set({ projects: updatedProjects, currentProject: updatedCurrentProject })
      },

      removeProject: (id) => {
        const { projects, currentProject } = get()
        const filteredProjects = projects.filter((p) => p.id !== id)
        const newCurrentProject =
          currentProject?.id === id
            ? filteredProjects[0] || null
            : currentProject
        set({
          projects: filteredProjects,
          currentProject: newCurrentProject,
        })
      },

      reset: () => set(initialState),
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = true // 需要重新加载项目列表
        }
      },
    }
  )
)

// 获取当前项目 ID 的便捷方法
export function getCurrentProjectId(): string | null {
  return useProjectStore.getState().currentProject?.id || null
}
