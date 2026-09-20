import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadThemeMode, resolveTheme, saveThemeMode, type ReaderThemeMode, type ResolvedTheme } from './readerPrefs'

type Appearance = {
  mode: ReaderThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ReaderThemeMode) => void
}

const AppearanceContext = createContext<Appearance | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ReaderThemeMode>(() => loadThemeMode())
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(loadThemeMode()))

  const setMode = useCallback((next: ReaderThemeMode) => {
    setModeState(next)
    saveThemeMode(next)
  }, [])

  useEffect(() => {
    const apply = () => setResolved(resolveTheme(mode))
    apply()
    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode])
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) {
    throw new Error('useAppearance must be used within AppearanceProvider')
  }
  return value
}
