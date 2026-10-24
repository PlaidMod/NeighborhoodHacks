"use client"

import {
  BellRing,
  ChevronRight,
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
import { useTranslations } from "next-intl"
import * as React from "react"
import { BodyIcon, Logo } from "@/components/prototype/civic"
import { StoryProvider, useStory } from "@/components/prototype/story-sheet"
import { Button } from "@/components/ui/button"
import {
  Command,
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
import { SignOutForm } from "@/components/prototype/sign-out-form"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PERSONAS, relDay } from "@/lib/prototype/format"
import { useProfile } from "@/lib/prototype/profile"
import { hasSavedAddress } from "@/lib/prototype/profile-storage"
import { searchShortcutLabel } from "@/lib/prototype/shortcut"
import { cn } from "@/lib/utils"

const noSubscribe = () => () => {}

/** ⌘K or Ctrl K for this device. Null on the server, so the hint appears after hydration without a mismatch. */
function useShortcutLabel(): string | null {
  return React.useSyncExternalStore(
    noSubscribe,
    () => {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
      return searchShortcutLabel(nav.userAgentData?.platform || nav.platform || "")
    },
    () => null,
  )
}

/** Each link's label is AppShell.nav.<key> in messages/*.json. */
type NavLink = { href: string; key: string; icon: LucideIcon }

const MENU: NavLink[] = [
  { href: "/app", key: "home", icon: LayoutGrid },
  { href: "/app/timeline", key: "timeline", icon: Rows3 },
  { href: "/app/brief", key: "brief", icon: Newspaper },
  { href: "/app/districts", key: "districts", icon: Map },
  { href: "/app/speak", key: "speak", icon: Mic },
  { href: "/app/vote", key: "vote", icon: Vote },
]

const GENERAL: NavLink[] = [
  { href: "/app/alerts", key: "alerts", icon: BellRing },
  { href: "/address?change=1", key: "changeAddress", icon: Settings2 },
]

/** Pages that hide the sidebar by default so the content can use the whole screen. */
const IMMERSIVE = ["/app/timeline"]

/** Whether the desktop sidebar is showing, so a page can make room for it (the timeline hides its left column). */
const NavOpenContext = React.createContext(true)
export function useNavOpen() {
  return React.useContext(NavOpenContext)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useProfile()
  const ts = useTranslations("Shell")
  const path = usePathname()
  const immersive = IMMERSIVE.includes(path)
  // The path the reader reopened the sidebar on. Leaving that page forgets it, so every visit to an
  // immersive page (the timeline) starts with the sidebar hidden.
  const [openOn, setOpenOn] = React.useState<string | null>(null)
  if (openOn !== null && openOn !== path) setOpenOn(null)
  const navOpen = !immersive || openOn === path
  if (!ready) return <div className="min-h-screen bg-canvas" />
  return (
    <StoryProvider>
      {/* Same skip link as the public pages: jumps past the sidebar and top bar. */}
      <a
        href="#main-content"
        className="sr-only fixed top-3 left-3 z-[100] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        {ts("skip")}
      </a>
      <div className="min-h-screen bg-canvas p-2 md:p-3">
        <div className="mx-auto flex max-w-[1520px]">
          <aside
            inert={!navOpen}
            className={cn(
              "sticky top-3 hidden h-[calc(100vh-1.5rem)] shrink-0 overflow-hidden transition-[width,margin-right,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:block motion-reduce:transition-[opacity]",
              navOpen ? "mr-3 w-[248px] opacity-100" : "mr-0 w-0 opacity-0",
            )}
          >
            <div className="h-full w-[248px]">
              <SidebarBody />
            </div>
          </aside>
          <div className="min-w-0 flex-1 rounded-[28px] bg-transparent">
            <TopBar navToggle={immersive ? { open: navOpen, toggle: () => setOpenOn(navOpen ? null : path) } : undefined} />
            <main id="main-content" className="px-4 pb-24 md:px-8">
              <NavOpenContext.Provider value={navOpen}>{children}</NavOpenContext.Provider>
            </main>
          </div>
        </div>
      </div>
    </StoryProvider>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  const t = useTranslations("AppShell")
  const { updates } = useProfile()
  const urgent = updates.filter((u) => u.tier === "urgent" && new Date(u.date) >= new Date()).length

  const item = (m: NavLink) => {
    const active = m.href === "/app" ? path === "/app" : m.href.startsWith("/?") ? false : path.startsWith(m.href)
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
        {t(`nav.${m.key}`)}
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
      <p className="px-4 pb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/70 uppercase">{t("sections.menu")}</p>
      <nav className="space-y-1">{MENU.map(item)}</nav>
      <p className="px-4 pt-7 pb-2 text-[11px] font-bold tracking-[0.12em] text-muted-foreground/70 uppercase">
        {t("sections.general")}
      </p>
      <nav className="space-y-1">{GENERAL.map(item)}</nav>
      <div className="mt-auto px-4 pt-10 pb-2">
        <p className="text-xs font-semibold text-ink">{t("footer.tagline")}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("footer.independent")}
          <br />
          {t("footer.builtBy")}
        </p>
      </div>
    </div>
  )
}

function TopBar({ navToggle }: { navToggle?: { open: boolean; toggle: () => void } }) {
  const { profile, jurisdiction, patch, isDemo, source, bodies, account, canSignIn } = useProfile()
  const t = useTranslations("AppShell")
  const shortcut = useShortcutLabel()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const who = account?.name || profile.name
  const savedAddress = hasSavedAddress(profile)
  const initials = who ? who.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "ME"
  const place = jurisdiction.zip ? `${jurisdiction.area} · ${jurisdiction.zip}` : t("account.governments", { count: bodies.length })

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
          {savedAddress ? t("banner.saved") : t("banner.demo")}{" "}
          <Link href="/address?change=1" className="font-semibold text-denim underline underline-offset-2">
            {t("banner.useMyAddress")}
          </Link>
        </p>
      )}
      {source === "sample" && (
        <p className="rounded-t-[28px] border-b border-line bg-white/60 px-4 py-2 text-center text-[11px] text-muted-foreground">
          {t("banner.noDatabase")}
        </p>
      )}
      <header className="flex items-center gap-3 px-4 pt-5 pb-3 md:px-8 md:pt-6">
        {navToggle && (
          <button
            onClick={navToggle.toggle}
            aria-expanded={navToggle.open}
            aria-label={navToggle.open ? t("toggle.hide") : t("toggle.show")}
            className="hidden h-11 shrink-0 items-center gap-1.5 rounded-full bg-white pr-4 pl-3 text-sm font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-muted active:scale-[0.96] lg:inline-flex"
          >
            <ChevronRight
              aria-hidden
              className={cn("size-5 transition-[rotate] duration-300 ease-[cubic-bezier(0.2,0,0,1)]", navToggle.open && "rotate-180")}
              strokeWidth={2.25}
            />
            {t("toggle.label")}
          </button>
        )}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
            <span className="sr-only">{t("sections.menu")}</span>
          </Button>
          <SheetContent side="left" className="w-[280px] border-0 bg-canvas p-2" showCloseButton={false}>
            <SheetTitle className="sr-only">{t("sections.navigation")}</SheetTitle>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-white px-4 text-left text-sm text-muted-foreground ring-1 ring-transparent transition hover:ring-border md:max-w-[380px]"
        >
          <Search className="size-[1.1rem] shrink-0 text-ink" />
          <span className="truncate">{t("search.button")}</span>
          {shortcut && (
            <kbd className="ml-auto hidden rounded-md bg-muted px-1.5 py-0.5 font-sans text-[11px] font-semibold md:block">
              {shortcut}
            </kbd>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label={t("account.trigger")} className="flex items-center gap-3 rounded-full py-1 pr-1 pl-1 hover:bg-white/60 md:pr-4">
                {account?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Google's avatar URL; not worth configuring next/image remote hosts
                  <img src={account.avatar} alt="" width={40} height={40} referrerPolicy="no-referrer" className="size-10 rounded-full object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-denim-soft text-sm font-bold text-denim-deep">{initials}</span>
                )}
                <span className="hidden text-left leading-tight xl:block">
                  <span className="block text-sm font-bold">{who || t("account.yourArea")}</span>
                  <span className="block text-xs text-muted-foreground">{place}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                {account ? (
                  <>
                    <span className="block font-semibold text-ink">{account.name ?? account.email}</span>
                    {t("account.signedIn")}
                  </>
                ) : (
                  <>
                    <span className="block font-semibold text-ink">{t("account.guest")}</span>
                    {t("account.guestNote")}
                  </>
                )}
              </DropdownMenuLabel>
              {!account && canSignIn && (
                <DropdownMenuItem asChild className="rounded-xl font-semibold text-denim">
                  <a href="/signin">{t("account.signIn")}</a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {place}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t("account.explainFor")}</DropdownMenuLabel>
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
                  {t(`persona.${p.id}`)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/address?change=1">{t("nav.changeAddress")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="rounded-xl">
                <Link href="/app/alerts">{t("nav.alerts")}</Link>
              </DropdownMenuItem>
              {(!isDemo || savedAddress || account) && (
                <>
                  <DropdownMenuSeparator />
                  {/* Guests sign out too: it makes this browser forget their governments and saved address (shared computers). */}
                  <SignOutForm>
                    <DropdownMenuItem asChild className="w-full rounded-xl text-brick focus:text-brick">
                      <button type="submit">{account ? t("account.signOut") : t("account.signOutGuest")}</button>
                    </DropdownMenuItem>
                  </SignOutForm>
                  {account && (
                    <DropdownMenuItem asChild className="rounded-xl text-brick focus:text-brick">
                      <Link href="/account/delete">{t("account.delete")}</Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
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
  const t = useTranslations("AppShell")
  const router = useRouter()
  const openStory = useStory()
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("search.button")}
      description={t("search.description")}
      className="rounded-3xl! sm:max-w-xl"
    >
      {/* cmdk's parts need their <Command> root; this CommandDialog doesn't add one. */}
      <Command>
        <CommandInput placeholder={t("search.placeholder")} />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>{t("search.empty")}</CommandEmpty>
          <CommandGroup heading={t("search.governments")}>
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
          <CommandGroup heading={t("search.updates")}>
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
      </Command>
    </CommandDialog>
  )
}
