// GET /api/auth/callback → GitHub sends the browser back here after sign-in.
// Checks, in order: the state matches this browser's cookie, GitHub hands over a token for the
// PKCE secret this browser holds, the account is the one allowed admin (by numeric id), and it
// can push to this site's repo. Anything else ends with no token, and any token revoked.
//
// The token reaches the dashboard in a 60-second cookie only this site can set (__Host-),
// never in a URL, so it doesn't land in browser history and no link can plant a token.
import {
  HANDOFF_COOKIE,
  PKCE_COOKIE,
  SESSION_SECONDS,
  STATE_COOKIE,
  backWithError,
  config,
  cookie,
  cookies,
  githubRepo,
  githubUser,
  noStore,
  redirect,
  revoke,
  sameSecret,
} from '../_auth.js'

export default async function handler(req, res) {
  noStore(res)
  const jar = cookies(req)
  // state and PKCE are single-use: cleared whatever happens next
  const clear = [cookie(STATE_COOKIE, '', 0), cookie(PKCE_COOKIE, '', 0)]
  res.setHeader('Set-Cookie', clear)
  const c = config()
  if (!c.ready) return backWithError(res, 'not_configured')

  const url = new URL(req.url, 'http://local')
  const code = url.searchParams.get('code')
  const verifier = jar[PKCE_COOKIE]
  if (!code || !verifier || !sameSecret(url.searchParams.get('state'), jar[STATE_COOKIE])) return backWithError(res, 'state')

  let token = ''
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'portfolio-admin' },
      body: JSON.stringify({ client_id: c.clientId, client_secret: c.clientSecret, code, redirect_uri: c.callback, code_verifier: verifier }),
    })
    const data = await r.json()
    token = data.access_token || ''
    if (!token) return backWithError(res, 'exchange', data.error)

    const user = await githubUser(token)
    if (!user || String(user.id) !== c.adminId) {
      await revoke(c, token)
      return backWithError(res, 'not_allowed')
    }
    const repo = await githubRepo(token, c.repo)
    if (!repo?.permissions?.push) {
      await revoke(c, token)
      return backWithError(res, 'no_repo_access')
    }

    const handoff = Buffer.from(
      JSON.stringify({
        token,
        expires_in: Math.min(Number(data.expires_in) || SESSION_SECONDS, SESSION_SECONDS),
        login: user.login,
        repo: c.repo,
        branch: repo.default_branch || 'main',
      }),
    ).toString('base64url')
    // readable by the dashboard's script (not HttpOnly) for one minute, then gone
    res.setHeader('Set-Cookie', [...clear, cookie(HANDOFF_COOKIE, handoff, 60, { httpOnly: false, sameSite: 'Strict' })])
    return redirect(res, '/admin')
  } catch {
    await revoke(c, token)
    return backWithError(res, 'github')
  }
}
