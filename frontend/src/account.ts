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

/** "https://www.ergchebbi-camps.ma/fr" → "ergchebbi-camps" (same as tac_website_name on the server). */
export function websiteName(url: string): string {
  return websiteHost(url).split('.')[0]
}

/** "https://www.ergchebbi-camps.ma/fr" → "ergchebbi-camps.ma" ('' when not a website address). */
function websiteHost(url: string): string {
  const raw = url.trim()
  if (!raw) return ''
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase()
    return host.includes('.') ? host.replace(/^www\d*\./, '') : ''
  } catch {
    return ''
  }
}

/** "ergchebbi-camps.ma" → "Ergchebbi Camps": the business name a website suggests. */
export function nameFromWebsite(url: string): string {
  return websiteName(url)
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const nameKey = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** Suppliers: the business name must be the same as the website name (the server also refuses names already in use). */
export function businessNameProblem(name: string, website: string): string | null {
  const site = websiteName(website)
  if (!site) return 'Please enter your website address, for example https://your-business.ma'
  if (nameKey(name) !== nameKey(site)) return `Your business name must be the same as your website name. For ${websiteHost(website)}, use “${nameFromWebsite(website)}”.`
  return null
}

export const BUSINESS_NAME_HINT = 'Must be the same as your website name: for atlas-trekking.ma, use “Atlas Trekking”. Each business name can be used only once.'
