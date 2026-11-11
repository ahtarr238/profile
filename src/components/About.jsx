import { motion } from 'motion/react'
import { about, profile, tools } from '../data/content'
import RevealText from './RevealText'
import CountUp from './CountUp'

const ease = [0.22, 1, 0.36, 1]

const details = [
  { label: 'Based in', value: profile.location },
  { label: 'Studying', value: `Informatics, ${profile.school}` },
  { label: 'Role', value: profile.role },
]

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease, delay },
})

export default function About() {
  const [lead, ...rest] = about.paragraphs

  return (
    <section id="about" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-64 bottom-0 h-[620px] w-[520px] opacity-50" />

      <div className="relative mx-auto max-w-[1320px] px-6 pt-12 pb-20 md:px-10 md:pt-24 md:pb-36">
        <p className="mb-4 text-[15px] font-medium text-coral">About</p>
        <RevealText
          text="About me"
          className="font-display text-[clamp(64px,10vw,160px)] leading-[0.9] font-normal tracking-[-0.05em] text-sky-soft"
        />

        <div className="mt-10 grid gap-10 md:mt-16 md:grid-cols-12 md:gap-16">
          {/* portrait, with the short facts under it */}
          {/* phones: a small photo beside the facts; desktop: a tall portrait over them */}
          <motion.figure {...rise()} className="grid grid-cols-[112px_1fr] items-start gap-5 md:col-span-5 md:block">
            <div className="group overflow-hidden rounded-[8px] bg-tile">
              <img
                src={profile.photo}
                alt={`Portrait of ${profile.name}`}
                width="640"
                height="850"
                loading="lazy"
                className="aspect-[4/5] w-full object-cover object-[50%_18%] grayscale transition-[filter,transform] duration-700 ease-out group-hover:scale-[1.02] group-hover:grayscale-0"
              />
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
          <div className="md:col-span-7">
            <motion.p {...rise(0.05)} className="font-display text-[26px] leading-[1.25] text-sky-soft md:text-[34px]">
              {lead}
            </motion.p>
            <motion.div {...rise(0.12)} className="mt-8 max-w-[38rem] space-y-5 text-[17px] leading-8 text-mist">
              {rest.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </motion.div>

            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 md:mt-14">
              {about.stats.map((s, i) => (
                <motion.li
                  key={s.label}
                  {...rise(0.06 * i)}
                  className="flex h-28 flex-col justify-between rounded-[6px] bg-tile p-4 transition-colors md:h-36 md:p-5 duration-200 ease-out hover:bg-navy"
                >
                  <span className="font-display text-[40px] leading-none font-light text-sky-soft md:text-[48px]">
                    <CountUp value={s.value} />
                  </span>
                  <span className="text-[13px] leading-5 text-mist">{s.label}</span>
                </motion.li>
              ))}
            </ul>

            <motion.div {...rise(0.1)} className="mt-10 md:mt-14">
              <p className="mb-4 text-[13px] text-mist">Tools I work with</p>
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
