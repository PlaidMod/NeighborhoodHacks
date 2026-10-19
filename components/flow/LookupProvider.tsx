'use client'

import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react'
import type { LookupErrorCode, LookupRequest, LookupResponse } from '@/lib/contracts/lookup'
import { INITIAL_LOOKUP_STATE, lookupReducer, type LookupState } from '@/lib/flow/lookupState'

// Keeps the address lookup running while the visitor moves from home to the stake picker
// to results. The address lives only in this request: never in storage, a cookie or the URL.

type LookupContextValue = {
  state: LookupState
  start: (address: string) => void
  reset: () => void
}

const LookupContext = createContext<LookupContextValue | null>(null)

const CODES: readonly LookupErrorCode[] = ['invalid_address', 'not_found', 'outside_harris', 'rate_limited', 'server_error']

function codeFromStatus(status: number): LookupErrorCode {
  if (status === 400) return 'invalid_address'
  if (status === 404) return 'not_found'
  if (status === 422) return 'outside_harris'
  if (status === 429) return 'rate_limited'
  return 'server_error'
}

function isLookupResponse(body: unknown): body is LookupResponse {
  return typeof body === 'object' && body !== null && typeof (body as LookupResponse).bodies_token === 'string'
}

export function LookupProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(lookupReducer, INITIAL_LOOKUP_STATE)
  const lastId = useRef(0)

  const start = useCallback((address: string) => {
    const requestId = ++lastId.current
    dispatch({ type: 'start', requestId })
    const request: LookupRequest = { address }
    fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
      .then(async (res) => {
        const body: unknown = await res.json().catch(() => null)
        if (res.ok && isLookupResponse(body)) {
          dispatch({ type: 'success', requestId, data: body })
          return
        }
        const code = (body as { error?: { code?: unknown } } | null)?.error?.code
        dispatch({
          type: 'failure',
          requestId,
          code: CODES.includes(code as LookupErrorCode) ? (code as LookupErrorCode) : codeFromStatus(res.status),
        })
      })
      .catch(() => dispatch({ type: 'failure', requestId, code: 'server_error' }))
  }, [])

  const reset = useCallback(() => {
    lastId.current++
    dispatch({ type: 'reset' })
  }, [])

  const value = useMemo(() => ({ state, start, reset }), [state, start, reset])
  return <LookupContext.Provider value={value}>{children}</LookupContext.Provider>
}

export function useLookup(): LookupContextValue {
  const value = useContext(LookupContext)
  if (!value) throw new Error('useLookup must be used inside LookupProvider')
  return value
}
