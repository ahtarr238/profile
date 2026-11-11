// The only repo the dashboard will ever write to. Public anyway; pinning it here means a
// session that points anywhere else is thrown away instead of used.
export const REPO = 'ahtarr238/profile'

// How long one sign-in lasts, counted from the moment you sign in. When it runs out the
// token is revoked at GitHub and you sign in again for a new one. Keep in step with
// SESSION_SECONDS in api/_auth.js.
export const SESSION_MINUTES = 30
