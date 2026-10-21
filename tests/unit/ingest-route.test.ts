import { beforeEach, describe, expect, it, vi } from 'vitest';

// The route talks to Supabase and the adapters through runScheduled; both are replaced here.
vi.mock('@/lib/ingest/supabaseStore', () => ({ supabaseIngestStore: {} }));
vi.mock('@/lib/ingest/scheduled', () => ({
  runScheduled: vi.fn(async () => ({
    ok: true,
    elapsed_ms: 12,
    runs: [{ source_id: 'hisd_board', stage: 'near_term', ok: true, healthy: true, flags: [], warnings: 2, items: { inserted: 1 } }],
    skipped: [],
  })),
}));

const { runScheduled } = await import('@/lib/ingest/scheduled');
const { GET, POST, maxDuration } = await import('@/app/api/cron/ingest/route');

const SECRET = 'test-cron-secret';
const call = (query = '', auth: string | null = `Bearer ${SECRET}`, method: 'GET' | 'POST' = 'GET') =>
  (method === 'GET' ? GET : POST)(
    new Request(`https://example.org/api/cron/ingest${query}`, { method, headers: auth ? { Authorization: auth } : {} }),
  );

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.mocked(runScheduled).mockClear();
});

describe('/api/cron/ingest', () => {
  it('allows the full 300 seconds', () => {
    expect(maxDuration).toBe(300);
  });

  it('rejects a request without the secret, or with the wrong one, before running anything', async () => {
    expect((await call('', null)).status).toBe(401);
    expect((await call('', 'Bearer wrong')).status).toBe(401);
    expect(runScheduled).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown source, an unknown mode, a mode without a source, or results without meetings', async () => {
    for (const q of ['?source=no_such_source', '?source=hisd_board&mode=everything', '?mode=near_term', '?source=hcmud_489&mode=results']) {
      expect((await call(q)).status, q).toBe(400);
    }
    expect(runScheduled).not.toHaveBeenCalled();
  });

  it('runs the whole schedule by default and returns counts only', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(vi.mocked(runScheduled).mock.calls[0]![0].only).toBeUndefined();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.runs[0]).toMatchObject({ source_id: 'hisd_board', warnings: 2 });
    expect(JSON.stringify(body)).not.toContain('warning_text');
  });

  it('runs one source in the asked-for mode', async () => {
    await call('?source=hcmud_489&mode=results&meetings=a,b');
    expect(vi.mocked(runScheduled).mock.calls[0]![0].only).toEqual({ sourceId: 'hcmud_489', mode: 'results', meetings: ['a', 'b'] });
  });

  it('POST behaves like GET', async () => {
    expect((await call('', null, 'POST')).status).toBe(401);
    expect((await call('?source=hisd_board', `Bearer ${SECRET}`, 'POST')).status).toBe(200);
    expect(vi.mocked(runScheduled).mock.calls[0]![0].only).toEqual({ sourceId: 'hisd_board', mode: 'rotation' });
  });
});
