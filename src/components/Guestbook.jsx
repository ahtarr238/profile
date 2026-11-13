import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ArrowUpRight, Check } from 'lucide-react'
import RevealText from './RevealText'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
const NAME_MAX = 40
const MESSAGE_MAX = 280
const PAGE = 6

const STEPS = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.35, 'week'],
  [12, 'month'],
  [Infinity, 'year'],
]
function ago(iso, lang) {
  const rtf = new Intl.RelativeTimeFormat(lang === 'id' ? 'id' : 'en', { numeric: 'auto' })
  let v = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [size, unit] of STEPS) {
    if (Math.abs(v) < size) return rtf.format(Math.round(v), unit)
    v /= size
  }
  return ''
}

function Field({ id, label, count, max, error, as = 'input', ...props }) {
  const Tag = as
  return (
    <label className="block" htmlFor={id}>
      <span className="flex items-baseline justify-between text-[13px] text-mist">
        {label}
        {max && <span className={`tabular-nums ${count > max ? 'text-coral' : 'text-dim'}`}>{max - count}</span>}
      </span>
      <Tag
        id={id}
        aria-invalid={error ? 'true' : undefined}
        className={`block w-full border-b bg-transparent text-[17px] text-sky-soft transition-colors duration-150 ease-out outline-none placeholder:text-dim focus:border-coral ${
          as === 'textarea' ? 'min-h-24 resize-none py-2.5' : 'h-12'
        } ${error ? 'border-coral' : 'border-sky-soft/30'}`}
        {...props}
      />
    </label>
  )
}

/**
 * A guestbook: anyone can leave a line, and it shows up here once the owner has approved it in
 * /admin (so spam never reaches the page). No sign-in, no cookies; the server limits each
 * visitor to a few messages a day and refuses links.
 */
export default function Guestbook() {
  const { t, lang } = useLang()
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '400px 0px' })
  const [entries, setEntries] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // the field only bots fill
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')

  // the wall loads when the section comes near, not with the page
  useEffect(() => {
    if (!near) return
    let on = true
    fetch('/api/guestbook')
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => on && setEntries(Array.isArray(d.entries) ? d.entries : []))
      .catch(() => on && setEntries([]))
    return () => {
      on = false
    }
  }, [near])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const n = name.trim()
    const m = message.trim()
    if (!n) return setError(t('guestbook.errors.name'))
    if (m.length < 2) return setError(t('guestbook.errors.message'))
    if (m.length > MESSAGE_MAX) return setError(t('guestbook.errors.message_long'))
    setState('sending')
    try {
      const r = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, message: m, lang, website }),
      })
      if (r.ok) {
        setState('sent')
        setMessage('')
        return
      }
      const body = await r.json().catch(() => ({}))
      const known = ['name', 'name_long', 'message', 'message_long', 'link', 'too_many', 'off']
      setError(t(`guestbook.errors.${known.includes(body.error) ? body.error : 'fail'}`))
    } catch {
      setError(t('guestbook.errors.fail'))
    }
    setState('idle')
  }

  return (
    <section id="guestbook" ref={ref} className="relative overflow-clip">
      <div className="relative mx-auto max-w-[1320px] px-6 pb-16 md:px-10 md:pt-16 md:pb-24">
        <RevealText text={t('guestbook.title')} accent="." className="font-display text-[clamp(52px,11vw,170px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-16">
          {/* the form */}
          <div>
            <p className="max-w-[24rem] text-[17px] leading-[1.55] text-sky-soft">{t('guestbook.note')}</p>
            <AnimatePresence mode="wait" initial={false}>
              {state === 'sent' ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease }}
                  className="mt-8 rounded-[10px] border border-sky-soft/15 p-5"
                  role="status"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-coral text-ground">
                    <Check size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <p className="mt-4 text-[16px] leading-[1.5] text-sky-soft">{t('guestbook.thanks')}</p>
                  <button
                    type="button"
                    onClick={() => setState('idle')}
                    className="mt-4 text-[14px] text-mist underline decoration-sky-soft/30 underline-offset-4 transition-colors hover:text-sky-soft hover:decoration-coral"
                  >
                    {t('guestbook.again')}
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={submit}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease }}
                  className="mt-8 grid gap-6"
                  noValidate
                >
                  <Field id="gb-name" label={t('guestbook.name')} value={name} maxLength={NAME_MAX} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
                  <Field
                    id="gb-message"
                    as="textarea"
                    rows={3}
                    label={t('guestbook.message')}
                    value={message}
                    max={MESSAGE_MAX}
                    count={message.length}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  {/* bots fill every field they find; people never see this one */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                    </label>
                  </div>
                  {error && (
                    <p role="alert" className="text-[14px] text-coral">
                      {error}
                    </p>
                  )}
                  <div>
                    <button
                      type="submit"
                      disabled={state === 'sending'}
                      className="group inline-flex h-12 items-center gap-3 rounded-[4px] bg-coral px-5 text-[15px] font-medium text-ground transition-[background-color,transform,opacity] duration-150 ease-out hover:bg-[#f27c5d] active:scale-[0.97] disabled:opacity-60"
                    >
                      {state === 'sending' ? t('guestbook.sending') : t('guestbook.send')}
                      <ArrowUpRight
                        size={18}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* the wall */}
          <div aria-live="polite" aria-busy={entries === null}>
            {entries === null ? (
              <div className="columns-1 gap-4 sm:columns-2" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="mb-4 h-32 break-inside-avoid rounded-[10px] bg-tile/60" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-sky-soft/15 px-6 py-12 text-center text-[15px] text-mist">{t('guestbook.empty')}</p>
            ) : (
              <>
                <ul className="columns-1 gap-4 sm:columns-2">
                  {entries.slice(0, shown).map((e, i) => (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.6, ease, delay: (i % PAGE) * 0.06 }}
                      className="mb-4 break-inside-avoid rounded-[10px] border border-sky-soft/10 bg-tile/60 p-5"
                    >
                      <p className="text-[16px] leading-[1.55] break-words text-sky-soft">{e.message}</p>
                      <p className="mt-4 flex items-center gap-2 text-[13px]">
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-coral" />
                        <span className="truncate text-mist">{e.name}</span>
                        <span className="shrink-0 text-dim tabular-nums">· {ago(e.at, lang)}</span>
                      </p>
                    </motion.li>
                  ))}
                </ul>
                {entries.length > shown && (
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + PAGE)}
                    className="mt-2 inline-flex h-11 items-center rounded-[4px] border border-sky-soft/30 px-4 text-[14px] text-sky-soft transition-colors duration-150 ease-out hover:border-sky-soft/70"
                  >
                    {t('guestbook.more')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
