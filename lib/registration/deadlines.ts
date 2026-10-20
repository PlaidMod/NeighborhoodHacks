import type { DeadlineRule, RegistrationMethod, RegistrationRecipe, RegistrationWindow } from './types.ts'

export const REGISTRATION_TIME_ZONE = 'America/Chicago'
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: REGISTRATION_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' })
const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
function wallTime(date: Date): number {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type,p.value]))
  return Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second)
}
function wallToInstant(wall: number): Date {
  // Derive both possible zone offsets around a transition, then require a unique match.
  const offsets = new Set([-36,0,36].map(h => {
    const instant = wall + h * 3600000
    return wallTime(new Date(instant)) - instant
  }))
  const matches = [...offsets].map(offset => wall-offset).filter(candidate => wallTime(new Date(candidate)) === wall)
  if (matches.length !== 1) throw new RangeError('Ambiguous or nonexistent Chicago local deadline')
  return new Date(matches[0])
}
function meetingDate(value: string): Date {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) throw new RangeError('Meeting requires an explicit UTC offset')
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid meeting timestamp')
  return date
}
export function resolveDeadline(rule: DeadlineRule, meetingISO: string): string {
  const meeting = meetingDate(meetingISO)
  if (!['meeting_start','previous_weekday'].includes(rule.anchor)) throw new RangeError('Unknown deadline anchor')
  for (const amount of [rule.offset_days,rule.offset_hours,rule.offset_minutes]) {
    if (amount !== undefined && (!Number.isFinite(amount) || !Number.isInteger(amount))) throw new RangeError('Invalid deadline offset')
  }
  const wall = new Date(wallTime(meeting))
  if (rule.anchor === 'previous_weekday') {
    const weekday = weekdays.indexOf(rule.weekday?.toLowerCase() ?? '')
    if (weekday < 0) throw new RangeError('Invalid weekday')
    do { wall.setUTCDate(wall.getUTCDate()-1) } while (wall.getUTCDay() !== weekday)
  }
  const days = rule.offset_days ?? 0
  if (Math.abs(days) > 3660) throw new RangeError('Deadline offset too large')
  let remaining = Math.abs(days)
  while (remaining > 0) {
    wall.setUTCDate(wall.getUTCDate()+Math.sign(days))
    if (!rule.business_days || (![0,6].includes(wall.getUTCDay()) && !rule.holidays?.includes(wall.toISOString().slice(0,10)))) remaining--
  }
  if (rule.time !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time)) throw new RangeError('Invalid deadline clock time')
    const [hour,minute] = rule.time.split(':').map(Number)
    wall.setUTCHours(hour,minute,0,0)
  }
  // Preserve the original instant for pure elapsed offsets, including repeated DST hours.
  const base = rule.anchor === 'meeting_start' && !days && rule.time === undefined ? meeting : wallToInstant(wall.getTime())
  return new Date(base.getTime()+(rule.offset_hours ?? 0)*3600000+(rule.offset_minutes ?? 0)*60000).toISOString()
}
function windowFromRules(recipe: Pick<RegistrationRecipe,'opensRule' | 'closesRule' | 'meetingWeekday'>, meetingISO: string, now: Date): RegistrationWindow {
  try {
    const meeting = meetingDate(meetingISO)
    if (recipe.meetingWeekday !== undefined && new Date(wallTime(meeting)).getUTCDay() !== recipe.meetingWeekday) return {state:'unknown'}
    if (!Number.isFinite(now.getTime())) return {state:'unknown'}
    const opensAt = recipe.opensRule ? resolveDeadline(recipe.opensRule,meetingISO) : undefined
    const closesAt = recipe.closesRule ? resolveDeadline(recipe.closesRule,meetingISO) : undefined
    const bounds = { ...(opensAt ? {opensAt} : {}), ...(closesAt ? {closesAt} : {}) }
    if (opensAt && closesAt && opensAt >= closesAt) return {state:'unknown'}
    if (closesAt && now.getTime() >= Date.parse(closesAt)) return {state:'closed',...bounds}
    if (opensAt && now.getTime() < Date.parse(opensAt)) return {state:'before_open',...bounds}
    return {state:opensAt && closesAt ? 'open' : 'unknown',...bounds}
  } catch { return {state:'unknown'} }
}
export function getWindow(recipe: RegistrationRecipe, meetingISO: string, now: Date): RegistrationWindow {
  return windowFromRules(recipe,meetingISO,now)
}
export function getMethodWindow(method: RegistrationMethod, meetingISO: string, now: Date): RegistrationWindow {
  return windowFromRules(method,meetingISO,now)
}
