import { useSyncExternalStore } from 'react'

export function useMedia(query, serverFallback = false) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  )
}

/** True on devices with a precise pointer that can hover (mouse, trackpad). */
export const useFinePointer = () => useMedia('(hover: hover) and (pointer: fine)')
