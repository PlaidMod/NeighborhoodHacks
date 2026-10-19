import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarClock,
  Droplets,
  FileText,
  Gavel,
  GraduationCap,
  HeartPulse,
  Landmark,
  Megaphone,
  TimerReset,
  Vote,
  Waves,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import type { BodyKind, Tier, UpdateType } from "@/lib/data/types"
import { APP_NAME } from "@/lib/format"
import { cn } from "@/lib/utils"

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-[10px] bg-brick text-white shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] transition-transform motion-safe:group-hover:-rotate-6",
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2.5l2.6 6.1 6.6.5-5 4.4 1.5 6.5L12 16.6 6.3 20l1.5-6.5-5-4.4 6.6-.5z"
          />
        </svg>
      </span>
      <span className={cn("text-[1.15rem] font-extrabold tracking-tight", light ? "text-white" : "text-ink")}>
        {APP_NAME}
        <span className={cn("ml-1 font-semibold", light ? "text-white/60" : "text-muted-foreground")}>HTX</span>
      </span>
    </Link>
  )
}

export const KIND_STYLE: Record<BodyKind, { icon: LucideIcon; tile: string; dot: string }> = {
  mud: { icon: Droplets, tile: "bg-brick-soft text-brick-deep", dot: "bg-brick" },
  school: { icon: GraduationCap, tile: "bg-denim-soft text-denim-deep", dot: "bg-denim" },
  city: { icon: Landmark, tile: "bg-ink/8 text-ink", dot: "bg-ink" },
  county: { icon: Building2, tile: "bg-sand text-sand-deep", dot: "bg-sand-deep" },
  flood: { icon: Waves, tile: "bg-denim-soft text-denim", dot: "bg-mist" },
  health: { icon: HeartPulse, tile: "bg-sage-soft text-sage", dot: "bg-sage" },
  college: { icon: BookOpen, tile: "bg-plum-soft text-plum-deep", dot: "bg-plum" },
}

export function BodyIcon({ kind, className }: { kind: BodyKind; className?: string }) {
  const s = KIND_STYLE[kind]
  const Icon = s.icon
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", s.tile, className)}>
      <Icon className="size-[1.1rem]" strokeWidth={2} />
    </span>
  )
}

export const TYPE_ICON: Record<UpdateType, LucideIcon> = {
  agenda: FileText,
  decision: Gavel,
  hearing: Megaphone,
  election: Vote,
  meeting: CalendarClock,
  deadline: TimerReset,
}

export function TierPill({ tier, className }: { tier: Tier; className?: string }) {
  if (tier === "timeline") return null
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold",
        tier === "urgent" ? "bg-brick-soft text-brick-deep" : "bg-denim-soft text-denim-deep",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tier === "urgent" ? "bg-brick" : "bg-denim")} />
      {tier === "urgent" ? "Urgent" : "In your brief"}
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

/** The circled arrow from the dashboard reference. */
export function ArrowCircle({ className }: { className?: string }) {
  return (
    <span
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

export function Panel({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-[24px] bg-white p-5 md:p-6", className)} {...props}>
      {children}
    </div>
  )
}
