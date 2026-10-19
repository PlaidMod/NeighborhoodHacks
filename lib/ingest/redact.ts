import type { Item } from '@/lib/adapters/types';

// §5.4 (D9): never store or show a private person's name on personnel items.
// Runs on every item from every adapter, after the quote check and before hashing.

const MATTER_RE = /hearing|grievance|personnel|termination|nonrenewal|appeal/i;
const SECTION_RE = /closed session|executive session|hearing items|personnel/i;
const TITLE_RE = /hearing examiner|proposed termination|nonrenewal|grievance|level (iii|3) appeal/i;

const ROLES = ['teacher', 'employee', 'principal', 'aide', 'counselor', 'coach', 'nurse', 'librarian', 'student', 'parent'];
const ROLE_ALT = ROLES.join('|');

// Up to 4 capitalized tokens (hyphens/apostrophes allowed, optional middle initial "J."),
// then a comma and a role word.
const NAME_TOKEN = "[A-Z][A-Za-z'’-]*\\.?";
const LEADING_NAME = new RegExp(`^\\s*(?:${NAME_TOKEN}\\s+){0,3}${NAME_TOKEN}\\s*,\\s*(?:${ROLE_ALT})s?\\b`, 'i');
// Case-sensitive check on the name part, so "the teacher, ..." isn't treated as a name.
const LEADING_NAME_CS = new RegExp(`^\\s*(?:${NAME_TOKEN}\\s+){0,3}${NAME_TOKEN}\\s*,`);

// A school / campus segment right after the role: ", Twain Elementary School,"
const SCHOOL_SEGMENT =
  /^\s*,\s*[^,]*?\b(?:School|Elementary|Middle|High|Academy|Campus|College|Center|ES|MS|HS)\b[^,]*(?=,|$)/;

export function isPersonnelSensitive(item: Pick<Item, 'matter_type' | 'section' | 'title'>): boolean {
  return (
    (item.matter_type !== undefined && MATTER_RE.test(item.matter_type)) ||
    (item.section !== undefined && SECTION_RE.test(item.section)) ||
    TITLE_RE.test(item.title)
  );
}

/** Redact a leading "Name, role[, School]" segment. Returns the new text and whether a name was removed. */
export function redactText(text: string): { text: string; redacted: boolean } {
  const m = text.match(LEADING_NAME);
  if (!m || !LEADING_NAME_CS.test(text)) return { text, redacted: false };
  let rest = text.slice(m[0].length);
  const school = rest.match(SCHOOL_SEGMENT);
  if (school) rest = rest.slice(school[0].length);
  // Drop the role too: "An employee" already says what is needed.
  return { text: `An employee${rest}`, redacted: true };
}

export function redactPersonnel(item: Item): Item {
  if (!isPersonnelSensitive(item)) return item;
  const t = redactText(item.title);
  const d = item.description !== undefined ? redactText(item.description) : undefined;
  const q = item.source_quote !== undefined ? redactText(item.source_quote) : undefined;
  const any = t.redacted || !!d?.redacted || !!q?.redacted;
  if (!any) return item;
  return {
    ...item,
    title: t.text,
    ...(d ? { description: d.text } : {}),
    ...(q ? { source_quote: q.text } : {}),
    contains_private_person: true,
  };
}
