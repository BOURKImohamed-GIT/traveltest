import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { readSession, writeSession } from './session'
import type { Session, User } from './types'

interface AuthState {
  user: User | null
  signInWithGoogle: (credential: string) => Promise<void>
  signInDev: (email: string, name: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const save = useCallback((s: Session | null) => {
    writeSession(s)
    setSession(s)
  }, [])

  // Drop a stored session the server no longer accepts (expired or revoked).
  useEffect(() => {
    if (!readSession()) return
    api.me().catch((e: { status?: number }) => {
      if (e.status === 401) save(null)
    })
  }, [save])

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      signInWithGoogle: async (credential) => save(await api.signInWithGoogle(credential)),
      signInDev: async (email, name) => save(await api.signInDev(email, name)),
      signOut: () => save(null),
    }),
    [session, save],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- the hook belongs with its provider
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
