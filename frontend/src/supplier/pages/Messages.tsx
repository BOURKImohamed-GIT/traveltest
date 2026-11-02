import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SITE_NAME } from '../../config'
import PhotoPicker from '../../components/PhotoPicker'
import PhotoStrip from '../../components/PhotoStrip'
import { supplierApi } from '../api'
import { useSupplier } from '../sessionContext'
import type { TeamMessage } from '../types'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Private conversation with the platform team. New messages also arrive by email. */
export default function Messages() {
  const { user, setUser } = useSupplier()
  const [list, setList] = useState<TeamMessage[] | null>(null)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      supplierApi.messages().then(
        (m) => {
          if (!alive) return
          setList(m)
          // Opening the conversation marks it read: refresh the badges.
          supplierApi.me().then((u) => alive && setUser(u), () => {})
        },
        (e: Error) => alive && setError(e.message),
      )
    load()
    const timer = window.setInterval(load, 20_000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [setUser])

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [list?.length])

  async function send(e?: FormEvent) {
    e?.preventDefault()
    if ((!text.trim() && !photos.length) || sending) return
    setSending(true)
    setError('')
    try {
      const m = await supplierApi.sendMessage(text.trim(), photos)
      setList((l) => [...(l ?? []), m])
      setText('')
      setPhotos([])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send()
  }

  if (!user) return null

  return (
    <>
      <h1 className="dash-title">Messages</h1>
      <section className="panel chat">
        <header className="chat-head">
          <span className="chat-avatar" aria-hidden="true">
            {SITE_NAME.charAt(0)}
          </span>
          <div>
            <strong>{SITE_NAME} team</strong>
            <span className="fine">Questions about your listings, bookings or account. We usually answer within one working day.</span>
          </div>
        </header>

        <div className="chat-body" aria-live="polite">
          {list === null && !error && <p className="fine">Loading…</p>}
          {list?.length === 0 && (
            <p className="chat-empty">
              No messages yet. Write to us below: we get an email right away, and you get one when we answer.
            </p>
          )}
          {list?.map((m) => (
            <div key={m.id} className={`chat-msg ${m.from === 'business' ? 'mine' : 'theirs'}`}>
              {m.text && <p>{m.text}</p>}
              {m.photos?.length > 0 && <PhotoStrip photos={m.photos} />}
              <span className="chat-meta">
                {m.from === 'business' ? 'You' : m.author} · {when(m.date)}
                {m.from === 'business' && (m.read ? ' · Seen' : ' · Sent')}
              </span>
            </div>
          ))}
          <div ref={end} />
        </div>

        <form className="chat-form" onSubmit={send}>
          <label htmlFor="chat-text" className="visually-hidden">
            Your message
          </label>
          <textarea
            id="chat-text"
            className="textarea"
            rows={3}
            maxLength={5000}
            placeholder={`Write to the ${SITE_NAME} team…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
          />
          <div className="chat-actions">
            <PhotoPicker files={photos} onChange={setPhotos} max={5} label="Add photos" compact />
            <button type="submit" className="btn btn-brand" disabled={sending || (!text.trim() && !photos.length)}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <p className="fine chat-note">You also receive our messages by email at {user.email}. Ctrl + Enter sends. You can add up to 5 photos per message.</p>
      </section>
    </>
  )
}
