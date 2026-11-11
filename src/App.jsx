import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { trackPageview } from './lib/track'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Band from './components/Band'
import About from './components/About'
import Certificates from './components/Certificates'
import Projects from './components/Projects'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Cursor from './components/Cursor'
import LikeButton from './components/LikeButton'
import { LenisContext, useLenis } from './hooks/useLenis'
import { LanguageProvider } from './i18n/LanguageProvider'
import { useLang } from './i18n/context'

function SkipLink() {
  const { t } = useLang()
  return (
    <a
      href="#about"
      className="sr-only z-[70] rounded-[4px] bg-sky-soft px-4 py-2 text-ground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t('skip')}
    </a>
  )
}

export default function App() {
  const lenis = useLenis()
  useEffect(trackPageview, [])
  return (
    <LanguageProvider>
      <LenisContext.Provider value={lenis}>
        <MotionConfig reducedMotion="never">
          <SkipLink />
          <Cursor />
          <Nav />
          <main>
            <Hero />
            {/* slides up over the last screen of the pinned hero, so the scene hands straight over to About */}
            <div className="relative z-10 -mt-[100svh] rounded-t-[32px] bg-ground shadow-[0_-40px_90px_rgb(0_0_0/0.5)] md:rounded-t-[48px]">
              <Band />
              <About />
            </div>
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
