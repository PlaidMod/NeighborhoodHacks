import { describe, expect, it } from 'vitest'
import type { LookupResponse } from '@/lib/contracts/lookup'
import { INITIAL_LOOKUP_STATE, lookupReducer } from '@/lib/flow/lookupState'

const DATA: LookupResponse = { bodies_token: 't', match: 'hcad', bodies: [], uncovered: [], ballot: [], not_government: [], regional: [], hoa: null }

describe('lookupReducer', () => {
  it('idle → loading → done', () => {
    expect(INITIAL_LOOKUP_STATE).toEqual({ status: 'idle' })
    const loading = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 1 })
    expect(loading).toEqual({ status: 'loading', requestId: 1 })
    expect(lookupReducer(loading, { type: 'success', requestId: 1, data: DATA })).toEqual({ status: 'done', data: DATA })
  })

  it('a stale success from an older requestId is ignored', () => {
    let state = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 1 })
    state = lookupReducer(state, { type: 'start', requestId: 2 })
    state = lookupReducer(state, { type: 'success', requestId: 1, data: DATA })
    expect(state).toEqual({ status: 'loading', requestId: 2 })
  })

  it('a stale failure is ignored too', () => {
    let state = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 1 })
    state = lookupReducer(state, { type: 'start', requestId: 2 })
    state = lookupReducer(state, { type: 'failure', requestId: 1, code: 'server_error' })
    expect(state).toEqual({ status: 'loading', requestId: 2 })
  })

  it('failure sets the code', () => {
    const loading = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 3 })
    expect(lookupReducer(loading, { type: 'failure', requestId: 3, code: 'not_found' })).toEqual({
      status: 'error',
      code: 'not_found',
    })
  })

  it('reset returns to idle', () => {
    const loading = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 4 })
    expect(lookupReducer(loading, { type: 'reset' })).toEqual({ status: 'idle' })
  })

  it('a result after reset is ignored', () => {
    let state = lookupReducer(INITIAL_LOOKUP_STATE, { type: 'start', requestId: 5 })
    state = lookupReducer(state, { type: 'reset' })
    expect(lookupReducer(state, { type: 'success', requestId: 5, data: DATA })).toEqual({ status: 'idle' })
  })
})
