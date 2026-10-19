"use client"

import { ArrowRight, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { DEMO_ADDRESSES, findJurisdiction } from "@/lib/data/zips"
import { cn } from "@/lib/utils"

export function AddressForm({
  initial = "",
  onResolved,
  size = "lg",
}: {
  initial?: string
  /** If omitted, navigates to /start with the address */
  onResolved?: (address: string) => void
  size?: "lg" | "md"
}) {
  const router = useRouter()
  const [value, setValue] = React.useState(initial)
  const [error, setError] = React.useState<string | null>(null)
  const [focused, setFocused] = React.useState(false)

  function submit(addr: string) {
    const a = addr.trim()
    if (!a) return setError("Enter your street address or ZIP code.")
    const j = findJurisdiction(a)
    if (!j)
      return setError(
        "We couldn't place that address yet. Include a Houston-area ZIP code, like 77004.",
      )
    setError(null)
    if (onResolved) onResolved(a)
    else router.push(`/start?a=${encodeURIComponent(a)}`)
  }

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className={cn(
          "flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_1px_0_rgb(27_38_59/0.04),0_12px_32px_-12px_rgb(27_38_59/0.18)] ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-denim",
          error && "ring-2 ring-brick",
        )}
      >
        <MapPin className="size-5 shrink-0 text-brick" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="1500 Heights Blvd, Houston, TX 77008"
          aria-label="Your address"
          aria-invalid={!!error}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-muted-foreground/70",
            size === "lg" ? "h-12 text-base" : "h-10 text-sm",
          )}
        />
        <Button type="submit" size={size === "lg" ? "lg" : "default"} className="shrink-0">
          <span className="hidden sm:inline">Find my governments</span>
          <span className="sm:hidden">Go</span>
          <ArrowRight data-icon="inline-end" />
        </Button>
      </form>
      {error && <p className="mt-2 pl-5 text-sm font-medium text-brick">{error}</p>}
      {focused && !value && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-3xl bg-white p-2 shadow-xl ring-1 ring-border">
          <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Try a demo address
          </p>
          {DEMO_ADDRESSES.map((d) => (
            <button
              key={d.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue(d.label)
                submit(d.label)
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-muted"
            >
              <span className="flex items-center gap-2.5 font-medium">
                <MapPin className="size-4 text-muted-foreground" />
                {d.label}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{d.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
