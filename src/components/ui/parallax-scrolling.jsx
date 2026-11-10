// Adapted from a 21st.dev / Osmo "parallax layers" component for this Vite + React (JS) + Tailwind project:
// - layers, title and overlay content come in as props instead of being hard-coded
// - the scene is pinned while you scroll through it and the camera pushes in: near layers
//   grow fastest and slide out of frame, far ones barely move
// - the page's own Lenis instance drives ScrollTrigger (a second Lenis would fight the first)
// - the original's missing stylesheet is rewritten as Tailwind classes
// - cleanup reverts only this component's tweens and triggers
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenisInstance } from '../../hooks/useLenis'

gsap.registerPlugin(ScrollTrigger)

function Layer({ name, src, priority }) {
  return (
    <img
      src={src}
      alt=""
      data-parallax-layer={name}
      fetchPriority={priority ? 'high' : undefined}
      className="pointer-events-none absolute inset-0 size-full max-w-none object-cover will-change-transform"
    />
  )
}

/**
 * @param {{ back: string, middle: string, front: string }} layers  image URLs, far to near
 * @param {React.ReactNode} title     sits between the middle and front layers
 * @param {React.ReactNode} children  overlay content at the foot of the scene; fades out first
 * @param {string} length             scroll length of the pinned scene (Tailwind height class)
 */
export function ParallaxComponent({ layers, title, children, length = 'h-[220svh]', className = '' }) {
  const rootRef = useRef(null)
  const lenis = useLenisInstance()

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none', duration: 1 },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
      })
      // depth: the nearer the layer, the more it grows; the pines grow from their top edge,
      // so they slide down and out of frame as if you walk through them
      tl.to('[data-parallax-layer="back"]', { scale: 1.1, transformOrigin: '50% 62%' }, 0)
        .to('[data-parallax-layer="middle"]', { scale: 1.32, yPercent: 3, transformOrigin: '60% 55%' }, 0)
        .to('[data-parallax-layer="title"]', { scale: 0.86, yPercent: -12 }, 0)
        .to('[data-parallax-layer="title"]', { opacity: 0, duration: 0.35 }, 0.6)
        .to('[data-parallax-layer="front"]', { scale: 1.9, transformOrigin: '50% 0%' }, 0)
        .to('[data-parallax-content]', { opacity: 0, y: 60, duration: 0.25 }, 0)
        // the scene dims into the page ground before the next section
        .to('[data-parallax-dim]', { opacity: 1, duration: 0.3 }, 0.7)
    }, root)
    return () => ctx.revert()
  }, [])

  // keep ScrollTrigger in step with the page's smooth scrolling
  useEffect(() => {
    if (!lenis) return
    const update = () => ScrollTrigger.update()
    lenis.on('scroll', update)
    return () => lenis.off('scroll', update)
  }, [lenis])

  return (
    <div ref={rootRef} className={`relative ${length} ${className}`}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-ground">
        <Layer name="back" src={layers.back} priority />
        <Layer name="middle" src={layers.middle} />
        <div data-parallax-layer="title" className="absolute inset-0 flex items-center justify-center will-change-transform">
          {title}
        </div>
        <Layer name="front" src={layers.front} />
        <div data-parallax-dim aria-hidden="true" className="pointer-events-none absolute inset-0 bg-ground opacity-0" />
        <div data-parallax-content className="absolute inset-0 z-10 flex flex-col justify-end">
          {children}
        </div>
      </div>
    </div>
  )
}
