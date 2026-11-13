// POST /api/track ← the public site reports a page view or one of a few named clicks.
// Privacy: no cookies, nothing stored about the person. A visitor is counted once a day through
// a one-way hash of (secret + day + IP + browser) that changes every day and can't be reversed.
// Abuse: only same-site requests, bots ignored, at most 20 hits a minute per visitor.
import { pipeline, redisReady } from './_redis.js'
import { body, realVisitor, visitorId } from './_visitor.js'
import { EVENTS, ITEM_EVENTS, ITEM_ID, KEEP_SECONDS, MAX_ITEMS, dayKey, k } from './_stats.js'

const device = (ua) => (/ipad|tablet/i.test(ua) ? 'tablet' : /mobi|android|iphone/i.test(ua) ? 'mobile' : 'desktop')

function referrer(raw, ownHost) {
  const host = String(raw || '')
    .toLowerCase()
    .replace(/^www\./, '')
    .slice(0, 60)
  if (!host || host === ownHost.replace(/^www\./, '')) return 'direct'
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : 'other'
}

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
  const ua = String(req.headers['user-agent'] || '')
  // anything we won't count still gets a quiet 204, so there's nothing to learn by probing
  if (!redisReady || !realVisitor(req)) return done()

  const data = body(req)
  const isView = data.t === 'pageview'
  const event = !isView && EVENTS.includes(data.e) ? data.e : null
  if (!isView && !event) return done()
  const item = event && ITEM_EVENTS.includes(event) && ITEM_ID.test(String(data.i || '')) ? `${event}:${data.i}` : null

  const day = dayKey()
  const visitor = visitorId(req, day)

  try {
    const minute = Math.floor(Date.now() / 60000)
    const [hits, , itemCount, itemKnown] = await pipeline([
      ['INCR', `rl:${visitor}:${minute}`],
      ['EXPIRE', `rl:${visitor}:${minute}`, 120],
      // room for this item today? (an id already counted always is)
      ...(item ? [['HLEN', k.items(day)], ['HEXISTS', k.items(day), item]] : []),
    ])
    if (hits > 20) return done()

    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase()
    const country = /^[A-Z]{2}$/.test(req.headers['x-vercel-ip-country'] || '') ? req.headers['x-vercel-ip-country'] : '??'
    const cmds = isView
      ? [
          ['INCR', k.views(day)],
          ['PFADD', k.visitors(day), visitor],
          ['HINCRBY', k.refs(day), referrer(data.r, host), 1],
          ['HINCRBY', k.countries(day), country, 1],
          ['HINCRBY', k.devices(day), device(ua), 1],
          ['INCR', k.total],
          ...[k.views(day), k.visitors(day), k.refs(day), k.countries(day), k.devices(day)].map((key) => ['EXPIRE', key, KEEP_SECONDS]),
        ]
      : [
          ['HINCRBY', k.events(day), event, 1],
          ['EXPIRE', k.events(day), KEEP_SECONDS],
          ...(item && (Number(itemKnown) === 1 || Number(itemCount) < MAX_ITEMS)
            ? [
                ['HINCRBY', k.items(day), item, 1],
                ['EXPIRE', k.items(day), KEEP_SECONDS],
              ]
            : []),
        ]
    await pipeline(cmds)
  } catch {
    // stats must never break the site; a lost hit is fine
  }
  return done()
}
