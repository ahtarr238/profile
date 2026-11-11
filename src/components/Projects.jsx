import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { Maximize2, Volume2, VolumeX } from 'lucide-react'
import { projects } from '../data/content'
import Tag from './Tag'
import RevealText from './RevealText'
import SwipeDots from './SwipeDots'
import { trackEvent } from '../lib/track'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]

/** Plays muted while on screen, pauses when it leaves; one button turns the sound on. */
function ProjectVideo({ project }) {
  const ref = useRef(null)
  const frameRef = useRef(null)
  const open = useInView(frameRef, { once: true, amount: 0.05 })
  const [muted, setMuted] = useState(true)
  const { t, pick } = useLang()
  const title = pick(project, 'title')

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.35 },
    )
    io.observe(video)
    return () => io.disconnect()
  }, [])

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
    // The curtain watches this unclipped wrapper: a fully clipped element never
    // counts as "on screen", so watching the frame itself would keep it shut.
    // On phones the frame drops its white border, so the video fills its swipe slide.
    <div ref={frameRef}>
      <motion.div
        // curtain: the frame opens from the bottom up as it comes on screen
        initial={{ clipPath: 'inset(100% 0% 0% 0% round 10px)' }}
        animate={{ clipPath: open ? 'inset(0% 0% 0% 0% round 10px)' : 'inset(100% 0% 0% 0% round 10px)' }}
        transition={{ duration: 1.1, ease }}
        className="group relative overflow-hidden rounded-[10px] bg-white md:p-3"
      >
        <div className="relative aspect-video overflow-hidden bg-tile md:rounded-[6px]">
          <video
            ref={ref}
            src={project.video}
            poster={project.poster}
            muted
            loop
            playsInline
            // nothing downloads until the video scrolls into view (play() then fetches it); the poster shows meanwhile
            preload="none"
            aria-label={t('projects.video', { title })}
            onClick={() => {
              // phones: a tap opens it big; desktop keeps the buttons for that
              if (window.matchMedia('(max-width: 767px)').matches) expand()
            }}
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
          <div className="absolute right-2 bottom-2 flex gap-2 sm:right-3 sm:bottom-3">
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
        </div>
      </motion.div>
    </div>
  )
}

export default function Projects() {
  const rowRef = useRef(null)
  const { t, pick } = useLang()
  if (!projects.length) return null

  return (
    <section id="projects" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-56 top-[12%] h-[700px] w-[460px] opacity-70" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-24 md:px-10 md:pb-40">
        <RevealText text={t('projects.title')} accent="." className="font-display text-[clamp(72px,15vw,230px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        {/* phones: one project per swipe; desktop: alternating rows */}
        <ol
          ref={rowRef}
          data-lenis-prevent-touch
          className="no-scrollbar -mx-6 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 md:mx-0 md:mt-20 md:block md:snap-none md:space-y-28 md:overflow-visible md:px-0"
        >
          {projects.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.7, ease }}
              className="grid w-[84vw] shrink-0 snap-start content-start gap-6 md:w-auto md:grid-cols-12 md:items-center md:gap-10"
            >
              <div className={`md:col-span-8 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                <ProjectVideo project={p} />
              </div>
              <div className={`md:col-span-4 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[15px] text-coral tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {/* set role: 'Contributor' on projects Ahtar worked on as part of a team */}
                  {p.role && (
                    <span className="inline-flex h-7 items-center rounded-[4px] border border-coral/70 px-2.5 text-[12px] text-coral">
                      {p.role === 'Contributor' ? t('projects.contributor') : p.role}
                    </span>
                  )}
                </div>
                <h3 className="font-display mt-2 text-[30px] leading-[1.05] font-normal tracking-[-0.03em] text-sky-soft md:text-[44px]">
                  {pick(p, 'title')}
                </h3>
                <p className="mt-4 text-[15px] leading-7 text-mist md:mt-5 md:text-[16px]">{pick(p, 'description')}</p>
                <ul className="mt-5 flex flex-wrap gap-2 md:mt-6">
                  {pick(p, 'tags').map((tag) => (
                    <li key={tag}>
                      <Tag>{tag}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
        <SwipeDots scrollerRef={rowRef} count={projects.length} />
      </div>
    </section>
  )
}
