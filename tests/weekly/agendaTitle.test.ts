import { describe, expect, it } from 'vitest'
import { agendaHeadline } from '@/lib/weekly/agendaTitle'

// Real titles from Houston City Council agendas (Oct 2026).
describe('agendaHeadline', () => {
  it('splits off the document type and stops at the district list', () => {
    const r = agendaHeadline(
      'ORDINANCE approving and authorizing a First Amendment to a contract with COBB, FENDLEY & ASSOCIATES, INC., to provide Professional Engineering Services for Bissonnet Corridor Safe Streets Project - DISTRICTS C - PANZARELLA; F - THOMAS and J - POLLARD',
    )
    expect(r.kind).toBe('Ordinance')
    expect(r.headline).toBe('Approving and authorizing a First Amendment to a contract with Cobb, Fendley…')
    expect(r.headline).not.toContain('DISTRICTS')
    expect(r.headline.endsWith('…')).toBe(true)
    expect(r.headline.length).toBeLessThanOrEqual(91)
    expect(r.trimmed).toBe(true)
  })

  it('keeps official numbers and short acronyms exactly', () => {
    const r = agendaHeadline('ORDINANCE appropriating $12,888,838.81 out of Dedicated Drainage and Street Renewal Capital Fund - Ad Valorem Tax')
    expect(r.headline).toContain('$12,888,838.81')
    const t = agendaHeadline('RESOLUTION approving the TIRZ budget for HISD')
    expect(t).toEqual({ kind: 'Resolution', headline: 'Approving the TIRZ budget for HISD', trimmed: true })
  })

  it('puts shouted names in normal case', () => {
    const r = agendaHeadline('ORDINANCE relating to Fiscal Affairs of LELAND WOODS REDEVELOPMENT AUTHORITY ON BEHALF OF REINVESTMENT ZONE NUMBER TWENTY-TWO')
    expect(r.headline).toBe('Relating to Fiscal Affairs of Leland Woods Redevelopment Authority on Behalf…')
  })

  it('leaves a short plain title alone', () => {
    expect(agendaHeadline('Approve the 2027-28 school calendar')).toEqual({ kind: null, headline: 'Approve the 2027-28 school calendar', trimmed: false })
  })

  it('never cuts so early that nothing is left', () => {
    const r = agendaHeadline('MOTION to adopt; see attached list of 40 items')
    expect(r.headline).toBe('To adopt; see attached list of 40 items')
  })
})
