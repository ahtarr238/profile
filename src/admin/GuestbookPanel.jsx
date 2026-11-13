import { useCallback, useEffect, useState } from 'react'
import { Check, Inbox, MessageSquareText, Trash2 } from 'lucide-react'
import { friendly } from './errors'
import { FeaturedIcon, Notice } from './ui'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Card } from '@/admin/components/ui/card'
import { Skeleton } from '@/admin/components/ui/skeleton'

const when = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Guestbook moderation. New messages wait here; approving one puts it on the site (within a
 * minute, the public list is cached that long), deleting one removes it for good. This acts on
 * the live guestbook straight away: there's no draft or Publish step for messages.
 */
export default function GuestbookPanel({ token }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [asking, setAsking] = useState(null)

  const call = useCallback(
    async (init) => {
      const r = await fetch('/api/guestbook-admin', {
        ...init,
        headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
      })
      if (r.status === 404) throw new Error('The guestbook only works on the live site (it runs on Vercel).')
      if (r.status === 401) throw new Error('Your sign-in ran out. Sign in again.')
      if (!r.ok) throw new Error('The guestbook isn’t answering right now.')
      return r.json()
    },
    [token],
  )

  const load = useCallback(async () => {
    try {
      setData(await call())
      setError('')
    } catch (e) {
      setError(friendly(e))
    }
  }, [call])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the list comes from the server
    load()
  }, [load])

  const act = async (action, id) => {
    setBusy(id)
    try {
      await call({ method: 'POST', body: JSON.stringify({ action, id }) })
      await load()
    } catch (e) {
      setError(friendly(e))
    }
    setBusy(null)
    setAsking(null)
  }

  if (error) return <Notice tone="error">{error}</Notice>
  if (!data)
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Loading the guestbook">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl bg-ut-100" />
        ))}
      </div>
    )
  if (data.configured === false) return <Notice>The guestbook needs the Upstash Redis store, the same one the visitor stats use.</Notice>

  const row = (e, waiting) => (
    <li key={e.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6 md:px-6">
      <div className="min-w-0">
        <p className="text-sm leading-6 break-words whitespace-pre-line text-ut-900">{e.message}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ut-600">
          <span className="font-medium text-ut-700">{e.name}</span>
          <span aria-hidden="true">·</span>
          <span>{when(e.at)}</span>
          <Badge variant="secondary" className="uppercase">
            {e.lang || 'en'}
          </Badge>
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        {asking === e.id ? (
          <>
            <span className="mr-1 text-sm font-medium text-[#b42318]">Delete for good?</span>
            <Button variant="outline" size="sm" onClick={() => setAsking(null)} disabled={busy === e.id}>
              Keep
            </Button>
            <Button variant="destructive" size="sm" onClick={() => act('delete', e.id)} disabled={busy === e.id}>
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setAsking(e.id)} disabled={busy === e.id} aria-label={`Delete the message from ${e.name}`}>
              <Trash2 strokeWidth={1.9} aria-hidden="true" /> Delete
            </Button>
            {waiting && (
              <Button size="sm" onClick={() => act('approve', e.id)} disabled={busy === e.id} aria-label={`Approve the message from ${e.name}`}>
                <Check strokeWidth={2} aria-hidden="true" /> {busy === e.id ? 'Approving…' : 'Approve'}
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  )

  const block = (title, text, list, waiting, empty) => (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-start justify-between gap-3 px-4 py-5 md:px-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ut-900">
            {title} <Badge variant={waiting && list.length ? 'default' : 'secondary'}>{list.length}</Badge>
          </h2>
          <p className="mt-0.5 text-sm text-ut-600">{text}</p>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center border-t border-ut-200 px-6 py-10 text-center">
          <FeaturedIcon icon={waiting ? Inbox : MessageSquareText} />
          <p className="mt-3 text-sm text-ut-600">{empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-ut-200 border-t border-ut-200">{list.map((e) => row(e, waiting))}</ul>
      )}
    </Card>
  )

  return (
    <div className="grid gap-6">
      <p className="text-sm text-ut-600">
        Approving or deleting acts on the site straight away; there’s nothing to publish. The site picks up changes within a minute.
      </p>
      {block('Waiting for you', 'New messages. Nothing here is on the site yet.', data.pending, true, 'All caught up. New messages show up here.')}
      {block('On the site', 'Approved messages, newest first.', data.approved, false, 'Nothing approved yet.')}
    </div>
  )
}
