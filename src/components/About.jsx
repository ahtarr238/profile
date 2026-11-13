import { useRef } from 'react'
import { motion, useInView, useScroll, useSpring, useTransform } from 'motion/react'
import { about, certificates, profile, projects, tools } from '../data/content'
import RevealText from './RevealText'
import CountUp from './CountUp'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease, delay },
})

/** The portrait opens like the project videos (a curtain from the bottom) and drifts inside its frame. */
function Portrait({ src, alt }) {
  const frameRef = useRef(null)
  const open = useInView(frameRef, { once: true, amount: 0.15 })
  const { scrollYProgress } = useScroll({ target: frameRef, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <div ref={frameRef}>
      <motion.div
        initial={{ clipPath: 'inset(100% 0% 0% 0% round 8px)' }}
        animate={{ clipPath: open ? 'inset(0% 0% 0% 0% round 8px)' : 'inset(100% 0% 0% 0% round 8px)' }}
        transition={{ duration: 1.1, ease }}
        className="group overflow-hidden rounded-[8px] bg-tile"
      >
        <motion.img
          src={src}
          alt={alt}
          width="640"
          height="850"
          loading="lazy"
          style={{ y, scale: 1.08 }}
          className="aspect-[4/5] w-full object-cover object-[50%_18%] grayscale transition-[filter] duration-700 ease-out group-hover:grayscale-0"
        />
      </motion.div>
    </div>
  )
}

/** The opening line lights up word by word as it scrolls through the screen. */
function ScrollLine({ text, className }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] })
  const words = text.split(' ')

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  )
}

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.18, 1])
  return (
    <>
      <motion.span style={{ opacity }}>{children}</motion.span>{' '}
    </>
  )
}

/**
 * The title arrives from in front of the camera, carrying on the hero's push-in:
 * it starts large and faint and settles into place as it comes up the screen.
 */
function ApproachingTitle({ children }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 0.3'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.5 })
  const scale = useTransform(p, [0, 1], [1.3, 1])
  const opacity = useTransform(p, [0, 0.55], [0, 1])
  const y = useTransform(p, [0, 1], ['18%', '0%'])
  return (
    <motion.div ref={ref} style={{ scale, opacity, y, transformOrigin: '0% 100%' }} className="will-change-transform">
      {children}
    </motion.div>
  )
}

export default function About() {
  const { t } = useLang()
  const [lead] = t('about.paragraphs')
  const details = [
    { label: t('about.details.based'), value: t('profile.location') },
    { label: t('about.details.studying'), value: t('about.studyingValue', { school: profile.school }) },
    { label: t('about.details.role'), value: t('profile.role') },
  ]
  // the two counts follow whatever is published, so they never go stale after an edit in /admin
  const counts = { projects: projects.length, certificates: certificates.length }
  const stats = about.stats.map((s) => (s.count ? { ...s, value: String(counts[s.count]) } : s))

  return (
    <section id="about" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-64 bottom-0 h-[620px] w-[520px] opacity-50" />

      <div className="relative mx-auto max-w-[1320px] px-6 pt-8 pb-12 md:px-10 md:pt-14 md:pb-16">
        <ApproachingTitle>
          <RevealText
            text={t('about.title')}
            accent="."
            className="font-display text-[clamp(64px,min(13vw,18svh),200px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft"
          />
        </ApproachingTitle>

        {/* spacing and sizes ease off on shorter screens, so the section fits under the navbar whole */}
        <div className="mt-10 grid gap-10 md:mt-[clamp(2rem,6svh,4rem)] md:grid-cols-12 md:gap-16">
          {/* portrait, with the short facts under it */}
          {/* phones: a small photo beside the facts; desktop: a modest portrait over them */}
          <motion.figure className="grid grid-cols-[104px_1fr] items-start gap-5 md:col-span-4 md:block">
            <div className="md:max-w-[min(280px,30svh)]">
              <Portrait src={profile.photo} alt={t('about.portraitAlt', { name: profile.name })} />
            </div>
            <figcaption>
              <dl className="border-t border-sky-soft/15 md:mt-6">
                {details.map((d) => (
                  <div key={d.label} className="border-b border-sky-soft/15 py-2.5 md:flex md:items-baseline md:justify-between md:gap-6 md:py-3.5">
                    <dt className="text-[13px] text-mist">{d.label}</dt>
                    <dd className="text-[14px] text-sky-soft md:text-right md:text-[15px]">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </figcaption>
          </motion.figure>

          {/* the story, the figures, the tools */}
          <div className="md:col-span-8">
            <ScrollLine text={lead} className="font-display text-[26px] leading-[1.25] text-sky-soft md:text-[34px]" />

            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 md:mt-[clamp(1.5rem,4svh,3.5rem)]">
              {stats.map((s, i) => (
                <motion.li
                  key={s.key}
                  {...rise(0.06 * i)}
                  className="flex h-28 flex-col justify-between rounded-[6px] bg-tile p-4 transition-colors md:h-[clamp(7rem,15svh,9rem)] md:p-5 duration-200 ease-out hover:bg-navy"
                >
                  <span className="font-display text-[40px] leading-none font-light text-sky-soft md:text-[48px]">
                    <CountUp value={s.value} />
                  </span>
                  <span className="text-[13px] leading-5 text-mist">{t(`about.stats.${s.key}`)}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div {...rise(0.1)} className="mt-10 md:mt-[clamp(1.5rem,4svh,3.5rem)]">
              <p className="mb-4 text-[13px] text-mist">{t('about.tools')}</p>
              <ul className="flex flex-wrap gap-2">
                {tools.map((t) => (
                  <li
                    key={t.name}
                    className="group inline-flex h-11 items-center gap-2.5 rounded-[4px] border border-sky-soft/20 px-3.5 transition-colors duration-150 ease-out hover:border-sky-soft/60"
                  >
                    <img
                      src={t.icon}
                      alt=""
                      width="20"
                      height="20"
                      className="size-5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                    />
                    <span className="text-[14px] text-sky-soft">{t.name}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
