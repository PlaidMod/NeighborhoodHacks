"use client"

import * as React from "react"
import { bodiesFor } from "./data/bodies"
import { updatesFor } from "./data/updates"
import { ZIPS, findJurisdiction } from "./data/zips"
import type { Body, Jurisdiction, Profile, Update } from "./data/types"

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

interface Ctx {
  ready: boolean
  isDemo: boolean
  profile: Profile
  jurisdiction: Jurisdiction
  bodies: Body[]
  updates: Update[]
  save: (p: Profile) => void
  patch: (p: Partial<Profile>) => void
  reset: () => void
}

const ProfileContext = React.createContext<Ctx | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
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

  const profile = stored ?? DEMO_PROFILE
  const jurisdiction =
    ZIPS[profile.zip] ?? findJurisdiction(profile.address) ?? ZIPS[DEMO_PROFILE.zip]

  const value = React.useMemo<Ctx>(
    () => ({
      ready,
      isDemo: !stored || !!stored.demo,
      profile,
      jurisdiction,
      bodies: bodiesFor(jurisdiction),
      // Dates are relative to "now", so only build updates on the client
      updates: ready ? updatesFor(jurisdiction) : [],
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
    [ready, stored, jurisdiction.zip],
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
