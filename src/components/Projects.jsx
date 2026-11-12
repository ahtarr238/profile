import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react'
import { ArrowLeft, ArrowRight, Maximize2, Volume2, VolumeX, X } from 'lucide-react'
import { projects } from '../data/content'
import Tag from './Tag'
import RevealText from './RevealText'
import { trackEvent } from '../lib/track'
import { useLang } from '../i18n/context'
import { useLenisInstance } from '../hooks/useLenis'
import { useMedia } from '../hooks/useMedia'

const ease = [0.22, 1, 0.36, 1]
const num = (i) => String(i + 1).padStart(2, '0')
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
// the stage is a loop: positions go on forever, and every project sits at its nearest copy
const wrapIndex = (i, n) => ((i % n) + n) % n
const wrapDistance = (d, n) => d - n * Math.round(d / n)

/**
 * A project's intro video in its white frame. It plays muted only while it is the project in
 * front (`active`), on screen and not covered by the detail panel (`suspend`); one button turns
 * the sound on. `mediaRef` gets the frame, which the detail panel flies from and back to.
 */
function ProjectVideo({ project, mediaRef, active = true, suspend = false, curtain = true, still = false }) {
  const ref = useRef(null)
  const frameRef = useRef(null)
  const seen = useInView(frameRef, { once: true, amount: 0.05 })
  const open = !curtain || seen
  const [visible, setVisible] = useState(false)
  const [muted, setMuted] = useState(true)
  const { t, pick } = useLang()
  const title = pick(project, 'title')

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 })
    io.observe(video)
    return () => io.disconnect()
  }, [])

  const playing = active && visible && !suspend
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (playing) {
      // a beat before it starts: the download and decoding don't compete with the scroll or swipe that brought it here
      const id = setTimeout(() => video.play().catch(() => {}), 350)
      return () => clearTimeout(id)
    } else {
      video.pause()
      if (!active && !document.fullscreenElement) {
        video.muted = true
        setMuted(true)
      }
    }
  }, [playing, active])

  const toggleSound = () => {
    const video = ref.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    if (!video.muted) video.play().catch(() => {})
  }

  // Full screen with sound, and sideways on phones that allow it, so the captions are readable.
  const expand = async () => {
    const video = ref.current
    if (!video) return
    trackEvent('video_open')
    video.muted = false
    setMuted(false)
    video.play().catch(() => {})
    try {
      if (video.requestFullscreen) await video.requestFullscreen()
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen() // iPhone Safari
      await screen.orientation?.lock?.('landscape')
    } catch {
      // full screen or rotation refused: the video simply keeps playing in place
    }
  }

  // leaving full screen puts the video back to its quiet, muted loop
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const onChange = () => {
      if (document.fullscreenElement) return
      screen.orientation?.unlock?.()
      video.muted = true
      setMuted(true)
    }
    document.addEventListener('fullscreenchange', onChange)
    video.addEventListener('webkitendfullscreen', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      video.removeEventListener('webkitendfullscreen', onChange)
    }
  }, [])

  const control =
    'inline-flex size-10 items-center justify-center gap-2 rounded-[4px] bg-ground/80 text-[13px] text-sky-soft transition-colors duration-150 ease-out hover:bg-coral hover:text-ground'

  return (
    // The curtain watches this unclipped wrapper: a fully clipped element never counts as "on screen".
    <div ref={frameRef} className="h-full">
      <motion.div
        ref={mediaRef}
        initial={curtain ? { clipPath: 'inset(100% 0% 0% 0% round 10px)' } : false}
        animate={{ clipPath: open ? 'inset(0% 0% 0% 0% round 10px)' : 'inset(100% 0% 0% 0% round 10px)' }}
        transition={{ duration: 1.1, ease }}
        className="relative overflow-hidden rounded-[10px] bg-white p-1.5 md:p-3"
      >
        <div className="relative aspect-video overflow-hidden rounded-[6px] bg-tile">
          {still ? (
            // projects at the side are just their poster: no video element, nothing to buffer or decode
            <img src={project.poster} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <video
              ref={ref}
              src={project.video}
              poster={project.poster}
              muted
              loop
              playsInline
              // nothing downloads until the video plays (play() then fetches it); the poster shows meanwhile
              preload="none"
              aria-label={t('projects.video', { title })}
              onClick={() => {
                // phones: a tap on the project in front opens it big
                if (active && window.matchMedia('(max-width: 767px)').matches) expand()
              }}
              className="size-full object-cover"
            />
          )}
          {active && !still && (
            <div className="absolute right-2 bottom-2 z-10 flex gap-2 sm:right-3 sm:bottom-3">
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={!muted}
                aria-label={muted ? t('projects.soundOn') : t('projects.soundOff')}
                className={`${control} sm:w-auto sm:px-3`}
              >
                {muted ? <VolumeX size={16} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />}
                <span className="hidden sm:inline">{muted ? t('projects.soundOn') : t('projects.soundOff')}</span>
              </button>
              <button type="button" onClick={expand} aria-label={t('projects.fullscreen', { title })} className={control}>
                <Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function RoleBadge({ role }) {
  const { t } = useLang()
  if (!role) return null
  return (
    <span className="inline-flex h-7 items-center rounded-[4px] border border-coral/70 px-2.5 text-[12px] text-coral">
      {role === 'Contributor' ? t('projects.contributor') : role}
    </span>
  )
}

/**
 * One project on the 3D stage. Its place comes from `pos` (the stage's position, in projects):
 * the one in front faces you; the others step aside, turn toward the middle and sink back.
 */
function Card({ project, index, pos, front, active, near, suspend, mediaRef, onPick }) {
  const { t, pick } = useLang()
  // how far from the front, in projects (+ = to the right), the short way round the loop
  const d = useTransform(pos, (v) => wrapDistance(index - v, projects.length))
  const x = useTransform(d, (v) => `${clamp(v, -3, 3) * 64}%`)
  const rotateY = useTransform(d, (v) => clamp(-v * 44, -58, 58))
  const z = useTransform(d, (v) => -Math.min(Math.abs(v), 3) * 280)
  const opacity = useTransform(d, (v) => clamp(2.6 - Math.abs(v), 0, 1))
  const shade = useTransform(d, (v) => Math.min(Math.abs(v), 1.4) * 0.5)
  const zIndex = useTransform(d, (v) => 50 - Math.round(Math.abs(v) * 10))

  // too far round the loop to be seen: not rendered at all (fewer 3D layers for the phone to draw)
  if (!near) return null

  return (
    <motion.div style={{ x, rotateY, z, opacity, zIndex }} className="absolute inset-0 will-change-transform [backface-visibility:hidden]">
      <ProjectVideo project={project} mediaRef={mediaRef} active={active} suspend={suspend} still={!front} curtain={front} />
      {/* the ones at the side sit in shadow */}
      <motion.div aria-hidden="true" style={{ opacity: shade }} className="pointer-events-none absolute inset-0 rounded-[10px] bg-ground" />
      {!active && (
        <button
          type="button"
          onClick={() => onPick(index)}
          aria-label={t('projects.goTo', { n: index + 1, title: pick(project, 'title') })}
          className="absolute inset-0 cursor-pointer rounded-[10px]"
        />
      )}
    </motion.div>
  )
}

/** Moves `el` from the `from` box to where it sits now (or back to it, with `reverse`), by transform only. */
function fly(el, from, { reverse = false } = {}) {
  const to = el.getBoundingClientRect()
  if (!from || !to.width || !to.height) return Promise.resolve()
  const d = { x: from.left - to.left, y: from.top - to.top, sx: from.width / to.width, sy: from.height / to.height }
  el.style.transformOrigin = '0 0'
  const keyframes = reverse
    ? { x: [0, d.x], y: [0, d.y], scaleX: [1, d.sx], scaleY: [1, d.sy] }
    : { x: [d.x, 0], y: [d.y, 0], scaleX: [d.sx, 1], scaleY: [d.sy, 1] }
  return animate(el, keyframes, { duration: reverse ? 0.55 : 0.75, ease })
}

/**
 * The whole story of one project. Its video flies up out of the stage into place,
 * the words follow; closing flies it back.
 */
function ProjectDetail({ index, fromRect, slideRect, onIndex, onClosed }) {
  const { t, pick } = useLang()
  const lenis = useLenisInstance()
  const project = projects[index]
  const mediaRef = useRef(null)
  const closeRef = useRef(null)
  const [closing, setClosing] = useState(false)
  const first = useRef(true)

  // fly in once, on open; switching to the next project inside the panel just cross-fades
  useLayoutEffect(() => {
    if (!first.current) return
    first.current = false
    if (mediaRef.current) fly(mediaRef.current, fromRect)
  }, [fromRect])

  const close = useCallback(async () => {
    if (closing) return
    setClosing(true)
    if (mediaRef.current) await fly(mediaRef.current, slideRect(), { reverse: true })
    onClosed()
  }, [closing, slideRect, onClosed])

  // while open: the page behind stays put and focus starts on the close button
  useEffect(() => {
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
  }, [lenis])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const next = (index + 1) % projects.length
  const title = pick(project, 'title')

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-ground"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? 0.45 : 0.4, ease }}
      />
      {/* One screen, no scrolling: video and words side by side on wide screens, stacked on narrow ones.
          The video's width comes from the height left for it, so the whole panel always fits. */}
      <div data-lenis-prevent className="relative h-full overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col justify-center gap-4 px-4 pt-14 pb-2 sm:gap-5 sm:pb-4 sm:px-6 sm:pt-16 min-[1600px]:max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-center lg:gap-14 lg:px-10 lg:py-16">
          <div className="mx-auto w-full max-w-[min(100%,calc(36svh_*_16_/_9_+_12px))] [@media(max-height:680px)]:max-w-[min(100%,calc(26svh_*_16_/_9_+_12px))] sm:max-w-[min(100%,calc(42svh_*_16_/_9_+_24px))] lg:max-w-[min(100%,calc((100svh_-_160px)_*_16_/_9_+_24px))]">
            <div key={project.id}>
              <ProjectVideo project={project} mediaRef={mediaRef} curtain={false} />
            </div>
          </div>

          <motion.div
            key={`text-${project.id}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: closing ? 0 : 1, y: closing ? 10 : 0 }}
            transition={{ duration: closing ? 0.2 : 0.6, ease, delay: closing ? 0 : 0.3 }}
            className="mx-auto w-full max-w-[640px] lg:max-w-none"
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-[14px] text-coral tabular-nums">
                {num(index)} <span className="text-dim">/ {num(projects.length - 1)}</span>
              </span>
              <RoleBadge role={project.role} />
            </div>
            <h2 className="font-display mt-1.5 text-[28px] leading-[1.05] font-normal tracking-[-0.03em] text-sky-soft sm:text-[36px] lg:text-[46px]">{title}</h2>
            <p className="mt-3 text-[14px] leading-6 text-mist sm:text-[15px] sm:leading-7 lg:mt-5 lg:text-[16px]">{pick(project, 'description')}</p>
            <ul className="mt-3 flex flex-wrap gap-2 sm:mt-4 lg:mt-6">
              {pick(project, 'tags').map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
            {projects.length > 1 && (
              <button
                type="button"
                onClick={() => onIndex(next)}
                className="group/next mt-4 flex w-full items-center justify-between gap-3 border-t border-sky-soft/15 pt-4 text-left text-[14px] text-mist transition-colors duration-150 hover:text-sky-soft sm:mt-5 lg:mt-8"
              >
                <span className="min-w-0">
                  <span className="block text-[12px] text-dim">{t('projects.next')}</span>
                  <span className="mt-0.5 block truncate text-sky-soft">{pick(projects[next], 'title')}</span>
                </span>
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 transition-transform duration-200 ease-out group-hover/next:translate-x-1" />
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <motion.button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label={t('projects.close')}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.8 : 1 }}
        transition={{ duration: 0.35, ease, delay: closing ? 0 : 0.2 }}
        className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-sky-soft/25 bg-navy-raised text-sky-soft transition-colors duration-150 hover:border-coral hover:text-coral md:top-6 md:right-6 md:size-12"
      >
        <X size={20} strokeWidth={1.75} aria-hidden="true" />
      </motion.button>
    </div>
  )
}

/**
 * The projects on a 3D stage: the one in front in the middle, the rest turned away at the sides.
 * Move with a drag or swipe, a sideways trackpad swipe, the arrows, the arrow keys, or by clicking
 * a project at the side. Scrolling up and down always scrolls the page.
 */
function ProjectStage() {
  const { t, pick } = useLang()
  const n = projects.length
  const phone = useMedia('(max-width: 767px)')
  const pos = useMotionValue(0)
  const [active, setActive] = useState(0)
  const [dir, setDir] = useState(1) // which way the words slide when the project changes
  const [detail, setDetail] = useState(null) // { index, from }
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef(null)
  const mediaRefs = useRef([])
  const opener = useRef(null)
  const drag = useRef(null)
  const roomRef = useRef(null)
  const [stageW, setStageW] = useState(null)

  // as wide as the screen allows, but never taller than the room left for it
  // (the frame is the 16:9 video plus its white border: 12px on phones, 24px on wider screens)
  useLayoutEffect(() => {
    const room = roomRef.current
    if (!room) return
    const fit = () => {
      const wide = window.innerWidth >= 768
      const pad = wide ? 24 : 12
      // phones: as wide as it sensibly gets; the frame sits right above the words (no room to fill)
      if (!wide) {
        const tall = window.innerHeight * 0.4
        setStageW(Math.round(Math.min(window.innerWidth * 0.94, ((tall - pad) * 16) / 9 + pad)))
        return
      }
      // wider screens: 86% of the room's height, so there is air above and below the frame
      const max = Math.min(window.innerWidth * 0.56, 880)
      const h = room.clientHeight * 0.86
      setStageW(Math.round(Math.max(160, Math.min(max, ((h - pad) * 16) / 9 + pad))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(room)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])

  useMotionValueEvent(pos, 'change', (v) => setActive(wrapIndex(Math.round(v), n)))

  // glide to a position on the loop (after the last comes the first again)
  const go = useCallback(
    (target) => {
      setDir(target >= Math.round(pos.get()) ? 1 : -1)
      animate(pos, target, { type: 'spring', stiffness: 170, damping: 26, mass: 0.9 })
    },
    [pos],
  )
  const goBy = useCallback((step) => go(Math.round(pos.get()) + step), [go, pos])
  // to a given project, the short way round
  const goTo = useCallback(
    (i) => {
      const here = Math.round(pos.get())
      go(here + wrapDistance(i - wrapIndex(here, n), n))
    },
    [go, pos, n],
  )

  // drag with a mouse or a finger; up-and-down movement is left to the page
  const step = () => (stageRef.current?.offsetWidth || 800) * 0.64
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, start: pos.get(), moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (!d.moved) {
      if (Math.abs(e.clientY - d.y) > Math.abs(dx) && Math.abs(e.clientY - d.y) > 6) {
        drag.current = null // a vertical swipe: the page scrolls
        return
      }
      if (Math.abs(dx) < 6) return
      d.moved = true
      setDragging(true)
      pos.stop()
      stageRef.current?.setPointerCapture(e.pointerId)
    }
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    pos.set(d.start - dx / step())
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    setDragging(false)
    // a quick flick carries on to the next one even if it was a short drag
    const flick = Math.abs(d.v) > 0.4 ? -Math.sign(d.v) * 0.5 : 0
    go(Math.round(pos.get() + flick))
    // the click that ends a drag must not open whatever it ended on
    const stop = (ev) => {
      ev.stopPropagation()
      ev.preventDefault()
    }
    window.addEventListener('click', stop, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
  }

  // a sideways trackpad swipe (or shift + wheel) moves one project per gesture
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let acc = 0
    let busy = false
    let quiet
    const onWheel = (e) => {
      const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0)
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return // up and down: the page scrolls
      e.preventDefault()
      clearTimeout(quiet)
      quiet = setTimeout(() => {
        busy = false
        acc = 0
      }, 200)
      if (busy) return
      acc += dx
      if (Math.abs(acc) > 30) {
        busy = true
        goBy(Math.sign(acc))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      clearTimeout(quiet)
      el.removeEventListener('wheel', onWheel)
    }
  }, [goBy])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') goBy(1)
    else if (e.key === 'ArrowLeft') goBy(-1)
    else return
    e.preventDefault()
  }

  const openDetail = (button) => {
    opener.current = button
    setDetail({ index: active, from: mediaRefs.current[active]?.getBoundingClientRect() })
  }
  // switching project inside the panel moves the stage too, so closing flies back to the right one
  const switchDetail = (i) => {
    pos.stop()
    pos.set(Math.round(pos.get()) + wrapDistance(i - active, n))
    setDetail((d) => ({ ...d, index: i }))
  }
  const slideRect = useCallback(() => (detail ? mediaRefs.current[detail.index]?.getBoundingClientRect() : null), [detail])
  const closed = useCallback(() => {
    setDetail(null)
    opener.current?.focus({ preventScroll: true })
  }, [])

  const project = projects[active]

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t('projects.title')}
      onKeyDown={onKeyDown}
      // phones: the video and its words stay together, centred in the space under the title
      className="flex min-h-0 flex-1 flex-col max-md:justify-center"
    >
      {/* the stage takes whatever height is left (basis-0 + a set min height: its own content never stretches it) */}
      <div ref={roomRef} className="flex items-center justify-center md:min-h-[200px] md:flex-1 md:basis-0">
        {/* perspective makes the side projects turn away in depth */}
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative touch-pan-y select-none ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ perspective: '1600px', width: stageW ?? undefined }}
        >
          {/* sizes the stage to one frame; the projects sit on top of it */}
          <div aria-hidden="true" className="invisible p-1.5 md:p-3">
            <div className="aspect-video" />
          </div>
          {projects.map((p, i) => (
            <Card
              key={p.id}
              project={p}
              index={i}
              pos={pos}
              front={i === active}
              active={i === active && !dragging}
              // phones only ever see the neighbours; wider screens see two either side
              near={Math.abs(wrapDistance(i - active, n)) <= (phone ? 1 : 2)}
              suspend={detail !== null}
              mediaRef={(el) => (mediaRefs.current[i] = el)}
              onPick={goTo}
            />
          ))}
        </div>
      </div>

      {/* under the video: ← the words for the project in front → */}
      <div className="mx-auto mt-4 flex w-full max-w-[880px] shrink-0 items-center gap-3 px-4 md:mt-5 md:gap-6 md:px-6">
        <button
          type="button"
          onClick={() => goBy(-1)}
          aria-label={t('projects.prev')}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-sky-soft/25 text-sky-soft transition-colors duration-150 hover:border-coral hover:text-coral disabled:pointer-events-none disabled:opacity-30 md:size-12"
        >
          <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={project.id}
              custom={dir}
              variants={{
                enter: (d) => ({ opacity: 0, x: d * 40 }),
                center: { opacity: 1, x: 0 },
                exit: (d) => ({ opacity: 0, x: d * -40 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease }}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="font-display text-[14px] text-coral tabular-nums">
                  {num(active)} <span className="text-dim">/ {num(n - 1)}</span>
                </span>
                <RoleBadge role={project.role} />
              </div>
              <h3 className="font-display mt-1.5 line-clamp-2 text-[26px] leading-[1.1] font-normal tracking-[-0.03em] text-sky-soft md:line-clamp-1 md:text-[36px]">
                {pick(project, 'title')}
              </h3>
              <p className="mx-auto mt-2 line-clamp-2 max-w-[620px] text-[14px] leading-6 text-mist md:text-[15px]">{pick(project, 'description')}</p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {pick(project, 'tags')
                  .slice(0, 3)
                  .map((tag) => (
                    <Tag key={tag} className="max-md:hidden">
                      {tag}
                    </Tag>
                  ))}
                <button
                  type="button"
                  onClick={(e) => openDetail(e.currentTarget)}
                  aria-label={t('projects.detailOf', { title: pick(project, 'title') })}
                  className="group/detail inline-flex h-10 items-center gap-2 rounded-[4px] bg-sky-soft px-4 text-[14px] font-medium text-ground transition-colors duration-150 ease-out hover:bg-coral"
                >
                  {t('projects.detail')}
                  <ArrowRight size={16} strokeWidth={1.9} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover/detail:translate-x-0.5" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => goBy(1)}
          aria-label={t('projects.next')}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-sky-soft/25 text-sky-soft transition-colors duration-150 hover:border-coral hover:text-coral disabled:pointer-events-none disabled:opacity-30 md:size-12"
        >
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      {/* position dots */}
      <div className="mt-3 flex shrink-0 items-center justify-center gap-1" role="group" aria-label={t('projects.position', { n: active + 1, total: n })}>
        {projects.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={t('projects.goTo', { n: i + 1, title: pick(p, 'title') })}
            aria-current={active === i ? 'true' : undefined}
            className="grid h-6 w-5 place-items-center"
          >
            <span className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out ${active === i ? 'w-5 bg-coral' : 'w-1.5 bg-sky-soft/35 hover:bg-sky-soft/70'}`} />
          </button>
        ))}
      </div>

      {detail && <ProjectDetail index={detail.index} fromRect={detail.from} slideRect={slideRect} onIndex={switchDetail} onClosed={closed} />}
    </div>
  )
}

/**
 * Settles the page onto the section when you stop scrolling with most of it on screen, so the
 * whole thing (title, stage, words) is always in view. It only pulls while you're heading into
 * the section or have just run past its top; scrolling away from it is never pulled back.
 */
function useSettleInto(ref) {
  const lenis = useLenisInstance()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = null
    let lastY = window.scrollY
    let dir = 0
    let startTop = null // where the section was when this burst of scrolling began
    const check = () => {
      const top = el.getBoundingClientRect().top
      if (startTop === null) startTop = top
      if (window.scrollY !== lastY) dir = Math.sign(window.scrollY - lastY)
      lastY = window.scrollY
      clearTimeout(timer)
      timer = setTimeout(() => {
        const settled = el.getBoundingClientRect().top
        const from = startTop
        startTop = null
        const heading = (settled > 0 && dir > 0) || (settled < 0 && dir < 0)
        const ranPast = Math.sign(from) !== Math.sign(settled)
        const near = Math.abs(settled) >= 2 && Math.abs(settled) < window.innerHeight * 0.4
        // a scroll that started on the section is someone leaving it
        if (near && Math.abs(from) >= 2 && (heading || ranPast)) {
          if (lenis) lenis.scrollTo(el, { duration: 0.7 })
          else window.scrollTo({ top: window.scrollY + settled, behavior: 'smooth' })
        }
      }, 160)
    }
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', check)
    }
  }, [ref, lenis])
}

export default function Projects() {
  const { t } = useLang()
  const sectionRef = useRef(null)
  useSettleInto(sectionRef)
  if (!projects.length) return null

  return (
    // One screen holds it all: the title, the 3D stage and the words under it.
    // overflow-x-clip: the projects at the sides run off the screen, never the page.
    <section ref={sectionRef} id="projects" className="relative flex min-h-svh flex-col overflow-x-clip pt-20 pb-5 md:pb-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="glow -right-56 top-[12%] h-[700px] w-[460px] opacity-70" />
      </div>
      <div className="relative mx-auto flex w-full max-w-[1320px] shrink-0 items-end justify-between gap-6 px-6 md:px-10">
        {/* sized by the screen's height too, so a short screen still fits everything */}
        <RevealText
          text={t('projects.title')}
          accent="."
          className="font-display text-[clamp(52px,min(13vw,11svh),140px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft"
        />
        <p className="mb-2 hidden text-right text-[13px] text-dim sm:block">{t('projects.hint')}</p>
      </div>
      <div className="relative mt-3 flex min-h-0 flex-1 flex-col md:mt-4">
        <ProjectStage />
      </div>
    </section>
  )
}
