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
import { LenisContext, useLenis } from './hooks/useLenis'

export default function App() {
  const lenis = useLenis()
  useEffect(trackPageview, [])
  return (
    <LenisContext.Provider value={lenis}>
      <MotionConfig reducedMotion="never">
        <a
          href="#about"
          className="sr-only z-[70] rounded-[4px] bg-sky-soft px-4 py-2 text-ground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
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
      </MotionConfig>
    </LenisContext.Provider>
  )
}
