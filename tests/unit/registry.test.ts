import { describe, expect, it } from 'vitest';
import { NewsDomainError, assertNoNewsUrls, isNewsHost, loadSources, parseSources } from '@/lib/ingest/registry';

describe('registry', () => {
  it('loads data/sources.yaml', () => {
    const s = loadSources();
    expect(s.map((x) => x.id)).toContain('hc_commissioners_court');
    expect(s.find((x) => x.id === 'hcmud_489')?.config.results_max_days).toBe(75);
  });
  it('rejects agenda sources on news domains', () => {
    const y = ['- id: bad', '  body_id: x', '  adapter: llm_extract', '  config: { index_url: "https://www.houstonpublicmedia.org/x" }'].join('\n');
    expect(() => parseSources(y)).toThrow(NewsDomainError);
  });
  it('rejects news URLs in manual YAML-shaped data', () => {
    expect(() => assertNoNewsUrls('manual/x.yaml', { meetings: [{ agenda_url: 'https://abc13.com/a' }] })).toThrow(NewsDomainError);
  });
  it('allows official sources', () => {
    expect(isNewsHost('https://hcmud489.com/board-meetings/')).toBe(false);
    expect(isNewsHost('https://webapi.legistar.com/v1/harriscountytx/events')).toBe(false);
    expect(isNewsHost('https://www.chron.com/x')).toBe(true);
    expect(isNewsHost('https://notchron.com/x')).toBe(false);
  });
  it('rejects duplicate ids', () => {
    expect(() => parseSources('- { id: a, adapter: manual }\n- { id: a, adapter: manual }\n')).toThrow(/duplicate/);
  });
});
