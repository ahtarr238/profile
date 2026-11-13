// Shared rules for the guestbook. Messages wait in "pending" until the owner approves them in
// /admin; only approved ones are ever shown. Kept as JSON strings in two Redis lists.
import crypto from 'node:crypto'

export const KEYS = { pending: 'gb:pending', approved: 'gb:approved' }
export const MAX_PENDING = 100 // older unread ones drop off, so a flood can't grow the store
export const MAX_APPROVED = 200
export const NAME_MAX = 40
export const MESSAGE_MAX = 280

const clean = (s, max) =>
  String(s ?? '')
    .normalize('NFC')
    // control characters and invisible direction tricks out, line breaks to spaces
    // eslint-disable-next-line no-control-regex -- removing control characters is the point
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

// links are how guestbook spam pays off, so a message with one is refused outright
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|id|co|xyz|ru|cn|info|biz|top|site|online|link|app|dev)\b)/i

/** { name, message } ready to store, or { error } saying what's wrong. */
export function checkEntry(raw = {}) {
  const name = clean(raw.name, NAME_MAX + 1)
  const message = clean(raw.message, MESSAGE_MAX + 1)
  if (name.length < 1) return { error: 'name' }
  if (name.length > NAME_MAX) return { error: 'name_long' }
  if (message.length < 2) return { error: 'message' }
  if (message.length > MESSAGE_MAX) return { error: 'message_long' }
  if (LINK.test(name) || LINK.test(message)) return { error: 'link' }
  return { name, message }
}

export const newEntry = ({ name, message }, lang) => ({
  id: crypto.randomBytes(8).toString('hex'),
  name,
  message,
  lang: lang === 'id' ? 'id' : 'en',
  at: new Date().toISOString(),
})

/** Parses stored entries, skipping anything that isn't one of ours. */
export const parseList = (list) =>
  (Array.isArray(list) ? list : [])
    .map((raw) => {
      try {
        const e = JSON.parse(raw)
        return e && typeof e.id === 'string' && typeof e.message === 'string' ? { ...e, raw } : null
      } catch {
        return null
      }
    })
    .filter(Boolean)

/** What the public page gets: no ids for the raw store, nothing but what's shown. */
export const publicEntry = ({ id, name, message, at }) => ({ id, name, message, at })

export function readJson(req, limit = 2048) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
  try {
    const text = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '')
    return text.length > limit ? {} : JSON.parse(text)
  } catch {
    return {}
  }
}
