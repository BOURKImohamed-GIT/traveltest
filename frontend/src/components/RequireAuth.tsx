import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname, search } = useLocation()
  if (!user) {
    // Business pages pre-select the business account type on the sign-in page.
    const business = pathname.startsWith('/account/listings') || pathname.startsWith('/account/requests')
    return <Navigate to={`/signin?${business ? 'type=supplier&' : ''}next=${encodeURIComponent(pathname + search)}`} replace />
  }
  return <>{children}</>
}
