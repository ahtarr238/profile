import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'

/** A number that counts up from 0 the first time it is seen. */
export default function CountUp({ value, duration = 1.4 }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const [n, setN] = useState(0)
  const target = Number(value)

  useEffect(() => {
    if (!seen) return
    const controls = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => controls.stop()
  }, [seen, target, duration])

  return (
    <span ref={ref} className="tabular-nums">
      {n}
    </span>
  )
}
