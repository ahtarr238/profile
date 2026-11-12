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
import { useMedia } from '../../hooks/useMedia'

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
 * @param {{ back: string, middle: string, clouds?: string, wisps?: string, front: string }} layers  image URLs, far to near.
 *                                    clouds (a deck receding to the horizon) sit between the sky and the middle
 *                                    layer, so the far range stands in front of them; wisps (low mist) sit in front
 *                                    of the title, behind the front layer. Both drift slowly sideways.
 *                                    `mobile` (optional): a lighter set of the same keys used on phones, where five big
 *                                    layers moving at once is more than a phone can draw smoothly.
 * @param {React.ReactNode} title     sits between the middle and front layers
 * @param {React.ReactNode} children  overlay content at the foot of the scene; fades out first
 * @param {string} length             scroll length of the pinned scene (Tailwind height class). The section
 *                                    after it overlaps the last screen (-mt-[100svh]) and slides over the scene.
 */
export function ParallaxComponent({ layers: allLayers, title, children, length = 'h-[300svh]', className = '' }) {
  const rootRef = useRef(null)
  const lenis = useLenisInstance()
  const phone = useMedia('(max-width: 767px)')
  const layers = phone && allLayers.mobile ? allLayers.mobile : allLayers

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ctx = gsap.context(() => {
      const has = (name) => root.querySelector(`[data-parallax-layer="${name}"]`) // the phone set has no separate clouds
      const tl = gsap.timeline({
        defaults: { ease: 'none', duration: 1 },
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.7 },
      })
      // depth: the nearer the layer, the more it grows; the pines grow from their top edge,
      // so they slide down and out of frame as if you walk through them
      tl.to('[data-parallax-layer="back"]', { scale: 1.1, transformOrigin: '50% 62%' }, 0)
        .to('[data-parallax-layer="middle"]', { scale: 1.32, yPercent: 3, transformOrigin: '60% 55%' }, 0)
        .to('[data-parallax-layer="title"]', { scale: 0.86, yPercent: -12 }, 0)
        .to('[data-parallax-layer="title"]', { opacity: 0, duration: 0.3 }, 0.45)
        .to('[data-parallax-layer="front"]', { scale: 1.9, transformOrigin: '50% 0%' }, 0)
        // the cloud deck is far, between the sky and the far range; the low mist is near, so it
        // swells and slides down out of frame, as if the camera passes through it
        .to('[data-parallax-content]', { opacity: 0, y: 60, duration: 0.25 }, 0)
      if (has('clouds')) tl.to('[data-parallax-layer="clouds"]', { scale: 1.2, transformOrigin: '50% 62%' }, 0)
      if (has('wisps')) tl.to('[data-parallax-layer="wisps"]', { scale: 1.8, yPercent: 8, transformOrigin: '50% 76%' }, 0)
    }, root)
    return () => ctx.revert()
  }, [layers]) // rebuilt when the phone and desktop sets swap

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
        {layers.clouds && (
          <div className="cloud-drift absolute -inset-[4%]">
            <Layer name="clouds" src={layers.clouds} />
          </div>
        )}
        <Layer name="middle" src={layers.middle} />
        <div data-parallax-layer="title" className="absolute inset-0 flex items-center justify-center will-change-transform">
          {title}
        </div>
        {layers.wisps && (
          <div className="cloud-drift cloud-drift-reverse absolute -inset-[4%]">
            <Layer name="wisps" src={layers.wisps} />
          </div>
        )}
        <Layer name="front" src={layers.front} />
        <div data-parallax-content className="absolute inset-0 z-10 flex flex-col justify-end">
          {children}
        </div>
      </div>
    </div>
  )
}
