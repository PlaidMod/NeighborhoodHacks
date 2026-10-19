"use client"

import { MapPin } from "lucide-react"
import Link from "next/link"
import { ArrowCircle, BodyIcon, Chip } from "@/components/civic"
import { KIND_LABEL } from "@/lib/data/bodies"
import { daysFromNow, money, relDay } from "@/lib/format"
import { useNow, useProfile } from "@/lib/profile"
import { cn } from "@/lib/utils"

export default function Districts() {
  const { bodies, jurisdiction, updates, profile } = useProfile()
  const now = useNow()

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
          <MapPin className="size-3.5 text-brick" /> {jurisdiction.area} · {jurisdiction.zip}
        </Chip>
      </div>

      {/* Layer cake */}
      <div className="mt-6 grid gap-3">
        {bodies.map((b, i) => {
          const next = updates
            .filter((u) => u.bodyId === b.id && +new Date(u.date) >= now)
            .sort((a, c) => +new Date(a.date) - +new Date(c.date))[0]
          const t = b.lastTurnout
          return (
            <Link
              key={b.id}
              href={`/app/districts/${b.id}`}
              className="group rise grid items-center gap-4 rounded-[24px] bg-white p-5 transition-[transform,box-shadow] motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] md:gap-6"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="relative">
                  <BodyIcon kind={b.kind} className="size-12" />
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
              <p className="line-clamp-2 text-sm text-muted-foreground">{b.tagline}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {b.taxRate && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">On a $300K home</p>
                    <p className="font-extrabold tabular">{money(b.taxRate * 3000)}/yr</p>
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
