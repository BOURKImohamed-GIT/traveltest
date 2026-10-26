import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../errors'
import { storedToken, storeToken, supplierApi } from './api'
import { Ctx } from './sessionContext'
import type { Session, SupplierUser } from './types'

export function SupplierProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupplierUser | null | undefined>(() => (storedToken() ? undefined : null))

  useEffect(() => {
    if (user !== undefined) return
    supplierApi.me().then(setUser, (e: Error) => {
      // An expired or revoked token: sign out. Other errors (offline) keep the token for next time.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) storeToken(null)
      setUser(null)
    })
  }, [user])

  // Keep the new-request count fresh while signed in: every minute and when the tab comes back.
  const signedIn = !!user
  useEffect(() => {
    if (!signedIn) return
    const refresh = () => supplierApi.me().then(setUser, () => {})
    const timer = window.setInterval(refresh, 60_000)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [signedIn])

  const signIn = useCallback((s: Session) => {
    storeToken(s.token)
    setUser(s.user)
  }, [])
  const signOut = useCallback(() => {
    storeToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signIn, signOut, setUser }), [user, signIn, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
