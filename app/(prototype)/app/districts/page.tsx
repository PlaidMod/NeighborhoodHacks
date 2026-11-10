"use client"

import { MapPin } from "lucide-react"
import Link from "next/link"
import { useRef, useState, type KeyboardEvent } from "react"
import { ArrowCircle, BodyIcon, Chip } from "@/components/prototype/civic"
import { KIND_LABEL } from "@/lib/prototype/bodies"
import { daysFromNow, money, relDay } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

export default function Districts() {
  const { bodies: all, jurisdiction, updates, profile } = useProfile()
  const now = useNow()
  const [tab, setTab] = useState<Tab>("local")
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ local: null, regional: null })
  const bodies = all.filter((b) => !b.regional)
  const regional = all.filter((b) => b.regional)

  // Tabs pattern (WAI-ARIA): arrow keys, Home and End move between tabs.
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = TABS.findIndex((t) => t.id === tab)
    const next =
      e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] :
      e.key === "ArrowLeft" ? TABS[(i - 1 + TABS.length) % TABS.length] :
      e.key === "Home" ? TABS[0] :
      e.key === "End" ? TABS[TABS.length - 1] : null
    if (!next) return
    e.preventDefault()
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <div className="pt-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em]">My districts</h1>
          <p className="mt-1 text-[0.95rem] text-muted-foreground">
            Every government that makes decisions for {profile.address.split(",")[0]}, from closest to home
            outward.
          </p>
        </div>
        <Chip tone="outline" className="h-9 px-4 text-xs">
          <MapPin className="size-3.5 text-brick" /> {jurisdiction.zip ? `${jurisdiction.area} · ${jurisdiction.zip}` : jurisdiction.area}
        </Chip>
      </div>

      <div role="tablist" aria-label="Kinds of government" className="mt-6 inline-flex max-w-full gap-1 rounded-full bg-white p-1 ring-1 ring-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el }}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKey}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tab === t.id ? "bg-ink text-white" : "text-muted-foreground hover:text-ink",
            )}
          >
            {t.label} <span className="tabular">({t.id === "local" ? bodies.length : regional.length})</span>
          </button>
        ))}
      </div>

      {tab === "regional" && (
        <div id="panel-regional" role="tabpanel" aria-labelledby="tab-regional" tabIndex={0} className="mt-4">
          <p className="max-w-3xl text-[0.95rem] text-muted-foreground">
            Regional and state agencies that make decisions reaching {profile.address.split(",")[0]}: highways, air and
            water permits, power rules and groundwater pumping. ShowUp doesn&apos;t read their agendas yet, so they have no
            meetings or alerts here.
          </p>
          {regional.length === 0 ? (
            <p className="mt-4 rounded-[24px] bg-white p-5 text-sm text-muted-foreground">
              No regional governments loaded for this address. Look up your address again to add them.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {regional.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/app/districts/${b.id}`}
                    className="group grid items-center gap-4 rounded-[24px] bg-white p-5 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)] md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <BodyIcon kind={b.kind} id={b.id} className="size-12" />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold tracking-tight">{b.name}</span>
                          <Chip tone="outline">Coming soon</Chip>
                        </p>
                        {b.tagline && <p className="mt-1 text-sm text-muted-foreground">{b.tagline}</p>}
                      </div>
                    </div>
                    <ArrowCircle className="hidden text-ink md:grid" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Layer cake */}
      <div
        id="panel-local"
        role="tabpanel"
        aria-labelledby="tab-local"
        hidden={tab !== "local"}
        data-onboarding={bodies.length === 0 ? "districtsMain" : undefined}
        className={cn("mt-4 gap-3", tab === "local" ? "grid" : "hidden")}
      >
        {bodies.map((b, i) => {
          const next = updates
            .filter((u) => u.bodyId === b.id && +new Date(u.date) >= now)
            .sort((a, c) => +new Date(a.date) - +new Date(c.date))[0]
          const t = b.lastTurnout
          return (
            <Link
              key={b.id}
              href={`/app/districts/${b.id}`}
              data-onboarding={i === 0 ? "districtsMain" : undefined}
              className="group rise grid items-center gap-4 rounded-[24px] bg-white p-5 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)] md:grid-cols-[minmax(0,1fr)_auto_auto] md:gap-6"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="relative">
                  <BodyIcon kind={b.kind} id={b.id} className="size-12" />
                  <span className="absolute -top-1.5 -left-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    {KIND_LABEL[b.kind]}
                  </p>
                  <p className="truncate font-extrabold tracking-tight">{b.name}</p>
                  <p className="truncate text-xs font-semibold text-denim">{b.yourSeat ?? b.seats}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {b.taxRate && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">On a $250K home</p>
                    <p className="font-extrabold tabular">{money(b.taxRate * 2500)}/yr</p>
                  </div>
                )}
                {next && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Next up</p>
                    <p className={cn("font-extrabold", daysFromNow(next.date) <= 3 && "text-brick")}>
                      {relDay(next.date)}
                    </p>
                  </div>
                )}
                {b.agendasRead === false && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Agendas</p>
                    <p className="font-extrabold text-muted-foreground">Not read yet</p>
                  </div>
                )}
                {t && b.kind === "mud" && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Last turnout</p>
                    <p className="font-extrabold text-brick">{t.votes} votes</p>
                  </div>
                )}
              </div>
              <ArrowCircle className="hidden text-ink md:grid" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

type Tab = "local" | "regional"
const TABS: { id: Tab; label: string }[] = [
  { id: "local", label: "Local governments" },
  { id: "regional", label: "Regional governments" },
]
