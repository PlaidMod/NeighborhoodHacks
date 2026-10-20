import {
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
import type { BodyKind, Tier, UpdateType } from "@/lib/prototype/types"
import { cn } from "@/lib/utils"

// The pieces the /app screens need that are keyed by the prototype's sample-data types
// (lib/prototype/types.ts). Everything else comes from the shared components/civic.tsx.
// As a screen moves to real data, switch it to the shared BodyIcon (keyed by BodyType) and TierPill.
export { ArrowCircle, Chip, Logo, Panel, SectionTitle } from "@/components/civic"

export const KIND_STYLE: Record<BodyKind, { icon: LucideIcon; tile: string; dot: string }> = {
  mud: { icon: Droplets, tile: "bg-brick-soft text-brick-deep", dot: "bg-brick" },
  school: { icon: GraduationCap, tile: "bg-denim-soft text-denim-deep", dot: "bg-denim" },
  city: { icon: Landmark, tile: "bg-ink/8 text-ink", dot: "bg-ink" },
  county: { icon: Building2, tile: "bg-sand text-sand-deep", dot: "bg-sand-deep" },
  flood: { icon: Waves, tile: "bg-denim-soft text-denim", dot: "bg-mist" },
  health: { icon: HeartPulse, tile: "bg-sage-soft text-sage", dot: "bg-sage" },
  college: { icon: BookOpen, tile: "bg-plum-soft text-plum-deep", dot: "bg-plum" },
}

/** Decorative: the body's name is always shown beside it. */
export function BodyIcon({ kind, className }: { kind: BodyKind; className?: string }) {
  const s = KIND_STYLE[kind]
  const Icon = s.icon
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", s.tile, className)}>
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
      <span aria-hidden className={cn("size-1.5 rounded-full", tier === "urgent" ? "bg-brick" : "bg-denim")} />
      {tier === "urgent" ? "Urgent" : "In your brief"}
    </span>
  )
}
