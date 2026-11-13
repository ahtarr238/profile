// /api/guestbook-admin, for /admin only (the GitHub token is checked on every call, like /api/stats)
//   GET  → { pending, approved }
//   POST ← { action: 'approve' | 'delete', id }
import { config, githubUser, isUserToken, noStore } from './_auth.js'
import { pipeline, redisReady } from './_redis.js'
import { KEYS, MAX_APPROVED, parseList, publicEntry, readJson } from './_guestbook.js'

export default async function handler(req, res) {
  noStore(res)
  const send = (status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  if (req.method !== 'GET' && req.method !== 'POST') return send(405, { error: 'method' })

  const c = config()
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!c.ready || !isUserToken(token)) return send(401, { error: 'unauthorized' })
  const user = await githubUser(token)
  if (!user || String(user.id) !== c.adminId) return send(401, { error: 'unauthorized' })
  if (!redisReady) return send(200, { configured: false, pending: [], approved: [] })

  try {
    const [pendingRaw, approvedRaw] = await pipeline([
      ['LRANGE', KEYS.pending, 0, -1],
      ['LRANGE', KEYS.approved, 0, -1],
    ])
    const pending = parseList(pendingRaw)
    const approved = parseList(approvedRaw)

    if (req.method === 'GET') {
      const out = (e) => ({ ...publicEntry(e), lang: e.lang })
      return send(200, { configured: true, pending: pending.map(out), approved: approved.map(out) })
    }

    const { action, id } = readJson(req)
    if (!/^[a-f0-9]{16}$/.test(String(id || ''))) return send(400, { error: 'id' })
    const waiting = pending.find((e) => e.id === id)
    const shown = approved.find((e) => e.id === id)

    if (action === 'approve') {
      if (!waiting) return send(404, { error: 'not_found' })
      await pipeline([
        ['LREM', KEYS.pending, 1, waiting.raw],
        ['LPUSH', KEYS.approved, waiting.raw],
        ['LTRIM', KEYS.approved, 0, MAX_APPROVED - 1],
      ])
      return send(200, { ok: true })
    }
    if (action === 'delete') {
      if (!waiting && !shown) return send(404, { error: 'not_found' })
      await pipeline([...(waiting ? [['LREM', KEYS.pending, 1, waiting.raw]] : []), ...(shown ? [['LREM', KEYS.approved, 1, shown.raw]] : [])])
      return send(200, { ok: true })
    }
    return send(400, { error: 'action' })
  } catch {
    return send(502, { error: 'unavailable' })
  }
}
