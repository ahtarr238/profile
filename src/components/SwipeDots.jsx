import { useEffect, useState } from 'react'

/** Phone-only position marker for a horizontal swipe row: "01 / 06", dots, and a hint. */
export default function SwipeDots({ scrollerRef, count }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      // the slide whose centre is nearest the row's centre
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0
      let dist = Infinity
      ;[...el.children].forEach((child, i) => {
        const d = Math.abs(child.offsetLeft + child.offsetWidth / 2 - mid)
        if (d < dist) {
          dist = d
          best = i
        }
      })
      setActive(best)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollerRef])

  const pad = (n) => String(n).padStart(2, '0')

  return (
    <div className="mt-6 flex items-center gap-4 md:hidden" aria-hidden="true">
      <span className="font-display text-[15px] text-coral tabular-nums">
        {pad(active + 1)} / {pad(count)}
      </span>
      <span className="flex gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ease-out ${i === active ? 'w-5 bg-coral' : 'w-1.5 bg-sky-soft/30'}`}
          />
        ))}
      </span>
      <span className="ml-auto text-[13px] text-mist">Swipe</span>
    </div>
  )
}
