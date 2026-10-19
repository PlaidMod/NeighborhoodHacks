"use client"

import { Check, Copy, Palette, RotateCcw, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { contrastRatio, DEFAULT_PALETTE, isHex, PALETTE_FLAG, PALETTE_KEYS, PALETTE_PRESETS, PALETTE_STORE, PALETTE_VARS, paletteCSS, parsePalette, type PaletteColors, type PaletteKey } from "@/lib/palette"
import { cn } from "@/lib/utils"

const LABELS: Record<PaletteKey, string> = { red: "Accent", white: "Paper", blue: "Primary", ink: "Ink" }
const subscribe = () => () => {}

export function DevPalette() {
  const mounted = React.useSyncExternalStore(subscribe, () => true, () => false)
  return mounted ? <PaletteStudio /> : null
}

function readSettings() {
  const flag = new URLSearchParams(window.location.search).get("dev")
  let saved = null, remembered = false
  try {
    saved = localStorage.getItem(PALETTE_STORE)
    remembered = localStorage.getItem(PALETTE_FLAG) === "1"
  } catch { /* Preview works without browser storage. */ }
  return {
    enabled: flag === "0" ? false : flag === "1" || remembered || process.env.NODE_ENV === "development",
    colors: parsePalette(saved),
  }
}

function PaletteStudio() {
  const [settings] = React.useState(readSettings)
  const [colors, setColors] = React.useState(settings.colors)
  const [open, setOpen] = React.useState(false)
  const [showCSS, setShowCSS] = React.useState(false)
  const [fieldRevision, setFieldRevision] = React.useState(0)

  React.useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("dev")
    try {
      if (flag === "1") localStorage.setItem(PALETTE_FLAG, "1")
      if (flag === "0") localStorage.removeItem(PALETTE_FLAG)
    } catch { /* The URL flag works without storage too. */ }
    if (!settings.enabled) return
    const root = document.documentElement
    root.classList.add("palette-changing")
    for (const key of PALETTE_KEYS) root.style.setProperty(PALETTE_VARS[key], colors[key])
    void root.offsetHeight
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => root.classList.remove("palette-changing"))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      root.classList.remove("palette-changing")
    }
  }, [colors, settings.enabled])

  function update(next: PaletteColors) {
    setColors(next)
    try { localStorage.setItem(PALETTE_STORE, JSON.stringify(next)) } catch { /* Session-only preview. */ }
  }
  function reset() {
    setColors({ ...DEFAULT_PALETTE })
    setFieldRevision((revision) => revision + 1)
    try { localStorage.removeItem(PALETTE_STORE) } catch { /* Session-only preview. */ }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(paletteCSS(colors))
      toast.success("Palette CSS copied")
    } catch {
      toast.error("Couldn't copy. Select CSS below.")
      setShowCSS(true)
    }
  }

  const active = PALETTE_PRESETS.find((preset) => PALETTE_KEYS.every((key) => preset.colors[key] === colors[key]))
  const checks = [
    { label: "Body on paper", ratio: contrastRatio(colors.ink, colors.white) },
    { label: "White on primary", ratio: contrastRatio("#ffffff", colors.blue) },
    { label: "White on accent", ratio: contrastRatio("#ffffff", colors.red) },
    { label: "White on ink", ratio: contrastRatio("#ffffff", colors.ink) },
  ]
  const passing = checks.every(({ ratio }) => ratio >= 4.5)
  if (!settings.enabled) return null

  return (
    <div className="fixed right-4 bottom-4 z-[60] font-sans sm:right-6 sm:bottom-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="palette-launcher flex h-11 items-center gap-2.5 rounded-full border border-white/20 bg-ink px-4 text-xs font-semibold text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-denim" aria-label="Open palette studio">
            <Palette className="size-4" aria-hidden /><span>Palette</span><Swatches colors={colors} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" sideOffset={12} collisionPadding={16}
          aria-labelledby="palette-title" aria-describedby="palette-description"
          className="palette-studio z-[70] max-h-[min(780px,80dvh)] w-[352px] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto overscroll-contain rounded-[28px] border border-transparent bg-white p-0 text-ink shadow-[0_16px_60px_-16px_rgb(0_0_0/0.3)] ring-1 ring-ink/10 data-open:animate-none data-closed:animate-none"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Design playground</p>
              <h2 id="palette-title" className="text-lg font-bold tracking-tight">Palette studio</h2>
              <p id="palette-description" className="mt-1 text-xs leading-relaxed text-muted-foreground">Try a direction. Every page updates live.</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close palette studio"><X /></Button>
          </div>
          <fieldset className="border-t border-line px-5 pt-4 pb-5">
            <legend className="sr-only">Choose a palette</legend>
            <div className="mb-3 flex items-center justify-between text-xs"><span className="font-semibold">Starting points</span><span className="text-muted-foreground" aria-live="polite">{active?.name ?? "Custom palette"}</span></div>
            <div className="grid grid-cols-2 gap-2">
              {PALETTE_PRESETS.map((preset) => {
                const selected = active?.name === preset.name
                return (
                  <button key={preset.name} onClick={() => { update({ ...preset.colors }); setFieldRevision((revision) => revision + 1) }} aria-pressed={selected}
                    className={cn("palette-preset rounded-2xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-denim", selected ? "border-denim bg-denim-soft/50" : "border-border bg-white")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2"><Swatches colors={preset.colors} />{selected && <Check className="size-3.5 text-denim" aria-hidden />}</div>
                    <span className="block text-xs font-bold">{preset.name}</span><span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{preset.note}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>
          <fieldset className="border-t border-line px-5 py-4">
            <legend className="sr-only">Fine-tune colors</legend>
            <p className="mb-3 text-xs font-semibold">Make it yours</p>
            <div className="space-y-2">{PALETTE_KEYS.map((key) => <ColorField key={`${key}-${fieldRevision}`} name={LABELS[key]} value={colors[key]} onChange={(value) => update({ ...colors, [key]: value })} />)}</div>
          </fieldset>
          <div className="border-t border-line px-5 py-4">
            <div className="flex items-center justify-between gap-2 text-xs"><p className="font-semibold">Text contrast</p><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", passing ? "bg-sage-soft text-sage" : "bg-brick-soft text-brick-deep")}>{passing ? "4 pairs pass AA" : "Needs adjustment"}</span></div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">{checks.map(({ label, ratio }) => <div key={label} className="flex justify-between gap-1 text-[10px]"><dt className="text-muted-foreground">{label}</dt><dd className={cn("font-semibold tabular", ratio < 4.5 && "text-brick")}>{ratio.toFixed(1)}:1 {ratio >= 4.5 ? "✓" : "!"}</dd></div>)}</dl>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Core text pairs only. Check tinted cards and muted text before publishing.</p>
          </div>
          <div className="border-t border-line bg-surface px-5 py-4">
            <div className="flex gap-2"><Button className="flex-1" onClick={copy}><Copy data-icon="inline-start" /> Copy CSS</Button><Button variant="outline" onClick={reset}><RotateCcw data-icon="inline-start" /> Reset</Button></div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">Saved in this browser · Preview only</p>
            {showCSS && <textarea aria-label="Palette CSS" readOnly value={paletteCSS(colors)} onFocus={(event) => event.target.select()} className="mt-3 h-36 w-full rounded-xl border border-input bg-white p-3 font-mono text-xs" />}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Swatches({ colors }: { colors: PaletteColors }) {
  return <span className="flex -space-x-1" aria-hidden>{(["white", "blue", "red", "ink"] as const).map((key) => <span key={key} className="size-4 rounded-full border border-white/80 ring-1 ring-ink/10" style={{ backgroundColor: colors[key] }} />)}</span>
}

function ColorField({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = React.useState(value)
  const [previous, setPrevious] = React.useState(value)
  if (previous !== value) {
    setPrevious(value)
    setDraft(value)
  }
  const invalid = !isHex(draft)
  const id = React.useId()
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${name} color`} className="size-10 shrink-0 cursor-pointer rounded-xl border border-border bg-white p-1" />
        <label htmlFor={id} className="flex-1 text-xs font-semibold">{name}</label>
        <input id={id} value={draft} aria-label={`${name} hex`} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} maxLength={7} spellCheck={false}
          onChange={(event) => { const next = event.target.value; setDraft(next); if (isHex(next)) onChange(next.toLowerCase()) }}
          className="h-10 w-28 rounded-xl border border-input bg-surface px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-denim"
        />
      </div>
      {invalid && <p id={`${id}-error`} className="mt-1 text-right text-[10px] text-brick">Use # and six hex digits.</p>}
    </div>
  )
}
