"use client"

import type * as React from "react"
import { clearBrowserProfile } from "@/lib/prototype/profile-storage"

/**
 * Signs out and makes this browser forget the reader, so the next person on a shared computer
 * doesn't see their details. Before the form posts, it clears the street address saved in this
 * browser. The /auth/signout route then ends the Google session and deletes the government and
 * role cookies. Use this for every sign-out button.
 */
export function SignOutForm({ children }: { children: React.ReactNode }) {
  return (
    <form action="/auth/signout" method="post" onSubmit={() => clearBrowserProfile()}>
      {children}
    </form>
  )
}
