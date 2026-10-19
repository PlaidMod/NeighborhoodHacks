"use client"

import {
  Bell,
  BellRing,
  ChevronDown,
  LayoutGrid,
  Map,
  MapPin,
  Menu,
  Mic,
  Newspaper,
  Rows3,
  Search,
  Settings2,
  Vote,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { BodyIcon, Logo, TYPE_ICON } from "@/components/civic"
import { StoryProvider, useStory } from "@/components/story-sheet"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { relevance } from "@/lib/data/updates"
import { PERSONAS, relDay } from "@/lib/format"
import { useProfile } from "@/lib/profile"
import { cn } from "@/lib/utils"

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app", label: "Home", icon: LayoutGrid },
  { href: "/app/timeline", label: "Timeline", icon: Rows3 },
  { href: "/app/brief", label: "Weekly brief", icon: Newspaper },
  { href: "/app/districts", label: "My districts", icon: Map },
  { href: "/app/speak", label: "Speak up", icon: Mic },
  { href: "/app/vote", label: "Vote", icon: Vote },
]

const GENERAL: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/alerts", label: "Text alerts", icon: BellRing },
  { href: "/start", label: "Change address", icon: Settings2 },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useProfile()
  if (!ready) return <div className="min-h-screen bg-canvas" />
  return (
    <StoryProvider>
      <div className="min-h-screen bg-canvas p-2 md:p-3">
        <div className="mx-auto flex max-w-[1520px] gap-3">
          <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[248px] shrink-0 lg:block">
            <SidebarBody />
          </aside>
          <div className="min-w-0 flex-1 rounded-[28px] bg-surface">
            <TopBar />
            <main className="px-4 pb-10 md:px-7">{children}</main>
          </div>
        </div>
      </div>
    </StoryProvider>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const { updates, profile } = useProfile()
  const urgent = updates.filter((u) => u.tier === "urgent" && new Date(u.date) >= new Date()).length

  const item = (m: (typeof MENU)[number]) => {
    const active = m.href === "/app" ? path === "/app" : path.startsWith(m.href)
    return (
      <Link
        key={m.href}
        href={m.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex h-11 items-center gap-3 rounded-2xl px-4 text-[0.92rem] font-semibold text-muted-foreground transition-colors hover:bg-white/70 hover:text-ink",
          active && "bg-white text-ink",
        )}
      >
        {active && <span className="absolute top-2.5 bottom-2.5 -left-0 w-1 rounded-r-full bg-denim" />}
        <m.icon className={cn("size-[1.15rem]", active ? "text-denim" : "")} strokeWidth={2} />
        {m.label}
        {m.href === "/app/timeline" && urgent > 0 && (
          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brick px-1.5 text-[10px] font-bold text-white">
            {urgent}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-[28px] bg-surface p-4">
      <div className="px-3 pt-2 pb-8">
        <Logo />
      </div>
      <p className="px-4 pb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/70 uppercase">Menu</p>
      <nav className="space-y-1">{MENU.map(item)}</nav>
      <p className="px-4 pt-7 pb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/70 uppercase">
        General
      </p>
      <nav className="space-y-1">{GENERAL.map(item)}</nav>

      {!profile.sms && (
        <div className="relative mt-auto overflow-hidden rounded-3xl bg-ink p-5 text-white">
          <div className="absolute -top-10 -right-10 size-32 rounded-full border-[18px] border-white/5" />
          <div className="absolute -right-4 -bottom-14 size-32 rounded-full border-[18px] border-brick/30" />
          <BellRing className="relative size-6 text-brick-soft" />
          <p className="relative mt-4 text-[1.05rem] leading-snug font-bold">Get a text for the big stuff</p>
          <p className="relative mt-1 text-xs text-white/60">Tax hikes, bonds, and closures only.</p>
          <Button asChild variant="white" size="sm" className="relative mt-4 w-full">
            <Link href="/app/alerts" onClick={onNavigate}>
              Turn on alerts
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function TopBar() {
  const { profile, jurisdiction, updates, patch, isDemo } = useProfile()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const openStory = useStory()
  const initials = profile.name.slice(0, 2).toUpperCase()
  const urgent = updates
    .filter((u) => u.tier === "urgent" && relevance(u, profile.personas) > 0)
    .slice(0, 4)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      {isDemo && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-t-[28px] bg-denim px-4 py-2 text-center text-xs font-semibold text-white">
          You're viewing a demo for Maya, a 17-year-old student in Third Ward.
          <Link href="/start" className="underline underline-offset-2 hover:text-white/80">
            Use my address
          </Link>
        </div>
      )}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 md:px-7 md:pt-5">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
            <span className="sr-only">Menu</span>
          </Button>
          <SheetContent side="left" className="w-[280px] border-0 bg-canvas p-2" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-4 text-left text-sm text-muted-foreground ring-1 ring-transparent transition hover:ring-border md:max-w-[380px]"
        >
          <Search className="size-[1.1rem] shrink-0 text-ink" />
          <span className="truncate">Search meetings, bodies, topics</span>
          <kbd className="ml-auto hidden rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] font-semibold md:block">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold hover:bg-white/80 md:flex">
                <span className="text-muted-foreground">Viewing as</span>
                {profile.personas.map((p) => PERSONAS.find((x) => x.id === p)?.label).join(", ") || "Resident"}
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Tailor explanations for
              </DropdownMenuLabel>
              {PERSONAS.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.id}
                  checked={profile.personas.includes(p.id)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(on) =>
                    patch({
                      personas: on
                        ? [...profile.personas, p.id]
                        : profile.personas.filter((x) => x !== p.id),
                    })
                  }
                  className="rounded-xl"
                >
                  {p.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <button className="relative grid size-11 place-items-center rounded-full bg-white hover:bg-white/80">
                <Bell className="size-[1.1rem]" />
                {urgent.length > 0 && (
                  <span className="absolute top-2.5 right-3 size-2 rounded-full bg-brick ring-2 ring-white" />
                )}
                <span className="sr-only">Urgent alerts</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[360px] rounded-3xl p-2">
              <p className="px-3 pt-2 pb-1 text-sm font-bold">Urgent for you</p>
              {urgent.map((u) => {
                const Icon = TYPE_ICON[u.type]
                return (
                  <button
                    key={u.id}
                    onClick={() => openStory(u)}
                    className="flex w-full gap-3 rounded-2xl p-3 text-left hover:bg-muted"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brick-soft text-brick-deep">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-semibold">{u.title}</span>
                      <span className="text-xs text-muted-foreground">{relDay(u.date)}</span>
                    </span>
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-full py-1 pr-1 pl-1 hover:bg-white/60 md:pr-4">
                <span className="grid size-11 place-items-center rounded-full bg-brick text-sm font-bold text-white">
                  {initials}
                </span>
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-bold">{profile.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {jurisdiction.area} · {jurisdiction.zip}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {jurisdiction.area}, {jurisdiction.zip}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/start">Change address</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/app/alerts">Text alerts</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { bodies, updates } = useProfile()
  const router = useRouter()
  const openStory = useStory()
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="rounded-3xl! sm:max-w-xl">
      <CommandInput placeholder="Search meetings, bodies, topics…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>Nothing matches that yet.</CommandEmpty>
        <CommandGroup heading="Your governments">
          {bodies.map((b) => (
            <CommandItem
              key={b.id}
              value={`${b.name} ${b.short}`}
              onSelect={() => {
                onOpenChange(false)
                router.push(`/app/districts/${b.id}`)
              }}
              className="gap-3 rounded-xl"
            >
              <BodyIcon kind={b.kind} className="size-8 rounded-xl" />
              {b.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Updates">
          {updates.map((u) => (
            <CommandItem
              key={u.id}
              value={`${u.title} ${u.topic}`}
              onSelect={() => {
                onOpenChange(false)
                openStory(u)
              }}
              className="rounded-xl"
            >
              <span className="truncate">{u.title}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{relDay(u.date)}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
