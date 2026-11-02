import { API_URL } from './config'
import { ApiError } from './errors'

/** Shown next to every "new password" field; matches the server's rules (account-security.php). */
export const PASSWORD_HINT = 'At least 8 characters, with letters and at least one number. Not your email address.'

/** Same rules as the server, checked before sending so the message appears at once. */
export function passwordProblem(password: string, email = ''): string | null {
  if (password.length < 8) return 'Use at least 8 characters.'
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return 'Use letters and at least one number.'
  const e = email.toLowerCase()
  if (e && (password.toLowerCase() === e || password.toLowerCase() === e.split('@')[0])) return 'Do not use your email address as your password.'
  return null
}

export interface ResetResult {
  status: 'reset'
  /** true: the account is a supplier account (sign in at /supplier/login). */
  supplier: boolean
}

/** Set a new password with the link from the reset email (travel/v1/auth/reset). */
export async function resetPassword(login: string, key: string, password: string): Promise<ResetResult> {
  if (!API_URL) return new Promise((r) => setTimeout(() => r({ status: 'reset', supplier: false }), 150))
  const res = await fetch(`${API_URL}/auth/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, key, password }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(body?.message || `Request failed (${res.status})`, res.status)
  return body as ResetResult
}
