import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { contact, socials } from '../data/content'
import { GithubIcon, LinkedinIcon } from './BrandIcons'
import RevealText from './RevealText'
import LeadForm from './LeadForm'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
const socialIcon = { GitHub: GithubIcon, LinkedIn: LinkedinIcon }

function CopyEmail() {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
    } catch {
      window.location.href = `mailto:${contact.email}`
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group flex max-w-full items-center gap-4 text-left"
      aria-label={t('contact.copyEmail', { email: contact.email })}
    >
      <span className="relative block h-10 overflow-hidden md:h-12">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? 'copied' : 'email'}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className={`font-display block truncate text-[22px] leading-10 font-light sm:text-[30px] md:text-[36px] md:leading-12 ${
              copied ? 'text-coral' : 'text-sky-soft'
            }`}
          >
            {copied ? t('contact.copied') : contact.email}
          </motion.span>
        </AnimatePresence>
      </span>
      <span
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-sky-soft/50 text-sky-soft transition-colors duration-150 ease-out group-hover:border-coral group-hover:bg-coral group-hover:text-ground"
        aria-hidden="true"
      >
        {copied ? <Check size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? t('contact.copiedSr') : ''}
      </span>
    </button>
  )
}

export default function Contact() {
  const { t } = useLang()
  return (
    // clip, not hidden: a hidden box can still be scrolled sideways when something inside takes focus
    <section id="contact" className="relative overflow-clip">
      <div aria-hidden="true" className="glow -right-56 top-[10%] h-[680px] w-[460px] opacity-70" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-28 md:px-10 md:pb-36">
        <RevealText text={t('contact.title')} accent="." className="font-display text-[clamp(72px,15vw,230px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <div className="mt-14 grid gap-14 md:mt-20 lg:grid-cols-[1fr_520px] lg:gap-20">
          <div className="flex flex-col">
            <p className="max-w-[26rem] text-[18px] leading-[1.55] text-sky-soft">{t('contact.note')}</p>
            <div className="mt-10">
              <CopyEmail />
            </div>
            <dl className="mt-12 grid gap-6 text-[15px] sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-mist">{t('contact.phone')}</dt>
                <dd className="mt-1">
                  <a href={contact.phoneHref} className="text-sky-soft hover:text-coral">
                    {contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-mist">{t('contact.based')}</dt>
                <dd className="mt-1 text-sky-soft">{t('profile.location')}</dd>
              </div>
            </dl>
            <ul className="mt-10 flex flex-wrap gap-3">
              {socials.map((s) => {
                const Icon = socialIcon[s.label]
                return (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex h-11 items-center gap-2 rounded-[4px] border border-sky-soft/50 px-4 text-[14px] text-sky-soft transition-colors duration-150 ease-out hover:border-sky-soft hover:bg-sky-soft hover:text-ground"
                    >
                      <Icon size={16} />
                      {s.label}
                      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <LeadForm />
        </div>
      </div>
    </section>
  )
}
