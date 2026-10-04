import { useEffect, useRef, useState } from 'react'

interface GoogleId {
  initialize: (opts: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const SCRIPT = 'https://accounts.google.com/gsi/client'
let loading: Promise<void> | undefined

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = undefined
      reject(new Error('Could not load Google sign-in.'))
    }
    document.head.appendChild(s)
  })
  return loading
}

/** Google's own "Continue with Google" button. */
export default function GoogleButton({ clientId, onCredential }: { clientId: string; onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const callback = useRef(onCredential)
  useEffect(() => {
    callback.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let active = true
    loadScript().then(
      () => {
        const id = window.google?.accounts.id
        if (!active || !id || !ref.current) return
        id.initialize({ client_id: clientId, callback: (r) => callback.current(r.credential) })
        id.renderButton(ref.current, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 300 })
      },
      (e: Error) => active && setError(e.message),
    )
    return () => {
      active = false
    }
  }, [clientId])

  return (
    <>
      <div ref={ref} className="google-button" />
      {error && (
        <p className="notice error" role="alert">
          {error} Check your connection and reload the page.
        </p>
      )}
    </>
  )
}
