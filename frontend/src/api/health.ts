import { apiGet } from './client'

export type Health = {
  status: string
}

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const body = await apiGet<Record<string, unknown>>('/health', signal)
  const status = String(body.status ?? body.Status ?? '')
  return { status }
}
