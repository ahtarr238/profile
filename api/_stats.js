// Shared definitions for visitor stats.
export const EVENTS = ['contact_whatsapp', 'contact_email', 'project_open', 'video_open', 'cert_open']
// these also say which project or certificate (by its id in cms.json), counted per item
export const ITEM_EVENTS = ['project_open', 'video_open', 'cert_open']
export const ITEM_ID = /^[a-z0-9][a-z0-9-]{0,59}$/ // the admin's slugs
export const MAX_ITEMS = 120 // per day: new ids past this are ignored, so made-up ids can't grow the store
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
  vitals: (d) => `stats:vitals:${d}`, // "lcp:mobile:4" → count (see _vitals.js)
  items: (d) => `stats:item:${d}`, // "video_open:ontime" → count
  total: 'stats:views:total',
  likes: (d) => `stats:likes:${d}`,
  likesTotal: 'stats:likes:total',
  likeSeen: (d, visitor) => `likes:seen:${d}:${visitor}`, // one like per visitor per day
}
