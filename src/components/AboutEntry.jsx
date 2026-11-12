import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

// Ground (#070c1a) fading in along an eased curve, so the dark rises without a visible band or edge.
const RISE = [0, 0.04, 0.12, 0.24, 0.4, 0.58, 0.74, 0.87, 0.95, 1]
const fade = `linear-gradient(to bottom, ${RISE.map((a, i) => `rgb(7 12 26 / ${a}) ${(i / (RISE.length - 1)) * 100}%`).join(', ')})`

/**
 * The hand-over from the pinned hero to About. Nothing slides over the scene:
 * it darkens from the bottom up and from within, until it is the page's own ground,
 * and About carries on in the same dark. Runs for everyone, like the rest of the site's motion.
 *
 * It overlaps the hero's last screen, and nothing pads it out: About follows the dark straight away.
 */
export default function AboutEntry({ children }) {
  const ref = useRef(null)
  // 0 when this block's top enters at the bottom of the screen, 1 when it reaches the top
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start start'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.5 })
  // the whole visible scene dims as well, so the dark doesn't stop at a line
  const shade = useTransform(p, [0, 1], [0, 0.8])

  return (
    <div ref={ref} className="relative z-10 -mt-[100svh] bg-ground">
      {/* dims the visible scene above this block */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[100svh] h-[100svh] bg-ground" style={{ opacity: shade }} />
      {/* the dark rising just ahead of the block: fully dark where the block starts (2px of overlap hides any seam) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-[25svh] h-[calc(25svh+2px)]" style={{ backgroundImage: fade }} />
      {children}
    </div>
  )
}
