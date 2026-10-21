import { describe, expect, it } from 'vitest'
import { displayHcadName, hcadJurisdictionName, typeFromHcadName, uncoveredFromHcadCode } from '@/lib/lookup/uncovered'

describe('HCAD jurisdiction names', () => {
  it("reads official names from HCAD's list, including the countywide codes every parcel carries", () => {
    expect(hcadJurisdictionName('043')).toBe('HARRIS COUNTY HOSPITAL DISTRICT')
    expect(hcadJurisdictionName('044')).toBe('HARRIS COUNTY DEPARTMENT OF EDUCATION')
    expect(hcadJurisdictionName('000')).toBeNull()
  })

  it('makes readable names without changing what they say', () => {
    expect(displayHcadName('HARRIS COUNTY HOSPITAL DISTRICT')).toBe('Harris County Hospital District')
    expect(displayHcadName('KATY ISD')).toBe('Katy ISD')
    expect(displayHcadName('HOUSTON, CITY OF')).toBe('City of Houston')
    expect(displayHcadName('HC EMERG SRV DIST 009')).toBe('Harris County Emergency Services District 9')
    expect(displayHcadName('HC MUD 489')).toBe('Harris County MUD 489')
    expect(displayHcadName('HC WCID 133')).toBe('Harris County WCID 133')
    expect(displayHcadName('HOUSTON DNTWN MGMT DIST')).toBe('Houston Downtown Management District')
    expect(displayHcadName('GREATER SE MGMT DIST')).toBe('Greater SE Management District')
    expect(displayHcadName('HC ID 014')).toBe('Harris County ID 14')
    expect(displayHcadName('OST ALMEDA 7 (NON-TAXING)')).toBe('OST Almeda 7 (non-taxing)')
  })

  it('types each kind of district for the "Who governs you?" quiz', () => {
    expect(typeFromHcadName('KATY ISD')).toBe('school_board')
    expect(typeFromHcadName('SAN JACINTO JR COLLEGE DISTRICT')).toBe('college_board')
    expect(typeFromHcadName('PASADENA, CITY OF')).toBe('city_council')
    expect(typeFromHcadName('HC MUD 489')).toBe('mud')
    expect(typeFromHcadName('HC WCID 133')).toBe('mud')
    expect(typeFromHcadName('HC EMERG SRV DIST 009')).toBe('esd')
    expect(typeFromHcadName('HARRIS COUNTY FLOOD CONTROL DISTRICT')).toBe('flood_control')
    expect(typeFromHcadName('HARRIS COUNTY HOSPITAL DISTRICT')).toBe('other')
    expect(typeFromHcadName('HARRIS COUNTY DEPARTMENT OF EDUCATION')).toBe('other')
  })

  it('builds an "uncovered" entry from a code, and none when HCAD has no official name for it', () => {
    expect(uncoveredFromHcadCode('633')).toEqual({ key: 'hcad:633', name: 'Harris County Emergency Services District 9', type: 'esd', source_kind: 'hcad' })
    expect(uncoveredFromHcadCode('000')).toBeNull()
  })
})
