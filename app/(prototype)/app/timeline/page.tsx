"use client"

import { Bookmark, BookmarkCheck, Hash } from "lucide-react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"
import { BodyIcon, Chip, KIND_STYLE, TierPill } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Switch } from "@/components/ui/switch"
import type { Topic, Update } from "@/lib/prototype/types"
import { relevance, whyFor } from "@/lib/prototype/updates"
import { daysFromNow, fmtDate, fmtTime, relDay } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

const TABS = ["foryou", "upcoming", "decided", "all"] as const
type Tab = (typeof TABS)[number]

export default function Timeline() {
  const t = useTranslations("AppTimeline")
  const tl = useTranslations("AppLabels")
  const { updates, bodies, profile } = useProfile()
  const openStory = useStory()
  const [tab, setTab] = React.useState<Tab>("foryou")
  const [topics, setTopics] = React.useState<Topic[]>([])
  const [muted, setMuted] = React.useState<string[]>([])
  const [saved, setSaved] = React.useState<string[]>([])

  const allTopics = [...new Set(updates.map((u) => u.topic))]
  const now = useNow()

  const filtered = updates.filter((u) => {
    if (muted.includes(u.bodyId)) return false
    if (topics.length && !topics.includes(u.topic)) return false
    if (tab === "foryou") return relevance(u, profile.personas) > 0
    if (tab === "upcoming") return +new Date(u.date) >= now
    if (tab === "decided") return u.type === "decision" || !!u.outcomePending
    return true
  })
  const featured = filtered.filter((u) => u.tier === "urgent" && +new Date(u.date) >= now).slice(0, 2)
  const rest = filtered.filter((u) => !featured.includes(u))

  // Group by posted day
  const groups = rest.reduce<Record<string, Update[]>>((acc, u) => {
    const k = relDay(u.posted)
    ;(acc[k] ??= []).push(u)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pt-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 font-news">
        <h1 className="font-headline text-[2.4rem] leading-tight font-black">{t("title")}</h1>
        <p className="mt-1 text-[0.95rem] text-muted-foreground">{t("lede", { count: bodies.length })}</p>

        {/* Topic chips */}
        <div role="group" aria-label={t("topicsLabel")} className="scrollbar-none -mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {allTopics.map((topic) => {
            const on = topics.includes(topic)
            return (
              <button
                key={topic}
                aria-pressed={on}
                onClick={() => setTopics((c) => (on ? c.filter((x) => x !== topic) : [...c, topic]))}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-muted-foreground ring-1 ring-border transition-colors hover:text-ink",
                  on && "bg-ink text-white ring-ink hover:text-white",
                )}
              >
                <Hash aria-hidden className="size-3.5" />
                {tl(`topic.${topic}`)}
              </button>
            )
          })}
        </div>

        {/* Underline tabs, from the news reference */}
        <div role="tablist" className="mt-5 flex border-b border-border">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "relative flex-1 pb-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink sm:flex-none sm:px-8",
                tab === id && "text-ink",
              )}
            >
              {t(`tabs.${id}`)}
              {tab === id && <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-brick" />}
            </button>
          ))}
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {featured.map((u, i) => (
              <FeatureCard key={u.id} u={u} rank={i + 1} onOpen={() => openStory(u)} />
            ))}
          </div>
        )}

        {/* Feed */}
        <div className="mt-6 space-y-8">
          {Object.entries(groups).map(([day, items]) => (
            <section key={day}>
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">{day}</h2>
                <span className="h-px flex-1 bg-border" />
              </div>
              <ul className="divide-y divide-line rounded-[24px] bg-white px-4 md:px-5">
                {items.map((u) => (
                  <FeedRow
                    key={u.id}
                    u={u}
                    saved={saved.includes(u.id)}
                    onSave={() =>
                      setSaved((s) => (s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id]))
                    }
                    onOpen={() => openStory(u)}
                  />
                ))}
              </ul>
            </section>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-[24px] bg-white p-10 text-center">
              <p className="font-bold">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right rail */}
      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-[24px] bg-white p-5">
          <h2 className="font-bold">{t("yourGovernments")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("muteHint")}</p>
          <ul className="mt-4 space-y-3">
            {bodies.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <BodyIcon kind={b.kind} id={b.id} className="size-9 rounded-xl" />
                <Link href={`/app/districts/${b.id}`} className="min-w-0 flex-1 hover:text-denim">
                  <p className="truncate text-sm font-bold">{b.short}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.yourSeat ?? b.seats}</p>
                </Link>
                <Switch
                  checked={!muted.includes(b.id)}
                  onCheckedChange={(on) =>
                    setMuted((m) => (on ? m.filter((x) => x !== b.id) : [...m, b.id]))
                  }
                  aria-label={t("show", { name: b.short })}
                />
              </li>
            ))}
          </ul>
        </div>

      </aside>
    </div>
  )
}

function FeatureCard({ u, rank, onOpen }: { u: Update; rank: number; onOpen: () => void }) {
  const t = useTranslations("AppTimeline")
  const tl = useTranslations("AppLabels")
  const { bodies, profile } = useProfile()
  const b = bodies.find((x) => x.id === u.bodyId)!
  const Icon = KIND_STYLE[b.kind].icon
  const dark = rank === 2
  return (
    <button
      onClick={onOpen}
      className={cn(
        "group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-[24px] p-5 text-left text-white transition-transform motion-safe:hover:-translate-y-0.5",
        dark ? "bg-ink" : "bg-denim",
      )}
    >
      <Icon
        className="absolute -top-6 -right-6 size-52 text-white/[0.07] transition-transform duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-6"
        strokeWidth={1.2}
      />
      <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-brick">
        <span aria-hidden className="size-1.5 rounded-full bg-brick" /> {t("urgentRank", { rank })}
      </span>
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-semibold text-white/70">
          <span className="grid size-6 place-items-center rounded-full bg-white/15">
            <Icon className="size-3.5" />
          </span>
          {b.short} · {tl(`topic.${u.topic}`)}
        </p>
        <p className="mt-3 font-headline text-[1.5rem] leading-tight font-bold">{u.title}</p>
        <p className="mt-2 line-clamp-2 text-sm text-white/75">{whyFor(u, profile.personas)}</p>
        <p className="mt-4 text-xs font-bold text-white/90">
          {relDay(u.date)} · {fmtTime(u.date)}
        </p>
      </div>
    </button>
  )
}

function FeedRow({
  u,
  saved,
  onSave,
  onOpen,
}: {
  u: Update
  saved: boolean
  onSave: () => void
  onOpen: () => void
}) {
  const t = useTranslations("AppTimeline")
  const tl = useTranslations("AppLabels")
  const { bodies, profile } = useProfile()
  const b = bodies.find((x) => x.id === u.bodyId)!
  const future = daysFromNow(u.date) >= 0
  return (
    <li className="group flex gap-4 py-4">
      <BodyIcon kind={b.kind} id={b.id} className="mt-1" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {b.short}
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
          {tl(`topic.${u.topic}`)}
        </p>
        <button onClick={onOpen} className="mt-1 text-left">
          <h3 className="font-headline text-[1.15rem] leading-snug font-bold group-hover:text-denim">{u.title}</h3>
        </button>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{whyFor(u, profile.personas)}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
          <span>
            {tl(`type.${u.type}`)} · {future ? `${relDay(u.date)}, ${fmtTime(u.date)}` : fmtDate(u.date)}
          </span>
          {u.vote && <Chip tone="sage">{u.vote}</Chip>}
          {u.tier === "urgent" && <TierPill tier="urgent" />}
          {u.outcomePending && <Chip tone="sand">{tl("outcomePending")}</Chip>}
          {u.comment && future && <Chip tone="ink">{t("commentOpen")}</Chip>}
        </div>
      </div>
      <button
        onClick={onSave}
        className="self-start rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-ink"
        aria-label={saved ? t("unsave") : t("save")}
      >
        {saved ? <BookmarkCheck className="size-[1.1rem] text-denim" /> : <Bookmark className="size-[1.1rem]" />}
      </button>
    </li>
  )
}
