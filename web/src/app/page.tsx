import { ArrowRight, BellRing, Megaphone, Newspaper, Rows3 } from "lucide-react"
import Link from "next/link"
import { AddressForm } from "@/components/address-form"
import { BodyIcon, Logo } from "@/components/civic"
import { Button } from "@/components/ui/button"
import { KIND_LABEL, bodiesFor } from "@/lib/data/bodies"
import { SUPPORTED_ZIP_COUNT, ZIPS } from "@/lib/data/zips"

export default function Landing() {
  const sample = bodiesFor(ZIPS["77065"])
  const mud = sample[0]

  return (
    <div className="min-h-screen bg-canvas p-3 md:p-4">
      <div className="mx-auto max-w-[1360px] rounded-[32px] bg-surface">
        {/* Top nav, from the sports-page reference */}
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-muted-foreground md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#why" className="hover:text-ink">Why it matters</a>
            <Link href="/app" className="hover:text-ink">Demo dashboard</Link>
          </nav>
          <Button asChild variant="outline" size="sm">
            <Link href="/app">Open demo</Link>
          </Button>
        </header>

        {/* Hero */}
        <section className="grid gap-12 px-5 pt-12 pb-16 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
          <div className="rise flex flex-col justify-center">
            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-denim ring-1 ring-border">
              <span className="size-1.5 rounded-full bg-brick" />
              Covering {SUPPORTED_ZIP_COUNT} Houston-area ZIP codes
            </span>
            <h1 className="text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.035em] text-ink md:text-6xl lg:text-[4.25rem]">
              You live under a stack of governments.
              <span className="block text-denim">Meet them.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              School boards, city council, commissioners court, flood control, and your utility district
              all decide your taxes, schools, and streets. Type your address to see who they are, what
              they're deciding next, and how to be heard.
            </p>
            <div className="mt-9 max-w-xl">
              <AddressForm />
            </div>
            <p className="mt-4 pl-5 text-xs text-muted-foreground">
              We use your address once to find your districts, then forget it.
            </p>
          </div>

          {/* The stack */}
          <div className="rise relative [animation-delay:120ms]">
            <div className="relative rounded-[32px] bg-denim p-6 text-white md:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-white/70">12014 Fallbrook Dr · 77065</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight">Your stack</p>
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {sample.length} bodies
                </span>
              </div>
              <ul className="mt-6 space-y-2">
                {sample.map((b, i) => (
                  <li
                    key={b.id}
                    className="rise flex items-center gap-3 rounded-2xl bg-white p-3 pr-4 text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)]"
                    style={{ animationDelay: `${200 + i * 70}ms`, marginLeft: `${Math.min(i, 4) * 6}px` }}
                  >
                    <BodyIcon kind={b.kind} className="size-9 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{KIND_LABEL[b.kind]}</p>
                    </div>
                    {b.taxRate && (
                      <span className="text-xs font-bold text-muted-foreground tabular">
                        ${b.taxRate.toFixed(2)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -bottom-14 -left-8 hidden w-64 rotate-[-3deg] rounded-3xl bg-ink p-5 text-white shadow-2xl md:block">
              <p className="text-xs font-semibold text-white/60">Last {mud.short} election</p>
              <p className="mt-1 text-4xl font-extrabold tracking-tight">
                {mud.lastTurnout?.votes} votes
              </p>
              <p className="mt-1 text-xs text-white/70">
                out of {mud.lastTurnout?.eligible.toLocaleString()} eligible. Now a $38.5M bond is on the ballot.
              </p>
            </div>
          </div>
        </section>

        {/* How it works: bento, from the sports reference */}
        <section id="how" className="px-5 pt-6 pb-16 md:px-10">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Three ways to stay in the loop</h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            One engine sorts every agenda and decision into what you need, when you need it.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3 md:grid-rows-[auto_auto]">
            <div className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-[28px] bg-denim p-7 text-white md:row-span-2">
              <Newspaper className="size-7 text-white/80" />
              <div>
                <p className="text-xs font-bold text-white/60 uppercase">Every Sunday</p>
                <p className="mt-2 text-3xl leading-tight font-extrabold tracking-tight">
                  A weekly brief that reads like your local paper
                </p>
                <p className="mt-3 text-sm text-white/75">
                  Upcoming meetings and what got decided, in plain language, for only the bodies that cover you.
                </p>
              </div>
            </div>
            <div className="flex min-h-52 flex-col justify-between rounded-[28px] bg-brick p-7 text-white md:col-span-2">
              <BellRing className="size-7 text-white/80" />
              <div>
                <p className="text-xs font-bold text-white/60 uppercase">Only the big stuff</p>
                <p className="mt-2 text-2xl leading-tight font-extrabold tracking-tight md:text-3xl">
                  A text when a tax hike, bond, or school closure is on the line
                </p>
              </div>
            </div>
            <div className="flex min-h-52 flex-col justify-between rounded-[28px] bg-ink p-7 text-white">
              <Rows3 className="size-7 text-white/80" />
              <p className="text-xl leading-tight font-extrabold tracking-tight">
                A live timeline of every agenda and decision
              </p>
            </div>
            <div className="flex min-h-52 flex-col justify-between rounded-[28px] bg-sand p-7 text-ink">
              <Megaphone className="size-7 text-sand-deep" />
              <p className="text-xl leading-tight font-extrabold tracking-tight">
                Draft your 2-minute public comment, then practice it
              </p>
            </div>
          </div>
        </section>

        {/* Why */}
        <section id="why" className="mx-5 mb-5 rounded-[28px] bg-white p-7 md:mx-10 md:mb-10 md:p-12">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              { n: "9", t: "HISD board managers, all appointed by the state. Public comment is one of the few ways left to be heard." },
              { n: "<50", t: "Voters in many MUD elections, even when millions of dollars in bonds are on the ballot." },
              { n: "72 hrs", t: "Minimum notice for most public meetings in Texas. We catch the agenda the moment it posts." },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-5xl font-extrabold tracking-tight text-brick">{s.n}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.t}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 md:flex-row md:items-center">
            <p className="text-lg font-bold">Built by Houston students, for anyone who wants to show up.</p>
            <Button asChild>
              <Link href="/start">
                Find my governments <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="px-5 pb-8 text-xs text-muted-foreground md:px-10">
          Prototype with sample meeting data. District lookups are approximate by ZIP code.
        </footer>
      </div>
    </div>
  )
}
