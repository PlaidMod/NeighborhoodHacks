import { DateTime } from 'luxon';

export const ZONE = 'America/Chicago';

/** §5.5 normalize(): NFKC, curly quotes to straight, collapse whitespace, trim, lowercase. */
export function normalize(text: string): string {
  return normalizeSpace(text).toLowerCase();
}

/** Same as normalize() but keeps case. Useful for display text and quote checks. */
export function normalizeSpace(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse a local America/Chicago date (yyyy-MM-dd or ISO date-time without offset,
 * e.g. Legistar "2026-11-05T00:00:00") plus an optional clock time ("9:00 AM", "13:30")
 * and return ISO 8601 with the correct Chicago offset for that date (DST-aware).
 */
export function toChicagoIso(date: string, time?: string): string {
  const d = DateTime.fromISO(date.slice(0, 10), { zone: ZONE });
  if (!d.isValid) throw new Error(`invalid date: ${date}`);
  let hour = 0;
  let minute = 0;
  if (time && time.trim()) {
    const parsed = parseClock(time);
    if (!parsed) throw new Error(`invalid time: ${time}`);
    [hour, minute] = parsed;
  } else if (date.length > 10) {
    const dt = DateTime.fromISO(date, { zone: ZONE });
    if (dt.isValid) {
      hour = dt.hour;
      minute = dt.minute;
    }
  }
  return d.set({ hour, minute, second: 0, millisecond: 0 }).toISO({ suppressMilliseconds: true })!;
}

/** "9:00 AM" | "9 AM" | "13:30" | "1:30pm" -> [h, m] in 24h, or null. */
export function parseClock(time: string): [number, number] | null {
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m?\.?$/i);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3]!.toLowerCase() === 'p') h += 12;
    const min = Number(m[2] ?? 0);
    return min < 60 ? [h, min] : null;
  }
  const m24 = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    return h < 24 && min < 60 ? [h, min] : null;
  }
  return null;
}

/** Current time in America/Chicago as a luxon DateTime. */
export function nowChicago(): DateTime {
  return DateTime.now().setZone(ZONE);
}

/** Window helpers (§5.1, D21), all computed in America/Chicago. */
export function rotationWindow(now: DateTime = nowChicago()): { from: Date; to: Date } {
  const start = now.setZone(ZONE).startOf('day');
  return { from: start.toJSDate(), to: start.plus({ days: 30 }).endOf('day').toJSDate() };
}

export function nearTermWindow(now: DateTime = nowChicago()): { from: Date; to: Date } {
  const n = now.setZone(ZONE);
  return { from: n.toJSDate(), to: n.plus({ hours: 72 }).toJSDate() };
}

export function resultsWindow(maxDays = 45, now: DateTime = nowChicago()): { from: Date; to: Date } {
  const n = now.setZone(ZONE);
  return { from: n.startOf('day').minus({ days: maxDays }).toJSDate(), to: n.toJSDate() };
}
