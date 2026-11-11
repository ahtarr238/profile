import { Clock } from 'lucide-react'

const WARN_MS = 5 * 60 * 1000
const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function SessionClock({ left }) {
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${left <= WARN_MS ? 'text-coral' : ''}`} title="Time left before you're signed out">
      <Clock size={13} strokeWidth={1.75} aria-hidden="true" /> {mmss(left)}
    </span>
  )
}

export function SessionWarning({ left, dirty }) {
  if (left > WARN_MS) return null
  return (
    <p role="status" className="mt-4 rounded-[6px] bg-coral/15 px-4 py-3 text-[14px] text-coral">
      Your session ends in {mmss(left)}.{' '}
      {dirty ? 'Publish your changes now, or they’ll be lost when you’re signed out.' : 'You’ll need to sign in again after that.'}
    </p>
  )
}
