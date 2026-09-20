import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHealth } from '../api/health'

type State = 'checking' | 'ok' | 'down'

export function HealthStatus() {
  const [state, setState] = useState<State>('checking')
  const abortRef = useRef<AbortController | null>(null)

  const check = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const timer = window.setTimeout(() => controller.abort(), 3000)

    fetchHealth(controller.signal)
      .then((health) => {
        if (!controller.signal.aborted) {
          setState(health.status.toLowerCase() === 'ok' ? 'ok' : 'down')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setState('down')
      })
      .finally(() => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    check()
    const id = window.setInterval(check, 20000)
    return () => {
      window.clearInterval(id)
      abortRef.current?.abort()
    }
  }, [check])

  if (state !== 'down') return null

  return (
    <div className="health" data-state="down" role="status">
      <span>Server unreachable</span>
      <button type="button" className="text-btn" onPointerDown={check}>
        Retry
      </button>
    </div>
  )
}
