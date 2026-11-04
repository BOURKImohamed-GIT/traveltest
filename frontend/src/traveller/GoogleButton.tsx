import { useEffect, useRef, useState } from 'react'
import { USING_SAMPLE_DATA } from '../config'
import { useAsync } from '../useAsync'
import { travellerApi } from './api'
import type { TravellerSession } from './types'

interface GoogleId {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let script: Promise<void> | null = null

/** Google Identity Services, loaded once. */
function loadGoogle(): Promise<void> {
  script ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      script = null
      reject(new Error('Could not load Google sign-in. Check your connection and try again.'))
    }
    document.head.appendChild(s)
  })
  return script
}

/**
 * "Continue with Google". Hidden until the site has a Google Client ID (Agency details → Google sign-in).
 * The preview without WordPress shows a look-alike button that opens a demo account.
 */
export default function GoogleButton({ onSession, onError }: { onSession: (s: TravellerSession) => void; onError: (msg: string) => void }) {
  const config = useAsync(() => travellerApi.config().catch(() => ({ googleClientId: '' })), [])
  const box = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const clientId = config.data?.googleClientId ?? ''

  useEffect(() => {
    if (!clientId || USING_SAMPLE_DATA || !box.current) return
    const el = box.current
    loadGoogle().then(
      () => {
        const id = window.google?.accounts.id
        if (!id) return
        id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            setBusy(true)
            travellerApi
              .google(credential)
              .then(onSession, (e: Error) => onError(e.message))
              .finally(() => setBusy(false))
          },
        })
        id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: Math.min(el.clientWidth || 320, 400) })
      },
      (e: Error) => onError(e.message),
    )
  }, [clientId, onSession, onError])

  if (!clientId) return null
  return (
    <div className="google-signin">
      {USING_SAMPLE_DATA ? (
        <button type="button" className="google-fake" onClick={() => travellerApi.google('demo').then(onSession)}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      ) : (
        <div ref={box} aria-busy={busy} />
      )}
      <p className="or-line">
        <span>or with email</span>
      </p>
    </div>
  )
}
