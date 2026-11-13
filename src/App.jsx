import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { trackPageview } from './lib/track'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Footer from './components/Footer'
import Cursor from './components/Cursor'
import LikeButton from './components/LikeButton'
import Loader from './components/Loader'
import { LenisContext, useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageProvider'

// below the hero: its own chunk, mounted just after the first paint
const Sections = lazy(() => import('./components/Sections'))

export default function App() {
  const lenis = useLenis()
  useEffect(trackPageview, [])
  // speed as this visitor gets it: loaded once the page is idle (the browser keeps the timings
  // from page start, so starting late misses nothing), kept out of the first render
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => import('./lib/vitals').then((m) => m.reportVitals()), { timeout: 3000 })
    return () => cancel(id)
  }, [])
  // the loading screen plays on every page load, refreshes included
  const [loading, setLoading] = useState(true) // the loader is on screen
  const [ready, setReady] = useState(false) // the hero may play its entrance
  const reveal = useCallback(() => setReady(true), [])
  const gone = useCallback(() => setLoading(false), [])
  // the rest of the page mounts once the browser has painted the loader and the hero
  const [rest, setRest] = useState(false)
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => setRest(true), { timeout: 600 })
    return () => cancel(id)
  }, [])
  return (
    <LanguageProvider>
      <LenisContext.Provider value={lenis}>
        <MotionConfig reducedMotion="never">
          {loading && <Loader onReveal={reveal} onGone={gone} />}
          <Cursor />
          <Nav />
          <main>
            <Hero ready={ready} />
            {rest && (
              <Suspense fallback={null}>
                <Sections />
              </Suspense>
            )}
          </main>
          <Footer />
          <LikeButton />
        </MotionConfig>
      </LenisContext.Provider>
    </LanguageProvider>
  )
}
