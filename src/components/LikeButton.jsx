import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ThumbsUp } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1]
const KEY = 'ahtar-liked-on' // the day this browser last liked; the server also counts one per day
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

function likedToday() {
  try {
    return localStorage.getItem(KEY) === today()
  } catch {
    return false
  }
}

function sendLike() {
  // no API on the local dev server; the button still works there, it just isn't counted
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) return
  fetch('/api/like', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: '{}' }).catch(() => {})
}

/** A round thumbs-up in the bottom-right corner: one tap says "nice site". */
export default function LikeButton() {
  const [liked, setLiked] = useState(likedToday)
  const [burst, setBurst] = useState(0) // bumps on each fresh like, replays the +1
  const [note, setNote] = useState('')
  const [shown, setShown] = useState(false)

  // comes in a moment after the page, so it doesn't compete with the hero
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 2200)
    return () => clearTimeout(t)
  }, [note])

  const like = () => {
    if (liked) {
      setNote('Already liked today. Thank you!')
      return
    }
    setLiked(true)
    setBurst((b) => b + 1)
    setNote('Thanks for the like!')
    try {
      localStorage.setItem(KEY, today())
    } catch {
      // private mode: the like still counts, it just isn't remembered here
    }
    sendLike()
  }

  return (
    <motion.div
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-row-reverse items-center gap-3 md:right-6 md:bottom-6"
      initial={{ opacity: 0, y: 16, scale: 0.8 }}
      animate={shown ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 16, scale: 0.8 }}
      transition={{ duration: 0.6, ease }}
    >
      <motion.button
        type="button"
        onClick={like}
        aria-pressed={liked}
        aria-label={liked ? 'You liked this website' : 'Like this website'}
        title={liked ? 'You liked this website' : 'Like this website'}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.88 }}
        className={`relative grid size-13 place-items-center rounded-full border shadow-[0_10px_30px_rgb(0_0_0/0.35)] transition-colors duration-200 ease-out ${
          liked ? 'border-coral bg-coral text-ground' : 'border-sky-soft/25 bg-navy-raised text-sky-soft hover:border-coral hover:text-coral'
        }`}
      >
        {/* the thumb pops and tilts on a fresh like (re-keyed, so the button itself keeps focus) */}
        <motion.span
          key={burst}
          aria-hidden="true"
          className="grid place-items-center"
          initial={false}
          animate={burst ? { scale: [1, 1.35, 0.92, 1], rotate: [0, -18, 8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <ThumbsUp size={21} strokeWidth={1.9} fill={liked ? 'currentColor' : 'none'} />
        </motion.span>

        {/* +1 floating up */}
        <AnimatePresence>
          {burst > 0 && (
            <motion.span
              key={burst}
              aria-hidden="true"
              className="font-display pointer-events-none absolute -top-2 left-1/2 text-[15px] font-medium text-coral"
              initial={{ opacity: 0, y: 0, x: '-50%' }}
              animate={{ opacity: [0, 1, 0], y: -34 }}
              transition={{ duration: 0.9, ease }}
            >
              +1
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {note && (
          <motion.p
            key={note}
            className="rounded-full border border-sky-soft/15 bg-navy-raised px-3.5 py-2 text-[13px] text-sky-soft shadow-[0_10px_30px_rgb(0_0_0/0.35)]"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.3, ease }}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {note}
      </span>
    </motion.div>
  )
}
