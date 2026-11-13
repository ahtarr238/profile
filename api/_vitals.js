// Speed as real visitors get it (Core Web Vitals). Each visit adds one count per metric to a
// bucket in a daily histogram, split phone/desktop; nothing about the visitor is kept. The
// bucket edges include Google's own "good" and "poor" thresholds, so those shares are exact,
// and the 75th percentile (what Google judges a site by) is read off the histogram.

// upper edge of each bucket (a value v goes in the first bucket with v <= edge)
export const METRICS = {
  lcp: { edges: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000, 10000, 15000, Infinity], good: 2500, poor: 4000, max: 120000 },
  inp: { edges: [50, 100, 150, 200, 250, 300, 400, 500, 700, 1000, 1500, 2500, Infinity], good: 200, poor: 500, max: 120000 },
  cls: { edges: [0.01, 0.025, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.35, 0.5, 0.75, 1, Infinity], good: 0.1, poor: 0.25, max: 20 },
  fcp: { edges: [300, 600, 900, 1200, 1500, 1800, 2200, 2600, 3000, 4000, 5000, 7000, 10000, Infinity], good: 1800, poor: 3000, max: 120000 },
  ttfb: { edges: [100, 200, 300, 400, 500, 600, 800, 1000, 1300, 1800, 2500, 4000, Infinity], good: 800, poor: 1800, max: 120000 },
}
export const DEVICES = ['mobile', 'desktop']

/** The bucket a value falls in, or -1 for a value that can't be real. */
export function bucketOf(metric, value) {
  const m = METRICS[metric]
  if (!m || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > m.max) return -1
  return m.edges.findIndex((edge) => value <= edge)
}

/**
 * { "lcp:mobile:4": 12, ... } → { mobile: { lcp: { n, p75, good, needsWork, poor } }, desktop: … }
 * p75 is interpolated inside its bucket; a p75 in the open last bucket is reported as its lower edge.
 */
export function summarize(hist) {
  const out = {}
  for (const device of DEVICES) {
    out[device] = {}
    for (const [metric, m] of Object.entries(METRICS)) {
      const counts = m.edges.map((_, i) => Number(hist[`${metric}:${device}:${i}`]) || 0)
      const n = counts.reduce((s, c) => s + c, 0)
      if (!n) {
        out[device][metric] = { n: 0, p75: null, good: 0, needsWork: 0, poor: 0 }
        continue
      }
      let good = 0
      let poor = 0
      counts.forEach((c, i) => {
        const lower = i === 0 ? 0 : m.edges[i - 1]
        if (m.edges[i] <= m.good) good += c
        else if (lower >= m.poor) poor += c
      })
      const target = n * 0.75
      let seen = 0
      let p75 = null
      for (let i = 0; i < counts.length; i++) {
        if (seen + counts[i] >= target) {
          const lower = i === 0 ? 0 : m.edges[i - 1]
          const upper = m.edges[i]
          p75 = upper === Infinity ? lower : lower + ((target - seen) / counts[i]) * (upper - lower)
          break
        }
        seen += counts[i]
      }
      out[device][metric] = { n, p75: metric === 'cls' ? Math.round(p75 * 1000) / 1000 : Math.round(p75), good, needsWork: n - good - poor, poor }
    }
  }
  return out
}
