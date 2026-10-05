import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(pathname + search)}`} replace />
  return <>{children}</>
}
