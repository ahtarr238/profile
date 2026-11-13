// /api/guestbook
//   GET  → the approved messages, newest first (public, cached a minute at the edge)
//   POST ← { name, message, lang, website } from the guestbook form. Nothing is shown until the
//          owner approves it in /admin. Same visitor rules as /api/track: real browsers on this
//          site only, no cookies, no IPs stored. "website" is a field people can't see: bots fill it.
import { pipeline, redisReady } from './_redis.js'
import { realVisitor, visitorId } from './_visitor.js'
import { dayKey } from './_stats.js'
import { KEYS, MAX_PENDING, checkEntry, newEntry, parseList, publicEntry, readJson } from './_guestbook.js'

const PER_DAY = 3 // messages one visitor can leave in a day

export default async function handler(req, res) {
  const send = (status, body, cache = 'no-store') => {
    res.statusCode = status
    res.setHeader('Cache-Control', cache)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  if (req.method === 'GET') {
    if (!redisReady) return send(200, { entries: [] })
    try {
      const [list] = await pipeline([['LRANGE', KEYS.approved, 0, 59]])
      return send(200, { entries: parseList(list).map(publicEntry) }, 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
    } catch {
      return send(200, { entries: [] })
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return send(405, { error: 'method' })
  }
  if (!redisReady) return send(503, { error: 'off' })
  if (!realVisitor(req)) return send(403, { error: 'forbidden' })

  const data = readJson(req)
  // the hidden field: a person never sees it, a bot fills it. Pretend it worked.
  if (String(data.website || '').trim()) return send(201, { ok: true })

  const entry = checkEntry(data)
  if (entry.error) return send(400, { error: entry.error })

  const day = dayKey()
  const visitor = visitorId(req, day)
  try {
    const key = `rl:gb:${visitor}:${day}`
    const [count] = await pipeline([
      ['INCR', key],
      ['EXPIRE', key, 2 * 86400],
    ])
    if (count > PER_DAY) return send(429, { error: 'too_many' })
    await pipeline([
      ['LPUSH', KEYS.pending, JSON.stringify(newEntry(entry, data.lang))],
      ['LTRIM', KEYS.pending, 0, MAX_PENDING - 1],
    ])
    return send(201, { ok: true })
  } catch {
    return send(502, { error: 'unavailable' })
  }
}
