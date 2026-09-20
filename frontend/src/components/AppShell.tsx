import { Outlet } from 'react-router-dom'
import { useAppearance } from '../lib/appearance'
import { HealthStatus } from './HealthStatus'

export function AppShell() {
  const { resolved, setMode } = useAppearance()

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">EPUB Reader</span>
          <h1>Library</h1>
        </div>
        <div className="topbar-end">
          <div className="seg" role="group" aria-label="Appearance">
            <button type="button" aria-pressed={resolved === 'light'} onClick={() => setMode('light')}>
              Light
            </button>
            <button type="button" aria-pressed={resolved === 'dark'} onClick={() => setMode('dark')}>
              Dark
            </button>
          </div>
          <HealthStatus />
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
