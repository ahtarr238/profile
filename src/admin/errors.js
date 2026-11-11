// Plain-language messages for the admin screens.

const SIGN_IN = {
  state: 'That sign-in link expired or came from somewhere else. Sign in again.',
  exchange: 'GitHub didn’t finish the sign-in. Try again.',
  not_allowed: 'That GitHub account can’t edit this site.',
  no_repo_access: 'That GitHub account can’t write to the site’s repo.',
  not_configured: 'Admin sign-in isn’t set up yet. Follow docs/admin-setup.md.',
  github: 'GitHub didn’t answer. Try again in a minute.',
}

// GitHub's reasons for refusing the sign-in code, in plain words with the fix
const GITHUB_REASON = {
  redirect_uri_mismatch: `The GitHub App's Redirect URI must be exactly ${window.location.origin}/api/auth/callback.`,
  incorrect_client_credentials: 'GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET in Vercel is wrong. Generate a new client secret in the GitHub App, paste it into Vercel, then redeploy.',
  bad_verification_code: 'The sign-in code expired or was already used. Click Sign in again (don’t refresh the GitHub page).',
  invalid_grant: 'GitHub rejected the sign-in check (PKCE). Click Sign in again in the same tab.',
  unverified_user_email: 'Verify your email address on GitHub first.',
}

export const signInError = (code, detail) => {
  const base = SIGN_IN[code] || 'Sign-in failed. Try again.'
  if (!detail) return base
  return `${base} ${GITHUB_REASON[detail] || `GitHub said: ${detail}.`}`
}

export function friendly(err) {
  const msg = err?.message || String(err || '')
  if (err?.status === 401) return 'Your sign-in ran out. Sign in again.'
  if (err?.status === 403 || err?.status === 404) return 'GitHub refused this. Sign in again, or check the app is installed on the repo.'
  if (err?.status === 422 && /fast forward|update is not a fast/i.test(msg))
    return 'The site was changed somewhere else (another tab, or a code push) since you opened this page, so nothing was overwritten. Reload the page and make your change again.'
  if (err?.status === 409) return 'The site changed since you opened this page. Reload and try again.'
  if (/failed to fetch|network/i.test(msg)) return 'Can’t reach GitHub. Check your connection.'
  return msg || 'Something went wrong.'
}
