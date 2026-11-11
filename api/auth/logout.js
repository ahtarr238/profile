// POST /api/auth/logout with "Authorization: Bearer <token>" → revokes that token at GitHub,
// so a signed-out session can't be reused even if the token was copied somewhere.
// Always answers 204, so it tells a caller nothing.
import { config, isUserToken, noStore, revoke } from '../_auth.js'

export default async function handler(req, res) {
  noStore(res)
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Allow', 'POST')
    return res.end()
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (isUserToken(token)) await revoke(config(), token)
  res.statusCode = 204
  res.end()
}
