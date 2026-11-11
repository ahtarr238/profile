// POST /api/like ← the thumbs-up button. Counts at most one like per visitor per day.
// Same rules as /api/track: no cookies, no IPs stored, only real browsers on this site,
// and a quiet 204 for everything so probing it tells nothing.
import { pipeline, redisReady } from './_redis.js'
import { KEEP_SECONDS, dayKey, k } from './_stats.js'
import { realVisitor, visitorId } from './_visitor.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const done = () => {
    res.statusCode = 204
    res.end()
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    return res.end()
  }
  if (!redisReady || !realVisitor(req)) return done()

  const day = dayKey()
  const visitor = visitorId(req, day)
  try {
    const minute = Math.floor(Date.now() / 60000)
    const [hits] = await pipeline([
      ['INCR', `rl:like:${visitor}:${minute}`],
      ['EXPIRE', `rl:like:${visitor}:${minute}`, 120],
    ])
    if (hits > 5) return done()

    // SET NX: only the first like from this visitor today gets through
    const [first] = await pipeline([['SET', k.likeSeen(day, visitor), '1', 'NX', 'EX', 2 * 86400]])
    if (first !== 'OK') return done()
    await pipeline([
      ['INCR', k.likesTotal],
      ['INCR', k.likes(day)],
      ['EXPIRE', k.likes(day), KEEP_SECONDS],
    ])
  } catch {
    // a lost like is fine; the button never shows an error for it
  }
  return done()
}
