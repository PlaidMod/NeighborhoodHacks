import {
  Anchor,
  ArrowUpRight,
  BookOpen,
  Building,
  Building2,
  BusFront,
  Droplet,
  Droplets,
  Fence,
  GraduationCap,
  House,
  Landmark,
  Siren,
  Waves,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { APP_NAME } from "@/lib/brand"
import type { BodyType } from "@/lib/contracts/bodyTypes"
import { cn } from "@/lib/utils"

// Shared building blocks from DESIGN.md section 7. Reuse these before building new ones.

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  const [word, place] = APP_NAME.split(" ")
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-brick text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] transition-transform motion-safe:group-hover:-rotate-6">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="currentColor" d="M12 2.5l2.6 6.1 6.6.5-5 4.4 1.5 6.5L12 16.6 6.3 20l1.5-6.5-5-4.4 6.6-.5z" />
        </svg>
      </span>
      <span className={cn("text-[1.15rem] font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>
        {word}
        <span className={cn("ml-1 font-semibold", light ? "text-white/60" : "text-muted-foreground")}>{place}</span>
      </span>
    </Link>
  )
}

/** Icon and color per body type. Every BodyType must have an entry. */
export const BODY_STYLE: Record<BodyType, { icon: LucideIcon; tile: string }> = {
  city_council: { icon: Landmark, tile: "bg-ink/8 text-ink" },
  commissioners_court: { icon: Building2, tile: "bg-sand text-sand-deep" },
  school_board: { icon: GraduationCap, tile: "bg-denim-soft text-denim-deep" },
  college_board: { icon: BookOpen, tile: "bg-plum-soft text-plum-deep" },
  mud: { icon: Droplets, tile: "bg-brick-soft text-brick-deep" },
  esd: { icon: Siren, tile: "bg-brick-soft text-brick-deep" },
  water_authority: { icon: Droplet, tile: "bg-denim-soft text-denim" },
  flood_control: { icon: Waves, tile: "bg-denim-soft text-denim" },
  port: { icon: Anchor, tile: "bg-sand text-sand-deep" },
  metro: { icon: BusFront, tile: "bg-sage-soft text-sage" },
  hcad: { icon: House, tile: "bg-sand text-sand-deep" },
  hoa: { icon: Fence, tile: "bg-muted text-muted-foreground" },
  other: { icon: Building, tile: "bg-muted text-muted-foreground" },
}

/** A 40px tile with the body's icon. DESIGN.md: every body listed gets one. Decorative: the name is shown beside it. */
export function BodyIcon({ type, className }: { type: BodyType; className?: string }) {
  const style = BODY_STYLE[type] ?? BODY_STYLE.other
  const Icon = style.icon
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", style.tile, className)}>
      <Icon className="size-[1.1rem]" strokeWidth={2} />
    </span>
  )
}

/** Shows "Urgent" for SMS-tier items only. Weekly and timeline items get no pill. */
export function TierPill({ tier, className }: { tier: "sms" | "weekly" | "timeline"; className?: string }) {
  const t = useTranslations("Civic")
  if (tier !== "sms") return null
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full bg-brick-soft px-2.5 text-[11px] font-bold text-brick-deep",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-brick" />
      {t("urgent")}
    </span>
  )
}

export function Chip({
  children,
  className,
  tone = "outline",
}: {
  children: React.ReactNode
  className?: string
  tone?: "outline" | "denim" | "brick" | "sand" | "ink" | "sage"
}) {
  const tones = {
    outline: "border border-border bg-white text-muted-foreground",
    denim: "bg-denim-soft text-denim-deep",
    brick: "bg-brick-soft text-brick-deep",
    sand: "bg-sand text-sand-deep",
    ink: "bg-ink text-white",
    sage: "bg-sage-soft text-sage",
  }
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** The circled arrow. Use it on cards where the whole card is a link (the parent needs `group`). */
export function ArrowCircle({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border border-current/25 transition-transform motion-safe:group-hover:rotate-45",
        className,
      )}
    >
      <ArrowUpRight className="size-4" />
    </span>
  )
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[1.05rem] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}

/** The default white card. */
export function Panel({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[24px] bg-white p-5 md:p-6", className)} {...props}>
      {children}
    </div>
  )
}
