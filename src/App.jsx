import { useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'motion/react'
import { trackPageview } from './lib/track'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Band from './components/Band'
import About from './components/About'
import AboutEntry from './components/AboutEntry'
import Certificates from './components/Certificates'
import Projects from './components/Projects'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Cursor from './components/Cursor'
import LikeButton from './components/LikeButton'
import Loader from './components/Loader'
import { LenisContext, useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageProvider'

export default function App() {
  const lenis = useLenis()
  useEffect(trackPageview, [])
  // the loading screen plays on every page load, refreshes included
  const [loading, setLoading] = useState(true) // the loader is on screen
  const [ready, setReady] = useState(false) // the hero may play its entrance
  const reveal = useCallback(() => setReady(true), [])
  const gone = useCallback(() => setLoading(false), [])
  return (
    <LanguageProvider>
      <LenisContext.Provider value={lenis}>
        <MotionConfig reducedMotion="never">
          {loading && <Loader onReveal={reveal} onGone={gone} />}
          <Cursor />
          <Nav />
          <main>
            <Hero ready={ready} />
            {/* rises over the last screen of the pinned hero: the dusk darkens into the page, no edge */}
            <AboutEntry>
              <Band />
              <About />
            </AboutEntry>
            <Projects />
            <Certificates />
            <Contact />
          </main>
          <Footer />
          <LikeButton />
        </MotionConfig>
      </LenisContext.Provider>
    </LanguageProvider>
  )
}
