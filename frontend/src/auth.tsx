import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { readSession, writeSession } from './session'
import type { AccountType, ProfileInput, Session, User } from './types'

interface AuthState {
  user: User | null
  signInWithGoogle: (credential: string, accountType?: AccountType) => Promise<void>
  signInDev: (email: string, name: string, accountType?: AccountType) => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const save = useCallback((s: Session | null) => {
    writeSession(s)
    setSession(s)
  }, [])

  // Refresh the stored profile, and drop a session the server no longer accepts.
  useEffect(() => {
    const stored = readSession()
    if (!stored) return
    api.me().then(
      (user) => save({ ...stored, user }),
      (e: { status?: number }) => {
        if (e.status === 401) save(null)
      },
    )
  }, [save])

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      signInWithGoogle: async (credential, type) => save(await api.signInWithGoogle(credential, type)),
      signInDev: async (email, name, type) => save(await api.signInDev(email, name, type)),
      updateProfile: async (input) => {
        const user = await api.updateProfile(input)
        if (session) save({ ...session, user })
      },
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
