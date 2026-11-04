import { useCallback, useSyncExternalStore } from 'react'

export const SAVED_KEY = 'eim:saved'
const listeners = new Set<() => void>()

function read(): string {
  try {
    return localStorage.getItem(SAVED_KEY) ?? '[]'
  } catch {
    return '[]'
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Per-browser "saved to trips" list of tour slugs. */
export function useSaved(slug: string): [boolean, () => void] {
  const raw = useSyncExternalStore(subscribe, read, () => '[]')
  const saved = (JSON.parse(raw) as string[]).includes(slug)
  const toggle = useCallback(() => {
    const list = JSON.parse(read()) as string[]
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable; ignore */
    }
    listeners.forEach((l) => l())
  }, [slug])
  return [saved, toggle]
}
