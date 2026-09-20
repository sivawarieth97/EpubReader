import type { ReaderFlow } from '../hooks/useEpub'

export type ReaderThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const THEME_KEY = 'epub-reader.theme'
const FONT_KEY = 'epub-reader.fontSize'
const FLOW_KEY = 'epub-reader.flow'

export function loadThemeMode(): ReaderThemeMode {
  const value = window.localStorage.getItem(THEME_KEY)
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}

export function saveThemeMode(mode: ReaderThemeMode) {
  window.localStorage.setItem(THEME_KEY, mode)
}

export function resolveTheme(mode: ReaderThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function loadFontSize(fallback: number) {
  const raw = window.localStorage.getItem(FONT_KEY)
  const value = raw ? Number(raw) : fallback
  return Number.isFinite(value) ? value : fallback
}

export function saveFontSize(size: number) {
  window.localStorage.setItem(FONT_KEY, String(size))
}

export function loadFlow(): ReaderFlow {
  return window.localStorage.getItem(FLOW_KEY) === 'scrolled' ? 'scrolled' : 'paginated'
}

export function saveFlow(flow: ReaderFlow) {
  window.localStorage.setItem(FLOW_KEY, flow)
}
