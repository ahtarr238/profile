// Shared definitions for visitor stats.
export const EVENTS = ['contact_whatsapp', 'contact_email', 'video_open', 'cert_open']
export const KEEP_SECONDS = 400 * 24 * 3600 // a little over a year of daily counters

// days are counted in Indonesian time, so "today" matches the owner's day
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
export const dayKey = (d = new Date()) => dayFmt.format(d) // YYYY-MM-DD

export function lastDays(n, now = new Date()) {
  const out = []
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(now.getTime() - i * 86400000)))
  return out
}

export const k = {
  views: (d) => `stats:views:${d}`,
  visitors: (d) => `stats:uv:${d}`,
  refs: (d) => `stats:ref:${d}`,
  countries: (d) => `stats:country:${d}`,
  devices: (d) => `stats:device:${d}`,
  events: (d) => `stats:event:${d}`,
  total: 'stats:views:total',
}
