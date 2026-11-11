import { useEffect, useMemo, useState } from 'react'
import { ThumbsUp } from 'lucide-react'
import { friendly } from './errors'
import { Notice } from './ui'

const nf = new Intl.NumberFormat('en-US')
const shortDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const EVENT_LABEL = {
  contact_whatsapp: 'Sent on WhatsApp',
  contact_email: 'Sent by email',
  video_open: 'Project video opened',
  cert_open: 'Certificate opened',
}
const DEVICE_LABEL = { mobile: 'Phone', desktop: 'Desktop', tablet: 'Tablet' }
const countryName = (cc) => {
  if (cc === '??') return 'Unknown'
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc
  } catch {
    return cc
  }
}

function Tile({ label, value, note, icon: Icon, className = '' }) {
  return (
    <div className={`flex flex-col justify-between rounded-[6px] bg-tile p-4 md:p-5 ${className}`}>
      <span className="flex items-center gap-1.5 text-[13px] text-mist">
        {Icon && <Icon size={14} strokeWidth={1.9} className="text-coral" fill="currentColor" aria-hidden="true" />}
        {label}
      </span>
      <span className="font-display mt-3 text-[34px] leading-none font-light tabular-nums md:text-[42px]">{nf.format(value)}</span>
      {note && <span className="mt-2 text-[12px] text-dim">{note}</span>}
    </div>
  )
}

/** One series (visitors per day) as thin bars; hover or focus a day for its numbers. */
function DailyBars({ series }) {
  const [hover, setHover] = useState(null)
  const H = 160
  const gap = 2
  const bw = 14
  const W = series.length * (bw + gap)
  const max = Math.max(1, ...series.map((d) => d.visitors))
  const nice = max <= 5 ? 5 : Math.ceil(max / 5) * 5
  const y = (v) => H - (v / nice) * H
  const bar = (x, top) => {
    const h = H - top
    if (h <= 0) return ''
    const r = Math.min(4, h, bw / 2) // rounded only at the data end, square on the baseline
    return `M${x},${H}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${H}Z`
  }
  const d = hover != null ? series[hover] : null

  return (
    <figure className="rounded-[6px] bg-tile p-4 md:p-5">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-[14px] text-sky-soft">Visitors per day</span>
        <span className="text-[12px] text-dim tabular-nums">
          {d
            ? `${shortDate(d.date)}: ${nf.format(d.visitors)} visitors · ${nf.format(d.views)} views · ${nf.format(d.likes ?? 0)} likes`
            : 'Hover a day for details'}
        </span>
      </figcaption>
      <div className="relative mt-4 flex gap-3">
        <div className="flex h-[160px] flex-col justify-between text-right text-[11px] text-dim tabular-nums" aria-hidden="true">
          <span>{nice}</span>
          <span>{nice / 2}</span>
          <span>0</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[160px] w-full overflow-visible" role="img" aria-label="Visitors per day, last days">
          {[0, 0.5, 1].map((t) => (
            <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className="text-sky-soft/10" />
          ))}
          {series.map((p, i) => {
            const x = i * (bw + gap)
            return (
              <g key={p.date}>
                <path d={bar(x, y(p.visitors))} className={hover == null || hover === i ? 'fill-coral' : 'fill-coral/40'} />
                {/* hit target: the whole column, taller and wider than the bar */}
                <rect
                  x={x - gap / 2}
                  y="0"
                  width={bw + gap}
                  height={H}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${shortDate(p.date)}: ${p.visitors} visitors, ${p.views} views`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex justify-between pl-8 text-[11px] text-dim tabular-nums" aria-hidden="true">
        <span>{shortDate(series[0].date)}</span>
        <span>{shortDate(series[Math.floor(series.length / 2)].date)}</span>
        <span>{shortDate(series.at(-1).date)}</span>
      </div>
      {/* the same numbers as a table, for screen readers */}
      <table className="sr-only">
        <caption>Visitors and views per day</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Visitors</th>
            <th>Views</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.visitors}</td>
              <td>{p.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Ranked({ title, rows, label = (x) => x, empty = 'No data yet' }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section className="rounded-[6px] bg-tile p-4 md:p-5">
      <h3 className="text-[14px] text-sky-soft">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-dim">{empty}</p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {rows.map(([key, n]) => (
            <li key={key} className="relative flex items-center justify-between gap-3 overflow-hidden rounded-[3px] px-2 py-1.5 text-[13px]">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-[3px] bg-sky-soft/10" style={{ width: `${(n / max) * 100}%` }} />
              <span className="relative truncate text-sky-soft">{label(key)}</span>
              <span className="relative text-mist tabular-nums">{nf.format(n)}</span>
            </li>
          ))}
        </ol>
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

  if (error) return <div className="mt-6"><Notice tone="error">{error}</Notice></div>
  if (!data) return <p className="mt-8 text-mist">Loading stats…</p>
  if (!data.configured)
    return (
      <div className="mt-6 rounded-[6px] bg-tile p-5 text-[15px] leading-6 text-mist">
        <p className="text-sky-soft">Visitor stats aren’t switched on yet.</p>
        <p className="mt-2">
          In Vercel open the project → <b className="text-sky-soft">Storage</b> → <b className="text-sky-soft">Create</b> → <b className="text-sky-soft">Upstash Redis</b>{' '}
          (free plan) and connect it to this project, then redeploy. Steps are in docs/admin-setup.md.
        </p>
      </div>
    )

  return (
    <div className="mt-6 grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-dim">Counted without cookies. Each visitor counts once a day.</p>
        <div className="flex gap-1 rounded-[4px] bg-tile p-1" role="group" aria-label="Time range">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={days === n}
              onClick={() => setDays(n)}
              className={`h-8 rounded-[3px] px-3 text-[13px] whitespace-nowrap transition-colors duration-150 ${days === n ? 'bg-sky-soft text-ground' : 'text-mist hover:text-sky-soft'}`}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile
          label="Likes"
          icon={ThumbsUp}
          value={data.likes ?? 0}
          note={`last ${data.days} days · ${nf.format(data.likesAllTime ?? 0)} all time`}
          className="col-span-2 md:col-span-1"
        />
        <Tile label="Visitors" value={data.visitors} note={`last ${data.days} days`} />
        <Tile label="Page views" value={data.views} note={`last ${data.days} days`} />
        <Tile label="Reached out" value={contacts} note="WhatsApp or email sends" />
        <Tile label="All-time views" value={data.allTime} note="since stats were switched on" />
      </div>

      <DailyBars series={data.series} />

      <div className="grid gap-3 md:grid-cols-3">
        <Ranked title="Where they came from" rows={data.referrers} label={(r) => (r === 'direct' ? 'Direct or unknown' : r)} />
        <Ranked title="Countries" rows={data.countries} label={countryName} />
        <Ranked
          title="What they did"
          rows={Object.entries(data.events).filter(([, n]) => n > 0)}
          label={(e) => EVENT_LABEL[e] || e}
          empty="No clicks yet"
        />
      </div>
      <Ranked title="Devices" rows={Object.entries(data.devices).sort((a, b) => b[1] - a[1])} label={(d) => DEVICE_LABEL[d] || d} />
    </div>
  )
}
