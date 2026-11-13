import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Eye, MessageCircle, ThumbsUp, Users } from 'lucide-react'
import { friendly } from './errors'
import { FeaturedIcon, Notice } from './ui'
import { Skeleton } from '@/admin/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/admin/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/admin/components/ui/toggle-group'
import { cn } from '@/admin/lib/utils'

const nf = new Intl.NumberFormat('en-US')
const shortDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const EVENT_LABEL = {
  contact_whatsapp: 'Sent on WhatsApp',
  contact_email: 'Sent by email',
  project_open: 'Project details opened',
  video_open: 'Project video opened',
  cert_open: 'Certificate opened',
}
const DEVICE_LABEL = { mobile: 'Phone', desktop: 'Desktop', tablet: 'Tablet' }
// colour follows the thing, never its rank: a device keeps its colour whatever the order
const DEVICE_TONE = { mobile: 'bg-data', desktop: 'bg-data-2', tablet: 'bg-data-3' }
// one hue per measure, shared by its figure, its sparkline, the chart and the tooltip
// (data, data-2, data-3 were checked together for colour-blind readers on white)
const TONE = {
  visitors: { stroke: 'stroke-data', area: 'fill-data/10', bar: 'fill-data', barDim: 'fill-data/30', dot: 'bg-data' },
  views: { stroke: 'stroke-data-2', area: 'fill-data-2/10', bar: 'fill-data-2', barDim: 'fill-data-2/30', dot: 'bg-data-2' },
  likes: { stroke: 'stroke-data-3', area: 'fill-data-3/10', bar: 'fill-data-3', barDim: 'fill-data-3/30', dot: 'bg-data-3' },
}
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

const card = 'rounded-xl border border-ut-200 bg-white shadow-xs'

/** A small line of the same days, beside a figure. */
function Spark({ values, tone }) {
  if (!tone || values.length < 2) return null
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${38 - (v / max) * 34}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-24 shrink-0 md:w-28" aria-hidden="true">
      <polyline points={`0,40 ${pts} 100,40`} className={tone.area} />
      <polyline points={pts} fill="none" vectorEffect="non-scaling-stroke" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className={tone.stroke} />
    </svg>
  )
}

function Kpi({ label, icon, value, note, spark, tone }) {
  return (
    <div className={cn(card, 'flex min-w-0 flex-col gap-4 p-4 md:p-5')}>
      <div className="flex items-center gap-3">
        <FeaturedIcon icon={icon} className="size-9 [&_svg]:size-[18px]" />
        <span className="truncate text-sm font-medium text-ut-600">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-ut-900 tabular-nums md:text-[30px] md:leading-[38px]">{nf.format(value)}</p>
          {note && <p className="mt-1 truncate text-sm text-ut-600">{note}</p>}
        </div>
        {spark && <Spark values={spark} tone={tone} />}
      </div>
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
  const H = 240
  const n = series.length
  const top = Math.max(0, ...series.map((d) => d[metric]))
  const max = niceMax(top)
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0]
  const step = n ? W / n : 0
  const gap = Math.max(2, Math.min(8, step * 0.3))
  const bw = Math.max(1, Math.min(32, step - gap))
  const y = (v) => H - (v / max) * H
  const cx = (i) => i * step + step / 2

  const bar = (i, v) => {
    const t = y(v)
    const h = H - t
    if (h <= 0) return ''
    const x = cx(i) - bw / 2
    const r = Math.min(4, h, bw / 2) // rounded at the data end only, square on the baseline
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
  const tipLeft = d ? Math.max(88, Math.min(W - 88, cx(active))) : 0

  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ut-200 px-4 py-5 md:px-6">
        <div>
          <h2 className="text-lg font-semibold text-ut-900">Traffic</h2>
          <p className="mt-0.5 text-sm text-ut-600">{METRICS[metric]} per day</p>
        </div>
        <ToggleGroup type="single" variant="outline" spacing={0} size="sm" value={metric} onValueChange={(v) => v && setMetric(v)} aria-label="Show">
          {Object.entries(METRICS).map(([key, label]) => (
            <ToggleGroupItem key={key} value={key}>
              <span aria-hidden="true" className={cn('size-2 rounded-full', TONE[key].dot)} />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 px-4 pt-6 pb-5 md:px-6">
        {/* y axis */}
        <div className="relative w-7 text-right text-xs text-ut-600 tabular-nums" style={{ height: H }} aria-hidden="true">
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
                <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} className={t === 0 ? 'stroke-ut-200' : 'stroke-ut-100'} strokeWidth="1" />
              ))}
              {d && <rect x={active * step} y="0" width={step} height={H} rx="4" className="fill-ut-50" />}
              {series.map((p, i) => (
                <path
                  key={p.date}
                  d={bar(i, p[metric])}
                  className={cn('transition-[fill] duration-150', active == null || active === i ? TONE[metric].bar : TONE[metric].barDim)}
                />
              ))}
            </svg>
          )}

          {top === 0 && <p className="absolute inset-0 grid place-items-center text-sm text-ut-600">No visits in this range yet.</p>}

          {d && (
            <div
              className="pointer-events-none absolute z-10 w-[176px] -translate-x-1/2 -translate-y-full rounded-lg border border-ut-200 bg-white px-3 py-2.5 text-xs shadow-[0_12px_16px_-4px_rgb(16_24_40/0.08),0_4px_6px_-2px_rgb(16_24_40/0.03)]"
              style={{ left: tipLeft, top: Math.max(0, y(d[metric]) - 10) }}
            >
              <p className="font-semibold text-ut-900">{longDate(d.date)}</p>
              <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
                {[
                  ['visitors', 'Visitors', d.visitors],
                  ['views', 'Views', d.views],
                  ['likes', 'Likes', d.likes ?? 0],
                ].map(([key, label, value]) => (
                  <div key={key} className="contents">
                    <dt className="flex items-center gap-2 text-ut-600">
                      <span aria-hidden="true" className={cn('size-2 rounded-full', TONE[key].dot)} />
                      {label}
                    </dt>
                    <dd className="text-right font-medium text-ut-900">{nf.format(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* x axis */}
        <div />
        <div className="relative mt-2 h-4 text-xs text-ut-600 tabular-nums" aria-hidden="true">
          {W > 0 &&
            labels.map((i, k) => (
              <span
                key={i}
                className={cn('absolute whitespace-nowrap', k === 0 ? '' : k === labels.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
                style={{ left: k === 0 ? 0 : k === labels.length - 1 ? W : cx(i) }}
              >
                {shortDate(series[i].date)}
              </span>
            ))}
        </div>
      </div>

      {/* the same numbers as a table, for screen readers (wrapped: a table ignores the 1px box of sr-only and would stretch the page) */}
      <div className="sr-only">
        <table>
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
      </div>
    </section>
  )
}

/** Untitled UI's progress list: a name, its count and share, and a thin bar under it. */
function Ranked({ title, rows, label = (x) => x, empty = 'No data yet' }) {
  const total = rows.reduce((s, r) => s + r[1], 0)
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section className={cn(card, 'p-4 md:p-6')}>
      <h3 className="text-lg font-semibold text-ut-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ut-600">{empty}</p>
      ) : (
        <ol className="mt-5 grid gap-4">
          {rows.map(([key, n]) => (
            <li key={key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-ut-700">{label(key)}</span>
                <span className="shrink-0 text-ut-600 tabular-nums">
                  {nf.format(n)}
                  <span className="ml-2 inline-block w-9 text-right text-ut-500">{Math.round((n / total) * 100)}%</span>
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ut-100" aria-hidden="true">
                <div className="h-full rounded-full bg-data" style={{ width: `${(n / max) * 100}%` }} />
              </div>
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
    <section className={cn(card, 'p-4 md:p-6')}>
      <h3 className="text-lg font-semibold text-ut-900">Devices</h3>
      {total === 0 ? (
        <p className="mt-4 text-sm text-ut-600">No data yet</p>
      ) : (
        <>
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {rows.map(([key, n]) => (
              <span key={key} className={cn(DEVICE_TONE[key] || 'bg-ut-400', 'first:rounded-l-full last:rounded-r-full')} style={{ width: `${(n / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-5 grid gap-3">
            {rows.map(([key, n]) => (
              <li key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2.5 font-medium text-ut-700">
                  <span aria-hidden="true" className={cn('size-2.5 rounded-full', DEVICE_TONE[key] || 'bg-ut-400')} />
                  {DEVICE_LABEL[key] || key}
                </span>
                <span className="text-ut-600 tabular-nums">
                  {nf.format(n)}
                  <span className="ml-2 inline-block w-9 text-right text-ut-500">{Math.round((n / total) * 100)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Opens of one kind for each id, from the "event:id" counts the API returns. */
const byId = (items, event) => {
  const out = {}
  for (const [key, n] of Object.entries(items || {})) {
    const [e, id] = key.split(':')
    if (e === event && id) out[id] = (out[id] || 0) + n
  }
  return out
}

/** Which projects people open: the details panel and the full-screen video, per project. */
function ProjectsTable({ projects, items }) {
  const details = byId(items, 'project_open')
  const videos = byId(items, 'video_open')
  const rows = projects
    .map((p) => ({ id: p.id, title: p.title, details: details[p.id] || 0, videos: videos[p.id] || 0 }))
    .sort((a, b) => b.details + b.videos - (a.details + a.videos))
  const max = Math.max(1, ...rows.map((r) => r.details + r.videos))
  const none = rows.every((r) => r.details + r.videos === 0)
  return (
    <section className={cn(card, 'overflow-hidden')}>
      <div className="px-4 pt-5 pb-4 md:px-6">
        <h3 className="text-lg font-semibold text-ut-900">Projects</h3>
        <p className="mt-0.5 text-sm text-ut-600">Which ones people open, most first.</p>
      </div>
      {none ? (
        <p className="border-t border-ut-200 px-4 py-6 text-sm text-ut-600 md:px-6">No project opened in this range yet. Counts per project start from this update.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full px-4 md:px-6">Project</TableHead>
              <TableHead className="px-3 text-right md:px-4">Details</TableHead>
              <TableHead className="px-4 text-right md:px-6">Videos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="h-auto max-w-0 px-4 py-3 md:px-6">
                  <p className="truncate text-sm font-medium text-ut-900">{r.title}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ut-100" aria-hidden="true">
                    <div className="h-full rounded-full bg-data" style={{ width: `${((r.details + r.videos) / max) * 100}%` }} />
                  </div>
                </TableCell>
                <TableCell className="h-auto px-3 py-3 text-right text-sm text-ut-700 tabular-nums md:px-4">{nf.format(r.details)}</TableCell>
                <TableCell className="h-auto px-4 py-3 text-right text-sm text-ut-700 tabular-nums md:px-6">{nf.format(r.videos)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export default function StatsPanel({ token, catalog }) {
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

  let body
  if (error) body = <Notice tone="error">{error}</Notice>
  else if (!data) body = <StatsSkeleton />
  else if (!data.configured)
    body = (
      <div className={cn(card, 'p-5 text-sm leading-6 text-ut-600')}>
        <p className="font-semibold text-ut-900">Visitor stats aren’t switched on yet.</p>
        <p className="mt-1">
          In Vercel open the project → <b className="text-ut-700">Storage</b> → <b className="text-ut-700">Create</b> → <b className="text-ut-700">Upstash Redis</b> (free plan) and
          connect it to this project, then redeploy. Steps are in docs/admin-setup.md.
        </p>
      </div>
    )
  else
    body = (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          <Kpi tone={TONE.visitors} label="Visitors" icon={Users} value={data.visitors} note={`last ${data.days} days`} spark={data.series.map((d) => d.visitors)} />
          <Kpi tone={TONE.views} label="Page views" icon={Eye} value={data.views} note={`${nf.format(data.allTime)} all time`} spark={data.series.map((d) => d.views)} />
          <Kpi tone={TONE.likes} label="Likes" icon={ThumbsUp} value={data.likes ?? 0} note={`${nf.format(data.likesAllTime ?? 0)} all time`} spark={data.series.map((d) => d.likes ?? 0)} />
          <Kpi
            label="Reached out"
            icon={MessageCircle}
            value={contacts}
            note={`${nf.format(data.events.contact_whatsapp || 0)} WhatsApp · ${nf.format(data.events.contact_email || 0)} email`}
          />
        </div>

        <TrafficChart series={data.series} />

        {catalog && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <ProjectsTable projects={catalog.projects || []} items={data.items} />
            <Ranked
              title="Certificates opened"
              rows={Object.entries(byId(data.items, 'cert_open'))
                .filter(([id]) => (catalog.certificates || []).some((c) => c.id === id))
                .sort((a, b) => b[1] - a[1])}
              label={(id) => (catalog.certificates || []).find((c) => c.id === id)?.title || id}
              empty="No certificate opened in this range yet."
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup type="single" variant="outline" spacing={0} value={String(days)} onValueChange={(v) => v && setDays(Number(v))} aria-label="Time range" className="max-sm:w-full">
          {[90, 30, 7].map((n) => (
            <ToggleGroupItem key={n} value={String(n)} className="max-sm:flex-1">
              {n} days
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-ut-600">Each visitor counts once a day.</p>
      </div>
      {body}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[148px] rounded-xl bg-ut-100" />
        ))}
      </div>
      <Skeleton className="h-[380px] rounded-xl bg-ut-100" />
    </div>
  )
}
