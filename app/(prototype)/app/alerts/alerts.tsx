"use client"

import { BellOff, Check, Smartphone, UserRoundCheck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"
import { toast } from "sonner"
import { AlertSignup } from "@/components/alerts/AlertSignup"
import { LogoMark } from "@/components/civic"
import { PushSignup } from "@/components/alerts/PushSignup"
import { Chip, Panel } from "@/components/prototype/civic"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { relevance } from "@/lib/prototype/updates"
import { itemNotice, reminderNotice, type PushNotice } from "@/lib/push/message"
import { fmtDate } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/**
 * With a looked-up address, sign-up is P3's real flow: browser notifications (PushSignup) and
 * texts (AlertSignup, a labeled preview until Twilio is registered). The demo keeps a simulated form.
 */
export function Alerts({ token, preview, vapidKey }: { token: string | null; preview: boolean; vapidKey: string | null }) {
  const t = useTranslations("AppAlerts")
  const lang = useLocale() === "es" ? "es" : "en"
  const { profile, patch, updates, bodies, source } = useProfile()
  const now = useNow()
  const minor = (profile.age ?? 18) < 18
  const sms = profile.sms
  const [phone, setPhone] = React.useState(sms?.phone ?? "")
  const [parent, setParent] = React.useState(sms?.parentPhone ?? "")
  const [urgent, setUrgent] = React.useState(sms?.urgent ?? true)
  const [reminders, setReminders] = React.useState(sms?.reminders ?? true)
  const [agree, setAgree] = React.useState(!!sms)
  const [error, setError] = React.useState<string | null>(null)

  const sample = updates.find((u) => u.tier === "urgent" && relevance(u, profile.personas) > 0) ?? updates[0]
  const sampleBody = bodies.find((b) => b.id === sample?.bodyId)
  const reminder = updates
    .filter((u) => u.comment && +new Date(u.comment.deadline) > now)
    .sort((a, b) => +new Date(a.comment!.deadline) - +new Date(b.comment!.deadline))[0]
  // The preview is built by the same code that sends the texts (lib/sms/message.ts, plan §11).
  // A placeholder short link; real texts carry the site's own link.
  const link = (u: { id: string }) => `showup.example/s/${(updates.indexOf(u as (typeof updates)[number]) + 1).toString(36)}`
  const status = !sms ? "off" : minor && sms.parentConsent !== "granted" ? "pending" : "on"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.replace(/\D/g, "").length !== 10) return setError(t("errors.phone"))
    if (minor && parent.replace(/\D/g, "").length !== 10) return setError(t("errors.parent"))
    if (minor && parent === phone) return setError(t("errors.same"))
    if (!agree) return setError(t("errors.agree"))
    setError(null)
    patch({
      sms: {
        phone,
        urgent,
        reminders,
        parentPhone: minor ? parent : undefined,
        parentConsent: minor ? "pending" : undefined,
      },
    })
    toast.success(minor ? t("toast.parentAsked") : t("toast.on"))
  }

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em]">{t("title")}</h1>
          <p className="mt-1 text-[0.95rem] text-muted-foreground">{t("lede")}</p>
        </div>
        {source === "demo" && (
        <Chip
          tone={status === "on" ? "sage" : status === "pending" ? "sand" : "outline"}
          className="h-8 px-3.5 text-xs"
        >
          <span
            className={cn(
              "size-2 rounded-full",
              status === "on" ? "bg-sage" : status === "pending" ? "bg-sand-deep" : "bg-muted-foreground/40",
            )}
          />
          {status === "on" ? t("statusOn") : status === "pending" ? t("statusPending") : t("statusOff")}
        </Chip>
        )}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {source !== "demo" ? (
            <>
              <Panel data-onboarding="alertsMain">
                <PushSignup token={token} vapidKey={vapidKey} />
              </Panel>
              <Panel>
                <h2 className="mb-4 text-lg font-bold">{t("textsTitle")}</h2>
                <AlertSignup token={token} preview={preview} />
              </Panel>
            </>
          ) : (
            <Panel data-onboarding="alertsMain">
              <form onSubmit={submit} className="space-y-7">
                <div>
                  <label htmlFor="phone" className="text-sm font-bold">
                    {t("phone")}
                  </label>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface px-4 ring-1 ring-border focus-within:ring-2 focus-within:ring-denim">
                    <Smartphone className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-muted-foreground">+1</span>
                    <input
                      id="phone"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatPhone(e.target.value))
                        setError(null)
                      }}
                      placeholder="(713) 555-0142"
                      className="h-12 flex-1 bg-transparent font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-line rounded-2xl ring-1 ring-border">
                  <Toggle
                    title={t("urgentTitle")}
                    desc={t("urgentDesc")}
                    checked={urgent}
                    onChange={setUrgent}
                    locked
                  />
                  <Toggle
                    title={t("remindersTitle")}
                    desc={t("remindersDesc")}
                    checked={reminders}
                    onChange={setReminders}
                  />
                </div>

                {minor && (
                  <div className="rounded-3xl bg-denim-soft p-5">
                    <p className="flex items-center gap-2 font-bold text-denim-deep">
                      <UserRoundCheck aria-hidden className="size-4" /> {t("minorTitle")}
                    </p>
                    <p className="mt-1 text-sm text-denim-deep/80">
                      {t("minorDesc")}
                    </p>
                    <input
                      inputMode="tel"
                      value={parent}
                      onChange={(e) => {
                        setParent(formatPhone(e.target.value))
                        setError(null)
                      }}
                      placeholder={t("parentPhone")}
                      aria-label={t("parentPhone")}
                      className="mt-4 h-12 w-full rounded-2xl bg-white px-4 font-semibold ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                    />
                    {sms?.parentConsent === "pending" && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-sm">
                        <span className="font-semibold">{t("pending", { phone: sms.parentPhone ?? "" })}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() => {
                            patch({ sms: { ...sms, parentConsent: "granted" } })
                            toast.success(t("toast.approved"))
                          }}
                        >
                          {t("simulate")}
                        </Button>
                      </div>
                  )}
                </div>
              )}

              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked)
                    setError(null)
                  }}
                  className="mt-0.5 size-4 accent-denim"
                />
                <span className="text-muted-foreground">
                  {t("agree")}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg">
                  {sms ? t("save") : minor ? t("sendApproval") : t("turnOn")}
                </Button>
                {sms && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      patch({ sms: undefined })
                      setAgree(false)
                      toast(t("toast.off"))
                    }}
                  >
                    <BellOff data-icon="inline-start" /> {t("turnOff")}
                  </Button>
                )}
                {error && <p className="text-sm font-semibold text-brick">{error}</p>}
              </div>
            </form>
          </Panel>
          )}

          <ul className="space-y-1.5 px-1 text-sm text-muted-foreground">
            <li>{t("keepNote")}</li>
            <li>{t("quietNote")}</li>
            <li>{t("stopNote")}</li>
          </ul>
        </div>

        {/* Phone preview: an iPhone lock screen with the notifications this reader would get. */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <LockScreen
            notices={[
              ...(urgent && sample
                ? [
                    itemNotice(
                      {
                        body: sampleBody?.short ?? "",
                        headline: sample.title,
                        deadline: { meeting_at: sample.date, registration_closes_at: sample.comment?.deadline ?? null },
                        link: link(sample),
                        tag: sample.id,
                      },
                      lang,
                    ),
                  ]
                : []),
              ...(reminders && reminder
                ? [
                    reminderNotice(
                      "registration_closes",
                      { body: bodies.find((b) => b.id === reminder.bodyId)?.short ?? "", title: reminder.title, at: reminder.comment!.deadline, link: link(reminder), tag: reminder.id },
                      lang,
                    ),
                  ]
                : []),
            ]}
          />
          <p className="mx-auto mt-4 max-w-[320px] text-center text-xs text-muted-foreground">
            {source === "demo" ? t("previewSample") : t("previewReal")}
          </p>
        </div>
      </div>
    </div>
  )
}

/** A phone lock screen showing push notifications as iOS draws them. Decorative: the same text is the caption's subject. */
function LockScreen({ notices }: { notices: PushNotice[] }) {
  const t = useTranslations("AppAlerts")
  const [now] = React.useState(() => new Date().toISOString())
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="relative aspect-[9/19] rounded-[52px] bg-ink p-[9px] shadow-[0_1px_2px_rgb(27_38_59/0.1),0_40px_70px_-36px_rgb(27_38_59/0.55)]">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[44px] bg-linear-to-b from-denim via-ink to-ink px-3 text-white">
          {/* Status bar and Dynamic Island */}
          <div className="relative flex items-center justify-between px-4 pt-3.5 text-[13px] font-semibold">
            <span>9:41</span>
            <span aria-hidden className="absolute top-2.5 left-1/2 h-7 w-24 -translate-x-1/2 rounded-full bg-ink ring-1 ring-white/5" />
            <span aria-hidden className="flex items-center gap-1">
              <svg viewBox="0 0 18 12" className="h-3 w-[18px] fill-current"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
              <svg viewBox="0 0 26 12" className="h-3 w-[26px]"><rect x="0.5" y="0.5" width="22" height="11" rx="3.5" className="fill-none stroke-current opacity-50" /><rect x="2.5" y="2.5" width="15" height="7" rx="2" className="fill-current" /><rect x="24" y="4" width="1.5" height="4" rx="0.75" className="fill-current opacity-50" /></svg>
            </span>
          </div>
          {/* Date and clock */}
          <p className="mt-8 text-center text-[15px] font-semibold text-white/85">{fmtDate(now, { weekday: "long", month: "long", day: "numeric" })}</p>
          <p className="text-center text-[5rem] leading-none font-semibold tracking-[-0.04em] tabular-nums">9:41</p>
          {/* Notifications, newest on top */}
          <div className="mt-auto mb-3 space-y-2">
            {notices.map((n, i) => (
              <div key={n.tag + i} className="rounded-[22px] bg-white/80 p-3 text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)] backdrop-blur-xl">
                <div className="flex gap-2.5">
                  <LogoMark className="size-9 rounded-[10px] text-[1.05rem]" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-bold">{n.title}</span>
                      <span className="shrink-0 text-[11px] text-ink/50">{i === 0 ? t("lockNow") : t("lockEarlier")}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-4 text-[12.5px] leading-snug text-ink/85">{n.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Flashlight, camera and the home bar */}
          <div aria-hidden className="mb-2 flex items-center justify-between px-3">
            <span className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"><svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8"><path d="M8 2h8v4l-2 4v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V10L8 6z" /></svg></span>
            <span className="grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur"><svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
          </div>
          <span aria-hidden className="mx-auto mb-2 h-1 w-28 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  )
}

function Toggle({
  title,
  desc,
  checked,
  onChange,
  locked,
}: {
  title: string
  desc: string
  checked: boolean
  onChange: (b: boolean) => void
  locked?: boolean
}) {
  const t = useTranslations("AppAlerts")
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="flex-1">
        <p className="flex items-center gap-2 font-bold">
          {title}
          {locked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Check aria-hidden className="size-3" /> {t("alwaysOn")}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={locked} aria-label={title} />
    </div>
  )
}
