import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/admin/lib/utils'

const WARN_MS = 5 * 60 * 1000
const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function SessionClock({ left, className = '' }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 tabular-nums', left <= WARN_MS ? 'text-[#b54708]' : '', className)}
      title="Time left before you're signed out"
    >
      <Clock className="size-3.5" strokeWidth={2} aria-hidden="true" /> {mmss(left)}
    </span>
  )
}

/** Untitled UI's "used space" card, as the time left in this sign-in. */
export function SessionCard({ left, total }) {
  const share = Math.max(0, Math.min(1, left / total))
  const low = left <= WARN_MS
  return (
    <div className="rounded-lg bg-ut-50 px-4 py-5">
      <p className="text-sm font-medium text-ut-900">Session</p>
      <p className="mt-1 text-sm text-ut-600">
        Signed out in <span className={cn('tabular-nums', low && 'font-medium text-[#b54708]')}>{mmss(left)}</span>, then the key is revoked.
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ut-200" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', low ? 'bg-[#f79009]' : 'bg-brand-600')} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  )
}

export function SessionWarning({ left, dirty }) {
  if (left > WARN_MS) return null
  return (
    <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-[#fec84b] bg-[#fffcf5] p-4 text-sm text-[#b54708] shadow-xs">
      <AlertTriangle className="mt-px size-5 shrink-0 text-[#dc6803]" strokeWidth={1.9} aria-hidden="true" />
      <p className="leading-5">
        <span className="font-semibold">Your session ends in {mmss(left)}.</span>{' '}
        {dirty ? 'Publish your changes now, or they’ll be lost when you’re signed out.' : 'You’ll need to sign in again after that.'}
      </p>
    </div>
  )
}
