"use client"

import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "motion/react"
import * as React from "react"

// Decorative background for the timeline: soft gray books that tumble down as the page scrolls.
// Tied to scroll position (Motion), so they move only when the reader does and reverse on the way
// back up. They sit behind everything (the shell's wrapper is `isolate`), never take clicks, and
// stay still with reduced motion.

type BookSpec = {
  /** Horizontal position, % of the viewport width. */
  x: number
  /** Where it starts, as a fraction of the fall height. */
  start: number
  w: number
  h: number
  /** Pixels fallen per pixel scrolled. */
  speed: number
  /** Degrees turned per 100px scrolled. */
  spin: number
  tilt: number
  tone: 0 | 1 | 2
}

// x is % across the timeline column. Fewer, calmer books: they show in the gaps beside the
// zigzagging tiles rather than everywhere.
const BOOKS: BookSpec[] = [
  { x: 2, start: 0.15, w: 40, h: 56, speed: 0.55, spin: 5, tilt: -16, tone: 0 },
  { x: 90, start: 0.6, w: 36, h: 50, speed: 0.7, spin: -7, tilt: 14, tone: 1 },
  { x: 8, start: 0.85, w: 32, h: 44, speed: 0.85, spin: 8, tilt: 24, tone: 2 },
  { x: 84, start: 0.3, w: 44, h: 62, speed: 0.5, spin: -5, tilt: -10, tone: 0 },
  { x: 48, start: 0.5, w: 30, h: 42, speed: 0.9, spin: 9, tilt: 6, tone: 1 },
  { x: 94, start: 0.05, w: 34, h: 48, speed: 0.65, spin: 6, tilt: -26, tone: 2 },
]

/** Cover, spine and page-edge grays (ink at low strength, so they read as a soft gray on the page). */
const TONES = [
  { cover: "fill-ink/[0.07]", spine: "fill-ink/[0.11]" },
  { cover: "fill-ink/[0.05]", spine: "fill-ink/[0.09]" },
  { cover: "fill-ink/[0.09]", spine: "fill-ink/[0.13]" },
]

/**
 * The books fall through the column `anchor` points at (the timeline), not the whole screen. The
 * layer stays fixed to the viewport vertically and follows the column's left edge and width.
 */
export function FallingBooks({ anchor }: { anchor: React.RefObject<HTMLElement | null> }) {
  const [box, setBox] = React.useState({ left: 0, width: 0, height: 900 })
  React.useEffect(() => {
    const el = anchor.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox({ left: r.left, width: r.width, height: window.innerHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [anchor])
  const height = box.height
  if (!box.width) return null
  return (
    <div
      aria-hidden
      style={{ left: box.left, width: box.width }}
      // Fades out toward the top so no book sits under the top bar.
      className="pointer-events-none fixed inset-y-0 -z-10 hidden overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,transparent_120px,black_260px)] md:block"
    >
      {BOOKS.map((b, i) => (
        <Book key={i} spec={b} height={height} />
      ))}
    </div>
  )
}

function Book({ spec, height }: { spec: BookSpec; height: number }) {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const span = height + spec.h * 2
  // Falls with the scroll and wraps back to the top, so the sky never runs out of books.
  const y = useTransform(scrollY, (v) => {
    const fallen = reduce ? 0 : v * spec.speed
    return ((((spec.start * span + fallen) % span) + span) % span) - spec.h
  })
  const rotate = useTransform(scrollY, (v) => spec.tilt + (reduce ? 0 : (v / 100) * spec.spin))
  const sway = useTransform(scrollY, (v) => (reduce ? 0 : Math.sin(v / 260 + spec.start * 6) * 18))
  const transform = useMotionTemplate`translate3d(${sway}px, ${y}px, 0) rotate(${rotate}deg)`
  const tone = TONES[spec.tone]!
  return (
    <motion.svg
      width={spec.w}
      height={spec.h}
      viewBox="0 0 40 56"
      style={{ left: `calc(${spec.x}% - ${spec.w / 2}px)`, transform }}
      className="absolute top-0 will-change-transform"
    >
      <rect x="0" y="0" width="40" height="56" rx="4" className={tone.cover} />
      <rect x="0" y="0" width="7" height="56" rx="3" className={tone.spine} />
      <rect x="36" y="3" width="2.5" height="50" rx="1" className="fill-white/70" />
      <rect x="13" y="12" width="17" height="3" rx="1.5" className={tone.spine} />
      <rect x="13" y="18" width="11" height="2.5" rx="1.25" className={tone.spine} />
    </motion.svg>
  )
}
