"use client"

import { BellOff, Check, Smartphone, UserRoundCheck } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { AlertSignup } from "@/components/alerts/AlertSignup"
import { Chip, Panel } from "@/components/prototype/civic"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { relevance } from "@/lib/prototype/updates"
import { fmtDateTime } from "@/lib/prototype/format"
import { useNow, useProfile } from "@/lib/prototype/profile"
import { cn } from "@/lib/utils"

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

/** With a looked-up address, sign-up is P3's real flow (AlertSignup); the demo keeps a simulated form. */
export function Alerts({ token, preview }: { token: string | null; preview: boolean }) {
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
  const status = !sms ? "off" : minor && sms.parentConsent !== "granted" ? "pending" : "on"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (phone.replace(/\D/g, "").length !== 10) return setError("Enter a 10-digit US mobile number.")
    if (minor && parent.replace(/\D/g, "").length !== 10) return setError("Enter a parent or guardian's number.")
    if (minor && parent === phone) return setError("Your parent's number needs to be different from yours.")
    if (!agree) return setError("Check the box to agree to receive texts.")
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
    toast.success(minor ? "We texted your parent to approve" : "Text alerts are on")
  }

  return (
    <div className="pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold tracking-[-0.03em]">Text alerts</h1>
          <p className="mt-1 text-[0.95rem] text-muted-foreground">
            A text only when something big is on the line. Usually 1–3 a month.
          </p>
        </div>
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
          {status === "on" ? "Alerts on" : status === "pending" ? "Waiting for parent approval" : "Alerts off"}
        </Chip>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          {source !== "demo" ? (
            <Panel>
              <AlertSignup token={token} preview={preview} />
            </Panel>
          ) : (
            <Panel>
              <form onSubmit={submit} className="space-y-7">
                <div>
                  <label htmlFor="phone" className="text-sm font-bold">
                    Your mobile number
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
                    title="Urgent decisions"
                    desc="Tax rate hikes, bond elections, school closures, and big votes on your block."
                    checked={urgent}
                    onChange={setUrgent}
                    locked
                  />
                  <Toggle
                    title="Speaker sign-up reminders"
                    desc="The day before sign-up closes on something you saved or drafted a comment for."
                    checked={reminders}
                    onChange={setReminders}
                  />
                </div>

                {minor && (
                  <div className="rounded-3xl bg-denim-soft p-5">
                    <p className="flex items-center gap-2 font-bold text-denim-deep">
                      <UserRoundCheck className="size-4" /> You're under 18, so a parent needs to say yes
                    </p>
                    <p className="mt-1 text-sm text-denim-deep/80">
                      We'll text them once to approve. We won't send them anything else.
                    </p>
                    <input
                      inputMode="tel"
                      value={parent}
                      onChange={(e) => {
                        setParent(formatPhone(e.target.value))
                        setError(null)
                      }}
                      placeholder="Parent or guardian's number"
                      aria-label="Parent or guardian's number"
                      className="mt-4 h-12 w-full rounded-2xl bg-white px-4 font-semibold ring-1 ring-border outline-none focus:ring-2 focus:ring-denim"
                    />
                    {sms?.parentConsent === "pending" && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-sm">
                        <span className="font-semibold">Approval pending for {sms.parentPhone}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="ml-auto"
                          onClick={() => {
                            patch({ sms: { ...sms, parentConsent: "granted" } })
                            toast.success("Parent approved. Alerts are on.")
                          }}
                        >
                          Simulate parent reply “YES”
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
                  I agree to receive automated texts from ShowUp HTX. Message and data rates may apply. Reply STOP
                  to cancel or HELP for help.
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg">
                  {sms ? "Save changes" : minor ? "Send approval request" : "Turn on alerts"}
                </Button>
                {sms && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      patch({ sms: undefined })
                      setAgree(false)
                      toast("Text alerts are off")
                    }}
                  >
                    <BellOff data-icon="inline-start" /> Turn off
                  </Button>
                )}
                {error && <p className="text-sm font-semibold text-brick">{error}</p>}
              </div>
            </form>
          </Panel>
          )}

          <ul className="space-y-1.5 px-1 text-sm text-muted-foreground">
            <li>We keep your phone number and districts, never your street address.</li>
            <li>No texts between 9 PM and 8 AM unless a vote happens that night.</li>
            <li>Reply STOP and we delete your number within 24 hours.</li>
          </ul>
        </div>

        {/* Phone preview */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mx-auto w-full max-w-[360px] rounded-[44px] bg-ink p-3 shadow-[0_30px_60px_-30px_rgb(27_38_59/0.6)]">
            <div className="overflow-hidden rounded-[34px] bg-surface">
              <div className="flex flex-col items-center border-b border-black/5 bg-white/80 pt-3 pb-3">
                <div className="mb-3 h-5 w-24 rounded-full bg-ink" />
                <span className="grid size-10 place-items-center rounded-full bg-brick text-white">
                  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                    <path fill="currentColor" d="M12 2.5l2.6 6.1 6.6.5-5 4.4 1.5 6.5L12 16.6 6.3 20l1.5-6.5-5-4.4 6.6-.5z" />
                  </svg>
                </span>
                <p className="mt-1 text-xs font-bold">ShowUp HTX</p>
              </div>
              <div className="space-y-3 p-4 text-[13px] leading-snug">
                <p className="text-center text-[10px] font-semibold text-muted-foreground">Text message · Today</p>
                {sample && (
                  <Bubble>
                    <b>{urgent ? "URGENT" : "Update"}</b> · {sampleBody?.short}: {sample.title}.{" "}
                    {sample.comment
                      ? `You can speak. Sign-up closes ${fmtDateTime(sample.comment.deadline)}.`
                      : `${fmtDateTime(sample.date)}.`}{" "}
                    <span className="text-denim underline">showup.htx/u/{sample.id.replace(/[^a-z0-9]/g, "").slice(-6)}</span>
                  </Bubble>
                )}
                {reminders && reminder && (
                  <Bubble>
                    Reminder: sign-up to speak on “{reminder.title}” closes tomorrow. Your draft is saved.{" "}
                    <span className="text-denim underline">showup.htx/speak</span>
                  </Bubble>
                )}
                <div className="ml-auto w-fit max-w-[70%] rounded-[18px] rounded-br-md bg-denim px-3.5 py-2 text-white">
                  thanks, signing up now
                </div>
                <p className="text-center text-[10px] text-muted-foreground">Reply STOP to unsubscribe</p>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-[360px] text-center text-xs text-muted-foreground">
            Preview of the texts you'd get, using this week's real items from your districts.
          </p>
        </div>
      </div>
    </div>
  )
}

function Bubble({ children }: { children: React.ReactNode }) {
  return <div className="w-fit max-w-[85%] rounded-[18px] rounded-bl-md bg-white px-3.5 py-2.5 shadow-sm">{children}</div>
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
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="flex-1">
        <p className="flex items-center gap-2 font-bold">
          {title}
          {locked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Check className="size-3" /> Always on
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={locked} aria-label={title} />
    </div>
  )
}
