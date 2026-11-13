import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { contact, nav, profile, socials } from '../data/content'
import { scrollToId, useLenisInstance } from '../hooks/useLenis'
import Button from './Button'
import LangSwitch from './LangSwitch'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
// sections that aren't in the menu but still end the one above: inside them nothing is underlined
const QUIET = ['drop-by']
const ids = [...nav.map((n) => n.id), ...QUIET]

function useActiveSection() {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const onScroll = () => {
      // looked up each time: the sections below the hero mount a moment after the page does
      const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
      const line = window.innerHeight * 0.4
      let current = null
      // the last section whose top has passed the line, in page order
      for (const el of els.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top))
        if (el.getBoundingClientRect().top <= line) current = el.id
      setActive(QUIET.includes(current) ? null : current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

/** Two lines that fold into an X. */
function MenuIcon({ open }) {
  const line = 'absolute left-1/2 h-[1.5px] w-[22px] -translate-x-1/2 rounded-full bg-current'
  return (
    <span aria-hidden="true" className="relative block size-6">
      <motion.span className={line} initial={false} animate={open ? { top: '50%', rotate: 45, y: '-50%' } : { top: '35%', rotate: 0, y: '-50%' }} transition={{ duration: 0.35, ease }} />
      <motion.span className={line} initial={false} animate={open ? { top: '50%', rotate: -45, y: '-50%' } : { top: '65%', rotate: 0, y: '-50%' }} transition={{ duration: 0.35, ease }} />
    </span>
  )
}

export default function Nav() {
  const lenis = useLenisInstance()
  const { t } = useLang()
  const active = useActiveSection()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // while the phone menu is open: Esc closes it and the page behind stays put
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
  }, [open, lenis])

  // the menu is phone-only; rotating to a wide screen closes it
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const go = (e, id) => {
    e.preventDefault()
    setOpen(false)
    // let the menu close (and scrolling come back) before gliding to the section
    requestAnimationFrame(() => scrollToId(lenis, id))
  }

  const toTop = (e) => {
    e.preventDefault()
    setOpen(false)
    requestAnimationFrame(() => scrollToId(lenis, 'top'))
  }

  const solid = scrolled || open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-200 ease-out ${
        solid ? 'bg-ground shadow-[0_1px_0_rgb(233_241_248/0.08)]' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 md:h-18 md:px-10" aria-label={t('nav.main')}>
        <a href="#top" onClick={toTop} className="font-display -ml-1 inline-flex h-11 items-center px-1 text-[22px] font-medium text-sky-soft">
          {profile.short}
          <span className="text-coral">.</span>
        </a>

        <ul className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <li key={item.id} className="relative">
              <a
                href={`#${item.id}`}
                onClick={(e) => go(e, item.id)}
                aria-current={active === item.id ? 'true' : undefined}
                className={`block py-2 text-sm transition-colors duration-150 ease-out ${
                  active === item.id ? 'text-sky-soft' : 'text-mist hover:text-sky-soft'
                }`}
              >
                {t(`nav.${item.id}`)}
              </a>
              {active === item.id && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-coral"
                  transition={{ duration: 0.4, ease }}
                />
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-3">
          <LangSwitch size="sm" layoutId="lang-switch" />
          <a
            href="#contact"
            onClick={(e) => go(e, 'contact')}
            className="hidden h-10 items-center rounded-[4px] border border-sky-soft/60 px-4 text-[14px] text-sky-soft transition-colors duration-150 ease-out hover:border-sky-soft hover:bg-sky-soft hover:text-ground active:scale-[0.97] md:inline-flex"
          >
            {t('nav.getInTouch')}
          </a>
          <button
            type="button"
            className="-mr-2.5 inline-flex size-11 items-center justify-center rounded-full text-sky-soft md:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="phone-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="phone-menu"
            key="phone-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25, ease }}
            className="flex h-[calc(100svh-4rem)] flex-col bg-ground px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:hidden"
          >
            <ul className="flex flex-col">
              {nav.map((item, i) => (
                <motion.li
                  key={item.id}
                  className="border-b border-sky-soft/10"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease, delay: 0.04 + i * 0.05 }}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => go(e, item.id)}
                    aria-current={active === item.id ? 'true' : undefined}
                    className="font-display flex items-center gap-4 py-[18px] text-[34px] leading-none font-normal tracking-[-0.02em] text-sky-soft"
                  >
                    <span className={`w-6 text-[13px] tabular-nums ${active === item.id ? 'text-coral' : 'text-dim'}`}>0{i + 1}</span>
                    {t(`nav.${item.id}`)}
                    {active === item.id && <span aria-hidden="true" className="ml-auto size-2 rounded-full bg-coral" />}
                  </a>
                </motion.li>
              ))}
            </ul>

            {/* bottom of the panel: the one action, then the quiet details */}
            <motion.div
              className="mt-auto"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.28 }}
            >
              <Button href="#contact" onClick={(e) => go(e, 'contact')} className="w-full justify-between">
                {t('nav.getInTouch')}
              </Button>
              <div className="mt-5 flex flex-col gap-1 text-[14px]">
                <a href={`mailto:${contact.email}`} className="inline-flex min-h-10 items-center text-sky-soft hover:text-coral">
                  {contact.email}
                </a>
                <span className="flex gap-5">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-0.5 text-mist hover:text-sky-soft">
                      {s.label}
                      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                    </a>
                  ))}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
