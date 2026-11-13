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

// what counts as a section's content when placing it: the things people read and use, not the
// padding around them or the soft glows behind
const CONTENT = 'h1, h2, h3, p, img, video, figure, ol, ul, dl, form, button, a, [role="img"]'

/**
 * Where to stop so a section's content is seen whole: centred in the space under the navbar
 * when it fits there, otherwise starting just under the navbar.
 */
export function landing(el) {
  const nav = document.querySelector('header')?.offsetHeight || 72
  const margin = 16
  let top = Infinity
  let bottom = -Infinity
  for (const node of el.querySelectorAll(CONTENT)) {
    if (node.closest('[aria-hidden="true"]') && !node.matches('h2, [role="img"]')) continue
    const r = node.getBoundingClientRect()
    if (!r.width || !r.height) continue
    top = Math.min(top, r.top)
    bottom = Math.max(bottom, r.bottom)
  }
  if (top === Infinity) {
    const r = el.getBoundingClientRect()
    top = r.top
    bottom = r.bottom
  }
  const height = bottom - top
  const room = window.innerHeight - nav - 2 * margin
  const docTop = top + window.scrollY
  const y = height <= room ? docTop - nav - margin - (room - height) / 2 : docTop - nav - margin
  const max = document.documentElement.scrollHeight - window.innerHeight
  return Math.max(0, Math.min(max, Math.round(y)))
}

/** Glide to a section id (or 0 for the top) with a fixed-length ease-in-out. */
export function scrollToId(lenis, id) {
  const target = id === 0 || id === 'top' ? 0 : document.getElementById(id)
  if (target === null) return
  const y = target === 0 ? 0 : landing(target)
  if (lenis) {
    // longer trips take a little longer, between 0.9 s and 1.8 s
    const duration = Math.min(1.8, Math.max(0.9, Math.abs(y - window.scrollY) / 2200))
    lenis.scrollTo(y, { duration, easing: easeInOut })
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}
