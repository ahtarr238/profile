import { motion } from 'motion/react'
import { hero, profile } from '../data/content'
import { scrollToId, useLenisInstance } from '../hooks/useLenis'
import { ParallaxComponent } from './ui/parallax-scrolling'
import Button from './Button'
import Tag from './Tag'
import RevealText from './RevealText'

const ease = [0.22, 1, 0.36, 1]

// Dusk over the mountains around Bogor, drawn by tools/hero-layers (far to near)
const LAYERS = {
  back: '/hero-layers/sky.webp',
  middle: '/hero-layers/far.webp',
  front: '/hero-layers/near.webp',
}

export default function Hero() {
  const lenis = useLenisInstance()

  const go = (id) => (e) => {
    e.preventDefault()
    scrollToId(lenis, id)
  }

  const rise = (delay, y = 24) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
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
              {profile.name}, {profile.role} in {profile.location}
            </span>
            <RevealText
              as="span"
              onLoad
              text={profile.short}
              accent="."
              delay={0.2}
              stagger={0.07}
              className="font-display block text-[clamp(104px,23vw,360px)] leading-[0.8] font-medium tracking-[-0.055em] text-sky-soft drop-shadow-[0_8px_40px_rgb(7_12_26/0.35)]"
            />
          </h1>
        }
      >
        <div className="mx-auto w-full max-w-[1320px] px-6 pb-12 md:px-10 md:pb-14">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <motion.div {...rise(0.5)} className="max-w-[30rem]">
              <p className="text-[18px] leading-[1.5] text-sky-soft md:text-[20px]">{hero.lead}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="#contact" onClick={go('contact')}>
                  Get in touch
                </Button>
                <Button href="#about" onClick={go('about')} outline>
                  About me
                </Button>
              </div>
            </motion.div>
            <motion.ul {...rise(0.6, 16)} className="flex flex-wrap gap-2 md:justify-end">
              {hero.tags.map((t) => (
                <li key={t}>
                  <Tag className="bg-ground/40">{t}</Tag>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      </ParallaxComponent>
    </section>
  )
}
