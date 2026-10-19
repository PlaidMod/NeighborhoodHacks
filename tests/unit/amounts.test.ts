import { describe, expect, it } from 'vitest';
import { parseAmounts } from '@/lib/ingest/amounts';

// Legistar-style strings. Real-fixture strings get added in Step 2 once recorded.
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
