import { useReducedMotion } from 'motion/react'

// Dev only: add ?motion to the URL to preview full motion on a machine
// that has "reduce motion" turned on at the OS level.
export const forceMotion =
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('motion')

/** True when big movement (smooth scroll, tilt, magnet, scaling) should be skipped. */
export function useReduceMotion() {
  const reduce = useReducedMotion()
  return forceMotion ? false : Boolean(reduce)
}
