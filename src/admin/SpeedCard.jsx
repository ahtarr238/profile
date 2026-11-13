import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Gauge, XCircle } from 'lucide-react'
import { FeaturedIcon } from './ui'
import { ToggleGroup, ToggleGroupItem } from '@/admin/components/ui/toggle-group'
import { cn } from '@/admin/lib/utils'

// Google's thresholds; must match api/_vitals.js
const METRICS = [
  { key: 'lcp', name: 'Largest paint', what: 'When the main content shows', good: 2500, poor: 4000, core: true },
  { key: 'inp', name: 'Responsiveness', what: 'How fast taps and clicks answer', good: 200, poor: 500, core: true },
  { key: 'cls', name: 'Layout shift', what: 'How much things jump around', good: 0.1, poor: 0.25, core: true },
  { key: 'fcp', name: 'First paint', what: 'When anything shows at all', good: 1800, poor: 3000 },
  { key: 'ttfb', name: 'Server response', what: 'How fast the first byte arrives', good: 800, poor: 1800 },
]
// status colours are for state only, always with an icon and a word
const RATING = {
  good: { label: 'Good', icon: CheckCircle2, text: 'text-[#067647]', badge: 'border-[#abefc6] bg-[#ecfdf3]', bar: 'bg-[#17b26a]' },
  needsWork: { label: 'Needs work', icon: AlertTriangle, text: 'text-[#b54708]', badge: 'border-[#fedf89] bg-[#fffaeb]', bar: 'bg-[#f79009]' },
  poor: { label: 'Poor', icon: XCircle, text: 'text-[#b42318]', badge: 'border-[#fecdca] bg-[#fef3f2]', bar: 'bg-[#f04438]' },
}
const rate = (m, v) => (v <= m.good ? 'good' : v <= m.poor ? 'needsWork' : 'poor')
const show = (key, v) => (key === 'cls' ? v.toFixed(2) : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(1)} s`)
const pct = (part, n) => Math.round((part / n) * 100)

function Metric({ m, s }) {
  if (!s || !s.n) {
    return (
      <div className="rounded-xl border border-ut-200 p-4">
        <p className="text-sm font-medium text-ut-700">{m.name}</p>
        <p className="mt-0.5 text-xs text-ut-500">{m.what}</p>
        <p className="mt-4 text-sm text-ut-500">No data yet</p>
      </div>
    )
  }
  const r = RATING[rate(m, s.p75)]
  const Icon = r.icon
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-ut-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ut-700">
            {m.name} <span className="text-xs font-normal text-ut-500 uppercase">{m.key}</span>
          </p>
          <p className="mt-0.5 text-xs text-ut-500">{m.what}</p>
        </div>
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', r.badge, r.text)}>
          <Icon className="size-3" strokeWidth={2.2} aria-hidden="true" />
          {r.label}
        </span>
      </div>
      <p className={cn('mt-3 font-semibold tracking-[-0.02em] text-ut-900 tabular-nums', m.core ? 'text-[30px] leading-[38px]' : 'text-2xl')}>{show(m.key, s.p75)}</p>
      {/* the share of visits in each band, Google's own split */}
      <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {['good', 'needsWork', 'poor'].map((k) =>
          s[k] ? <span key={k} className={cn(RATING[k].bar, 'first:rounded-l-full last:rounded-r-full')} style={{ width: `${pct(s[k], s.n)}%` }} /> : null,
        )}
      </div>
      <p className="mt-2 text-xs text-ut-600 tabular-nums">
        {pct(s.good, s.n)}% good · {pct(s.needsWork, s.n)}% needs work · {pct(s.poor, s.n)}% poor
      </p>
    </div>
  )
}

/**
 * How fast the site is for the people who actually visit it (Core Web Vitals), per device:
 * the 75th percentile, which is what Google judges a page by, and the good / needs work / poor split.
 */
export default function SpeedCard({ speed }) {
  const [device, setDevice] = useState('mobile')
  const d = speed?.[device] || {}
  const visits = d.lcp?.n || d.fcp?.n || 0
  return (
    <section className="rounded-xl border border-ut-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ut-200 px-4 py-5 md:px-6">
        <div className="flex items-start gap-3">
          <FeaturedIcon icon={Gauge} className="hidden sm:grid" />
          <div>
            <h2 className="text-lg font-semibold text-ut-900">Speed for real visitors</h2>
            <p className="mt-0.5 text-sm text-ut-600">
              The 75th percentile, which is what Google ranks by. {visits ? `${visits} ${visits === 1 ? 'visit' : 'visits'} measured.` : ''}
            </p>
          </div>
        </div>
        <ToggleGroup type="single" variant="outline" spacing={0} size="sm" value={device} onValueChange={(v) => v && setDevice(v)} aria-label="Device">
          <ToggleGroupItem value="mobile">Phone</ToggleGroupItem>
          <ToggleGroupItem value="desktop">Desktop</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-6 xl:grid-cols-3">
        {METRICS.map((m) => (
          <Metric key={m.key} m={m} s={d[m.key]} />
        ))}
        <p className="self-center text-xs leading-5 text-ut-500 sm:col-span-2 xl:col-span-1">
          The loading screen counts here: it holds every visit for at least 1.7 s, so paint times start from there. Counts begin with this update.
        </p>
      </div>
    </section>
  )
}
