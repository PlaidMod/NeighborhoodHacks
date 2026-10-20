"use client"

import {
  BellRing,
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
import { BodyIcon, Logo } from "@/components/prototype/civic"
import { StoryProvider, useStory } from "@/components/prototype/story-sheet"
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PERSONAS, relDay } from "@/lib/prototype/format"
import { useProfile } from "@/lib/prototype/profile"
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
  { href: "/", label: "Change address", icon: Settings2 },
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
            <main id="main-content" className="px-4 pb-24 md:px-8">{children}</main>
          </div>
        </div>
      </div>
    </StoryProvider>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const { updates } = useProfile()
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
          active && "bg-denim-soft text-denim-deep",
        )}
        aria-current={active ? "page" : undefined}
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
      <div className="mt-auto px-4 pt-10 pb-2">
        <p className="text-xs font-semibold text-ink">Your neighborhood. Your voice.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Independent & nonpartisan.<br />Built by Houston students.</p>
      </div>
    </div>
  )
}

function TopBar() {
  const { profile, jurisdiction, patch, isDemo, source, bodies } = useProfile()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const initials = profile.name ? profile.name.slice(0, 2).toUpperCase() : "ME"
  const place = jurisdiction.zip ? `${jurisdiction.area} · ${jurisdiction.zip}` : `${bodies.length} governments`

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
        <p className="rounded-t-[28px] border-b border-line bg-white/60 px-4 py-2 text-center text-[11px] text-muted-foreground">
          Sample data · Exploring Third Ward as Maya.{" "}
          <Link href="/" className="font-semibold text-denim underline underline-offset-2">
            Use my address
          </Link>
        </p>
      )}
      {source === "sample" && (
        <p className="rounded-t-[28px] border-b border-line bg-white/60 px-4 py-2 text-center text-[11px] text-muted-foreground">
          Sample data · The meeting database isn&apos;t connected here, so these are sample governments and items.
        </p>
      )}
      <header className="flex items-center gap-3 px-4 pt-5 pb-3 md:px-8 md:pt-6">
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
              <button aria-label="Profile and interests" className="flex items-center gap-3 rounded-full py-1 pr-1 pl-1 hover:bg-white/60 md:pr-4">
                <span className="grid size-10 place-items-center rounded-full bg-denim-soft text-sm font-bold text-denim-deep">
                  {initials}
                </span>
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-bold">{profile.name || "Your area"}</span>
                  <span className="block text-xs text-muted-foreground">{place}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {place}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Explain things for a</DropdownMenuLabel>
              {PERSONAS.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.id}
                  checked={profile.personas.includes(p.id)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(on) =>
                    patch({
                      personas: on ? [...profile.personas, p.id] : profile.personas.filter((x) => x !== p.id),
                    })
                  }
                  className="rounded-xl"
                >
                  {p.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/">Change address</Link>
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
              <BodyIcon kind={b.kind} id={b.id} className="size-8 rounded-xl" />
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
