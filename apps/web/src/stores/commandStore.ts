import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RecentItem = {
  id: string
  type: 'prompt' | 'dataset' | 'task' | 'page' | 'model' | 'evaluator'
  title: string
  href: string
  timestamp: number
}

type CommandState = {
  isOpen: boolean
  searchQuery: string
  recentItems: RecentItem[]
  open: () => void
  close: () => void
  toggle: () => void
  setSearchQuery: (query: string) => void
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  clearRecentItems: () => void
}

const MAX_RECENT_ITEMS = 10

export const useCommandStore = create<CommandState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      searchQuery: '',
      recentItems: [],

      open: () => set({ isOpen: true, searchQuery: '' }),
      close: () => set({ isOpen: false, searchQuery: '' }),
      toggle: () => {
        const { isOpen } = get()
        set({ isOpen: !isOpen, searchQuery: '' })
      },

      setSearchQuery: (query) => set({ searchQuery: query }),

      addRecentItem: (item) => {
        const { recentItems } = get()
        // 移除重复项
        const filtered = recentItems.filter((r) => r.id !== item.id)
        // 添加到开头
        const newItems = [
          { ...item, timestamp: Date.now() },
          ...filtered,
        ].slice(0, MAX_RECENT_ITEMS)
        set({ recentItems: newItems })
      },

      clearRecentItems: () => set({ recentItems: [] }),
    }),
    {
      name: 'command-palette',
      partialize: (state) => ({ recentItems: state.recentItems }),
    }
  )
)
