import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../errors'
import { storeTravellerToken, travellerApi, travellerToken } from './api'
import { TravellerCtx } from './sessionContext'
import type { Traveller, TravellerSession } from './types'

export function TravellerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Traveller | null | undefined>(() => (travellerToken() ? undefined : null))

  useEffect(() => {
    if (user !== undefined) return
    travellerApi.me().then(setUser, (e: Error) => {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) storeTravellerToken(null)
      setUser(null)
    })
  }, [user])

  const signIn = useCallback((s: TravellerSession) => {
    storeTravellerToken(s.token)
    setUser(s.user)
  }, [])
  const signOut = useCallback(() => {
    storeTravellerToken(null)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut])
  return <TravellerCtx.Provider value={value}>{children}</TravellerCtx.Provider>
}
