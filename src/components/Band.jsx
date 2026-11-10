import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform, useVelocity } from 'motion/react'
import { band } from '../data/content'

const wrap = (min, max, v) => {
  const r = max - min
  return ((((v - min) % r) + r) % r) + min
}

/**
 * The tilted strip of words. It drifts on its own, speeds up while the page scrolls
 * and turns around when you scroll back up. Hovering it slows it to a stop.
 */
export default function Band() {
  const base = useMotionValue(0)
  const { scrollY } = useScroll()
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 })
  const boost = useTransform(velocity, [-1500, 0, 1500], [-6, 0, 6], { clamp: false })
  const dir = useRef(1)
  const pace = useSpring(1, { damping: 30, stiffness: 120 })
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`)

  useAnimationFrame((_, delta) => {
    const b = boost.get()
    if (b < 0) dir.current = -1
    else if (b > 0) dir.current = 1
    // 1.6% of the strip per second, plus a push from the scroll speed
    const step = dir.current * -1.6 * (delta / 1000) * (1 + Math.abs(b)) * pace.get()
    base.set(base.get() + step)
  })

  const run = [...band, ...band]
  const words = (key) => (
    <div key={key} className="flex shrink-0 items-center">
      {run.map((w, i) => (
        <span key={i} className="flex items-center">
          <span className="font-display px-6 text-[22px] font-light whitespace-nowrap md:px-8 md:text-[30px]">{w}</span>
          <span className="font-display text-[22px] font-light text-coral md:text-[30px]">&amp;</span>
        </span>
      ))}
    </div>
  )

  return (
    <section aria-label="What I do" className="relative h-[180px] overflow-hidden md:h-[240px]">
      <div
        onMouseEnter={() => pace.set(0)}
        onMouseLeave={() => pace.set(1)}
        className="absolute top-1/2 -left-[5%] w-[110%] -translate-y-1/2 -rotate-[4deg] border-y-2 border-sky-soft/80 bg-ground py-3 text-sky-soft md:py-4"
      >
        <motion.div style={{ x }} className="flex w-max will-change-transform">
          {words('a')}
          {words('b')}
        </motion.div>
      </div>
    </section>
  )
}
