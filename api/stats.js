// GET /api/stats?days=30 with "Authorization: Bearer <GitHub token>" → visitor numbers for /admin.
// Only the admin's GitHub account gets an answer: the token is checked with GitHub on every call.
import { config, githubUser, isUserToken, noStore } from './_auth.js'
import { pipeline, redisReady } from './_redis.js'
import { EVENTS, k, lastDays } from './_stats.js'

const pairs = (flat) => {
  const out = {}
  for (let i = 0; Array.isArray(flat) && i < flat.length; i += 2) out[flat[i]] = Number(flat[i + 1]) || 0
  return out
}
const add = (into, from) => {
  for (const [key, n] of Object.entries(from)) into[key] = (into[key] || 0) + n
  return into
}
const top = (obj, n = 8) =>
  Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)

export default async function handler(req, res) {
  noStore(res)
  const send = (status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  if (req.method !== 'GET') return send(405, { error: 'method' })

  const c = config()
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!c.ready || !isUserToken(token)) return send(401, { error: 'unauthorized' })
  const user = await githubUser(token)
  if (!user || String(user.id) !== c.adminId) return send(401, { error: 'unauthorized' })

  if (!redisReady) return send(200, { configured: false })

  const n = [7, 30, 90].includes(Number(new URL(req.url, 'http://x').searchParams.get('days'))) ? Number(new URL(req.url, 'http://x').searchParams.get('days')) : 30
  const days = lastDays(n)
  const PER_DAY = 8 // commands per day below
  try {
    const perDay = days.flatMap((d) => [
      ['GET', k.views(d)],
      ['PFCOUNT', k.visitors(d)],
      ['HGETALL', k.refs(d)],
      ['HGETALL', k.countries(d)],
      ['HGETALL', k.devices(d)],
      ['HGETALL', k.events(d)],
      ['GET', k.likes(d)],
      ['HGETALL', k.items(d)],
    ])
    const out = await pipeline([...perDay, ['PFCOUNT', ...days.map(k.visitors)], ['GET', k.total], ['GET', k.likesTotal]])
    const refs = {}
    const countries = {}
    const devices = {}
    const events = Object.fromEntries(EVENTS.map((e) => [e, 0]))
    const items = {}
    const series = days.map((date, i) => {
      const [views, visitors, r, co, de, ev, lk, it] = out.slice(i * PER_DAY, i * PER_DAY + PER_DAY)
      add(refs, pairs(r))
      add(countries, pairs(co))
      add(devices, pairs(de))
      add(events, pairs(ev))
      add(items, pairs(it))
      return { date, views: Number(views) || 0, visitors: Number(visitors) || 0, likes: Number(lk) || 0 }
    })
    const [uniqueVisitors, allTime, likesAllTime] = out.slice(days.length * PER_DAY)
    return send(200, {
      configured: true,
      days: n,
      series,
      views: series.reduce((s, d) => s + d.views, 0),
      visitors: Number(uniqueVisitors) || 0,
      allTime: Number(allTime) || 0,
      likes: series.reduce((s, d) => s + d.likes, 0),
      likesAllTime: Number(likesAllTime) || 0,
      referrers: top(refs),
      countries: top(countries),
      devices,
      events,
      items, // "project_open:ontime" → count; the admin matches ids to titles
    })
  } catch {
    return send(502, { error: 'stats_unavailable' })
  }
}
