"use client"

import * as React from "react"
import { bodiesFor } from "./bodies"
import { updatesFor } from "./updates"
import { ZIPS, findJurisdiction } from "./zips"
import type { LiveData } from "./live"
import type { Body, Jurisdiction, Profile, Update } from "./types"

const KEY = "showup.profile.v1"

export const DEMO_PROFILE: Profile = {
  name: "Maya",
  address: "3100 Cleburne St, Houston, TX 77004",
  zip: "77004",
  personas: ["student", "renter"],
  age: 17,
  birthdate: "2008-12-20",
  demo: true,
}

/** What a real reader sees before they fill in onboarding: no name, the stakes they picked. */
const LIVE_PROFILE: Profile = { name: "", address: "", zip: "", personas: [] }

interface Ctx {
  ready: boolean
  /** The demo neighborhood (Maya in Third Ward): no address has been looked up. */
  isDemo: boolean
  /** Where bodies and updates come from: the demo, P3's sample items, or the database. */
  source: "demo" | LiveData["mode"]
  profile: Profile
  jurisdiction: Jurisdiction
  bodies: Body[]
  updates: Update[]
  save: (p: Profile) => void
  patch: (p: Partial<Profile>) => void
  reset: () => void
}

const ProfileContext = React.createContext<Ctx | null>(null)

export function ProfileProvider({ children, live = null }: { children: React.ReactNode; live?: LiveData | null }) {
  const [stored, setStored] = React.useState<Profile | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      // Hydrate from browser storage once after mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setStored(JSON.parse(raw))
    } catch {}
    setReady(true)
  }, [])

  const save = React.useCallback((p: Profile) => {
    setStored(p)
    try {
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {}
  }, [])

  const base = stored && !stored.demo ? stored : live ? { ...LIVE_PROFILE, personas: live.personas } : (stored ?? DEMO_PROFILE)
  const profile = base
  const jurisdiction = live
    ? // No ZIP-based jurisdiction for a real address: the bodies come from the lookup instead.
      // The lookup only accepts Harris County addresses, so that's the one place name we know.
      { ...ZIPS[DEMO_PROFILE.zip]!, zip: "", area: "Harris County" }
    : (ZIPS[profile.zip] ?? findJurisdiction(profile.address) ?? ZIPS[DEMO_PROFILE.zip]!)

  const value = React.useMemo<Ctx>(
    () => ({
      ready,
      isDemo: !live && (!stored || !!stored.demo),
      source: live ? live.mode : "demo",
      profile,
      jurisdiction,
      bodies: live ? live.bodies : bodiesFor(jurisdiction),
      // Demo dates are relative to "now", so only build them on the client
      updates: live ? live.updates : ready ? updatesFor(jurisdiction) : [],
      save,
      patch: (p) => save({ ...profile, ...p }),
      reset: () => {
        setStored(null)
        try {
          localStorage.removeItem(KEY)
        } catch {}
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, stored, jurisdiction.zip, live],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = React.useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider")
  return ctx
}

export function useMarkDone() {
  const { profile, patch } = useProfile()
  return React.useCallback(
    (step: NonNullable<Profile["done"]>[number]) => {
      if (profile.done?.includes(step)) return
      patch({ done: [...(profile.done ?? []), step] })
    },
    [profile, patch],
  )
}

/** A stable "now" for the life of the component, safe to read during render. */
export function useNow() {
  const [now] = React.useState(() => Date.now())
  return now
}
