import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { Volume2, VolumeX } from 'lucide-react'
import { projects } from '../data/content'
import Tag from './Tag'
import RevealText from './RevealText'

const ease = [0.22, 1, 0.36, 1]

/** Plays muted while on screen, pauses when it leaves; one button turns the sound on. */
function ProjectVideo({ project }) {
  const ref = useRef(null)
  const frameRef = useRef(null)
  const open = useInView(frameRef, { once: true, amount: 0.3 })
  const [muted, setMuted] = useState(true)

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

  return (
    // The curtain watches this unclipped wrapper: a fully clipped element never
    // counts as "on screen", so watching the frame itself would keep it shut.
    <div ref={frameRef}>
    <motion.div
      // curtain: the frame opens from the bottom up as it comes on screen
      initial={{ clipPath: 'inset(100% 0% 0% 0% round 10px)' }}
      animate={{ clipPath: open ? 'inset(0% 0% 0% 0% round 10px)' : 'inset(100% 0% 0% 0% round 10px)' }}
      transition={{ duration: 1.1, ease }}
      className="group relative overflow-hidden rounded-[10px] bg-white p-2 md:p-3"
    >
      <div className="relative aspect-video overflow-hidden rounded-[6px] bg-tile">
        <video
          ref={ref}
          src={project.video}
          poster={project.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={`Intro video for ${project.title}`}
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={!muted}
          aria-label={muted ? 'Sound on' : 'Sound off'}
          className="absolute right-2 bottom-2 inline-flex size-9 items-center justify-center gap-2 rounded-[4px] bg-ground/80 text-[13px] text-sky-soft transition-colors duration-150 ease-out hover:bg-coral hover:text-ground sm:right-3 sm:bottom-3 sm:h-10 sm:w-auto sm:px-3"
        >
          {muted ? <VolumeX size={16} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />}
          <span className="hidden sm:inline">{muted ? 'Sound on' : 'Sound off'}</span>
        </button>
      </div>
    </motion.div>
    </div>
  )
}

export default function Projects() {
  if (!projects.length) return null

  return (
    <section id="projects" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-56 top-[12%] h-[700px] w-[460px] opacity-70" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-28 md:px-10 md:pb-40">
        <RevealText text="Projects" accent="." className="font-display text-[clamp(72px,15vw,230px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <ol className="mt-14 space-y-20 md:mt-20 md:space-y-28">
          {projects.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease }}
              className="grid gap-8 md:grid-cols-12 md:items-center md:gap-10"
            >
              <div className={`md:col-span-8 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
                <ProjectVideo project={p} />
              </div>
              <div className={`md:col-span-4 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <span className="font-display text-[15px] text-coral tabular-nums">0{i + 1}</span>
                <h3 className="font-display mt-2 text-[36px] leading-[1] font-normal tracking-[-0.03em] text-sky-soft md:text-[44px]">
                  {p.title}
                </h3>
                <p className="mt-5 text-[16px] leading-7 text-mist">{p.description}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <li key={t}>
                      <Tag>{t}</Tag>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}
