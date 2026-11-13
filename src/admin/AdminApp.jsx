import { useCallback, useEffect, useState } from 'react'
import { LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import '@fontsource-variable/inter'
import './admin.css'
import { GithubIcon } from '../components/BrandIcons'
import { GitHub } from './github'
import { REPO, SESSION_MINUTES } from './config'
import { Brand, FeaturedIcon, Notice } from './ui'
import { Button } from '@/admin/components/ui/button'
import { friendly, signInError } from './errors'
import Dashboard from './Dashboard'

// Sign-in is GitHub's: the password, the 2FA code and the "is this person allowed" check all
// happen at GitHub and in /api/auth/callback. This screen only keeps the resulting token for
// this tab, and GitHub decides what that token can touch (this one repo, nothing else).
//
// A session lasts exactly SESSION_MINUTES from sign-in, busy or not. When it ends the token is
// revoked at GitHub, so it is dead everywhere, and the next visit needs a fresh sign-in.

const SESSION_MS = SESSION_MINUTES * 60 * 1000
const SESSION = 'ahtar-admin-session'

const validSession = (s) =>
  s &&
  typeof s === 'object' &&
  s.repo === REPO &&
  /^ghu_[A-Za-z0-9_]{20,255}$/.test(s.token || '') &&
  Number.isFinite(s.expiresAt) &&
  s.expiresAt - Date.now() <= SESSION_MS // nothing can stretch a session past the limit

const store = {
  get() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION) || 'null')
      return validSession(s) ? s : null
    } catch {
      return null
    }
  },
  set(s) {
    try {
      sessionStorage.setItem(SESSION, JSON.stringify(s))
    } catch {
      // storage blocked: the session simply won't survive a reload
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(SESSION)
    } catch {
      // nothing stored
    }
  },
}

/** Asks the server to revoke the token at GitHub, then forgets it here. */
async function endSession(session) {
  store.clear()
  if (!session?.token) return
  await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {})
}

const HANDOFF = '__Host-admin_handoff'

/**
 * Picks up a fresh sign-in. The token comes in a one-minute cookie that only this site's
 * /api/auth/callback can set (a __Host- cookie can't be planted by another site or a link),
 * and is deleted the moment it's read. The #fragment only ever carries an error code.
 */
function takeSignIn() {
  const out = {}
  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const code = params.get('error')
    const detail = params.get('detail')
    window.history.replaceState(null, '', window.location.pathname)
    if (code) out.error = signInError(code, /^[a-z_]{1,40}$/.test(detail || '') ? detail : '')
  }
  const m = document.cookie.match(/(?:^|;\s*)__Host-admin_handoff=([^;]+)/)
  if (!m) return out
  document.cookie = `${HANDOFF}=; Path=/; Secure; SameSite=Strict; Max-Age=0`
  try {
    const p = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))
    const session = {
      token: p.token,
      login: String(p.login || ''),
      repo: p.repo,
      branch: /^[\w./-]+$/.test(p.branch || '') ? p.branch : 'main',
      expiresAt: Date.now() + Math.min((Number(p.expires_in) || 0) * 1000, SESSION_MS),
    }
    if (validSession(session)) out.session = session
  } catch {
    // unreadable hand-off: ignored, the user simply signs in again
  }
  return out
}

export default function AdminApp() {
  const [stage, setStage] = useState('checking') // checking | login | ready
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')

  const signOut = useCallback(async (message = '') => {
    await endSession(store.get())
    setSession(null)
    setError(message)
    setStage('login')
  }, [])

  // the admin's light look (admin.css) hangs off <html>, so popups rendered into <body> get it too
  useEffect(() => {
    document.documentElement.classList.add('admin-ui')
    return () => document.documentElement.classList.remove('admin-ui')
  }, [])

  // keep the page out of search results
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.append(meta)
    document.title = 'Admin · ahtar.'
    return () => meta.remove()
  }, [])

  useEffect(() => {
    let on = true
    ;(async () => {
      const fresh = takeSignIn()
      if (fresh.error) setError(fresh.error)
      if (fresh.session) {
        // a new sign-in replaces any older session in this tab; revoke the old token first
        const old = store.get()
        if (old && old.token !== fresh.session.token) await endSession(old)
        store.set(fresh.session)
      }
      // a session saved before an older version of this page (no hard limit) is not trusted either
      const raw = (() => {
        try {
          return JSON.parse(sessionStorage.getItem(SESSION) || 'null')
        } catch {
          return null
        }
      })()
      const s = store.get()
      if (!s) {
        if (raw?.token) await endSession(raw)
        return on && setStage('login')
      }
      if (Date.now() >= s.expiresAt) {
        await endSession(s)
        if (!on) return
        setError(`Your ${SESSION_MINUTES}-minute session ended. Sign in again.`)
        setStage('login')
        return
      }
      // the token still has to work and still has write access, or it's no use
      try {
        const repo = await new GitHub(s).api('')
        if (!repo.permissions?.push) throw Object.assign(new Error('no push'), { status: 403 })
        if (!on) return
        setSession(s)
        setStage('ready')
      } catch (e) {
        await endSession(s)
        if (!on) return
        setError(friendly(e))
        setStage('login')
      }
    })()
    return () => {
      on = false
    }
  }, [])

  // the hard limit: at expiresAt the session ends and the token is revoked, whatever you're doing
  useEffect(() => {
    if (stage !== 'ready' || !session) return
    const t = setTimeout(
      () => signOut(`Your ${SESSION_MINUTES}-minute session ended. Sign in again.`),
      Math.max(0, session.expiresAt - Date.now()),
    )
    // timers can be paused in a background tab: check again whenever the tab comes back
    const recheck = () => {
      if (document.visibilityState === 'visible' && Date.now() >= session.expiresAt) signOut(`Your ${SESSION_MINUTES}-minute session ended. Sign in again.`)
    }
    document.addEventListener('visibilitychange', recheck)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [stage, session, signOut])

  if (stage === 'ready') return <Dashboard session={session} onSignOut={() => signOut()} />

  return (
    <div className="flex min-h-svh flex-col bg-white">
      <header className="px-5 pt-6 md:px-8 md:pt-8">
        <Brand />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-16 pb-12 md:items-center md:pt-0">
        <div className="w-full max-w-[400px]">
          {stage === 'checking' ? (
            <div className="flex flex-col items-center text-center">
              <FeaturedIcon icon={LoaderCircle} className="[&_svg]:animate-spin" />
              <p className="mt-4 text-sm text-ut-600">Checking your session…</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center text-center">
                <FeaturedIcon icon={LockKeyhole} className="size-12 rounded-[10px] [&_svg]:size-6" />
                <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-ut-900 md:text-[30px] md:leading-[38px]">Log in to the admin</h1>
                <p className="mt-2 text-base text-ut-600">Use the GitHub account that owns the site. GitHub asks for your password and two-factor code.</p>
              </div>
              {error && <Notice tone="error" className="mt-6">{error}</Notice>}
              {/* the sign-in runs in Vercel functions (api/), which the Vite dev server doesn't run */}
              {import.meta.env.DEV && (
                <Notice className="mt-6">
                  Sign-in only works on the live site: GitHub hands the key to a Vercel function that doesn’t run on localhost.
                </Notice>
              )}
              <Button asChild variant="outline" size="lg" className="mt-8 w-full">
                <a href="/api/auth/login">
                  <GithubIcon size={20} />
                  Sign in with GitHub
                </a>
              </Button>
            </>
          )}
        </div>
      </main>
      <footer className="flex items-start gap-2 px-5 pb-6 text-sm text-ut-600 md:px-8 md:pb-8">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ut-500" strokeWidth={1.9} aria-hidden="true" />
        <p>
          Only the site owner’s GitHub account gets in. Each sign-in lasts {SESSION_MINUTES} minutes, then the key is revoked.
        </p>
      </footer>
    </div>
  )
}
