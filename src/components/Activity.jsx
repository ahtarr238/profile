import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { ArrowUpRight, GitCommitHorizontal, GitMerge, GitPullRequest, Plus, Tag as TagIcon } from 'lucide-react'
import RevealText from './RevealText'
import { useLang } from '../i18n/context'

const ease = [0.22, 1, 0.36, 1]

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

// one hue, light to strong, for how busy a day was
const level = (n) => (n === 0 ? 'bg-sky-soft/[0.07]' : n === 1 ? 'bg-coral/35' : n <= 3 ? 'bg-coral/60' : n <= 6 ? 'bg-coral/85' : 'bg-coral')

const ICON = { push: GitCommitHorizontal, pr: GitPullRequest, merged: GitMerge, create: Plus, release: TagIcon, issue: GitPullRequest, review: GitPullRequest }

/**
 * What I've been building lately, from GitHub: a twelve-week activity grid and the last few
 * things. The numbers come from /api/github-activity (public events only, cached on the server),
 * so the section shows up only when there's something to show.
 */
export default function Activity() {
  const { t, lang } = useLang()
  const ref = useRef(null)
  const near = useInView(ref, { once: true, margin: '400px 0px' })
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!near) return
    let on = true
    fetch('/api/github-activity')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => on && setData(d && Array.isArray(d.days) ? d : false))
      .catch(() => on && setData(false))
    return () => {
      on = false
    }
  }, [near])

  // nothing to show (or GitHub unreachable): the section steps aside
  if (data === false) return <div ref={ref} />

  const weeks = []
  if (data) {
    // columns of seven days, oldest week on the left; the first column is padded so weekdays line up
    const first = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay() // 0 = Sunday
    const cells = [...Array((first + 6) % 7).fill(null), ...data.days]
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  }
  const describe = (r) => {
    const repo = r.repo.split('/')[1]
    const base = r.kind === 'pr' ? (r.action === 'closed' || r.action === 'merged' ? 'prMerged' : 'prOpened') : r.kind
    const key = r.times > 1 ? `${base}Many` : base
    return t(`activity.what.${key}`, { repo, times: r.times })
  }

  return (
    <section id="lately" ref={ref} className="relative overflow-clip">
      <div className="relative mx-auto max-w-[1320px] px-6 pb-10 md:px-10 md:pt-16 md:pb-16">
        <RevealText text={t('activity.title')} accent="." className="font-display text-[clamp(52px,11vw,170px)] leading-[0.86] font-normal tracking-[-0.05em] text-sky-soft" />

        <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
          {/* the grid and the figures */}
          <div className="min-w-0">
            <p className="max-w-[30rem] text-[17px] leading-[1.55] text-sky-soft">{t('activity.note')}</p>
            {data ? (
              <>
                <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                  {[
                    [data.total, t('activity.total')],
                    [data.activeDays, t('activity.activeDays')],
                    [data.streak, t('activity.streak')],
                  ].map(([n, label]) => (
                    <div key={label}>
                      <dt className="sr-only">{label}</dt>
                      <dd className="font-display text-[44px] leading-none font-light text-sky-soft tabular-nums">{n}</dd>
                      <p aria-hidden="true" className="mt-2 text-[13px] text-mist">
                        {label}
                      </p>
                    </div>
                  ))}
                </dl>
                <div className="mt-8 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max gap-[5px]" role="img" aria-label={t('activity.gridLabel', { n: data.total })}>
                    {weeks.map((week, w) => (
                      <motion.div
                        key={w}
                        className="grid grid-rows-7 gap-[5px]"
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease, delay: w * 0.03 }}
                      >
                        {week.map((d, i) =>
                          d ? (
                            <span key={d.date} title={`${d.date}: ${d.count}`} className={`size-[clamp(14px,3.2vw,22px)] rounded-[4px] ${level(d.count)}`} />
                          ) : (
                            <span key={`pad-${i}`} className="size-[clamp(14px,3.2vw,22px)]" />
                          ),
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-2 text-[12px] text-dim">
                  {t('activity.less')}
                  {[0, 1, 2, 4, 7].map((n) => (
                    <span key={n} aria-hidden="true" className={`size-3 rounded-[3px] ${level(n)}`} />
                  ))}
                  {t('activity.more')}
                </p>
              </>
            ) : (
              <div className="mt-8 h-[220px] max-w-[640px] rounded-[10px] bg-tile/60" aria-hidden="true" />
            )}
          </div>

          {/* the latest few things */}
          <div className="min-w-0">
            <h3 className="text-[13px] text-mist">{t('activity.recent')}</h3>
            <ol className="mt-4 border-t border-sky-soft/15">
              {(data?.recent || []).map((r, i) => {
                const Icon = ICON[r.kind === 'pr' && r.action === 'merged' ? 'merged' : r.kind] || GitCommitHorizontal
                return (
                  <motion.li
                    key={`${r.at}-${i}`}
                    initial={{ opacity: 0, x: 16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, ease, delay: i * 0.07 }}
                    className="flex items-start gap-4 border-b border-sky-soft/15 py-4"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-sky-soft/20 text-coral">
                      <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug text-sky-soft">{describe(r)}</span>
                      <span className="mt-1 block truncate text-[13px] text-dim">
                        {r.repo} · {ago(r.at, lang)}
                      </span>
                    </span>
                  </motion.li>
                )
              })}
            </ol>
            {data && (
              <a
                href={`https://github.com/${data.owner}`}
                target="_blank"
                rel="noreferrer"
                className="group mt-6 inline-flex h-11 items-center gap-2 text-[15px] text-sky-soft underline decoration-sky-soft/30 underline-offset-4 transition-colors hover:decoration-coral"
              >
                {t('activity.profile')}
                <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
