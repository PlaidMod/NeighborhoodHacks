"use client"

import { ArrowRight, BellRing, Clock, ExternalLink, Mic } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import * as React from "react"
import { BodyIcon, Chip, Panel, SectionTitle, TierPill } from "@/components/prototype/civic"
import { useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import { fmtDateTime, fmtTime, relDay } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { buildTldr, readMinutes, tldrFootnote, tldrLine } from "@/lib/prototype/tldr"
import type { Body, Update } from "@/lib/prototype/types"
import { AI_LABEL } from "@/lib/stories/types"

/**
 * The weekly brief in short: one line for the week, then each item as a headline and one line on
 * what it means, the next sign-up deadline, and recent decisions. Same data and order as
 * /app/brief (lib/prototype/tldr.ts). Every item opens its story and links to its official source.
 */
export default function Tldr() {
  const t = useTranslations("AppTldr")
  const tl = useTranslations("AppLabels")
  const lang = useLocale() === "es" ? "es" : "en"
  const { updates, bodies, profile, weekly, source } = useProfile()
  const openStory = useStory()
  const now = useNow()

  const { coming, decided, next, counts } = buildTldr({ updates, weekly, personas: profile.personas, now })
  // Lead with the decision (the headline), then one line on what it means (DESIGN.md §9).
  const line = (u: Update) => tldrLine(u, profile.personas)
  const bodyOf = (u: Update) => bodies.find((b) => b.id === u.bodyId)
  const gist = t("gist", counts)
  const nextText = next ? t("nextSpeak", { title: next.title, when: fmtDateTime(next.comment!.deadline) }) : t("noneOpen")
  const minutes = readMinutes([gist, nextText, ...[...coming, ...decided].flatMap((u) => [u.title, line(u)])])
  const foot = tldrFootnote([...coming, ...decided], source)
  const nothing = coming.length === 0 && decided.length === 0

  return (
    <div className="mx-auto max-w-3xl pt-4 font-news">
      <header className="border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
          <Chip tone="denim">{t("chip")}</Chip>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" /> {t("minRead", { count: minutes })}
          </span>
        </div>
        <h1 className="mt-4 text-[2.4rem] leading-[1.05] font-black tracking-[-0.03em] text-balance md:text-[3rem]">{t("title")}</h1>
        <p className="mt-3 text-lg leading-relaxed text-pretty text-muted-foreground">{gist}</p>
      </header>

      {nothing ? (
        <Panel className="mt-8 font-sans">
          <p className="text-lg font-bold">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/app/timeline">{t("openTimeline")}</Link>
          </Button>
        </Panel>
      ) : (
        <div className="mt-8 space-y-6">
          {coming.length > 0 && (
            <Panel>
              <SectionTitle
                action={
                  counts.coming > coming.length && (
                    <Link href="/app/timeline" className="font-sans text-sm font-semibold text-denim hover:underline">
                      {t("more", { count: counts.coming - coming.length })}
                    </Link>
                  )
                }
              >
                {t("coming")}
              </SectionTitle>
              <ul className="divide-y divide-line">
                {coming.map((u) => (
                  <Row key={u.id} u={u} body={bodyOf(u)} line={line(u)} onOpen={openStory}>
                    {u.comment && +new Date(u.comment.deadline) > now && (
                      <Chip tone="brick">{t("signup", { when: fmtDateTime(u.comment.deadline) })}</Chip>
                    )}
                  </Row>
                ))}
              </ul>
            </Panel>
          )}

          {next ? (
            <section className="flex flex-col gap-5 rounded-[24px] bg-brick p-6 font-sans text-white md:flex-row md:items-center md:justify-between md:p-7">
              <div className="flex items-start gap-4">
                <Mic aria-hidden className="mt-1 size-6 shrink-0 text-white/80" />
                <div>
                  <h2 className="text-sm font-bold text-white/80">{t("next")}</h2>
                  <p className="mt-1 text-lg leading-snug font-extrabold tracking-tight text-pretty">{nextText}</p>
                </div>
              </div>
              <Button asChild variant="white" className="shrink-0">
                <Link href={`/app/speak?item=${next.id}`}>
                  {t("draft")} <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </section>
          ) : (
            <section className="flex flex-col gap-4 rounded-[24px] bg-muted p-6 font-sans md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-bold text-muted-foreground">{t("next")}</h2>
                <p className="mt-1 leading-relaxed font-semibold text-ink">{nextText}</p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/app/alerts">
                  <BellRing data-icon="inline-start" /> {t("alerts")}
                </Link>
              </Button>
            </section>
          )}

          {decided.length > 0 && (
            <Panel>
              <SectionTitle>{t("decided")}</SectionTitle>
              <ul className="divide-y divide-line">
                {decided.map((u) => (
                  <Row key={u.id} u={u} body={bodyOf(u)} line={line(u)} onOpen={openStory}>
                    {u.vote && <Chip tone="sage">{u.vote}</Chip>}
                    {u.outcomePending && <Chip tone="sand">{tl("outcomePending")}</Chip>}
                  </Row>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      <footer className="mt-8 flex flex-col gap-4 border-t border-border pt-6 font-sans sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {foot === "ai" ? AI_LABEL[lang] : t(foot === "real" ? "footReal" : "footSample")}
        </p>
        <Button asChild variant="outline" className="shrink-0">
          <Link href="/app/brief">
            {t("fullBrief")} <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </footer>
    </div>
  )
}

/** One item: who and when, the headline (opens the story), what it means, then its chips and source. */
function Row({
  u,
  body,
  line,
  onOpen,
  children,
}: {
  u: Update
  body?: Body
  line: string
  onOpen: (u: Update) => void
  children?: React.ReactNode
}) {
  const t = useTranslations("AppTldr")
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs font-semibold text-muted-foreground">
        {body && <BodyIcon kind={body.kind} id={body.id} className="size-6 rounded-lg" />}
        {body && <span className="text-ink">{body.short}</span>}
        {body && <span aria-hidden>·</span>}
        <span>
          {relDay(u.date)}, {fmtTime(u.date)}
        </span>
        {u.tier === "urgent" && <TierPill tier="urgent" />}
      </p>
      <h3 className="mt-2 text-[1.08rem] leading-snug font-bold text-ink">
        <button type="button" onClick={() => onOpen(u)} className="text-left underline-offset-4 hover:text-denim hover:underline">
          {u.title}
        </button>
      </h3>
      {line && <p className="mt-1 leading-relaxed text-pretty text-muted-foreground">{line}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-sans">
        {children}
        <a
          href={u.source}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("sourceLabel", { title: u.title })}
          className="inline-flex items-center gap-1 text-xs font-semibold text-denim underline-offset-2 hover:underline"
        >
          {t("source")} <ExternalLink aria-hidden className="size-3" />
        </a>
      </div>
    </li>
  )
}
