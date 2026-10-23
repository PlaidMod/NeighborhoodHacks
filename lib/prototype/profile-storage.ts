"use client"

import type { Profile } from "./types"

export const PROFILE_STORAGE_KEY = "showup.profile.v1"

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false
  const profile = value as Partial<Profile>
  return (
    typeof profile.name === "string" &&
    typeof profile.address === "string" &&
    typeof profile.zip === "string" &&
    Array.isArray(profile.personas)
  )
}

export function readBrowserProfile(): Profile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    return isProfile(value) ? value : null
  } catch {
    return null
  }
}

export function writeBrowserProfile(profile: Profile): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}

/** This reader saved a real street address here. The sample profile (Maya) doesn't count. */
export function hasSavedAddress(profile: Profile): boolean {
  return !profile.demo && profile.address.trim() !== ""
}

/** Keep the full street address only in this browser's existing profile record. */
export function rememberBrowserAddress(address: string): boolean {
  const old = readBrowserProfile()
  const base: Profile = old && !old.demo
    ? old
    : { name: "", address: "", zip: "", personas: [] }
  const zip = address.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? ""
  return writeBrowserProfile({ ...base, address, zip, demo: false })
}

export function clearBrowserProfile(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY)
  } catch {}
}
