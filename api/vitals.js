// POST /api/vitals ← one beacon per visit from the public site: how fast the page was for this
// visitor (LCP, INP, CLS, FCP, TTFB). Same rules as /api/track: real browsers on this site only,
// no cookies, nothing about the person stored, a quiet 204 for everything.
import { pipeline, redisReady } from './_redis.js'
import { body, realVisitor, visitorId } from './_visitor.js'
import { KEEP_SECONDS, dayKey, k } from './_stats.js'
import { METRICS, bucketOf } from './_vitals.js'

// a tablet loads like a phone, so it counts with phones
const device = (ua) => (/mobi|android|iphone|ipad|tablet/i.test(ua) ? 'mobile' : 'desktop')

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

  const data = body(req)
  const dev = device(String(req.headers['user-agent'] || ''))
  const fields = Object.keys(METRICS)
    .map((metric) => [metric, bucketOf(metric, data[metric])])
    .filter(([, b]) => b >= 0)
    .map(([metric, b]) => `${metric}:${dev}:${b}`)
  if (!fields.length) return done()

  const day = dayKey()
  const visitor = visitorId(req, day)
  try {
    const minute = Math.floor(Date.now() / 60000)
    const [hits] = await pipeline([
      ['INCR', `rl:vit:${visitor}:${minute}`],
      ['EXPIRE', `rl:vit:${visitor}:${minute}`, 120],
    ])
    if (hits > 10) return done()
    await pipeline([...fields.map((f) => ['HINCRBY', k.vitals(day), f, 1]), ['EXPIRE', k.vitals(day), KEEP_SECONDS]])
  } catch {
    // a lost measurement is fine
  }
  return done()
}
