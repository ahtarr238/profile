import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenisInstance } from '../hooks/useLenis'
import { useLang } from '../i18n/context'
import { band } from '../data/content'

const ease = [0.22, 1, 0.36, 1]
const lift = [0.76, 0, 0.24, 1] // slow start, quick middle, soft landing: a curtain
const MIN_MS = 1700 // long enough for the scene to draw itself, short enough not to be in the way
const MAX_MS = 4500 // a slow network never keeps anyone here longer than this
const COLUMNS = 5

// A ridge like the hero's Gunung Salak: a broad massif with a jagged crown, in a 600×120 box.
const RIDGE = (() => {
  const pts = []
  for (let x = 0; x <= 600; x += 6) {
    const massif = 70 * Math.exp(-Math.pow((x - 330) / 150, 2))
    const crown = 14 * Math.exp(-Math.pow((x - 300) / 14, 2)) + 18 * Math.exp(-Math.pow((x - 350) / 12, 2)) + 9 * Math.exp(-Math.pow((x - 395) / 16, 2))
    const left = 34 * Math.exp(-Math.pow((x - 90) / 80, 2))
    const ripple = Math.sin(x * 0.09) * 2.2 + Math.sin(x * 0.23) * 1.2
    pts.push(`${x},${(112 - Math.max(massif + crown, left) - ripple).toFixed(1)}`)
  }
  return `M${pts.join(' L')}`
})()

/**
 * One digit of the counter, rolling like a meter. It follows the progress value directly
 * (hundreds, tens or ones by `place`), so the counter never re-renders the loader.
 */
function Digit({ progress, place }) {
  const y = useTransform(progress, (v) => `-${Math.floor(Math.round(v * 100) / place) % 10}em`)
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <motion.span className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-500 ease-out" style={{ y }}>
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} className="block h-[1em] leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

/**
 * The first screen of a visit. The name rises letter by letter; underneath, the hero's own scene
 * draws itself as the site loads: a mountain ridge traced left to right and the sun rising behind
 * it, both following what is really loading (the fonts and the hero's picture layers), with the
 * counter rolling to match. Then the screen splits into columns that lift away one after another,
 * and the hero plays its entrance (`onReveal`); `onGone` fires once the last column is gone.
 */
export default function Loader({ onReveal, onGone }) {
  const lenis = useLenisInstance()
  const { t } = useLang()
  const progress = useMotionValue(0) // what is shown, 0…1
  const [word, setWord] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const target = useRef(0)
  const gone = useRef(false)
  const sunY = useTransform(progress, [0, 1], [118, 40]) // rises from behind the ridge
  const glow = useTransform(progress, [0, 1], [0.3, 1])

  // keep the page still underneath
  useEffect(() => {
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      lenis?.start()
      document.documentElement.style.overflow = ''
      // fonts and pictures came in while this was up; let the hero's scroll effects measure the page afresh
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }
  }, [lenis])

  // the words under the name tick over while it loads
  useEffect(() => {
    if (leaving) return
    const id = setInterval(() => setWord((w) => (w + 1) % band.length), 420)
    return () => clearInterval(id)
  }, [leaving])

  useEffect(() => {
    let alive = true
    const start = performance.now()
    const glide = (to) => {
      target.current = Math.max(target.current, to)
      animate(progress, target.current, { duration: 0.8, ease })
    }
    // what the first screen needs: the fonts and every picture layer of the hero
    const images = [...document.querySelectorAll('#top img')]
    const tasks = [document.fonts?.ready ?? Promise.resolve(), ...images.map((img) => (img.decode ? img.decode() : Promise.resolve()).catch(() => {}))]
    let done = 0
    tasks.forEach((task) =>
      Promise.resolve(task).then(() => {
        done += 1
        // the last stretch is kept for the finish, so the counter never sits at 100 waiting
        if (alive) glide((done / tasks.length) * 0.85)
      }),
    )
    const all = Promise.all(tasks)
    const timeout = new Promise((resolve) => setTimeout(resolve, MAX_MS))
    Promise.race([all, timeout]).then(() => {
      const wait = Math.max(0, MIN_MS - (performance.now() - start))
      setTimeout(() => {
        if (!alive) return
        animate(progress, 1, { duration: 0.6, ease }).then(() => {
          if (!alive) return
          // a short beat on 100, then the curtain
          setTimeout(() => {
            if (!alive) return
            setLeaving(true)
            onReveal()
          }, 220)
        })
      }, wait)
    })
    // a safety net: whatever happens (an animation that never finishes), the page is never left locked
    const failsafe = setTimeout(() => {
      if (!alive) return
      onReveal()
      onGone()
    }, MAX_MS + 3500)
    return () => {
      alive = false
      clearTimeout(failsafe)
    }
  }, [progress, onReveal, onGone])

  const letters = [...'ahtar']
  const finish = () => {
    if (gone.current) return
    gone.current = true
    onGone()
  }

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100]">
      {/* the curtain: columns that lift away one after another */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: COLUMNS }, (_, i) => (
          <motion.div
            key={i}
            className="h-full flex-1 bg-ground"
            // a hair of overlap so no seam shows between columns
            style={{ marginRight: i < COLUMNS - 1 ? -1 : 0 }}
            initial={{ y: '0%' }}
            animate={{ y: leaving ? '-100%' : '0%' }}
            transition={{ duration: 0.9, ease: lift, delay: leaving ? 0.15 + i * 0.07 : 0 }}
            onAnimationComplete={() => leaving && i === COLUMNS - 1 && finish()}
          />
        ))}
      </div>

      {/* everything on the curtain leaves just before it lifts */}
      <motion.div
        className="absolute inset-0 flex flex-col text-sky-soft"
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -40 : 0 }}
        transition={{ duration: 0.45, ease }}
      >
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          {/* the scene, drawn as it loads: the sun rises behind a ridge that traces itself */}
          <svg viewBox="0 0 600 120" className="w-[min(86vw,560px)] overflow-visible" aria-hidden="true">
            <defs>
              <radialGradient id="loader-sun">
                <stop offset="0" stopColor="#ffd6be" />
                <stop offset="0.55" stopColor="#ee6a48" />
                <stop offset="1" stopColor="#ee6a48" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="loader-glow">
                <stop offset="0" stopColor="#ee6a48" stopOpacity="0.9" />
                <stop offset="0.45" stopColor="#ee6a48" stopOpacity="0.35" />
                <stop offset="1" stopColor="#ee6a48" stopOpacity="0" />
              </radialGradient>
              <clipPath id="loader-above-ridge">
                <path d={`${RIDGE} L600,-200 L0,-200 Z`} />
              </clipPath>
            </defs>
            <g clipPath="url(#loader-above-ridge)">
              <motion.circle cx="250" r="120" fill="url(#loader-glow)" cy={sunY} style={{ opacity: glow }} />
              <motion.circle cx="250" r="30" fill="url(#loader-sun)" cy={sunY} />
            </g>
            <motion.path
              d={RIDGE}
              fill="none"
              stroke="#e9f1f8"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pathLength: progress }}
            />
          </svg>

          {/* the name */}
          <p className="font-display -mt-4 flex overflow-hidden pb-[0.08em] text-[clamp(64px,14vw,170px)] leading-[0.9] font-medium tracking-[-0.055em] md:-mt-8">
            {letters.map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block origin-bottom-left"
                initial={{ y: '115%', rotate: 9 }}
                animate={{ y: '0%', rotate: 0 }}
                transition={{ duration: 0.9, ease, delay: 0.08 + i * 0.07 }}
              >
                {ch}
              </motion.span>
            ))}
            <motion.span
              className="inline-block text-coral"
              initial={{ y: '-120%', opacity: 0 }}
              animate={{ y: ['-120%', '8%', '0%'], opacity: 1 }}
              transition={{ duration: 0.7, ease, delay: 0.55, times: [0, 0.7, 1] }}
            >
              .
            </motion.span>
          </p>

          {/* what I do, ticking over */}
          <div className="mt-3 h-7 overflow-hidden text-center text-[15px] text-mist md:text-[17px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={word}
                className="block leading-7"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.35, ease }}
              >
                {band[word]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>

        {/* the real progress: a label, a line, and the counter rolling like a meter */}
        <div className="mx-auto mb-7 w-full max-w-[1320px] px-6 md:mb-10 md:px-10">
          <div className="flex items-end justify-between">
            <span className="text-[13px] text-mist">{t('loading')}</span>
            <span className="font-display flex text-[44px] leading-none font-light text-sky-soft tabular-nums md:text-[64px]">
              {[100, 10, 1].map((place) => (
                <Digit key={place} progress={progress} place={place} />
              ))}
              <span className="ml-1 text-[0.4em] leading-[2.2] text-coral">%</span>
            </span>
          </div>
          <div className="relative mt-4 h-px bg-sky-soft/15">
            <motion.div className="absolute inset-0 origin-left bg-coral" style={{ scaleX: progress }} />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
