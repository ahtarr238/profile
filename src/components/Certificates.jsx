import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ArrowUpRight, Maximize2, X } from 'lucide-react'
import { certificates } from '../data/content'
import { useLenisInstance } from '../hooks/useLenis'
import { useMedia } from '../hooks/useMedia'
import Tag from './Tag'
import RevealText from './RevealText'
import { trackEvent } from '../lib/track'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
const AUTO_MS = 5000 // the featured certificate moves on by itself until someone picks one

function Lightbox({ cert, onClose }) {
  const { t, date } = useLang()
  const closeRef = useRef(null)
  const lenis = useLenisInstance()

  useEffect(() => {
    if (!cert) return
    trackEvent('cert_open', cert.id)
    const previous = document.activeElement
    lenis?.stop()
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      lenis?.start()
      previous?.focus?.({ preventScroll: true })
    }
  }, [cert, lenis, onClose])

  return createPortal(
    <AnimatePresence>
      {cert && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={cert.title}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease }}
        >
          <div className="absolute inset-0 bg-ground/92" onClick={onClose} />
          <figure className="relative w-full max-w-[1000px]">
            <motion.img
              layoutId={`cert-${cert.id}`}
              src={cert.image}
              alt={cert.alt}
              className="w-full rounded-[6px] bg-white"
              transition={{ duration: 0.45, ease }}
            />
            <figcaption className="mt-4 flex items-start justify-between gap-6">
              <div>
                <p className="font-display text-xl font-medium text-sky-soft">{cert.title}</p>
                <p className="mt-1 text-sm text-mist tabular-nums">
                  {cert.issuer} · {date(cert.issuedOn)}
                </p>
                {cert.verify && (
                  <a
                    href={cert.verify}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-coral underline-offset-4 hover:underline"
                  >
                    {t('certs.verifyOn', { issuer: cert.issuer.split(' ')[0] })}
                    <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                )}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[4px] border border-sky-soft/60 px-4 text-sm text-sky-soft transition-colors duration-150 ease-out hover:bg-sky-soft hover:text-ground"
              >
                <X size={18} strokeWidth={1.5} />
                {t('certs.close')}
              </button>
            </figcaption>
          </figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** The large frame: the active certificate, crossfading when it changes. */
function Featured({ cert, onOpen, hidden }) {
  const { t } = useLang()
  return (
    <div className="group relative overflow-hidden rounded-[10px] bg-white p-2 md:p-3">
      <button
        type="button"
        onClick={() => onOpen(cert)}
        aria-label={t('certs.openNamed', { title: cert.title })}
        className="relative block aspect-[16/11] w-full overflow-hidden rounded-[6px] bg-white"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {!hidden && (
            <motion.img
              key={cert.id}
              layoutId={`cert-${cert.id}`}
              src={cert.image}
              alt=""
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.55, ease }}
              className="absolute inset-0 size-full object-contain"
            />
          )}
        </AnimatePresence>
        <span className="absolute right-3 bottom-3 inline-flex size-10 items-center justify-center rounded-[4px] bg-ground/80 text-sky-soft transition-colors duration-150 ease-out group-hover:bg-coral group-hover:text-ground">
          <Maximize2 size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}

/**
 * Phones: the whole list as one row of cards you swipe through, so the section stays one card
 * tall however many certificates there are. Native scroll snapping does the swiping; a tap opens
 * the certificate full size.
 */
function PhoneStrip({ open, onOpen }) {
  const { t, date } = useLang()
  const rowRef = useRef(null)
  const [at, setAt] = useState(0)
  const count = certificates.length

  const onScroll = () => {
    const row = rowRef.current
    const first = row?.firstElementChild
    if (!first) return
    const step = first.getBoundingClientRect().width + 12 // card + gap-3
    setAt(Math.min(count - 1, Math.max(0, Math.round(row.scrollLeft / step))))
  }

  return (
    <div className="mt-8">
      <ol
        ref={rowRef}
        onScroll={onScroll}
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {certificates.map((c, i) => (
          <li key={c.id} className="w-[84%] shrink-0 snap-start">
            <button
              type="button"
              onClick={() => onOpen(c)}
              aria-label={t('certs.openNamed', { title: c.title })}
              className="block w-full text-left"
            >
              <span className="block rounded-[10px] bg-white p-2">
                <span className="relative block aspect-[16/11] overflow-hidden rounded-[6px] bg-white">
                  {open?.id !== c.id && (
                    <motion.img
                      layoutId={`cert-${c.id}`}
                      src={c.image}
                      alt=""
                      loading={i < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 size-full object-contain"
                      transition={{ duration: 0.45, ease }}
                    />
                  )}
                </span>
              </span>
              <span className="mt-3 flex items-start gap-3">
                <span className={`font-display pt-0.5 text-[13px] tabular-nums ${i === at ? 'text-coral' : 'text-dim'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="font-display block text-[18px] leading-[1.2] text-sky-soft">{c.title}</span>
                  <span className="mt-1 block text-[13px] text-mist">
                    {c.issuer}
                    <span className="text-dim tabular-nums"> · {date(c.issuedOn)}</span>
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* where you are in the row */}
      <div className="mt-5 flex items-center gap-4">
        <span className="font-display text-[14px] text-sky-soft tabular-nums">
          {String(at + 1).padStart(2, '0')} <span className="text-dim">/ {String(count).padStart(2, '0')}</span>
        </span>
        <span className="relative h-px flex-1 bg-sky-soft/15">
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-coral"
            animate={{ width: `${((at + 1) / count) * 100}%` }}
            transition={{ duration: 0.35, ease }}
          />
        </span>
        <span className="text-[12px] text-dim">{t('certs.swipe')}</span>
      </div>
    </div>
  )
}

export default function Certificates() {
  const { t, date } = useLang()
  const count = certificates.length
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  const sectionRef = useRef(null)
  const onScreen = useInView(sectionRef, { amount: 0.4 })
  const phone = useMedia('(max-width: 767px)')

  // moves on by itself while on screen, until someone picks a certificate (wide screens only)
  useEffect(() => {
    if (phone || touched || !onScreen || open || count < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % count), AUTO_MS)
    return () => clearInterval(t)
  }, [phone, touched, onScreen, open, count])

  const pick = (i) => {
    setTouched(true)
    setActive(i)
  }
  // the list can shrink once the live copy arrives, so never point past its end
  const cert = certificates[Math.min(active, count - 1)]
  if (!cert) return null

  return (
    <section id="certificates" ref={sectionRef} className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -left-56 top-[20%] h-[640px] w-[440px] opacity-70 max-md:hidden" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-10 md:px-10 md:pt-[clamp(2.5rem,7svh,4rem)] md:pb-[clamp(2.5rem,6svh,4rem)]">
        {/* laptops and up: the title on the right, who issued them on the left of the same row */}
        <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-end lg:justify-between lg:gap-12">
          <RevealText
            text={t('certs.title')}
            accent="."
            className="font-display text-[clamp(48px,min(12.5vw,13svh),160px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft lg:shrink-0 lg:text-right lg:whitespace-nowrap"
          />
          <ul className="flex flex-wrap gap-2 lg:mb-4 lg:max-w-[22rem]">
            {['Dicoding', 'MySkill', 'Education Alliance Finland', 'DBS Foundation'].map((t) => (
              <li key={t}>
                <Tag>{t}</Tag>
              </li>
            ))}
          </ul>
        </div>

        {phone ? (
          <PhoneStrip open={open} onOpen={setOpen} />
        ) : (
        <div className="mt-10 grid gap-8 md:mt-[clamp(1.5rem,5svh,3rem)] md:grid-cols-12 md:items-center md:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease }}
            // never taller than about half the screen, so the section fits a laptop screen whole
            className="md:col-span-7 md:max-w-[calc(50svh_*_16_/_11_+_24px)]"
          >
            <Featured cert={cert} onOpen={setOpen} hidden={open?.id === cert.id} />
            {/* who issued the one on show, and what you can do with it */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="min-w-0 truncate text-[13px] text-mist" aria-live="polite">
                {cert.issuer}
                <span className="text-dim tabular-nums"> · {date(cert.issuedOn)}</span>
              </p>
              <div className="flex shrink-0 items-center gap-5">
                <button
                  type="button"
                  onClick={() => setOpen(cert)}
                  className="group inline-flex h-11 items-center gap-2.5 rounded-[4px] bg-coral px-4 text-[14px] font-medium text-ground transition-[background-color,transform] duration-150 ease-out hover:bg-[#f27c5d] active:scale-[0.97]"
                >
                  {t('certs.open')}
                  <ArrowUpRight
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </button>
                {cert.verify && (
                  <a
                    href={cert.verify}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center gap-1.5 text-[14px] text-sky-soft underline decoration-sky-soft/30 underline-offset-4 transition-colors duration-150 ease-out hover:decoration-coral"
                  >
                    {t('certs.verify')}
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* the list: hover or tap a title to bring it up */}
          <ol className="border-t border-sky-soft/15 md:col-span-5">
            {certificates.map((c, i) => {
              const on = i === active
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, ease, delay: i * 0.08 }}
                  className="relative border-b border-sky-soft/15"
                >
                  {on && (
                    <motion.span
                      layoutId="cert-active"
                      aria-hidden="true"
                      className="absolute top-0 bottom-0 left-0 w-[3px] bg-coral"
                      transition={{ duration: 0.45, ease }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    onMouseEnter={() => pick(i)}
                    aria-current={on ? 'true' : undefined}
                    title={`${c.title} · ${c.issuer} · ${date(c.issuedOn)}`}
                    className="flex w-full items-baseline gap-4 py-2.5 pr-2 pl-5 text-left"
                  >
                    <span className={`font-display text-[13px] tabular-nums transition-colors duration-200 ${on ? 'text-coral' : 'text-dim'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`font-display min-w-0 flex-1 truncate text-[18px] leading-[1.35] transition-colors duration-200 lg:text-[20px] ${
                        on ? 'text-sky-soft' : 'text-mist'
                      }`}
                    >
                      {c.title}
                    </span>
                    {/* the full issuer and date show in the frame's caption and the full-size view */}
                    <span className="shrink-0 text-[12px] whitespace-nowrap text-dim tabular-nums">
                      {c.issuer.split('/')[0].trim()} · {c.issuedOn.slice(0, 4)}
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ol>
        </div>
        )}
      </div>

      <Lightbox cert={open} onClose={close} />
    </section>
  )
}
