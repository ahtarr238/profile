import { motion } from 'motion/react'
import { about, profile, tools } from '../data/content'
import RevealText from './RevealText'
import CountUp from './CountUp'

const ease = [0.22, 1, 0.36, 1]

/** Two slanted coral bars, the mark on the bordered text box. */
function Slashes({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 32" className={className}>
      <path d="M10 0h12L12 32H0z M32 0h12L34 32H22z" fill="currentColor" />
    </svg>
  )
}

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-64 bottom-0 h-[620px] w-[520px] opacity-60" />

      <div className="relative mx-auto max-w-[1320px] px-6 pt-16 pb-28 md:px-10 md:pt-24 md:pb-40">
        {/* who, with the small portrait */}
        <div className="flex items-center gap-4 md:ml-[18%]">
          <img
            src={profile.photo}
            alt={`Portrait of ${profile.name}`}
            width="1205"
            height="1600"
            loading="lazy"
            className="size-14 rounded-full object-cover object-[50%_22%] grayscale"
          />
          <div className="text-[13px] leading-5">
            <p className="text-mist">About</p>
            <p className="text-sky-soft">
              {about.who} · {about.whoLine}
            </p>
          </div>
        </div>

        <div className="relative mt-10 grid md:mt-14">
          <RevealText
            text={'About\nme'}
            className="font-display text-[clamp(88px,17vw,260px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

          {/* bordered text box, overlapping the heading on wide screens */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease }}
            className="relative mt-12 border-[1.5px] border-coral bg-tile/90 p-7 md:absolute md:top-[4%] md:right-0 md:mt-0 md:w-[440px] md:p-9"
          >
            <Slashes className="absolute -top-5 left-5 h-8 text-coral" />
            <div className="space-y-4 text-[15px] leading-7 text-sky-soft">
              {about.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="mt-8 text-[13px] text-mist">[ {about.note} ]</p>
          </motion.div>
        </div>

        {/* staggered figure tiles, then the tools */}
        <div className="mt-20 grid gap-12 md:mt-28 md:grid-cols-[auto_1fr] md:gap-20">
          <ul className="grid grid-cols-2 gap-3 sm:w-[440px] md:gap-4">
            {about.stats.map((s, i) => (
              <li key={s.label} className={i % 2 === 1 ? 'translate-y-12 md:translate-y-20' : ''}>
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.8, ease, delay: i * 0.1 }}
                  className="flex aspect-square flex-col justify-between bg-tile p-5 transition-colors duration-200 ease-out hover:bg-navy md:p-6"
                >
                  <span className="font-display text-[56px] leading-none font-light text-sky-soft md:text-[72px]">
                    <CountUp value={s.value} />
                  </span>
                  <span className="text-[13px] text-mist">{s.label}</span>
                </motion.div>
              </li>
            ))}
          </ul>

          <div className="mt-12 self-end md:mt-0">
            <p className="mb-6 text-[13px] text-mist">Tools I work with</p>
            <ul className="border-t border-sky-soft/15">
              {tools.map((t, i) => (
                <motion.li
                  key={t.name}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.7, ease, delay: i * 0.06 }}
                  className="group flex items-center justify-between border-b border-sky-soft/15 py-4"
                >
                  <span className="font-display text-[26px] font-light text-sky-soft transition-colors duration-150 ease-out group-hover:text-coral md:text-[34px]">
                    {t.name}
                  </span>
                  <img
                    src={t.icon}
                    alt=""
                    width="32"
                    height="32"
                    className="size-8 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                  />
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
