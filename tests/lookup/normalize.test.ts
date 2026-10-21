import { describe, expect, it } from 'vitest'
import { normalizeHcadAddress, parcelAddressCandidates } from '@/lib/lookup/normalize'

describe('normalizeHcadAddress', () => {
  it('canonicalizes suffixes and drops city/state/ZIP fields', () => {
    expect(normalizeHcadAddress('3100 Cleburne Street, Houston, TX 77004')).toBe('3100 CLEBURNE ST')
    expect(normalizeHcadAddress('16915 Apple River Drive, Cypress, TX 77433')).toBe('16915 APPLE RIVER DR')
  })

  it('ignores unit designators for parcel-level matching', () => {
    expect(normalizeHcadAddress('12 Main Road Apt 4B')).toBe('12 MAIN RD')
    expect(normalizeHcadAddress('12 Main Rd #4B')).toBe('12 MAIN RD')
  })
})

describe('parcelAddressCandidates', () => {
  it('never mixes unrelated suggestions with a Census-resolved address', () => {
    expect(parcelAddressCandidates(
      { censusMatchedAddress: '3100 CLEBURNE ST, HOUSTON, TX 77004', censusQueryAddress: '3100 Cleburne Street, Houston, TX 77004' },
      ['3100 Cleburne Street, Houston, TX 77004', '3100 Almeda Road, Houston, TX 77004'],
    )).toEqual(['3100 CLEBURNE ST, HOUSTON, TX 77004', '3100 Cleburne Street, Houston, TX 77004'])
  })
  it('uses candidate suggestions only when Census found no match', () => {
    expect(parcelAddressCandidates(null, ['one', 'two'])).toEqual(['one', 'two'])
  })
})
