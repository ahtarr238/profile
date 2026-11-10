import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, X } from 'lucide-react'
import { certificates, profile } from '../data/content'
import { useLenisInstance } from '../hooks/useLenis'
import Tag from './Tag'
import RevealText from './RevealText'

const ease = [0.22, 1, 0.36, 1]

function CertCard({ cert, onOpen, hidden, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cert)}
      aria-label={`Open certificate: ${cert.title}`}
      className={`group block w-full rounded-[10px] bg-white p-3 text-left text-ground transition-transform duration-200 ease-out hover:-translate-y-0.5 md:p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-[17px] font-semibold text-coral">
          {profile.short}
          <span className="text-ground">.</span>
        </span>
        <span className="text-[12px] text-dim tabular-nums">{cert.date}</span>
      </div>
      <p className="font-display mt-4 text-[24px] leading-[1.08] font-medium md:text-[28px]">{cert.title}</p>
      <p className="mt-2 text-[13px] text-dim">{cert.issuer}</p>
      <div className="mt-4 aspect-[16/10] overflow-hidden rounded-[4px] bg-sky-soft">
        {!hidden && (
          <motion.img
            layoutId={`cert-${cert.id}`}
            src={cert.image}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        )}
      </div>
      <span className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[3px] bg-coral text-[14px] font-medium text-ground">
        Open certificate
        <ArrowUpRight
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </button>
  )
}

function Lightbox({ cert, onClose }) {
  const closeRef = useRef(null)
  const lenis = useLenisInstance()

  useEffect(() => {
    if (!cert) return
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
                  {cert.issuer} · {cert.date}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[4px] border border-sky-soft/60 px-4 text-sm text-sky-soft transition-colors duration-150 ease-out hover:bg-sky-soft hover:text-ground"
              >
                <X size={18} strokeWidth={1.5} />
                Close
              </button>
            </figcaption>
          </figure>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default function Certificates() {
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])

  return (
    <section id="certificates" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -left-56 top-[20%] h-[640px] w-[440px] opacity-70" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-28 md:px-10 md:pb-40">
        <RevealText text="Certificates" accent="." className="font-display text-[clamp(48px,12.5vw,190px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />
        <ul className="mt-6 flex flex-wrap gap-2">
          <li>
            <Tag>Dicoding</Tag>
          </li>
          <li>
            <Tag>MySkill</Tag>
          </li>
          <li>
            <Tag>Education Alliance Finland</Tag>
          </li>
        </ul>

        <ul className="mt-14 grid gap-5 md:mt-20 md:grid-cols-3 md:gap-6">
          {certificates.map((cert, i) => (
            <motion.li
              key={cert.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease, delay: i * 0.06 }}
            >
              <div className={i === 1 ? 'md:translate-y-16' : ''}>
                <CertCard cert={cert} onOpen={setOpen} hidden={open?.id === cert.id} />
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <Lightbox cert={open} onClose={close} />
    </section>
  )
}
