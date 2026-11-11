// Plain-language messages for the admin screens.

const SIGN_IN = {
  state: 'That sign-in link expired or came from somewhere else. Sign in again.',
  exchange: 'GitHub didn’t finish the sign-in. Try again.',
  not_allowed: 'That GitHub account can’t edit this site.',
  no_repo_access: 'That GitHub account can’t write to the site’s repo.',
  not_configured: 'Admin sign-in isn’t set up yet. Follow docs/admin-setup.md.',
  github: 'GitHub didn’t answer. Try again in a minute.',
}

export const signInError = (code) => SIGN_IN[code] || 'Sign-in failed. Try again.'

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
