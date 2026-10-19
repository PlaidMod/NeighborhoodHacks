import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/adapters/types';
import { isPersonnelSensitive, leakingName, redactPersonnel, redactText } from '@/lib/ingest/redact';
import { FIXTURE_NAMES, loadFixture, mapFixture } from '../golden/legistar/fixtures';

// §8 Step 3: redaction against the recorded Legistar fixtures.

/** Names and schools from the raw HISD 1332 hearing rows ("Name, role, School, ..."). */
function rawHearingParts() {
  return loadFixture('houstonisd-1332')
    .rows.filter((r) => r.EventItemMatterType?.trim() === 'Hearings Item')
    .map((r) => {
      const [name, role, school] = (r.EventItemTitle ?? '').split(',').map((s) => s.trim());
      return { id: String(r.EventItemId), name: name!, role: role!, school: school! };
    });
}

const outputText = (i: Item) => [i.title, i.description ?? '', i.source_quote ?? ''].join(' | ');

describe('HISD 1332 hearing items', () => {
  const parts = rawHearingParts();
  const { items } = mapFixture('houstonisd-1332');

  it('has the 5 hearing items from the live agenda', () => {
    expect(parts).toHaveLength(5);
    for (const p of parts) {
      expect(p.role).toBe('teacher');
      expect(p.school).toMatch(/School$/);
    }
  });

  it('all 5 come out with no personal name and no school name', () => {
    for (const p of parts) {
      const item = items.find((i) => i.external_id === p.id)!;
      expect(item.contains_private_person).toBe(true);
      expect(item.title.startsWith('An employee, ')).toBe(true);
      for (const all of items) {
        expect(outputText(all)).not.toContain(p.name);
        expect(outputText(all)).not.toContain(p.school);
        for (const token of p.name.split(/\s+/)) expect(outputText(all)).not.toContain(token);
      }
    }
  });

  it('keeps closed-session items with no name unchanged', () => {
    const closed = items.filter((i) => /CLOSED SESSION/.test(i.section ?? ''));
    expect(closed.length).toBeGreaterThan(0);
    for (const i of closed) expect(i.contains_private_person).toBe(false);
    expect(closed.some((i) => i.title.startsWith('Deliberate the duties of the superintendent'))).toBe(true);
  });
});

describe('HISD 1306 closed session', () => {
  it('redacts an embedded "Name, former principal of School" segment', () => {
    const raw = loadFixture('houstonisd-1306').rows.find((r) => /termination of [A-Z]/.test(r.EventItemTitle ?? ''))!;
    const [, name, school] = raw.EventItemTitle!.match(/termination of ([^,]+), former principal of ([^,]+),/)!;
    const item = mapFixture('houstonisd-1306').items.find((i) => i.external_id === String(raw.EventItemId))!;
    expect(item.contains_private_person).toBe(true);
    expect(item.title).toContain('including termination of an employee, terminations/suspensions');
    expect(item.title).not.toContain(name!);
    expect(item.title).not.toContain(school!);
  });
});

describe('redaction leak check over every fixture', () => {
  it('no item with contains_private_person has 2+ consecutive capitalized non-stopword tokens before the first comma', () => {
    let checked = 0;
    for (const name of FIXTURE_NAMES) {
      for (const i of mapFixture(name).items.filter((x) => x.contains_private_person)) {
        checked++;
        expect(leakingName(i.title), `${name} ${i.external_id}: ${i.title.slice(0, 60)}`).toBe(false);
        if (i.description) expect(leakingName(i.description)).toBe(false);
      }
    }
    expect(checked).toBe(6); // 5 HISD 1332 hearings + 1 HISD 1306 closed-session item
  });

  it('no personnel-sensitive item in any fixture still matches a redaction pattern', () => {
    for (const name of FIXTURE_NAMES) {
      for (const i of mapFixture(name).items.filter((x) => isPersonnelSensitive(x))) {
        expect(redactText(i.title).redacted, `${name} ${i.external_id}`).toBe(false);
      }
    }
  });

  it('the leak check itself catches an unredacted name', () => {
    expect(leakingName('Natasha Smith, teacher, Twain Elementary School')).toBe(true);
    expect(leakingName('An employee, Consideration of Independent Hearing Examiner’s Recommendation')).toBe(false);
  });
});

describe('near-misses that must be kept (§5.4)', () => {
  const base: Item = {
    external_id: '1',
    meeting_external_id: 'm',
    body_id: 'hisd_board',
    title: '',
    section: 'CLOSED SESSION / Personnel',
    status: 'upcoming',
    amounts: [],
    attachments: [],
    contains_private_person: false,
    source_url: 'https://example.gov',
  };
  it.each([
    "Approve the superintendent's employment contract",
    'Board member Jane Doe requests a report on staffing',
    'personnel including teachers, assistant principals, principals, chiefs, deputy chiefs',
  ])('%s', (title) => {
    const i = { ...base, title };
    expect(redactPersonnel(i)).toEqual(i);
  });
});
