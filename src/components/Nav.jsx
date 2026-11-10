import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { nav, profile } from '../data/content'
import { scrollToId, useLenisInstance } from '../hooks/useLenis'
import Button from './Button'

const ease = [0.22, 1, 0.36, 1]
const ids = nav.map((n) => n.id)

function useActiveSection() {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    const onScroll = () => {
      const line = window.innerHeight * 0.4
      let current = null
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el.id
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return active
}

export default function Nav() {
  const lenis = useLenisInstance()
  const active = useActiveSection()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (e, id) => {
    e.preventDefault()
    setOpen(false)
    scrollToId(lenis, id)
  }

  const toTop = (e) => {
    e.preventDefault()
    setOpen(false)
    scrollToId(lenis, 'top')
  }

  const solid = scrolled || open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ease-out ${
        solid ? 'bg-ground shadow-[0_1px_0_rgb(233_241_248/0.08)]' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-18 max-w-[1320px] items-center justify-between px-6 md:px-10" aria-label="Main">
        <a href="#top" onClick={toTop} className="font-display text-[22px] font-medium text-sky-soft">
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
                {item.label}
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

        <a
          href="#contact"
          onClick={(e) => go(e, 'contact')}
          className="hidden h-10 items-center rounded-[4px] border border-sky-soft/60 px-4 text-[14px] text-sky-soft transition-colors duration-150 ease-out hover:border-sky-soft hover:bg-sky-soft hover:text-ground active:scale-[0.97] md:inline-flex"
        >
          Get in touch
        </a>

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-sky-soft md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease }}
            className="h-[calc(100svh-4.5rem)] bg-ground px-6 pt-4 pb-8 md:hidden"
          >
            <ul className="flex flex-col">
              {nav.map((item, i) => (
                <li key={item.id} className="border-b border-sky-soft/8">
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => go(e, item.id)}
                    className="font-display flex items-baseline gap-4 py-5 text-4xl font-normal text-sky-soft"
                  >
                    <span className="text-sm font-normal text-coral tabular-nums">0{i + 1}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button href="#contact" onClick={(e) => go(e, 'contact')} className="mt-8 w-full justify-between">
              Get in touch
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
