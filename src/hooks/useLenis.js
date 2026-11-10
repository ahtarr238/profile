import { createContext, useContext, useEffect, useState } from 'react'
import Lenis from 'lenis'

export const LenisContext = createContext(null)
export const useLenisInstance = () => useContext(LenisContext)

// easeInOutQuart: starts gently, glides, settles softly
const easeInOut = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)

/**
 * Smooth wheel scrolling for every visitor. It only eases the wheel (touch keeps
 * the device's own scrolling), so it stays on even with reduced motion.
 */
export function useLenis() {
  const [lenis, setLenis] = useState(null)

  useEffect(() => {
    const instance = new Lenis({
      lerp: 0.07, // lower = longer glide after each wheel step
      wheelMultiplier: 1,
      smoothWheel: true,
    })
    let frame
    const raf = (time) => {
      instance.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)
    // Lenis is an external system; the state only hands the instance to the tree
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLenis(instance)
    return () => {
      cancelAnimationFrame(frame)
      instance.destroy()
      setLenis(null)
    }
  }, [])

  return lenis
}

/** Glide to a section id (or 0 for the top) with a fixed-length ease-in-out. */
export function scrollToId(lenis, id) {
  const target = id === 0 || id === 'top' ? 0 : document.getElementById(id)
  if (target === null) return
  if (lenis) {
    const distance = Math.abs((target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY) - window.scrollY)
    // longer trips take a little longer, between 0.9 s and 1.8 s
    const duration = Math.min(1.8, Math.max(0.9, distance / 2200))
    lenis.scrollTo(target, { offset: target === 0 ? 0 : -72, duration, easing: easeInOut })
  } else if (target === 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
