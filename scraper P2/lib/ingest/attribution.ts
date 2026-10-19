import { normalize } from './normalize';

// D10: assign body_id from section headers using a per-source map
// (header text, case-insensitive and trimmed -> body_id).

export function attributeBody(
  section: string | undefined,
  defaultBodyId: string,
  sectionBodyMap: Record<string, string> | undefined,
): string {
  if (!section || !sectionBodyMap) return defaultBodyId;
  const key = normalize(section);
  for (const [header, bodyId] of Object.entries(sectionBodyMap)) {
    if (normalize(header) === key) return bodyId;
  }
  return defaultBodyId;
}
