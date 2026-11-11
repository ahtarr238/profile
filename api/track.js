// POST /api/track ← the public site reports a page view or one of a few named clicks.
// Privacy: no cookies, nothing stored about the person. A visitor is counted once a day through
// a one-way hash of (secret + day + IP + browser) that changes every day and can't be reversed.
// Abuse: only same-site requests, bots ignored, at most 20 hits a minute per visitor.
import crypto from 'node:crypto'
import { pipeline, redisReady, redisSecret } from './_redis.js'
import { EVENTS, KEEP_SECONDS, dayKey, k } from './_stats.js'

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|monitor/i

function sameSite(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const origin = req.headers.origin
  if (origin) {
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  return req.headers['sec-fetch-site'] === 'same-origin'
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body
  try {
    return JSON.parse(String(req.body || '').slice(0, 512))
  } catch {
    return {}
  }
}

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
  if (!redisReady || !sameSite(req) || !ua || BOT.test(ua)) return done()

  const data = body(req)
  const isView = data.t === 'pageview'
  const event = !isView && EVENTS.includes(data.e) ? data.e : null
  if (!isView && !event) return done()

  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim()
  const day = dayKey()
  const visitor = crypto.createHmac('sha256', redisSecret).update(`${day}|${ip}|${ua}`).digest('base64url').slice(0, 22)

  try {
    const minute = Math.floor(Date.now() / 60000)
    const [hits] = await pipeline([
      ['INCR', `rl:${visitor}:${minute}`],
      ['EXPIRE', `rl:${visitor}:${minute}`, 120],
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
        ]
    await pipeline(cmds)
  } catch {
    // stats must never break the site; a lost hit is fine
  }
  return done()
}
