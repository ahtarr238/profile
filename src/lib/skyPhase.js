// The hero's sky follows the clock in Bogor: dawn, day, dusk or night, whatever time zone the
// visitor is in. Picked once when the page opens, so the picture never swaps mid-visit.
// ?sky=dawn|day|dusk|night shows a given one (handy to show off all four).

export const PHASES = ['dawn', 'day', 'dusk', 'night']

const bogorHour = (now) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0)
  return get('hour') + get('minute') / 60
}

export function skyPhase(now = new Date()) {
  try {
    const asked = new URLSearchParams(window.location.search).get('sky')
    if (PHASES.includes(asked)) return asked
  } catch {
    // no URL to read: fall through to the clock
  }
  const h = bogorHour(now)
  // the sun rises around 5:45 and sets around 17:50 in Bogor all year (it's near the equator)
  if (h >= 5 && h < 6.5) return 'dawn'
  if (h >= 6.5 && h < 16.5) return 'day'
  if (h >= 16.5 && h < 18.5) return 'dusk'
  return 'night'
}

/** The hero's layer files for a phase: dusk sits at the top of /hero-layers, the rest in a folder each. */
export function heroLayers(phase) {
  const dir = phase === 'dusk' ? '/hero-layers' : `/hero-layers/${phase}`
  return {
    back: `${dir}/sky.webp`,
    clouds: `${dir}/clouds.webp`, // a cloud deck behind the mountains, rendered as a volume
    middle: `${dir}/far.webp`,
    wisps: `${dir}/wisps.webp`, // low mist at the foot of the mountains
    front: `${dir}/near.webp`,
    // phones: smaller files and the clouds baked into the sky, so four layers move instead of five
    mobile: {
      back: `${dir}/sky-m.webp`,
      middle: `${dir}/far-m.webp`,
      wisps: `${dir}/wisps.webp`,
      front: `${dir}/near-m.webp`,
    },
  }
}
