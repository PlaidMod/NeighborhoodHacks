"use client"

import { Copy, Palette, RotateCcw, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Dev-only palette swapper. Recolors the app live by overriding the three
 * base tokens (red, white, blue); every other shade is derived from them in
 * globals.css with color-mix().
 *
 * Shows automatically in `next dev`. On a deployed build, add `?dev=1` to any
 * URL to turn it on (it remembers), and `?dev=0` to turn it off.
 */

type Key = "red" | "white" | "blue"
type Swatch = Record<Key, string>

const VARS: Record<Key, string> = { red: "--brick", white: "--surface", blue: "--denim" }
const LABELS: Record<Key, string> = { red: "Red", white: "White", blue: "Blue" }
const DEFAULTS: Swatch = { red: "#b23a48", white: "#faf7f2", blue: "#3d5a80" }

const PRESETS: { name: string; colors: Swatch }[] = [
  { name: "Americana", colors: DEFAULTS },
  { name: "Old Glory", colors: { red: "#b22234", white: "#ffffff", blue: "#3c3b6e" } },
  { name: "Bayou", colors: { red: "#c8553d", white: "#f6f1e7", blue: "#2f5d62" } },
  { name: "Astros", colors: { red: "#eb6e1f", white: "#f7f4ee", blue: "#002d62" } },
  { name: "Newsprint", colors: { red: "#d7263d", white: "#f4f1ea", blue: "#222222" } },
]

const STORE = "showup.dev.palette"
const FLAG = "showup.dev"

function apply(c: Swatch) {
  const root = document.documentElement
  for (const k of Object.keys(VARS) as Key[]) root.style.setProperty(VARS[k], c[k])
}

function clear() {
  const root = document.documentElement
  for (const v of Object.values(VARS)) root.style.removeProperty(v)
}

export function DevPalette() {
  const [enabled, setEnabled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [colors, setColors] = React.useState<Swatch>(DEFAULTS)

  // Decide visibility and restore saved colors once, on the client.
  React.useEffect(() => {
    let on = process.env.NODE_ENV === "development"
    try {
      const q = new URLSearchParams(location.search).get("dev")
      if (q === "1") localStorage.setItem(FLAG, "1")
      if (q === "0") localStorage.removeItem(FLAG)
      if (localStorage.getItem(FLAG) === "1") on = true
      if (q === "0") on = false
      const saved = localStorage.getItem(STORE)
      if (saved && on) {
        const c = { ...DEFAULTS, ...JSON.parse(saved) } as Swatch
        apply(c)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setColors(c)
      }
    } catch {}
    setEnabled(on)
  }, [])

  function update(next: Swatch) {
    setColors(next)
    apply(next)
    try {
      localStorage.setItem(STORE, JSON.stringify(next))
    } catch {}
  }

  function reset() {
    setColors(DEFAULTS)
    clear()
    try {
      localStorage.removeItem(STORE)
    } catch {}
  }

  if (!enabled) return null

  const css = (Object.keys(VARS) as Key[]).map((k) => `  ${VARS[k]}: ${colors[k]};`).join("\n")

  return (
    <div className="fixed top-[72px] right-3 z-[60] md:top-auto md:right-4 md:bottom-4">
      {open ? (
        <div className="w-[272px] rounded-2xl bg-white p-4 text-ink shadow-[0_20px_50px_-12px_rgb(0_0_0/0.35)] ring-1 ring-black/10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              Palette <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">DEV</span>
            </p>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted" aria-label="Close palette">
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {(Object.keys(VARS) as Key[]).map((k) => (
              <label key={k} className="flex items-center gap-3">
                <input
                  type="color"
                  value={colors[k]}
                  onChange={(e) => update({ ...colors, [k]: e.target.value })}
                  className="size-9 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5"
                  aria-label={`${LABELS[k]} color`}
                />
                <span className="w-12 text-sm font-semibold">{LABELS[k]}</span>
                <input
                  value={colors[k]}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    setColors({ ...colors, [k]: v })
                    if (/^#[0-9a-f]{6}$/i.test(v)) update({ ...colors, [k]: v })
                  }}
                  spellCheck={false}
                  className="h-8 min-w-0 flex-1 rounded-lg bg-muted px-2 font-mono text-xs outline-none focus:ring-2 focus:ring-denim"
                  aria-label={`${LABELS[k]} hex`}
                />
              </label>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Presets</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => update(p.colors)}
                className="flex items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 text-xs font-semibold ring-1 ring-black/10 hover:bg-muted"
              >
                <span className="flex">
                  {(["red", "white", "blue"] as Key[]).map((k) => (
                    <span
                      key={k}
                      className="-ml-1 size-4 rounded-full ring-2 ring-white first:ml-0"
                      style={{ background: p.colors[k] }}
                    />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(css)
                toast.success("CSS copied. Paste it into globals.css")
              }}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink text-xs font-semibold text-white"
            >
              <Copy className="size-3.5" /> Copy CSS
            </button>
            <button
              onClick={reset}
              className="flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold ring-1 ring-black/10 hover:bg-muted"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full bg-ink pr-3.5 pl-1.5 text-xs font-bold text-white shadow-lg transition-transform hover:scale-105",
          )}
          aria-label="Open dev palette"
        >
          <span className="flex">
            {(["red", "white", "blue"] as Key[]).map((k) => (
              <span
                key={k}
                className="-ml-1.5 size-7 rounded-full ring-2 ring-ink first:ml-0"
                style={{ background: colors[k] }}
              />
            ))}
          </span>
          <Palette className="size-4" />
        </button>
      )}
    </div>
  )
}
