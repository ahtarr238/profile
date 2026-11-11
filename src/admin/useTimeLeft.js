import { useEffect, useState } from 'react'

/** Milliseconds left until `expiresAt`, refreshed every second. */
export function useTimeLeft(expiresAt) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return expiresAt - now
}
