import { motion } from 'motion/react'
import { profile } from '../data/content'
import { useLang } from '../i18n/context'
import { scrollToId, useLenisInstance } from '../hooks/useLenis'
import { ParallaxComponent } from './ui/parallax-scrolling'
import Button from './Button'
import Tag from './Tag'
import RevealText from './RevealText'

const ease = [0.22, 1, 0.36, 1]

// Dusk over the mountains around Bogor, drawn by tools/hero-layers (far to near)
const LAYERS = {
  back: '/hero-layers/sky.webp',
  clouds: '/hero-layers/clouds.webp', // a sunset cloud deck behind the mountains, rendered as a volume
  middle: '/hero-layers/far.webp',
  wisps: '/hero-layers/wisps.webp', // low mist at the foot of the mountains
  front: '/hero-layers/near.webp',
  // phones: smaller files and the clouds baked into the sky, so four layers move instead of five
  mobile: {
    back: '/hero-layers/sky-m.webp',
    middle: '/hero-layers/far-m.webp',
    wisps: '/hero-layers/wisps.webp',
    front: '/hero-layers/near-m.webp',
  },
}

/** `ready`: false while the loading screen is up, so the entrance plays as the curtain lifts. */
export default function Hero({ ready = true }) {
  const lenis = useLenisInstance()
  const { t } = useLang()

  const go = (id) => (e) => {
    e.preventDefault()
    scrollToId(lenis, id)
  }

  const rise = (delay, y = 24) => ({
    initial: { opacity: 0, y },
    animate: ready ? { opacity: 1, y: 0 } : { opacity: 0, y },
    transition: { duration: 0.9, ease, delay },
  })

  return (
    <section id="top" className="relative">
      <ParallaxComponent
        layers={LAYERS}
        // shorter on phones: about one screen of scenery before About slides over
        length="h-[250svh] md:h-[300svh]"
        title={
          <h1 className="-mt-[6vh] px-4 text-center">
            <span className="sr-only">
              {t('hero.srTitle', { name: profile.name, role: t('profile.role'), location: t('profile.location') })}
            </span>
            <RevealText
              as="span"
              decorative
              onLoad
              hold={!ready}
              text={profile.short}
              accent="."
              delay={0.2}
              stagger={0.07}
              className="font-display block text-[clamp(104px,23vw,360px)] leading-[0.8] font-medium tracking-[-0.055em] text-sky-soft drop-shadow-[0_8px_40px_rgb(7_12_26/0.35)]"
            />
          </h1>
        }
      >
        {/* extra room at the bottom so the floating like button (bottom-right) doesn't sit on the tags */}
        <div className="mx-auto w-full max-w-[1320px] px-6 pb-24 md:px-10 md:pb-28">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <motion.div {...rise(0.5)} className="max-w-[30rem]">
              <p className="text-[18px] leading-[1.5] text-sky-soft md:text-[20px]">{t('hero.lead')}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {/* a touch less padding on phones keeps both buttons on one line in either language */}
                <Button href="#contact" onClick={go('contact')} className="max-sm:px-4">
                  {t('nav.getInTouch')}
                </Button>
                <Button href="#about" onClick={go('about')} outline className="max-sm:px-4">
                  {t('hero.aboutMe')}
                </Button>
              </div>
            </motion.div>
            <motion.ul {...rise(0.6, 16)} className="flex flex-wrap gap-2 md:justify-end">
              {t('hero.tags').map((tag) => (
                <li key={tag}>
                  <Tag className="bg-ground/40">{tag}</Tag>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </ParallaxComponent>
    </section>
  )
}
