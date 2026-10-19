import type { LookupErrorCode, LookupResponse } from '@/lib/contracts/lookup'

// State of the address lookup while the visitor moves from home to the stake picker to results.
// Each lookup has a requestId so a slow, older answer can't overwrite a newer one.

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading'; requestId: number }
  | { status: 'done'; data: LookupResponse }
  | { status: 'error'; code: LookupErrorCode }

export type LookupAction =
  | { type: 'start'; requestId: number }
  | { type: 'success'; requestId: number; data: LookupResponse }
  | { type: 'failure'; requestId: number; code: LookupErrorCode }
  | { type: 'reset' }

export const INITIAL_LOOKUP_STATE: LookupState = { status: 'idle' }

export function lookupReducer(state: LookupState, action: LookupAction): LookupState {
  switch (action.type) {
    case 'start':
      return { status: 'loading', requestId: action.requestId }
    case 'reset':
      return INITIAL_LOOKUP_STATE
    case 'success':
      if (state.status !== 'loading' || state.requestId !== action.requestId) return state
      return { status: 'done', data: action.data }
    case 'failure':
      if (state.status !== 'loading' || state.requestId !== action.requestId) return state
      return { status: 'error', code: action.code }
  }
}
