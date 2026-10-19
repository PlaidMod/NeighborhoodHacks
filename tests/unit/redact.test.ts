import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/adapters/types';
import { isPersonnelSensitive, redactPersonnel } from '@/lib/ingest/redact';

const base: Item = {
  external_id: '1',
  meeting_external_id: 'm',
  body_id: 'hisd_board',
  title: '',
  status: 'upcoming',
  amounts: [],
  attachments: [],
  contains_private_person: false,
  source_url: 'https://example.gov',
};

describe('redactPersonnel (rules; HISD fixtures come in Step 3)', () => {
  it('removes the name and school', () => {
    const out = redactPersonnel({
      ...base,
      title: "Natasha Smith, teacher, Twain Elementary School, Consideration of Independent Hearing Examiner's Recommendation",
    });
    expect(out.title).toBe("An employee, Consideration of Independent Hearing Examiner's Recommendation");
    expect(out.contains_private_person).toBe(true);
  });
  it('redacts description and quote too', () => {
    const name = "Jo Ann O'Neil-Lee";
    const out = redactPersonnel({
      ...base,
      matter_type: 'Hearing',
      title: `${name}, counselor, Bellaire High School, proposed termination`,
      description: `${name}, counselor, discussion`,
      source_quote: `${name}, counselor, Bellaire High School`,
    });
    expect(out.title).toBe('An employee, proposed termination');
    expect(out.description).toBe('An employee, discussion');
    expect(out.source_quote).toBe('An employee');
  });
  it('keeps closed-session items with no name', () => {
    const i = { ...base, section: 'CLOSED SESSION', title: 'Deliberate the duties of the superintendent' };
    expect(redactPersonnel(i)).toEqual(i);
  });
  it('keeps near-misses', () => {
    for (const title of ["Approve the superintendent's employment contract", 'Board member Jane Doe requests a report on staffing']) {
      const i = { ...base, title };
      expect(redactPersonnel(i)).toEqual(i);
    }
  });
  it('does not treat lowercase phrases as names', () => {
    const i = { ...base, section: 'Personnel', title: 'the teacher, grievance follow-up' };
    expect(redactPersonnel(i).contains_private_person).toBe(false);
  });
  it('detects sensitivity by matter type, section or title', () => {
    expect(isPersonnelSensitive({ title: 'x', matter_type: 'Hearings Item' })).toBe(true);
    expect(isPersonnelSensitive({ title: 'x', section: 'Executive Session' })).toBe(true);
    expect(isPersonnelSensitive({ title: 'Level III appeal of a grievance' })).toBe(true);
    expect(isPersonnelSensitive({ title: 'Approve road contract' })).toBe(false);
  });
});
