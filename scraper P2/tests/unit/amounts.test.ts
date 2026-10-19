import { describe, expect, it } from 'vitest';
import { parseAmounts } from '@/lib/ingest/amounts';

// Synthetic Legistar-style strings; the real fixture strings are in `real` below.
const cases: [string, { value: number; text: string; kind?: 'rate' }[]][] = [
  ['Request for approval of an agreement in the amount of $322,895.36 with Acme LLC', [{ value: 322895.36, text: '$322,895.36' }]],
  ['Award of contract to XYZ Construction for $1,685,000 for road improvements', [{ value: 1685000, text: '$1,685,000' }]],
  ['Bond election for $14 million in drainage projects', [{ value: 14e6, text: '$14 million' }]],
  ['Authorize issuance of $14.5 million in certificates of obligation', [{ value: 14.5e6, text: '$14.5 million' }]],
  ['Approve the $2 billion bond program', [{ value: 2e9, text: '$2 billion' }]],
  ['Approve a $14M grant', [{ value: 14e6, text: '$14M' }]],
  ['Adopt a tax rate of $0.3891 per $100 valuation', [{ value: 0.3891, text: '$0.3891 per $100 valuation', kind: 'rate' }]],
  [
    'Proposed rate of $0.38529 per $100 of taxable valuation',
    [{ value: 0.38529, text: '$0.38529 per $100 of taxable valuation', kind: 'rate' }],
  ],
  ['Set the maintenance and operations rate at 0.389100 for tax year 2026', [{ value: 0.3891, text: '0.389100', kind: 'rate' }]],
  [
    'Amendment increasing the amount by $50,000.00 to a total of $250,000.00',
    [
      { value: 50000, text: '$50,000.00' },
      { value: 250000, text: '$250,000.00' },
    ],
  ],
  ['Payment of $500 to the Texas Commission on Environmental Quality', [{ value: 500, text: '$500' }]],
  ['Purchase of 3 vehicles at $45,210.50 each', [{ value: 45210.5, text: '$45,210.50' }]],
  ['Transfer of funds in the amount of $ 12,000 to the Flood Control District', [{ value: 12000, text: '$ 12,000' }]],
  ['Approval of a budget amendment of $1.2 billion', [{ value: 1.2e9, text: '$1.2 billion' }]],
  ['Accept a donation of $750 thousand from the foundation', [{ value: 750000, text: '$750 thousand' }]],
  ['Approval of order number 2026-0412 for Precinct 3', []],
  ['Request for approval of 12 personnel changes', []],
  ['Approve the minutes of the meeting of September 17, 2026', []],
  ['Contract renewal ($98,765.43) for janitorial services', [{ value: 98765.43, text: '$98,765.43' }]],
];

// Real strings copied verbatim from the recorded Legistar fixtures (tests/golden/legistar/).
const real: [string, { value: number; text: string; kind?: 'rate' }[]][] = [
  ['Request for approval to pay commercial paper interest in the amount of $322,895.36.', [{ value: 322895.36, text: '$322,895.36' }]],
  ['Request for approval of additional $1,685,000 commercial paper funding for', [{ value: 1685000, text: '$1,685,000' }]],
  ['to county property and other claims in the total amount of $181,673 and one workers’ compensation', [{ value: 181673, text: '$181,673' }]],
  ['for approval to pay the IRS an arbitrage rebate payment of $22,297.28 on the General Obligation', [{ value: 22297.28, text: '$22,297.28' }]],
  ['the Harris County Courts Expansion project in the amount of $14,000,000 for a total net CP funding of', [{ value: 14e6, text: '$14,000,000' }]],
  ['in an amount not to exceed $20,000 for the period of October 1,', [{ value: 20000, text: '$20,000' }]],
  ['through September 30, 2027, at an approximate total cost of $1,680.00.', [{ value: 1680, text: '$1,680.00' }]],
  ['Backup Power Systems project, for an initial authorization of $8,857,000 for FY 2027', [{ value: 8857000, text: '$8,857,000' }]],
  ['adding 41 calendar days, with a deduction in the amount of $234,969.76, Job No', [{ value: 234969.76, text: '$234,969.76' }]],
  ['for the appraised value of $25,350.00, and that the County Judge', [{ value: 25350, text: '$25,350.00' }]],
  ['with a financial surety in the amount of $4,450.00. Consultant, IDS ENGINEERING', [{ value: 4450, text: '$4,450.00' }]],
  ['Request for approval to accept $54,358.00 back into the general fund', [{ value: 54358, text: '$54,358.00' }]],
  ['Approval Of Vendor Awards For Purchases Which Cost $1,000,000 Or More', [{ value: 1e6, text: '$1,000,000' }]],
  [
    'to hold a public hearing for the proposed 2026 tax rate of $0.05266 per $100 of value for the',
    [{ value: 0.05266, text: '$0.05266 per $100 of value', kind: 'rate' }],
  ],
  [
    'the adoption of a tax rate of 0.05266, which is effectively a 6.28 percent increase in the tax rate; this rate consists of 0.04023 for maintenance and operations and 0.01243 for debt service.',
    [
      { value: 0.05266, text: '0.05266', kind: 'rate' },
      { value: 0.04023, text: '0.04023', kind: 'rate' },
      { value: 0.01243, text: '0.01243', kind: 'rate' },
    ],
  ],
  ['Control District, a political subdivision of the State of Texas, of a 0.1972-acre waterline easement', []],
  ['to accept a real estate donation of a 0.0332-acre unobstructed visibility', []],
];

describe('parseAmounts on real Legistar strings', () => {
  it.each(real)('%s', (text, expected) => {
    expect(parseAmounts(text)).toEqual(expected);
  });
});

describe('parseAmounts', () => {
  it.each(cases)('%s', (text, expected) => {
    const got = parseAmounts(text);
    expect(got).toEqual(expected);
    for (const a of got) expect(text).toContain(a.text);
  });

  it('handles empty input', () => {
    expect(parseAmounts('')).toEqual([]);
  });
});
