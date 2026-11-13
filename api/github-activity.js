// GET /api/github-activity → how busy the site owner has been on GitHub lately, for the
// "Lately" section: activity per day for the last 12 weeks, plus totals.
// Only public events, read from GitHub's public API by the server (visitors' browsers never
// talk to GitHub), cached for half an hour in Redis and at the edge, so GitHub sees a couple of
// requests an hour however many people visit.
import { pipeline, redisReady } from './_redis.js'
import { dayKey, lastDays } from './_stats.js'

const OWNER = (process.env.GITHUB_REPO || 'ahtarr238/profile').split('/')[0]
const FRESH_MS = 30 * 60 * 1000
const CACHE_KEY = 'gh:activity:v2'
const DAYS = 84 // twelve weeks

const KIND = {
  PushEvent: 'push',
  PullRequestEvent: 'pr',
  CreateEvent: 'create',
  ReleaseEvent: 'release',
  IssuesEvent: 'issue',
  PullRequestReviewEvent: 'review',
}

async function fetchEvents() {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'portfolio-activity' }
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(OWNER)}/events/public?per_page=100`, { headers })
  if (!res.ok) throw new Error(`github ${res.status}`)
  return res.json()
}

/** The summary the page shows: counts per day only, no repo names or messages leave the server. */
export function summarize(events, now = new Date()) {
  const days = lastDays(DAYS, now)
  const counts = Object.fromEntries(days.map((d) => [d, 0]))
  for (const e of Array.isArray(events) ? events : []) {
    const kind = KIND[e?.type]
    if (!kind || typeof e.repo?.name !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(e.repo.name)) continue
    if (kind === 'create' && e.payload?.ref_type !== 'repository') continue // new branches and tags are noise
    const day = dayKey(new Date(e.created_at))
    if (day in counts) counts[day] += 1
  }
  const series = days.map((date) => ({ date, count: counts[date] }))
  let streak = 0
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].count > 0) streak += 1
    else if (i === series.length - 1) continue // nothing yet today doesn't break it
    else break
  }
  return {
    owner: OWNER,
    days: series,
    total: series.reduce((s, d) => s + d.count, 0),
    activeDays: series.filter((d) => d.count > 0).length,
    streak,
    updated: now.toISOString(),
  }
}

export default async function handler(req, res) {
  const send = (status, body, cache) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', cache)
    res.end(JSON.stringify(body))
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return send(405, { error: 'method' }, 'no-store')
  }
  const edge = 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400'

  let cached = null
  if (redisReady) {
    try {
      const [raw] = await pipeline([['GET', CACHE_KEY]])
      cached = raw ? JSON.parse(raw) : null
    } catch {
      cached = null
    }
  }
  if (cached && Date.now() - new Date(cached.updated).getTime() < FRESH_MS) return send(200, cached, edge)

  try {
    const summary = summarize(await fetchEvents())
    if (redisReady) await pipeline([['SET', CACHE_KEY, JSON.stringify(summary), 'EX', 7 * 86400]]).catch(() => {})
    return send(200, summary, edge)
  } catch {
    // GitHub down or rate-limited: yesterday's picture beats an empty one
    if (cached) return send(200, cached, 'public, max-age=0, s-maxage=300')
    return send(503, { error: 'unavailable' }, 'no-store')
  }
}
