import type { Session } from './types'

const KEY = 'mt:session'

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: the session lasts for this page only */
  }
  current = session
}

let current: Session | null = readSession()

export const getToken = () => current?.token ?? null
