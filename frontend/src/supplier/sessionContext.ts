import { createContext, useContext } from 'react'
import type { Session, SupplierUser } from './types'

interface SupplierSession {
  /** undefined while checking a saved session; null when signed out. */
  user: SupplierUser | null | undefined
  signIn: (s: Session) => void
  signOut: () => void
  setUser: (u: SupplierUser) => void
}

export const Ctx = createContext<SupplierSession>({ user: null, signIn: () => {}, signOut: () => {}, setUser: () => {} })

/** The signed-in supplier (SupplierProvider in App). */
export const useSupplier = () => useContext(Ctx)
