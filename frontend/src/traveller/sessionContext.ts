import { createContext, useContext } from 'react'
import type { Traveller, TravellerSession } from './types'

interface TravellerState {
  /** undefined while checking a saved session; null when signed out. */
  user: Traveller | null | undefined
  signIn: (s: TravellerSession) => void
  signOut: () => void
  /** Replace the signed-in traveller's details (after saving them). */
  setUser: (u: Traveller) => void
}

export const TravellerCtx = createContext<TravellerState>({ user: null, signIn: () => {}, signOut: () => {}, setUser: () => {} })

/** The signed-in traveller (TravellerProvider in App). */
export const useTraveller = () => useContext(TravellerCtx)
