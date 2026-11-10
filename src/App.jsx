import { MotionConfig } from 'motion/react'
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
          <Band />
          <About />
          <Certificates />
          <Projects />
          <Contact />
        </main>
        <Footer />
      </MotionConfig>
    </LenisContext.Provider>
  )
}
