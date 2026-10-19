import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { normalize, normalizeSpace, parseClock, rotationWindow, toChicagoIso } from '@/lib/ingest/normalize';

describe('normalize', () => {
  it('NFKC, curly quotes, whitespace, trim, lowercase', () => {
    expect(normalize('  “Hello”\r\n\tWorld’s  ')).toBe('"hello" world\'s');
    expect(normalize('ﬁle')).toBe('file');
  });
  it('normalizeSpace keeps case', () => {
    expect(normalizeSpace(' A  B ')).toBe('A B');
  });
});

describe('parseClock', () => {
  it.each([
    ['9:00 AM', [9, 0]],
    ['12:00 PM', [12, 0]],
    ['12:30 am', [0, 30]],
    ['1:30pm', [13, 30]],
    ['6 PM', [18, 0]],
    ['13:30', [13, 30]],
  ] as const)('%s', (t, e) => expect(parseClock(t)).toEqual(e));
  it('rejects junk', () => expect(parseClock('noon-ish')).toBeNull());
});

describe('toChicagoIso across DST (Nov 1, 2026)', () => {
  it('Oct 29 9:00 AM is CDT -05:00', () => {
    expect(toChicagoIso('2026-10-29', '9:00 AM')).toBe('2026-10-29T09:00:00-05:00');
  });
  it('Nov 5 9:00 AM is CST -06:00', () => {
    expect(toChicagoIso('2026-11-05', '9:00 AM')).toBe('2026-11-05T09:00:00-06:00');
  });
  it('accepts Legistar midnight date-time', () => {
    expect(toChicagoIso('2026-11-05T00:00:00', '9:00 AM')).toBe('2026-11-05T09:00:00-06:00');
  });
  it('keeps the time from a local date-time when no clock is given', () => {
    expect(toChicagoIso('2026-10-20T13:30:00')).toBe('2026-10-20T13:30:00-05:00');
  });
});

describe('rotationWindow', () => {
  it('starts at Chicago midnight and spans 30 days', () => {
    const now = DateTime.fromISO('2026-10-19T08:00:00', { zone: 'America/Chicago' });
    const w = rotationWindow(now);
    expect(w.from.toISOString()).toBe('2026-10-19T05:00:00.000Z');
    expect(w.to.getTime()).toBeGreaterThan(Date.parse('2026-11-18T05:59:00Z'));
  });
});
