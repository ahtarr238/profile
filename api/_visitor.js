// Who is calling, without ever storing who they are. Shared by /api/track and /api/like.
import crypto from 'node:crypto'
import { redisSecret } from './_redis.js'

export const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|curl|wget|python|axios|node-fetch|go-http|java\/|httpclient|monitor/i

/** Only requests made by this site's own pages count. */
export function sameSite(req) {
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

/** A real browser on this site, not a bot, script or another site. */
export function realVisitor(req) {
  const ua = String(req.headers['user-agent'] || '')
  return Boolean(ua) && !BOT.test(ua) && sameSite(req)
}

export function body(req) {
  if (req.body && typeof req.body === 'object') return req.body
  try {
    return JSON.parse(String(req.body || '').slice(0, 512))
  } catch {
    return {}
  }
}

/**
 * A one-way hash of (secret + day + IP + browser). It changes every day and can't be turned
 * back into an IP, so the same person is recognised for one day only.
 */
export function visitorId(req, day) {
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim()
  const ua = String(req.headers['user-agent'] || '')
  return crypto.createHmac('sha256', redisSecret).update(`${day}|${ip}|${ua}`).digest('base64url').slice(0, 22)
}
