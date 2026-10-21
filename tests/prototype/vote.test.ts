import { describe, expect, it } from 'vitest'
import type { Body, Update } from '@/lib/prototype/types'
import { localBallotUpdates } from '@/lib/prototype/vote'

const body = (id: string): Body => ({
  id,
  name: id,
  short: id,
  kind: 'mud',
  tagline: '',
  controls: [],
  selection: '',
  seats: '',
  meets: '',
  location: '',
  commentRules: '',
  website: '',
})

const update = (id: string, bodyId: string, type: Update['type']): Update => ({
  id,
  bodyId,
  type,
  tier: 'timeline',
  topic: 'elections',
  date: '2026-11-03',
  posted: '2026-10-20',
  title: id,
  summary: '',
  why: { default: '' },
  audiences: [],
  source: 'https://example.org',
})

describe('localBallotUpdates', () => {
  it('matches canonical body IDs such as hcmud_489 without relying on slug spelling', () => {
    const hcmud = update('bond', 'hcmud_489', 'election')
    const unrelated = update('other', 'another_mud', 'election')
    const agenda = update('agenda', 'hcmud_489', 'agenda')

    expect(localBallotUpdates([hcmud, unrelated, agenda], [body('hcmud_489')])).toEqual([hcmud])
  })
})
