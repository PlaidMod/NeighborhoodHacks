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

// Embedded "Name Name, [former] role [of School]" anywhere in the text (found in real data:
// HISD 1306 closed session "including termination of Travis Johnson, former principal of
// Kashmere High School,"). Needs 2-4 capitalized tokens so a single word can't trigger it.
const SCHOOL_WORDS = '(?:School|Elementary|Middle|High|Academy|Campus|College|Center|ES|MS|HS)';
const EMBEDDED_NAME = new RegExp(
  `\\b(?:${NAME_TOKEN}\\s+){1,3}${NAME_TOKEN}\\s*,\\s*(?:(?:former|current|interim|assistant)\\s+)?(?:${ROLE_ALT})s?\\b` +
    `(?:\\s+(?:of|at)\\s+[^,]*?\\b${SCHOOL_WORDS}\\b[^,]*|\\s*,\\s*[^,]*?\\b${SCHOOL_WORDS}\\b[^,]*(?=,|$))?`,
  'g',
);

/**
 * Redact a leading "Name, role[, School]" segment, then any embedded
 * "Name Name, [former] role [of School]" segment. Returns the new text and whether a name was removed.
 */
export function redactText(text: string): { text: string; redacted: boolean } {
  let out = text;
  let redacted = false;
  const m = out.match(LEADING_NAME);
  if (m && LEADING_NAME_CS.test(out)) {
    let rest = out.slice(m[0].length);
    const school = rest.match(SCHOOL_SEGMENT);
    if (school) rest = rest.slice(school[0].length);
    // Drop the role too: "An employee" already says what is needed.
    out = `An employee${rest}`;
    redacted = true;
  }
  const embedded = out.replace(EMBEDDED_NAME, (seg, offset: number) => {
    if (offset === 0 && seg.startsWith('An employee')) return seg;
    redacted = true;
    return 'an employee';
  });
  return { text: embedded, redacted };
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

// Leak check (§8 Step 3): two or more consecutive capitalized, non-stopword tokens
// before the first comma means a name may have survived redaction.
const LEAK_STOPWORDS = new Set(['a', 'an', 'the', 'of', 'and', 'for', 'to', 'in', 'on', 'at', 'by', 'with']);

export function leakingName(text: string): boolean {
  const head = text.split(',')[0] ?? '';
  let run = 0;
  for (const tok of head.split(/\s+/).filter(Boolean)) {
    const capital = /^[A-Z][A-Za-z'’.-]*$/.test(tok) && !LEAK_STOPWORDS.has(tok.toLowerCase());
    run = capital ? run + 1 : 0;
    if (run >= 2) return true;
  }
  return false;
}
