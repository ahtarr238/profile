import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { ArrowUp, Check } from 'lucide-react'
import RevealText from './RevealText'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]
const NAME_MAX = 40
const MESSAGE_MAX = 280

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

// one hue, light to strong, for how busy a day was on GitHub
const level = (n) => (n === 0 ? 'bg-sky-soft/[0.07]' : n === 1 ? 'bg-coral/35' : n <= 3 ? 'bg-coral/60' : n <= 6 ? 'bg-coral/85' : 'bg-coral')
// each note sits a little differently, like paper pinned by hand
const TILT = ['-rotate-[1.5deg] translate-y-1', 'rotate-[1deg] -translate-y-1', '-rotate-[0.5deg] translate-y-2', 'rotate-[1.5deg]', 'rotate-[0.5deg] translate-y-1', '-rotate-[1deg] -translate-y-0.5']

/** Twelve weeks of public GitHub activity, a square a day, and three figures. */
function GitHubGrid({ data }) {
  const { t } = useLang()
  const weeks = []
  // columns of seven days, oldest on the left; the first column is padded so weekdays line up
  const first = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay()
  const cells = [...Array((first + 6) % 7).fill(null), ...data.days]
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const cell = 'size-[clamp(13px,3.6vw,19px)] rounded-[4px]'
  return (
    <div className="mt-10">
      <p className="text-[13px] text-mist">
        {t('activity.title')} <span className="text-dim">· {t('activity.note')}</span>
      </p>
      <div className="mt-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-1" role="img" aria-label={t('activity.gridLabel', { n: data.total })}>
          {weeks.map((week, w) => (
            <motion.div
              key={w}
              className="grid grid-rows-7 gap-1"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease, delay: w * 0.03 }}
            >
              {week.map((d, i) => (d ? <span key={d.date} title={`${d.date}: ${d.count}`} className={`${cell} ${level(d.count)}`} /> : <span key={`pad-${i}`} className={cell} />))}
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[14px] text-mist tabular-nums">
        <span className="text-sky-soft">{data.total}</span> {t('activity.total')} <span className="text-dim">·</span>{' '}
        <span className="text-sky-soft">{data.activeDays}</span> {t('activity.activeDays')} <span className="text-dim">·</span>{' '}
        <span className="text-sky-soft">{data.streak}</span> {t('activity.streak')}
      </p>
    </div>
  )
}

/** One note on the wall. */
function Note({ entry, i, lang, ghost = false }) {
  return (
    <li aria-hidden={ghost || undefined} className={`w-[min(76vw,300px)] shrink-0 rounded-[18px] bg-tile/80 p-5 shadow-[0_18px_40px_-24px_rgb(0_0_0/0.8)] ${TILT[i % TILT.length]}`}>
      <p className="text-[16px] leading-[1.55] break-words text-sky-soft">{entry.message}</p>
      <p className="mt-4 flex items-center gap-2.5 text-[13px]">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-coral/15 text-[12px] font-medium text-coral uppercase">
          {entry.name.trim().charAt(0)}
        </span>
        <span className="min-w-0 truncate text-mist">{entry.name}</span>
        <span className="shrink-0 text-dim">· {ago(entry.at, lang)}</span>
      </p>
    </li>
  )
}

/**
 * "Drop by": the guestbook and what I've been up to on GitHub, in one place. A note goes up
 * once the owner has approved it in /admin, so spam never reaches the page; the server limits
 * each visitor to a few a day and refuses links. Both lists load when the section comes near.
 */
export default function DropBy() {
  const { t, lang } = useLang()
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '400px 0px' })
  const [github, setGithub] = useState(null)
  const [entries, setEntries] = useState(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // the field only bots fill
  const [state, setState] = useState('idle') // idle | sending | sent
  const [error, setError] = useState('')

  useEffect(() => {
    if (!near) return
    let on = true
    fetch('/api/github-activity')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => on && setGithub(d && Array.isArray(d.days) && d.days.length ? d : false))
      .catch(() => on && setGithub(false))
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
    if (m.length < 2) return setError(t('guestbook.errors.message'))
    if (m.length > MESSAGE_MAX) return setError(t('guestbook.errors.message_long'))
    if (!n) return setError(t('guestbook.errors.name'))
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

  const left = MESSAGE_MAX - message.length
  const notes = entries || []
  const drifting = notes.length >= 4

  return (
    <section id="drop-by" ref={ref} className="relative overflow-clip">
      <div className="relative mx-auto max-w-[1320px] px-6 md:px-10 md:pt-16">
        <RevealText text={t('guestbook.title')} accent="." className="font-display text-[clamp(56px,12vw,180px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-start lg:gap-20">
          {/* a few words, and GitHub */}
          <div className="min-w-0">
            <p className="max-w-[24rem] text-[18px] leading-[1.55] text-sky-soft">{t('guestbook.note')}</p>
            {github && <GitHubGrid data={github} />}
          </div>

          {/* the composer */}
          <AnimatePresence mode="wait" initial={false}>
            {state === 'sent' ? (
              <motion.div
                key="sent"
                role="status"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className="flex min-h-[220px] flex-col items-start justify-center rounded-[22px] bg-tile/80 p-7"
              >
                <span className="grid size-11 place-items-center rounded-full bg-coral text-ground">
                  <Check size={20} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <p className="mt-5 max-w-[22rem] text-[17px] leading-[1.5] text-sky-soft">{t('guestbook.thanks')}</p>
                <button type="button" onClick={() => setState('idle')} className="mt-4 text-[14px] text-mist underline decoration-sky-soft/30 underline-offset-4 hover:text-sky-soft hover:decoration-coral">
                  {t('guestbook.again')}
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={submit}
                noValidate
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease }}
                className="relative rounded-[22px] bg-tile/80 p-2 ring-1 ring-sky-soft/10 transition-shadow duration-200 focus-within:ring-coral/50"
              >
                <label htmlFor="gb-message" className="sr-only">
                  {t('guestbook.message')}
                </label>
                <textarea
                  id="gb-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('guestbook.message')}
                  className="block w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[18px] leading-[1.5] text-sky-soft outline-none placeholder:text-dim"
                />
                {/* bots fill every field they find; people never see this one */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="gb-name" className="sr-only">
                    {t('guestbook.name')}
                  </label>
                  <input
                    id="gb-name"
                    value={name}
                    maxLength={NAME_MAX}
                    autoComplete="given-name"
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('guestbook.name')}
                    className="h-12 min-w-0 flex-1 rounded-full bg-ground/70 px-5 text-[15px] text-sky-soft outline-none placeholder:text-dim focus:ring-1 focus:ring-coral/50"
                  />
                  <span aria-hidden="true" className={`w-9 text-right text-[12px] tabular-nums ${left < 0 ? 'text-coral' : 'text-dim'}`}>
                    {left}
                  </span>
                  <button
                    type="submit"
                    disabled={state === 'sending'}
                    aria-label={t('guestbook.send')}
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-coral text-ground transition-[background-color,transform,opacity] duration-150 ease-out hover:bg-[#f27c5d] active:scale-95 disabled:opacity-60"
                  >
                    <ArrowUp size={20} strokeWidth={2.2} aria-hidden="true" className={state === 'sending' ? 'animate-pulse' : ''} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {error && (
                    <motion.p
                      role="alert"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden px-4 pt-3 pb-1 text-[14px] text-coral"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* the notes: drifting by when there are enough of them, resting in a row when there are few */}
      <div className="mt-16 pb-20 md:mt-20 md:pb-28">
        {entries === null ? null : notes.length === 0 ? (
          <p className="mx-auto max-w-[1320px] px-6 text-[15px] text-dim md:px-10">{t('guestbook.empty')}</p>
        ) : (
          <div aria-label={t('guestbook.notes')} role="region" className={drifting ? '[mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]' : ''}>
            <ul
              className={drifting ? 'notes-drift flex w-max gap-5 py-4' : 'mx-auto flex max-w-[1320px] flex-wrap gap-5 px-6 py-4 md:px-10'}
              style={drifting ? { '--drift': `${Math.max(40, notes.length * 9)}s` } : undefined}
            >
              {notes.map((e, i) => (
                <Note key={e.id} entry={e} i={i} lang={lang} />
              ))}
              {/* the second copy makes the loop seamless; it's for the eye only */}
              {drifting && notes.map((e, i) => <Note key={`${e.id}-again`} entry={e} i={i} lang={lang} ghost />)}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
