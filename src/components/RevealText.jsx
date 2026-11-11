import { useRef } from 'react'
import { motion, useInView } from 'motion/react'

const ease = [0.22, 1, 0.36, 1]

/**
 * Big type that rises letter by letter from behind a mask when it comes on screen.
 * `text` may hold "\n" for line breaks; `accent` is a trailing piece in coral (like ".").
 * `onLoad` plays it right away instead of waiting for the scroll.
 * Screen readers get the plain words (aria-label on headings, an sr-only copy on spans) instead of
 * letter-by-letter spans. `decorative` hides it all, for when the parent already says it.
 */
export default function RevealText({ text, accent = '', as: Tag = 'h2', className = '', delay = 0, stagger = 0.035, onLoad = false, decorative = false }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, amount: 0.35 })
  const show = onLoad || seen
  const lines = text.split('\n')
  // where each line starts in the overall letter count, so the stagger runs across lines
  const starts = lines.map((_, i) => lines.slice(0, i).reduce((sum, l) => sum + l.length, 0))
  const total = lines.reduce((sum, l) => sum + l.length, 0)

  const letter = (ch, key, index, extra = '') => {
    const d = delay + index * stagger
    return (
      <motion.span
        key={key}
        className={`inline-block will-change-transform ${extra}`}
        initial={{ y: '110%' }}
        animate={{ y: show ? '0%' : '110%' }}
        transition={{ duration: 0.95, ease, delay: show ? d : 0 }}
      >
        {ch === ' ' ? ' ' : ch}
      </motion.span>
    )
  }

  return (
    // Headings name themselves with aria-label (allowed on h1–h6), so the page text stays the visible
    // letters once. A plain span can't carry aria-label, so it gets an sr-only copy instead.
    <Tag
      ref={ref}
      className={className}
      aria-hidden={decorative || undefined}
      aria-label={!decorative && Tag !== 'span' ? `${text.replace(/\n/g, ' ')}${accent}` : undefined}
    >
      {!decorative && Tag === 'span' && <span className="sr-only">{`${text.replace(/\n/g, ' ')}${accent}`}</span>}
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
          {[...line].map((ch, ci) => letter(ch, ci, starts[li] + ci))}
          {li === lines.length - 1 && accent && letter(accent, 'accent', total, 'text-coral')}
        </span>
      ))}
    </Tag>
  )
}
