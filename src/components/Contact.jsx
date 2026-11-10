import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { contact, socials } from '../data/content'
import { GithubIcon, LinkedinIcon } from './BrandIcons'
import Button from './Button'
import RevealText from './RevealText'

const ease = [0.22, 1, 0.36, 1]
const socialIcon = { GitHub: GithubIcon, LinkedIn: LinkedinIcon }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Slashes({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 32" className={className}>
      <path d="M10 0h12L12 32H0z M32 0h12L34 32H22z" fill="currentColor" />
    </svg>
  )
}

function CopyEmail() {
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
      aria-label={`Copy email address ${contact.email}`}
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
            {copied ? 'Copied to clipboard' : contact.email}
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
        {copied ? 'Email copied' : ''}
      </span>
    </button>
  )
}

function Field({ label, name, error, as = 'input', ...props }) {
  const Tag = as
  return (
    <label className="block">
      <span className="block text-[13px] text-mist">{label}</span>
      <Tag
        name={name}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`block w-full border-b bg-transparent text-[16px] text-sky-soft placeholder:text-dim transition-colors duration-150 ease-out outline-none focus:border-coral ${
          as === 'textarea' ? 'min-h-28 resize-y py-3' : 'h-12'
        } ${error ? 'border-coral' : 'border-sky-soft/30'}`}
        {...props}
      />
      {error && (
        <span id={`${name}-error`} className="mt-2 block text-[13px] text-coral">
          {error}
        </span>
      )}
    </label>
  )
}

function ContactForm() {
  const [values, setValues] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')

  const update = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!values.name.trim()) next.name = 'Enter your name'
    if (!emailPattern.test(values.email)) next.email = 'Enter a valid email'
    if (!values.message.trim()) next.message = 'Write a short message'
    setErrors(next)
    if (Object.keys(next).length) return

    setStatus('sending')
    try {
      const body = new URLSearchParams({ 'form-name': 'contact', ...values, 'bot-field': '' }).toString()
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('sent')
      setValues({ name: '', email: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <form
      name="contact"
      onSubmit={submit}
      noValidate
      aria-label="Send a message"
      className="relative border-[1.5px] border-coral bg-tile/90 p-7 md:p-9"
    >
      <Slashes className="absolute -top-5 left-5 h-8 text-coral" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" name="name" autoComplete="name" value={values.name} onChange={update} error={errors.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={update}
          error={errors.email}
        />
      </div>
      <div className="mt-6">
        <Field label="Message" name="message" as="textarea" value={values.message} onChange={update} error={errors.message} />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send message'}
        </Button>
        <p className="text-[13px] text-mist" aria-live="polite">
          {status === 'sent' && 'Message sent. I’ll reply by email.'}
          {status === 'error' && `Couldn’t send right now. Email me at ${contact.email}`}
        </p>
      </div>
      <p className="mt-8 text-[13px] text-mist">[ open to new opportunities ]</p>
    </form>
  )
}

export default function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden">
      <div aria-hidden="true" className="glow -right-56 top-[10%] h-[680px] w-[460px] opacity-70" />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-28 md:px-10 md:pb-36">
        <RevealText text="Contact" accent="." className="font-display text-[clamp(72px,15vw,230px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <div className="mt-14 grid gap-14 md:mt-20 lg:grid-cols-[1fr_520px] lg:gap-20">
          <div className="flex flex-col">
            <p className="max-w-[26rem] text-[18px] leading-[1.55] text-sky-soft">{contact.note}</p>
            <div className="mt-10">
              <CopyEmail />
            </div>
            <dl className="mt-12 grid gap-6 text-[15px] sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-mist">Phone</dt>
                <dd className="mt-1">
                  <a href={contact.phoneHref} className="text-sky-soft hover:text-coral">
                    {contact.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-mist">Based in</dt>
                <dd className="mt-1 text-sky-soft">{contact.location}</dd>
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

          <ContactForm />
        </div>
      </div>
    </section>
  )
}
