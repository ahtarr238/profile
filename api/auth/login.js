// GET /api/auth/login → sends the browser to GitHub to sign in.
// Two short-lived, script-proof cookies tie the sign-in to this browser:
//   state  – the callback only accepts the sign-in this browser started (stops login CSRF)
//   PKCE   – GitHub only hands out a token to whoever holds the matching secret
import crypto from 'node:crypto'
import { PKCE_COOKIE, STATE_COOKIE, config, cookie, noStore, redirect } from '../_auth.js'

export default function handler(req, res) {
  noStore(res)
  const c = config()
  if (!c.ready) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.end(`Admin sign-in is not configured yet.\n\nCheck these Vercel environment variables (Production), then redeploy:\n- ${c.problems.join('\n- ')}\n`)
  }
  const state = crypto.randomBytes(32).toString('base64url')
  const verifier = crypto.randomBytes(48).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  res.setHeader('Set-Cookie', [cookie(STATE_COOKIE, state, 600), cookie(PKCE_COOKIE, verifier, 600)])

  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', c.clientId)
  url.searchParams.set('redirect_uri', c.callback)
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('allow_signup', 'false')
  redirect(res, url.toString())
}
