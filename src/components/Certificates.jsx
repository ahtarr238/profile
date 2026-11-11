import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ArrowUpRight, Maximize2, X } from 'lucide-react'
import { certificates } from '../data/content'
import { useLenisInstance } from '../hooks/useLenis'
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
    trackEvent('cert_open')
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

export default function Certificates() {
  const { t, date } = useLang()
  const count = certificates.length
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])
  const sectionRef = useRef(null)
  const onScreen = useInView(sectionRef, { amount: 0.4 })

  // moves on by itself while on screen, until someone picks a certificate
  useEffect(() => {
    if (touched || !onScreen || open || count < 2) return
    const t = setInterval(() => setActive((i) => (i + 1) % count), AUTO_MS)
    return () => clearInterval(t)
  }, [touched, onScreen, open, count])

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

      <div className="relative mx-auto max-w-[1320px] px-6 pb-24 md:px-10 md:pb-40">
        <RevealText
          text={t('certs.title')}
          accent="."
          className="font-display text-[clamp(48px,12.5vw,190px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft"
        />
        <ul className="mt-6 flex flex-wrap gap-2">
          {['Dicoding', 'MySkill', 'Education Alliance Finland', 'DBS Foundation'].map((t) => (
            <li key={t}>
              <Tag>{t}</Tag>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-8 md:mt-16 md:grid-cols-12 md:items-center md:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease }}
            className="md:col-span-7"
          >
            <Featured cert={cert} onOpen={setOpen} hidden={open?.id === cert.id} />
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
                    className="flex w-full items-start gap-4 py-4 pr-2 pl-5 text-left"
                  >
                    <span className={`font-display pt-1 text-[14px] tabular-nums transition-colors duration-200 ${on ? 'text-coral' : 'text-dim'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`font-display block text-[20px] leading-[1.2] transition-colors duration-200 md:text-[23px] ${
                          on ? 'text-sky-soft' : 'text-mist'
                        }`}
                      >
                        {c.title}
                      </span>
                      <span className="mt-1 block text-[13px] text-mist">
                        {c.issuer}
                        <span className="text-dim tabular-nums"> · {date(c.issuedOn)}</span>
                      </span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
            <li className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-6">
              <button
                type="button"
                onClick={() => setOpen(cert)}
                className="group inline-flex h-12 items-center gap-3 rounded-[4px] bg-coral px-5 text-[15px] font-medium text-ground transition-[background-color,transform] duration-150 ease-out hover:bg-[#f27c5d] active:scale-[0.97]"
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
                  className="inline-flex h-12 items-center gap-1.5 text-[15px] text-sky-soft underline decoration-sky-soft/30 underline-offset-4 transition-colors duration-150 ease-out hover:decoration-coral"
                >
                  {t('certs.verify')}
                </a>
              )}
            </li>
          </ol>
        </div>
      </div>

      <Lightbox cert={open} onClose={close} />
    </section>
  )
}
