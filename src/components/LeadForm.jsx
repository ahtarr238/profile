import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Copy, Mail, RotateCcw } from 'lucide-react'
import { contact } from '../data/content'
import { WhatsappIcon } from './BrandIcons'
import { trackEvent } from '../lib/track'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]

// One question at a time, mostly taps. The answers end up as a ready-to-send
// message in WhatsApp or email, so nothing depends on a form backend.
// Answers are stored as keys; the words come from src/i18n/dict.js (form.*), so switching
// language mid-form keeps every choice.
const REASONS = ['hire', 'project', 'collab', 'hi']
const ROLES = ['fulltime', 'internship', 'freelance', 'parttime']
const NEEDS = ['website', 'webapp', 'mobile', 'ai', 'unsure']
const TIMELINES = ['asap', 'month', 'months', 'exploring']

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[\d\s-]{8,}$/
const EMPTY = { reason: '', needs: [], timeline: '', name: '', reach: '', note: '' }

function Slashes({ className = '' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 32" className={className}>
      <path d="M10 0h12L12 32H0z M32 0h12L34 32H22z" fill="currentColor" />
    </svg>
  )
}

function Choice({ on, multi, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`group inline-flex min-h-12 items-center gap-2.5 rounded-[4px] border px-4 py-2.5 text-left text-[15px] transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97] ${
        on ? 'border-coral bg-coral text-ground' : 'border-sky-soft/25 text-sky-soft hover:border-sky-soft/70'
      }`}
    >
      {multi && (
        <span
          aria-hidden="true"
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-150 ${
            on ? 'border-ground bg-ground text-coral' : 'border-sky-soft/40'
          }`}
        >
          {on && <Check size={12} strokeWidth={3} />}
        </span>
      )}
      {children}
    </button>
  )
}

function Input({ label, error, as = 'input', id, ...props }) {
  const Tag = as
  return (
    <label className="block" htmlFor={id}>
      <span className="block text-[13px] text-mist">{label}</span>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block w-full border-b bg-transparent text-[17px] text-sky-soft placeholder:text-dim transition-colors duration-150 ease-out outline-none focus:border-coral ${
          as === 'textarea' ? 'min-h-20 resize-none py-2.5' : 'h-12'
        } ${error ? 'border-coral' : 'border-sky-soft/30'}`}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="mt-1.5 block text-[13px] text-coral">
          {error}
        </span>
      )}
    </label>
  )
}

export default function LeadForm() {
  const { t } = useLang()
  const [a, setA] = useState(EMPTY)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [errors, setErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)

  const hiring = a.reason === 'hire'
  const label = {
    reason: (k) => t(`form.reasons.${k}`),
    need: (k) => (hiring ? t(`form.roles.${k}`) : t(`form.needs.${k}`)),
    timeline: (k) => t(`form.timelines.${k}`),
  }
  const steps = [
    { q: t('form.q.reason'), hint: t('form.pickOne'), ok: !!a.reason },
    { q: hiring ? t('form.q.role') : t('form.q.need'), hint: t('form.pickMany'), ok: a.needs.length > 0 },
    { q: t('form.q.timeline'), hint: t('form.pickOne'), ok: !!a.timeline },
    { q: t('form.q.reach'), hint: t('form.reachHint'), ok: true },
  ]
  const total = steps.length
  const done = step === total

  const go = (to) => {
    setDir(to > step ? 1 : -1)
    setStep(to)
  }

  // single-choice questions move on by themselves, so most of the form is just taps
  const pickOne = (key, value) => {
    setA((v) => ({ ...v, [key]: value, ...(key === 'reason' && value !== v.reason ? { needs: [] } : {}) }))
    setTimeout(() => go(step + 1), 220)
  }
  const toggle = (value) =>
    setA((v) => ({ ...v, needs: v.needs.includes(value) ? v.needs.filter((n) => n !== value) : [...v.needs, value] }))
  const type = (e) => {
    const { name, value } = e.target
    setA((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }))
  }

  const finish = (e) => {
    e.preventDefault()
    const next = {}
    if (!a.name.trim()) next.name = 'errName'
    const reach = a.reach.trim()
    if (!emailPattern.test(reach) && !phonePattern.test(reach)) next.reach = 'errReach'
    setErrors(next)
    if (!Object.keys(next).length) go(total)
  }

  // written in the visitor's language
  const summary = [
    t('form.summary.hello', { name: a.name.trim() }),
    '',
    `${t('form.summary.reason')}: ${a.reason ? label.reason(a.reason) : ''}`,
    `${hiring ? t('form.summary.role') : t('form.summary.need')}: ${a.needs.map(label.need).join(', ')}`,
    `${t('form.summary.start')}: ${a.timeline ? label.timeline(a.timeline) : ''}`,
    `${t('form.summary.reach')}: ${a.reach.trim()}`,
    ...(a.note.trim() ? ['', a.note.trim()] : []),
  ].join('\n')
  const waHref = `https://wa.me/${contact.phoneHref.replace(/\D/g, '')}?text=${encodeURIComponent(summary)}`
  const mailHref = `mailto:${contact.email}?subject=${encodeURIComponent(`${a.reason ? label.reason(a.reason) : ''} · ${a.name.trim()}`)}&body=${encodeURIComponent(summary)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: the two send buttons still carry the same text
    }
  }

  const restart = () => {
    setA(EMPTY)
    setErrors({})
    go(0)
  }

  const options = step === 1 ? (hiring ? ROLES : NEEDS) : null

  return (
    <div className="relative border-[1.5px] border-coral bg-tile/90 p-6 md:p-9" aria-label={t('form.region')} role="region">
      <Slashes className="absolute -top-5 left-5 h-8 text-coral" />

      {/* progress */}
      <div className="flex items-center justify-between text-[13px] text-mist tabular-nums">
        <span>{done ? t('form.ready') : t('form.oneAtATime')}</span>
        <span aria-live="polite">
          {Math.min(step + 1, total)} / {total}
        </span>
      </div>
      <div className="mt-3 h-[2px] overflow-hidden bg-sky-soft/15">
        <motion.div
          className="h-full origin-left bg-coral"
          initial={false}
          animate={{ scaleX: done ? 1 : (step + 1) / total }}
          transition={{ duration: 0.5, ease }}
        />
      </div>

      <div className="relative mt-8 min-h-[340px] md:min-h-[320px]">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={done ? 'done' : step}
            custom={dir}
            variants={{
              enter: (d) => ({ opacity: 0, x: d * 36 }),
              show: { opacity: 1, x: 0 },
              leave: (d) => ({ opacity: 0, x: d * -36 }),
            }}
            initial="enter"
            animate="show"
            exit="leave"
            transition={{ duration: 0.32, ease }}
          >
            {!done && (
              <>
                <h3 className="font-display text-[28px] leading-[1.1] tracking-[-0.02em] text-sky-soft md:text-[34px]">{steps[step].q}</h3>
                <p className="mt-2 text-[13px] text-mist">{steps[step].hint}</p>
              </>
            )}

            {step === 0 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {REASONS.map((r) => (
                  <Choice key={r} on={a.reason === r} onClick={() => pickOne('reason', r)}>
                    {label.reason(r)}
                  </Choice>
                ))}
              </div>
            )}

            {options && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {options.map((n) => (
                  <Choice key={n} multi on={a.needs.includes(n)} onClick={() => toggle(n)}>
                    {label.need(n)}
                  </Choice>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {TIMELINES.map((k) => (
                  <Choice key={k} on={a.timeline === k} onClick={() => pickOne('timeline', k)}>
                    {label.timeline(k)}
                  </Choice>
                ))}
              </div>
            )}

            {step === 3 && (
              <form id="lead-last" onSubmit={finish} noValidate className="mt-6 grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    id="lead-name"
                    label={t('form.name')}
                    name="name"
                    autoComplete="name"
                    value={a.name}
                    onChange={type}
                    error={errors.name && t(`form.${errors.name}`)}
                  />
                  <Input
                    id="lead-reach"
                    label={t('form.reach')}
                    name="reach"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={a.reach}
                    onChange={type}
                    error={errors.reach && t(`form.${errors.reach}`)}
                  />
                </div>
                <Input id="lead-note" label={t('form.note')} name="note" as="textarea" rows={2} value={a.note} onChange={type} />
              </form>
            )}

            {done && (
              <div>
                <h3 className="font-display text-[30px] leading-[1.1] tracking-[-0.02em] text-sky-soft md:text-[38px]">
                  {t('form.thanks', { name: a.name.trim().split(' ')[0] })}
                  <span className="text-coral">.</span>
                </h3>
                <p className="mt-3 max-w-[26rem] text-[15px] leading-6 text-mist">
                  {t('form.doneText')}
                </p>
                <pre className="mt-5 max-h-48 overflow-auto rounded-[4px] bg-ground/70 p-4 font-sans text-[13px] leading-5 whitespace-pre-wrap text-sky-soft/90">
                  {summary}
                </pre>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={waHref}
                    onClick={() => trackEvent('contact_whatsapp')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center gap-2.5 rounded-[4px] bg-coral px-5 text-[15px] font-medium text-ground transition-[background-color,transform] duration-150 ease-out hover:bg-[#f27c5d] active:scale-[0.97]"
                  >
                    <WhatsappIcon size={18} />
                    {t('form.sendWa')}
                  </a>
                  <a
                    href={mailHref}
                    onClick={() => trackEvent('contact_email')}
                    className="inline-flex h-12 items-center gap-2.5 rounded-[4px] border border-sky-soft/60 px-5 text-[15px] text-sky-soft transition-colors duration-150 ease-out hover:bg-sky-soft hover:text-ground"
                  >
                    <Mail size={17} strokeWidth={1.75} aria-hidden="true" />
                    {t('form.sendEmail')}
                  </a>
                  <button
                    type="button"
                    onClick={copy}
                    className="inline-flex h-12 items-center gap-2 px-2 text-[14px] text-mist transition-colors duration-150 ease-out hover:text-sky-soft"
                  >
                    {copied ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
                    <span aria-live="polite">{copied ? t('form.copied') : t('form.copy')}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* back / continue */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-sky-soft/15 pt-5">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => (done ? restart() : go(step - 1))}
            className="inline-flex h-11 items-center gap-2 text-[14px] text-mist transition-colors duration-150 ease-out hover:text-sky-soft"
          >
            {done ? <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" /> : <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
            {done ? t('form.restart') : t('form.back')}
          </button>
        ) : (
          <span className="text-[13px] text-mist">
            <span className="max-sm:hidden">{t('form.open')}</span>
          </span>
        )}

        {!done && (
          <button
            type={step === 3 ? 'submit' : 'button'}
            form={step === 3 ? 'lead-last' : undefined}
            onClick={step === 3 ? undefined : () => go(step + 1)}
            disabled={!steps[step].ok}
            className="group inline-flex h-12 items-center gap-2.5 rounded-[4px] bg-coral px-5 text-[15px] font-medium text-ground transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-[#f27c5d] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-35"
          >
            {step === 3 ? t('form.finish') : t('form.continue')}
            <ArrowRight size={17} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  )
}
