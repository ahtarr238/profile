// Tells /api/track about a page view or one of a few named clicks. No cookies, no IDs, nothing
// stored in the browser. Skipped on localhost, on /admin, and when the browser asks not to be tracked.
export const off =
  typeof window === 'undefined' ||
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) ||
  window.location.pathname.startsWith('/admin') ||
  navigator.doNotTrack === '1' ||
  navigator.globalPrivacyControl === true

function send(payload) {
  if (off) return
  const body = JSON.stringify(payload)
  // sendBeacon survives the page closing (e.g. right after "Send on WhatsApp")
  if (navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'text/plain' }))) return
  fetch('/api/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
}

let viewed = false
export function trackPageview() {
  if (viewed) return
  viewed = true
  let ref = ''
  try {
    ref = document.referrer ? new URL(document.referrer).hostname : ''
  } catch {
    // unreadable referrer counts as direct
  }
  send({ t: 'pageview', r: ref })
}

/**
 * One of: contact_whatsapp, contact_email, project_open, video_open, cert_open. The last three
 * take the project's or certificate's id from cms.json, so the admin can show which one.
 */
export const trackEvent = (e, id) => send({ t: 'event', e, ...(id ? { i: id } : {}) })
