// How fast the page really was for this visitor (Core Web Vitals, via Google's web-vitals):
// collected while the page is open and sent once, as the visitor leaves, to /api/vitals.
// Same switches as the visit counter: nothing on localhost, /admin, or with Do Not Track.
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import { off } from './track'

export function reportVitals() {
  if (off) return
  const values = {}
  const keep = ({ name, value }) => {
    values[name.toLowerCase()] = name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value)
  }
  // registered before the listener below, so their final values land first when the page hides
  onLCP(keep)
  onCLS(keep)
  onINP(keep)
  onFCP(keep)
  onTTFB(keep)

  let sent = false
  const send = () => {
    if (sent || !Object.keys(values).length) return
    sent = true
    const body = new Blob([JSON.stringify(values)], { type: 'text/plain' })
    if (!navigator.sendBeacon?.('/api/vitals', body)) fetch('/api/vitals', { method: 'POST', body, keepalive: true }).catch(() => {})
  }
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && send())
  addEventListener('pagehide', send)
}
