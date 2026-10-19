import type { Amount } from '@/lib/adapters/types';

// §5.6: dollar amounts and tax rates, parsed in code (never by the LLM).
// Each Amount.text is the exact substring of the input it came from.

const SCALE: Record<string, number> = {
  thousand: 1e3,
  k: 1e3,
  million: 1e6,
  m: 1e6,
  mm: 1e6,
  billion: 1e9,
  b: 1e9,
  bn: 1e9,
};

// Order matters: rates first, so "$0.3891 per $100" is one rate and not two dollar amounts.
const RATE_PER_100 = /\$\s?(\d+\.\d+)\s+per\s+\$\s?100(?:\s+(?:of\s+)?(?:assessed\s+|taxable\s+)?(?:valuation|value))?/gi;
// Bare tax rate like "0.389100": leading 0, 4-6 decimals, not part of a larger number or a $ amount,
// and not a measurement such as "0.1972-acre" or "0.0332 acres".
const RATE_BARE = /(?<![\d.$,])0\.\d{4,6}(?![\d.\-A-Za-z])(?!\s*(?:acres?|miles?|feet|foot|ft|sq)\b)/g;
const DOLLAR =
  /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:\s?(thousand|million|billion|mm|bn|[kmb])\b)?/gi;

type Span = { start: number; end: number };

function overlaps(spans: Span[], s: Span): boolean {
  return spans.some((x) => s.start < x.end && x.start < s.end);
}

export function parseAmounts(text: string): Amount[] {
  if (!text) return [];
  const found: (Amount & Span)[] = [];
  const taken: Span[] = [];

  for (const m of text.matchAll(RATE_PER_100)) {
    const span = { start: m.index, end: m.index + m[0].length };
    found.push({ value: Number(m[1]), text: m[0], kind: 'rate', ...span });
    taken.push(span);
  }
  for (const m of text.matchAll(RATE_BARE)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (overlaps(taken, span)) continue;
    found.push({ value: Number(m[0]), text: m[0], kind: 'rate', ...span });
    taken.push(span);
  }
  for (const m of text.matchAll(DOLLAR)) {
    const span = { start: m.index, end: m.index + m[0].length };
    if (overlaps(taken, span)) continue;
    const base = Number(m[1]!.replace(/,/g, '') + (m[2] ?? ''));
    const scale = m[3] ? (SCALE[m[3].toLowerCase()] ?? 1) : 1;
    const value = Math.round(base * scale * 100) / 100;
    if (!Number.isFinite(value)) continue;
    found.push({ value, text: m[0], ...span });
    taken.push(span);
  }

  return found
    .sort((a, b) => a.start - b.start)
    .map(({ value, text: t, kind }) => (kind ? { value, text: t, kind } : { value, text: t }));
}
