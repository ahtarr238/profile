// Shared bits for the GitHub sign-in functions. Files starting with "_" are not routes on Vercel.
//
// Environment variables (Vercel → Settings → Environment Variables → Production only):
//   GITHUB_CLIENT_ID      from the GitHub App
//   GITHUB_CLIENT_SECRET  from the GitHub App (server only, never VITE_*)
//   ADMIN_GITHUB_ID       numeric id of the one GitHub account allowed in (ids never change; usernames can)
//   GITHUB_REPO           owner/name of this site's repo, e.g. ahtarr238/profile
//   PUBLIC_ORIGIN         the live site, e.g. https://ahtar.vercel.app (never taken from request headers)
import crypto from 'node:crypto'

export const STATE_COOKIE = '__Host-admin_oauth_state'
export const PKCE_COOKIE = '__Host-admin_pkce'
export const HANDOFF_COOKIE = '__Host-admin_handoff'

export function config() {
  const c = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    adminId: String(process.env.ADMIN_GITHUB_ID || '').trim(),
    repo: String(process.env.GITHUB_REPO || '').trim(),
    origin: String(process.env.PUBLIC_ORIGIN || '')
      .trim()
      .replace(/\/+$/, ''),
  }
  c.ready = Boolean(
    c.clientId && c.clientSecret && /^\d+$/.test(c.adminId) && /^[\w.-]+\/[\w.-]+$/.test(c.repo) && /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(c.origin),
  )
  c.callback = `${c.origin}/api/auth/callback`
  return c
}

export const cookie = (name, value, maxAge, { httpOnly = true, sameSite = 'Lax' } = {}) =>
  `${name}=${value}; Path=/; Secure; SameSite=${sameSite}; Max-Age=${maxAge}${httpOnly ? '; HttpOnly' : ''}`

export function cookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

export function sameSecret(a, b) {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}

export function redirect(res, location) {
  res.statusCode = 302
  res.setHeader('Location', location)
  res.end()
}

/** Errors go back in the #fragment: only a short code, never a token. */
export const backWithError = (res, code) => redirect(res, `/admin#error=${encodeURIComponent(code)}`)

const ghHeaders = (auth) => ({
  Authorization: auth,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'portfolio-admin',
})

/** The GitHub account behind a token, or null. */
export const githubUser = (token) =>
  fetch('https://api.github.com/user', { headers: ghHeaders(`Bearer ${token}`) })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

export const githubRepo = (token, repo) =>
  fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders(`Bearer ${token}`) })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

export const isUserToken = (t) => /^ghu_[A-Za-z0-9_]{20,255}$/.test(String(t || ''))

/** Invalidates a user token at GitHub, so it can't be used again. */
export async function revoke(c, token) {
  if (!isUserToken(token) || !c.clientId || !c.clientSecret) return
  await fetch(`https://api.github.com/applications/${c.clientId}/token`, {
    method: 'DELETE',
    headers: ghHeaders(`Basic ${Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64')}`),
    body: JSON.stringify({ access_token: token }),
  }).catch(() => {})
}
