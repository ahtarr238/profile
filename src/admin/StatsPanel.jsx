import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eye, MessageCircle, ThumbsUp, Users } from 'lucide-react'
import { friendly } from './errors'
import { Notice } from './ui'

const nf = new Intl.NumberFormat('en-US')
const shortDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const EVENT_LABEL = {
  contact_whatsapp: 'Sent on WhatsApp',
  contact_email: 'Sent by email',
  video_open: 'Project video opened',
  cert_open: 'Certificate opened',
}
const DEVICE_LABEL = { mobile: 'Phone', desktop: 'Desktop', tablet: 'Tablet' }
const DEVICE_TONE = ['bg-coral', 'bg-sky', 'bg-dim'] // most used first
const countryName = (cc) => {
  if (cc === '??') return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc
  } catch {
    return cc
  }
}

/** Width of an element in CSS pixels, kept up to date as the layout changes. */
function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/** A round number just above the top value, so the grid lines land on friendly figures. */
function niceMax(v) {
  if (v <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(v))
  const steps = [1, 2, 2.5, 4, 5, 10]
  return steps.map((s) => s * p).find((s) => s >= v) ?? 10 * p
}

const card = 'rounded-[10px] border border-sky-soft/10 bg-tile'

/** A small line of the same days, drawn under a figure. */
function Spark({ values }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 26}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-4 h-8 w-full" aria-hidden="true">
      <polyline points={`0,30 ${pts} 100,30`} className="fill-coral/10" />
      <polyline points={pts} fill="none" vectorEffect="non-scaling-stroke" strokeWidth="1.5" strokeLinejoin="round" className="stroke-coral" />
    </svg>
  )
}

function Kpi({ label, icon: Icon, value, note, spark }) {
  return (
    <div className={`${card} flex min-w-0 flex-col p-4 md:p-5`}>
      <span className="flex items-center gap-2 text-[13px] text-mist">
        <Icon size={15} strokeWidth={1.75} className="text-coral" aria-hidden="true" />
        {label}
      </span>
      <span className="font-display mt-3 text-[32px] leading-none font-light tabular-nums md:text-[40px]">{nf.format(value)}</span>
      {note && <span className="mt-2 truncate text-[12px] text-dim">{note}</span>}
      {spark && <Spark values={spark} />}
    </div>
  )
}

const METRICS = { visitors: 'Visitors', views: 'Page views' }

/**
 * Bars for each day, drawn at the real pixel width of the card (no stretched viewBox),
 * so they stay crisp from a phone to a wide screen. Point, tap, drag or use the arrow keys
 * to read a day.
 */
function TrafficChart({ series }) {
  const [metric, setMetric] = useState('visitors')
  const [active, setActive] = useState(null)
  const boxRef = useRef(null)
  const W = useWidth(boxRef)
  const H = 200
  const n = series.length
  const top = Math.max(0, ...series.map((d) => d[metric]))
  const max = niceMax(top)
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0]
  const step = n ? W / n : 0
  const gap = Math.max(1, Math.min(6, step * 0.28))
  const bw = Math.max(1, Math.min(28, step - gap))
  const y = (v) => H - (v / max) * H
  const cx = (i) => i * step + step / 2

  const bar = (i, v) => {
    const t = y(v)
    const h = H - t
    if (h <= 0) return ''
    const x = cx(i) - bw / 2
    const r = Math.min(3, h, bw / 2) // rounded at the data end only, square on the baseline
    return `M${x},${H}V${t + r}Q${x},${t} ${x + r},${t}H${x + bw - r}Q${x + bw},${t} ${x + bw},${t + r}V${H}Z`
  }

  const pick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.floor(((e.clientX - rect.left) / rect.width) * n)
    setActive(Math.max(0, Math.min(n - 1, i)))
  }
  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n) + (e.key === 'ArrowLeft' ? -1 : 1))))
  }

  // as many dates under the axis as fit, evenly spread, always the first and the last
  const labelCount = Math.max(2, Math.min(n, Math.floor(W / 90)))
  const labels = [...new Set(Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / (labelCount - 1))))]

  const d = active != null ? series[active] : null
  const tipLeft = d ? Math.max(84, Math.min(W - 84, cx(active))) : 0

  return (
    <section className={`${card} p-4 md:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] text-sky-soft">Traffic</h2>
          <p className="text-[12px] text-dim">{METRICS[metric]} per day</p>
        </div>
        <div className="flex rounded-[6px] bg-ground/60 p-1" role="group" aria-label="Show">
          {Object.entries(METRICS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              className={`h-8 rounded-[4px] px-3 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                metric === key ? 'bg-navy-raised text-sky-soft' : 'text-mist hover:text-sky-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-3">
        {/* y axis */}
        <div className="relative w-7 text-right text-[11px] text-dim tabular-nums" style={{ height: H }} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>
              {nf.format(Math.round(t))}
            </span>
          ))}
        </div>

        <div
          ref={boxRef}
          className="relative min-w-0 touch-pan-y rounded-[4px] outline-offset-4"
          style={{ height: H }}
          tabIndex={0}
          role="group"
          aria-label={`${METRICS[metric]} per day. Use the left and right arrow keys to read each day.`}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        >
          {W > 0 && (
            <svg width={W} height={H} className="absolute inset-0 overflow-visible" aria-hidden="true">
              {ticks.map((t) => (
                <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-sky-soft/25' : 'stroke-sky-soft/[0.07]'} strokeWidth="1" />
              ))}
              {d && <rect x={active * step} y="0" width={step} height={H} className="fill-sky-soft/[0.04]" />}
              {series.map((p, i) => (
                <path
                  key={p.date}
                  d={bar(i, p[metric])}
                  className={`transition-[fill] duration-150 ${active == null || active === i ? 'fill-coral' : 'fill-coral/35'}`}
                />
              ))}
            </svg>
          )}

          {top === 0 && (
            <p className="absolute inset-0 grid place-items-center text-[13px] text-dim">No visits in this range yet.</p>
          )}

          {d && (
            <div
              className="pointer-events-none absolute z-10 w-[168px] -translate-x-1/2 -translate-y-full rounded-[8px] border border-sky-soft/15 bg-navy-deep px-3 py-2.5 text-[12px] shadow-[0_12px_32px_rgb(0_0_0/0.45)]"
              style={{ left: tipLeft, top: Math.max(0, y(d[metric]) - 10) }}
            >
              <p className="text-sky-soft">{longDate(d.date)}</p>
              <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
                <dt className="text-dim">Visitors</dt>
                <dd className="text-right text-sky-soft">{nf.format(d.visitors)}</dd>
                <dt className="text-dim">Views</dt>
                <dd className="text-right text-sky-soft">{nf.format(d.views)}</dd>
                <dt className="text-dim">Likes</dt>
                <dd className="text-right text-sky-soft">{nf.format(d.likes ?? 0)}</dd>
              </dl>
            </div>
          )}
        </div>

        {/* x axis */}
        <div />
        <div className="relative mt-2 h-4 text-[11px] text-dim tabular-nums" aria-hidden="true">
          {W > 0 &&
            labels.map((i, k) => (
              <span
                key={i}
                className={`absolute whitespace-nowrap ${k === 0 ? '' : k === labels.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{ left: k === 0 ? 0 : k === labels.length - 1 ? W : cx(i) }}
              >
                {shortDate(series[i].date)}
              </span>
            ))}
        </div>
      </div>

      {/* the same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>Visitors, views and likes per day</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Visitors</th>
            <th>Views</th>
            <th>Likes</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.visitors}</td>
              <td>{p.views}</td>
              <td>{p.likes ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function Ranked({ title, rows, label = (x) => x, empty = 'No data yet' }) {
  const total = rows.reduce((s, r) => s + r[1], 0)
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section className={`${card} p-4 md:p-5`}>
      <h3 className="text-[15px] text-sky-soft">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-dim">{empty}</p>
      ) : (
        <ol className="mt-4 grid gap-1.5">
          {rows.map(([key, n]) => (
            <li key={key} className="relative flex h-9 items-center justify-between gap-3 overflow-hidden rounded-[4px] px-2.5 text-[13px]">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-[4px] bg-sky-soft/[0.07]" style={{ width: `${(n / max) * 100}%` }} />
              <span className="relative min-w-0 truncate text-sky-soft">{label(key)}</span>
              <span className="relative shrink-0 text-mist tabular-nums">
                {nf.format(n)}
                <span className="ml-2 inline-block w-9 text-right text-dim">{Math.round((n / total) * 100)}%</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Devices({ devices }) {
  const rows = Object.entries(devices)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, r) => s + r[1], 0)
  return (
    <section className={`${card} p-4 md:p-5`}>
      <h3 className="text-[15px] text-sky-soft">Devices</h3>
      {total === 0 ? (
        <p className="mt-4 text-[13px] text-dim">No data yet</p>
      ) : (
        <>
          <div className="mt-5 flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
            {rows.map(([key, n], i) => (
              <span key={key} className={`${DEVICE_TONE[i] || 'bg-mist'} rounded-full`} style={{ width: `${(n / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-5 grid gap-3">
            {rows.map(([key, n], i) => (
              <li key={key} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex items-center gap-2.5 text-sky-soft">
                  <span aria-hidden="true" className={`size-2.5 rounded-full ${DEVICE_TONE[i] || 'bg-mist'}`} />
                  {DEVICE_LABEL[key] || key}
                </span>
                <span className="text-mist tabular-nums">
                  {nf.format(n)}
                  <span className="ml-2 inline-block w-9 text-right text-dim">{Math.round((n / total) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default function StatsPanel({ token }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let on = true
    fetch(`/api/stats?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw Object.assign(new Error(r.status === 401 ? 'Your sign-in ran out. Sign in again.' : 'Stats are not available right now.'), { status: r.status })
        return r.json()
      })
      .then((d) => on && (setData(d), setError('')))
      .catch((e) => on && setError(e.status === 404 ? 'Stats only work on the live site (they run on Vercel).' : friendly(e)))
    return () => {
      on = false
    }
  }, [days, token])

  const contacts = useMemo(() => (data?.events ? (data.events.contact_whatsapp || 0) + (data.events.contact_email || 0) : 0), [data])

  const range = (
    <div className="flex rounded-[6px] border border-sky-soft/10 bg-tile p-1" role="group" aria-label="Time range">
      {[7, 30, 90].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={days === n}
          onClick={() => setDays(n)}
          className={`h-8 flex-1 rounded-[4px] px-3 text-[13px] whitespace-nowrap transition-colors duration-150 ${
            days === n ? 'bg-sky-soft text-ground' : 'text-mist hover:text-sky-soft'
          }`}
        >
          {n} days
        </button>
      ))}
    </div>
  )

  let body
  if (error) body = <Notice tone="error">{error}</Notice>
  else if (!data) body = <StatsSkeleton />
  else if (!data.configured)
    body = (
      <div className={`${card} p-5 text-[15px] leading-6 text-mist`}>
        <p className="text-sky-soft">Visitor stats aren’t switched on yet.</p>
        <p className="mt-2">
          In Vercel open the project → <b className="text-sky-soft">Storage</b> → <b className="text-sky-soft">Create</b> → <b className="text-sky-soft">Upstash Redis</b>{' '}
          (free plan) and connect it to this project, then redeploy. Steps are in docs/admin-setup.md.
        </p>
      </div>
    )
  else
    body = (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <Kpi label="Visitors" icon={Users} value={data.visitors} note={`last ${data.days} days`} spark={data.series.map((d) => d.visitors)} />
          <Kpi label="Page views" icon={Eye} value={data.views} note={`${nf.format(data.allTime)} all time`} spark={data.series.map((d) => d.views)} />
          <Kpi label="Likes" icon={ThumbsUp} value={data.likes ?? 0} note={`${nf.format(data.likesAllTime ?? 0)} all time`} spark={data.series.map((d) => d.likes ?? 0)} />
          <Kpi
            label="Reached out"
            icon={MessageCircle}
            value={contacts}
            note={`${nf.format(data.events.contact_whatsapp || 0)} WhatsApp · ${nf.format(data.events.contact_email || 0)} email`}
          />
        </div>

        <TrafficChart series={data.series} />

        <div className="grid gap-4 md:grid-cols-2">
          <Ranked title="Where they came from" rows={data.referrers} label={(r) => (r === 'direct' ? 'Direct or unknown' : r)} />
          <Ranked title="Countries" rows={data.countries} label={countryName} />
          <Devices devices={data.devices} />
          <Ranked
            title="What they did"
            rows={Object.entries(data.events)
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1])}
            label={(e) => EVENT_LABEL[e] || e}
            empty="No clicks yet"
          />
        </div>
      </div>
    )

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-dim">Counted without cookies. Each visitor counts once a day.</p>
        <div className="w-full sm:w-auto">{range}</div>
      </div>
      {body}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${card} h-[132px] md:h-[160px]`} />
        ))}
      </div>
      <div className={`${card} h-[320px]`} />
    </div>
  )
}
