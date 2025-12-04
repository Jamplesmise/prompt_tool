import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SettingsState = {
  fontSize: number
  setFontSize: (size: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      fontSize: 14,
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      name: 'app-settings',
    }
  )
)
