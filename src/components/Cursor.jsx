import { useEffect, useState } from 'react'
import { motion, useMotionValue } from 'motion/react'
import { useFinePointer } from '../hooks/useMedia'

const CLICKABLE = 'a, button, [role="button"], video, label, summary, select'
const TEXT = 'input, textarea, [contenteditable="true"]'

/**
 * Replaces the system pointer on mouse devices: a coral dot that sits exactly on the
 * pointer. It grows a little over anything clickable and squeezes on press.
 */
export default function Cursor() {
  const fine = useFinePointer()
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const [mode, setMode] = useState('dot') // dot | link | text
  const [down, setDown] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!fine) return
    const root = document.documentElement
    root.classList.add('custom-cursor')

    const move = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)
      const t = e.target
      setMode(t.closest?.(TEXT) ? 'text' : t.closest?.(CLICKABLE) ? 'link' : 'dot')
    }
    const press = () => setDown(true)
    const release = () => setDown(false)
    const leave = () => setVisible(false)

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', press)
    window.addEventListener('pointerup', release)
    root.addEventListener('pointerleave', leave)
    return () => {
      root.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', press)
      window.removeEventListener('pointerup', release)
      root.removeEventListener('pointerleave', leave)
    }
  }, [fine, x, y])

  if (!fine) return null

  const ease = [0.22, 1, 0.36, 1]
  const link = mode === 'link'
  const text = mode === 'text'

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90]">
      {/* the dot, exactly on the pointer; a little bigger over anything clickable */}
      <motion.div style={{ x, y }} className="absolute top-0 left-0">
        <motion.div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-coral shadow-[0_0_0_1.5px_rgb(7_12_26/0.55)]"
          initial={false}
          animate={{
            width: text ? 3 : link ? 16 : 10,
            height: text ? 22 : link ? 16 : 10,
            borderRadius: text ? 2 : 999,
            scale: down ? 0.7 : 1,
            opacity: visible ? 1 : 0,
          }}
          transition={{ duration: 0.18, ease }}
        />
      </motion.div>
    </div>
  )
}
