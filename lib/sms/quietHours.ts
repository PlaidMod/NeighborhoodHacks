import { DateTime } from "luxon"

const ZONE = "America/Chicago"
export const SEND_START_HOUR = 8 // 8:00 a.m. Central
export const SEND_END_HOUR = 20 // 8:00 p.m. Central

/** True between 8:00 a.m. and 8:00 p.m. Central (plan §8, §11). */
export function inSendingHours(at: Date) {
  const h = DateTime.fromJSDate(at).setZone(ZONE).hour
  return h >= SEND_START_HOUR && h < SEND_END_HOUR
}

/** The earliest time at or after `at` when a text may go out. */
export function nextSendTime(at: Date): Date {
  if (inSendingHours(at)) return at
  const local = DateTime.fromJSDate(at).setZone(ZONE)
  const day = local.hour >= SEND_END_HOUR ? local.plus({ days: 1 }) : local
  return day.set({ hour: SEND_START_HOUR, minute: 0, second: 0, millisecond: 0 }).toJSDate()
}
