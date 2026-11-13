import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn's class joiner: later classes win over earlier ones (px-4 after px-3 keeps px-4). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
